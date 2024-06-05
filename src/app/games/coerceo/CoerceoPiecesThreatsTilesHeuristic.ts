import { Coord } from 'src/app/jscaip/Coord';
import { PieceThreat } from 'src/app/jscaip/PieceThreat';
import { Player } from 'src/app/jscaip/Player';
import { MGPMap, MGPOptional } from '@everyboard/lib';
import { CoerceoState } from './CoerceoState';
import { CoerceoConfig, CoerceoNode } from './CoerceoRules';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { CoerceoHeuristic } from './CoerceoHeuristic';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { TriangularCheckerBoard } from 'src/app/jscaip/state/TriangularCheckerBoard';
import { CoerceoStep } from './CoerceoMove';
import { Vector } from 'src/app/jscaip/Vector';

export class CoerceoPiecesThreatsTilesHeuristic extends CoerceoHeuristic {

    public override getMetrics(node: CoerceoNode, _config: MGPOptional<CoerceoConfig>): PlayerNumberTable {
        const state: CoerceoState = node.gameState;
        const pieceMap: MGPMap<Player, CoordSet> = this.getPiecesMap(state);
        const threatMap: MGPMap<Coord, PieceThreat> = this.getThreatMap(state, pieceMap);
        const filteredThreatMap: MGPMap<Coord, PieceThreat> = this.filterThreatMap(threatMap, state);
        const safeIndex: number = 0;
        const threatenedIndex: number = 1;
        const tilesIndex: number = 2;
        const metrics: PlayerNumberTable = PlayerNumberTable.of([0, 0, 0], [0, 0, 0]);

        for (const owner of Player.PLAYERS) {
            for (const coord of pieceMap.get(owner).get()) {
                if (filteredThreatMap.get(coord).isPresent()) {
                    metrics.add(owner, threatenedIndex, 1);
                } else {
                    metrics.add(owner, safeIndex, 1);
                }
            }
            metrics.add(owner, tilesIndex, state.tiles.get(owner));
        }
        return metrics;
    }

    public getThreatMap(state: CoerceoState, pieces: MGPMap<Player, CoordSet>): MGPMap<Coord, PieceThreat> {
        const threatMap: MGPMap<Coord, PieceThreat> = new MGPMap();
        for (const player of Player.PLAYERS) {
            for (const piece of pieces.get(player).get()) {
                const threat: MGPOptional<PieceThreat> = this.getThreat(piece, state);
                if (threat.isPresent()) {
                    threatMap.set(piece, threat.get());
                }
            }
        }
        return threatMap;
    }

    public getThreat(coord: Coord, state: CoerceoState): MGPOptional<PieceThreat> {
        const threatenerPlayer: Player = state.getPieceAt(coord).getPlayer() as Player;
        const opponent: Player = threatenerPlayer.getOpponent();
        const fourStatePieceOpponent: FourStatePiece = FourStatePiece.ofPlayer(opponent);
        let uniqueFreedom: MGPOptional<Coord> = MGPOptional.empty();
        let emptiableNeighborTile: MGPOptional<Coord> = MGPOptional.empty();
        let directThreats: Coord[] = [];
        const neighbors: Coord[] = TriangularCheckerBoard
            .getNeighbors(coord)
            .filter((c: Coord) => state.isOnBoard(c));
        for (const directThreat of neighbors) {
            const threat: FourStatePiece = state.getPieceAt(directThreat);
            if (threat.is(opponent)) {
                directThreats.push(directThreat);
                if (this.tileCouldBeRemovedThisTurn(directThreat, state, opponent)) {
                    emptiableNeighborTile = MGPOptional.of(directThreat);
                }
            } else if (threat === FourStatePiece.EMPTY) {
                if (uniqueFreedom.isPresent()) {
                    // more than one freedom!
                    return MGPOptional.empty();
                } else {
                    uniqueFreedom = MGPOptional.of(directThreat);
                }
            }
        }
        if (uniqueFreedom.isPresent()) {
            const movingThreats: Coord[] = [];
            for (const step of CoerceoStep.STEPS) {
                const movingThreat: Coord = uniqueFreedom.get().getNext(step.direction, 1);
                if (state.hasPieceAt(movingThreat, fourStatePieceOpponent) &&
                    directThreats.some((c: Coord) => c.equals(movingThreat)) === false)
                {
                    movingThreats.push(movingThreat);
                }
            }
            if (movingThreats.length > 0) {
                return MGPOptional.of(new PieceThreat(new CoordSet(directThreats), new CoordSet(movingThreats)));
            }
        }
        if (emptiableNeighborTile.isPresent()) {
            directThreats = directThreats.filter((c: Coord) => c.equals(emptiableNeighborTile.get()));
            const directThreatsSet: CoordSet = new CoordSet(directThreats);
            return MGPOptional.of(new PieceThreat(directThreatsSet, new CoordSet([emptiableNeighborTile.get()])));
        }
        return MGPOptional.empty();
    }

