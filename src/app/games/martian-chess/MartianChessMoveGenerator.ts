import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional, Set } from '@everyboard/lib';
import { MartianChessMove } from './MartianChessMove';
import { MartianChessState } from './MartianChessState';
import { MartianChessPiece } from './MartianChessPiece';
import { MartianChessNode } from './MartianChessRules';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class MartianChessMoveGenerator extends MoveGenerator<MartianChessMove, MartianChessState> {

    public override getListMoves(node: MartianChessNode, _config: NoConfig): MartianChessMove[] {
        const state: MartianChessState = node.gameState;
        const currentPlayer: Player = state.getCurrentPlayer();
        const playerTerritory: Set<number> = state.getPlayerTerritory(currentPlayer);
        let moves: MartianChessMove[] = [];
        for (const y of playerTerritory) {
            for (let x: number = 0; x < MartianChessState.WIDTH; x++) {
                const piece: MartianChessPiece = state.getPieceAtXY(x, y);
                switch (piece) {
                    case MartianChessPiece.PAWN:
                        moves = moves.concat(this.getMovesForPawnAt(state, x, y));
                        break;
                    case MartianChessPiece.DRONE:
                        moves = moves.concat(this.getMovesForDroneAt(state, x, y));
                        break;
                    case MartianChessPiece.QUEEN:
                        moves = moves.concat(this.getMovesForQueenAt(state, x, y));
                        break;
                    default:
                        break;
                }
            }
        }
        return moves;
    }
    public getMovesForPawnAt(state: MartianChessState, x: number, y: number): MartianChessMove[] {
        const coord: Coord = new Coord(x, y);
        const landingCoords: Coord[] = [];
        for (const diagonal of Ordinal.DIAGONALS) {
            const landingCoord: Coord = coord.getNext(diagonal);
            if (MartianChessState.isOnBoard(landingCoord)) {
                landingCoords.push(landingCoord);
            }
        }
        return this.addLegalMoves(state, coord, landingCoords);
    }
    private addLegalMoves(state: MartianChessState,
                          startingCoord: Coord,
                          validLandingCoords: Coord[])
    : MartianChessMove[]
    {
        const moves: MartianChessMove[] = [];
        const firstPiece: MartianChessPiece = state.getPieceAt(startingCoord);
        const canPromoteDrone: boolean = state.isTherePieceOnPlayerSide(MartianChessPiece.DRONE) === false;
        const canPromoteQueen: boolean = state.isTherePieceOnPlayerSide(MartianChessPiece.QUEEN) === false;
        const last: MGPOptional<MartianChessMove> = state.lastMove;
        for (const landingCoord of validLandingCoords) {
            const landedPiece: MartianChessPiece = state.getPieceAt(landingCoord);
            if (landedPiece === MartianChessPiece.EMPTY) {
                // Moves
                this.add(moves, MartianChessMove.from(startingCoord, landingCoord).get(), last);
            } else if (state.isInPlayerTerritory(landingCoord)) {
                // Promotions
                const promotion: MGPOptional<MartianChessPiece> = MartianChessPiece.tryMerge(landedPiece, firstPiece);
                if (promotion.isPresent()) {
                    const promoted: MartianChessPiece = promotion.get();
                    const move: MartianChessMove = MartianChessMove.from(startingCoord, landingCoord).get();
                    if (promoted === MartianChessPiece.DRONE && canPromoteDrone) {
                        this.add(moves, move, last);
                    } else if (promoted === MartianChessPiece.QUEEN && canPromoteQueen) {
                        this.add(moves, move, last);
                    }
                }
            } else {
                // Capture
                this.add(moves, MartianChessMove.from(startingCoord, landingCoord).get(), last);
            }
        }
        return moves;
    }
    private add(moves: MartianChessMove[],
                move: MartianChessMove,
                last: MGPOptional<MartianChessMove>)
    : void
    {
        const isCancelingLastMove: boolean = move.isUndoneBy(last);
        if (isCancelingLastMove === false) {
            moves.push(move);
        }
    }
    public getMovesForDroneAt(state: MartianChessState, x: number, y: number): MartianChessMove[] {
        const coord: Coord = new Coord(x, y);
        const landingCoords: Coord[] = this.getLandingCoordsForLinearMove(coord, state, 2);
        return this.addLegalMoves(state, coord, landingCoords);
    }
    private getLandingCoordsForLinearMove(startingCoord: Coord, state: MartianChessState, maxDist: number): Coord[] {
        const landingCoords: Coord[] = [];
        for (const dir of Ordinal.ORDINALS) {
            let dist: number = 1;
            let landingCoord: Coord = startingCoord.getNext(dir, dist);
            let possible: boolean = state.hasPieceAt(landingCoord, MartianChessPiece.EMPTY);
            while (possible) {
                landingCoords.push(landingCoord);
                dist++;
                landingCoord = startingCoord.getNext(dir, dist);
                possible = state.hasPieceAt(landingCoord, MartianChessPiece.EMPTY) && (dist < maxDist);
            }
            if (state.getOptionalPieceAt(landingCoord).isPresent()) {
                landingCoords.push(landingCoord);
            }
        }
        return landingCoords;
    }
    public getMovesForQueenAt(state: MartianChessState, x: number, y: number): MartianChessMove[] {
        const startingCoord: Coord = new Coord(x, y);
        const landingCoords: Coord[] = this.getLandingCoordsForQueen(startingCoord, state);
        return this.addLegalMoves(state, startingCoord, landingCoords);
    }
    private getLandingCoordsForQueen(startingCoord: Coord, state: MartianChessState): Coord[] {
        return this.getLandingCoordsForLinearMove(startingCoord, state, MartianChessState.HEIGHT);
    }
}
