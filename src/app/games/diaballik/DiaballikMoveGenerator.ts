import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { DiaballikMove, DiaballikBallPass, DiaballikSubMove, DiaballikTranslation, isTranslation } from './DiaballikMove';
import { DiaballikPiece, DiaballikState } from './DiaballikState';
import { DiaballikNode, DiaballikRules } from './DiaballikRules';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { ArrayUtils, ComparableObject, MGPFallible, MGPOptional, Set, Utils } from '@everyboard/lib';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { CoordSet } from 'src/app/jscaip/CoordSet';

export class DiaballikMoveInConstruction implements ComparableObject {

    public readonly hasPass: boolean;
    public readonly translations: number;

    public static finalize(m: DiaballikMoveInConstruction): DiaballikMove {
        return m.finalize();
    }

    public constructor(public readonly subMoves: DiaballikSubMove[],
                       public readonly stateBefore: DiaballikState,
                       public readonly stateAfterSubMoves: DiaballikState)
    {
        Utils.assert(this.subMoves.length <= 3, 'DiaballikMoveInConstruction can have at most 3 submoves');
        let hasPass: boolean = false;
        let translations: number = 0;
        for (const subMove of subMoves) {
            if (subMove instanceof DiaballikBallPass) {
                Utils.assert(hasPass === false, 'DiaballikMoveInConstruction can have at most one pass');
                hasPass = true;
            } else {
                Utils.assert(translations < 2, 'DiaballikMoveInConstruction can have at most two translations');
                translations++;
            }
        }
        this.hasPass = hasPass;
        this.translations = translations;
    }

    public equals(other: this): boolean {
        return ArrayUtils.equals(this.subMoves, other.subMoves);
    }

    public addIfLegal(subMove: DiaballikSubMove, listToAddTo: DiaballikMoveInConstruction[]): void {
        const legality: MGPFallible<DiaballikState> =
            DiaballikRules.get().isLegalSubMove(this.stateAfterSubMoves, subMove);
        if (legality.isSuccess()) {
            const newSubMoves: DiaballikSubMove[] = this.subMoves.concat([subMove]);
            this.sortIfNeeded(newSubMoves); // Sort to avoid duplicates, when possible
            const newMoveInConstruction: DiaballikMoveInConstruction =
                new DiaballikMoveInConstruction(newSubMoves, this.stateBefore, legality.get());
            listToAddTo.push(newMoveInConstruction);
        }
    }

    private sortIfNeeded(subMoves: DiaballikSubMove[]): void {
        // If we have to subsequent translations that do not have any coordinate in common,
        // then their order does not matter. To avoid duplicates, we sort them then.
        const firstTranslationIndex: MGPOptional<number> = this.getFirstTranslationIndex(subMoves);
        if (firstTranslationIndex.isAbsent()) {
            // No translation, no sort to do
            return;
        }
        const i: number = firstTranslationIndex.get();
        if (i+1 >= subMoves.length || isTranslation(subMoves[i+1]) === false) {
            // We don't have two consecutive translations, no sort to do
            return;
        }
        const firstTranslation: DiaballikSubMove = subMoves[i];
        const firstTranslationCoords: CoordSet = new CoordSet(firstTranslation.getCoords());
        const secondTranslation: DiaballikSubMove = subMoves[i+1];
        const secondTranslationCoords: CoordSet = new CoordSet(secondTranslation.getCoords());
        const translationIntersect: boolean =
            firstTranslationCoords.intersection(secondTranslationCoords).size() > 0;
        if (translationIntersect) {
            // If they intersect, their order are important so we preserve it
            return;
        }
        // The "smallest" translation goes first, according to coordinate order
        // Note: we only need to compare start. Either first is bigger (and we
        // have to swap them), or it is smaller (and we keep them as is). It
        // cannot be equal, as otherwise the translations would have
        // intersected.
        const compareStart: number = firstTranslation.getStart().compareTo(secondTranslation.getStart());
        const firstIsBigger: boolean = compareStart > 0;
        if (firstIsBigger) {
            subMoves[i] = secondTranslation;
            subMoves[i+1] = firstTranslation;
        }
    }