    private tileCouldBeRemovedThisTurn(coord: Coord, state: CoerceoState, OPPONENT: Player): boolean {
        const player: Player = OPPONENT.getOpponent();
        const isTileRemovable: boolean = state.isDeconnectable(coord);
        if (isTileRemovable === false) {
            return false;
        }
        let uniqueThreat: MGPOptional<Coord> = MGPOptional.empty();
        // for all coord of the tiles
        const tileUpperLeft: Coord = CoerceoState.getTilesUpperLeftCoord(coord);
        for (let tileY: number = 0; tileY < 2; tileY++) {
            for (let tileX: number = 0; tileX < 3; tileX++) {
                const tileCoord: Coord = tileUpperLeft.getNext(new Vector(tileX, tileY), 1);
                if (state.getPieceAt(tileCoord).is(OPPONENT)) {
                    if (this.pieceCouldLeaveTheTile(tileCoord, state)) {
                        // Then add it to the threat list
                        uniqueThreat = MGPOptional.of(tileCoord);
                    } else {
                        return false;
                    }
                } else if (state.getPieceAt(tileCoord).is(player)) {
                    return false;
                }
            }
        }
        return uniqueThreat.isPresent();
    }

    private pieceCouldLeaveTheTile(piece: Coord, state: CoerceoState): boolean {
        const startingTileUpperLeft: Coord = CoerceoState.getTilesUpperLeftCoord(piece);
        for (const dir of CoerceoStep.STEPS) {
            const landing: Coord = piece.getNext(dir.direction, 1);
            const landingTileUpperLeft: Coord = CoerceoState.getTilesUpperLeftCoord(landing);
            if (startingTileUpperLeft.equals(landingTileUpperLeft) === false &&
                state.hasPieceAt(landing, FourStatePiece.EMPTY))
            {
                return true;
            }
        }
        return false;
    }

    public filterThreatMap(threatMap: MGPMap<Coord, PieceThreat>, state: CoerceoState): MGPMap<Coord, PieceThreat> {
        const filteredThreatMap: MGPMap<Coord, PieceThreat> = new MGPMap();
        const threateneds: Coord[] = threatMap.getKeyList();
        const threatenedPlayerPieces: Coord[] = threateneds.filter((coord: Coord) => {
            return state.getPieceAt(coord).is(state.getCurrentPlayer());
        });
        const threatenedOpponentPieces: CoordSet = new CoordSet(threateneds.filter((coord: Coord) => {
            return state.getPieceAt(coord).is(state.getCurrentOpponent());
        }));
        for (const threatenedPiece of threatenedPlayerPieces) {
            const oldThreat: PieceThreat = threatMap.get(threatenedPiece).get();
            let newThreat: MGPOptional<PieceThreat> = MGPOptional.empty();
            for (const directOldThreat of oldThreat.directThreats) {
                if (threatenedOpponentPieces.contains(directOldThreat) === false) {
                    // if the direct threat of this piece is not a false threat
                    const newMover: Coord[] = [];
                    for (const mover of oldThreat.mover) {
                        if (threatenedOpponentPieces.contains(mover) === false) {
                            // if the moving threat of this piece is real
                            newMover.push(mover);
                        }
                    }
                    if (newMover.length > 0) {
                        newThreat = MGPOptional.of(new PieceThreat(oldThreat.directThreats, new CoordSet(newMover)));
                    }
                }
            }
            if (newThreat.isPresent()) {
                filteredThreatMap.set(threatenedPiece, newThreat.get());
            }
        }
        for (const threatenedOpponentPiece of threatenedOpponentPieces) {
            const threatSet: PieceThreat = threatMap.get(threatenedOpponentPiece).get();
            filteredThreatMap.set(threatenedOpponentPiece, threatSet);
        }
        return filteredThreatMap;
    }

}