    private getFirstTranslationIndex(subMoves: DiaballikSubMove[]): MGPOptional<number> {
        for (let i: number = 0; i < subMoves.length; i++) {
            if (isTranslation(subMoves[i])) {
                return MGPOptional.of(i);
            }
        }
        return MGPOptional.empty();
    }

    public getPassEnd(): MGPOptional<Coord> {
        for (const subMove of this.subMoves) {
            if (subMove instanceof DiaballikBallPass) {
                return MGPOptional.of(subMove.getEnd());
            }
        }
        return MGPOptional.empty();
    }

    public passPathContains(coord: Coord): boolean {
        for (const subMove of this.subMoves) {
            if (subMove instanceof DiaballikBallPass) {
                const passPath: Coord[] = subMove.getStart().getCoordsToward(subMove.getEnd());
                return passPath.some((c: Coord): boolean => c.equals(coord));
            }
        }
        return false;

    }

    public getPreviousTranslation(): MGPOptional<DiaballikTranslation> {
        for (const subMove of this.subMoves) {
            if (subMove instanceof DiaballikTranslation) {
                return MGPOptional.of(subMove);
            }
        }
        return MGPOptional.empty();
    }

    /**
     * Checks if this move has a previous translation that is the opposite of (start, end)
     */
    public hasOppositeTranslation(start: Coord, end: Coord) : boolean {
        if (this.translations > 0) {
            const previousTranslation: DiaballikTranslation = this.getPreviousTranslation().get();
            return previousTranslation.getStart().equals(end) && previousTranslation.getEnd().equals(start);
        } else {
            return false;
        }
    }

    private finalize(): DiaballikMove {
        Utils.assert(this.subMoves.length > 0, 'DiaballikMoveInConstruction can only be finalized if it contains something');
        const first: DiaballikSubMove = this.subMoves[0];
        let second: MGPOptional<DiaballikSubMove> = MGPOptional.empty();
        if (this.subMoves.length > 1) {
            second = MGPOptional.of(this.subMoves[1]);
        }
        let third: MGPOptional<DiaballikSubMove> = MGPOptional.empty();
        if (this.subMoves.length > 2) {
            third = MGPOptional.of(this.subMoves[2]);
        }
        const move: DiaballikMove = new DiaballikMove(first, second, third);
        Utils.assert(DiaballikRules.get().isLegal(move, this.stateBefore).isSuccess(),
                     'DiaballikMoveGenerator should only generate legal moves');
        return move;
    }
}


export class DiaballikMoveGenerator extends MoveGenerator<DiaballikMove, DiaballikState> {

    public constructor(private readonly avoidDuplicates: boolean = true) {
        super();
    }

    public override getListMoves(node: DiaballikNode, config: NoConfig): DiaballikMove[] {
        const emptyMove: DiaballikMoveInConstruction =
            new DiaballikMoveInConstruction([], node.gameState, node.gameState);
        let movesInConstruction: DiaballikMoveInConstruction[] = [emptyMove];
        let moves: Set<DiaballikMove> = new Set();
        for (let i: number = 0; i < 3; i++) {
            let nextMovesInConstruction: DiaballikMoveInConstruction[] = [];
            for (const move of movesInConstruction) {
                const newMovesInConstruction: DiaballikMoveInConstruction[] = this.addAllPossibleSubMoves(move);
                moves = moves.unionList(newMovesInConstruction.map(DiaballikMoveInConstruction.finalize));
                nextMovesInConstruction = nextMovesInConstruction.concat(newMovesInConstruction);
            }
            movesInConstruction = nextMovesInConstruction;
        }
        return this.removeDuplicates(node.gameState, moves, config);
    }

    private removeDuplicates(state: DiaballikState, moves: Set<DiaballikMove>, config: NoConfig)
    : DiaballikMove[]
    {
        if (this.avoidDuplicates === false) {
            return moves.toList();
        }
        let seenStates: Set<DiaballikState> = new Set();
        const movesToKeep: DiaballikMove[] = [];
        const rules: DiaballikRules = DiaballikRules.get();
        for (const move of moves) {
            const legalityInfo: MGPFallible<DiaballikState> = DiaballikRules.get().isLegal(move, state);
            const stateAfterMove: DiaballikState =
                rules.applyLegalMove(move, state, config, legalityInfo.get());
            if (seenStates.contains(stateAfterMove) === false) {
                movesToKeep.push(move);
                seenStates = seenStates.addElement(stateAfterMove);
            }
        }
        return movesToKeep;
    }

    protected addAllPossibleSubMoves(moveInConstruction: DiaballikMoveInConstruction): DiaballikMoveInConstruction[] {
        const state: DiaballikState = moveInConstruction.stateAfterSubMoves;
        const player: Player = state.getCurrentPlayer();
        const nextMovesInConstruction: DiaballikMoveInConstruction[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            const piece: DiaballikPiece = coordAndContent.content;
            if (piece.owner === player) {
                if (piece.holdsBall && moveInConstruction.hasPass === false) {
                    // Note: we can only do one pass per turn, hence the check on hasPass
                    for (const end of this.getPassEnds(state, coordAndContent.coord)) {
                        // The pass here is valid by construction
                        const pass: DiaballikBallPass = DiaballikBallPass.from(coord, end).get();
                        moveInConstruction.addIfLegal(pass, nextMovesInConstruction);
                    }
                } else {
                    // Can only do two translations per move
                    const hasLessThanTwoTranslations: boolean = moveInConstruction.translations < 2;
                    if (hasLessThanTwoTranslations) {
                        for (const end of this.getTranslationEnds(state, coordAndContent.coord)) {
                            // We ignore this one if we already did the opposite translation
                            const doesNotHaveOppositeTranslation: boolean =
                                moveInConstruction.hasOppositeTranslation(coordAndContent.coord, end) === false;
                            if (doesNotHaveOppositeTranslation || this.avoidDuplicates === false) {
                                let keep: boolean = true;
                                if (moveInConstruction.hasPass) {
                                    // There was a pass before, so we only keep this if
                                    //   - it is the piece that passed, or
                                    const isPieceThatPassed: boolean =
                                        moveInConstruction.getPassEnd().equalsValue(coord);
                                    //   - it goes through the path of the pass,
                                    const goesThroughPassPath: boolean = moveInConstruction.passPathContains(end);
                                    keep = isPieceThatPassed || goesThroughPassPath;
                                }
                                if (keep || this.avoidDuplicates === false) {
                                    // The translation here is valid and legal by construction
                                    const translation: DiaballikTranslation =
                                        DiaballikTranslation.from(coord, end).get();
                                    moveInConstruction.addIfLegal(translation, nextMovesInConstruction);
                                }
                            }
                        }
                    }
                }
            }
        }
        return nextMovesInConstruction;
    }

    /**
     * Returns all legal pass ends for a pass starting at start
     */
    public getPassEnds(state: DiaballikState, start: Coord): Coord[] {
        const player: Player = state.getCurrentPlayer();
        const opponent: Player = state.getCurrentOpponent();
        const ends: Coord[] = [];
        // A pass is in any direction, as long as it reaches a player piece and is not obstructed
        for (const direction of Ordinal.factory.all) {
            let coord: Coord = start.getNext(direction);
            while (state.coordIsNotOwnedBy(coord, opponent)) {
                const piece: DiaballikPiece = state.getPieceAt(coord);
                if (piece.owner === player) {
                    ends.push(coord);
                    break;
                }
                coord = coord.getNext(direction);
            }
        }
        return ends;
    }

    /**
     * Returns all legal translation ends for a translation starting at start
     */
    public getTranslationEnds(state: DiaballikState, start: Coord): Coord[] {
        const ends: Coord[] = [];
        // A legal translation is an orthogonal translation that ends on an empty space
        for (const direction of Orthogonal.factory.all) {
            const end: Coord = start.getNext(direction);
            if (state.coordIsOwnerByNone(end)) {
                ends.push(end);
            }
        }
        return ends;
    }
}
