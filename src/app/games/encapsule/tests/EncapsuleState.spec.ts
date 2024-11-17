/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Player } from 'src/app/jscaip/Player';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { EncapsulePiece } from 'src/app/games/encapsule/EncapsulePiece';
import { EncapsuleRemainingPieces, EncapsuleSizeToNumberMap, EncapsuleSpace, EncapsuleState } from '../EncapsuleState';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { EncapsuleRules } from '../EncapsuleRules';

const _: EncapsuleSpace = EncapsuleSpace.EMPTY;
const smallDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ZERO);
const mediumDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, Player.ZERO);
const bigDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, Player.ZERO);
const smallLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ONE);
const mediumLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, Player.ONE);
const noMorePiece: EncapsuleRemainingPieces =
    PlayerMap.ofValues(new EncapsuleSizeToNumberMap(), new EncapsuleSizeToNumberMap());

describe('EncapsuleState', () => {


    const emptyBoard: EncapsuleSpace[][] = TableUtils.create(3, 3, _);

    describe('getPieceAt', () => {

        it('should return the expected space', () => {
            const someSpace: EncapsuleSpace = _.put(smallLight);
            const board: EncapsuleSpace[][] = [
                [_, _, _],
                [someSpace, _, _],
                [_, _, _]];
            const state: EncapsuleState = new EncapsuleState(board, 0, noMorePiece, 3);
            expect(state.getPieceAtXY(0, 1)).toEqual(someSpace);
        });

    });

    describe('isDroppable', () => {

        it('should not consider pieces of the opponent as droppable', () => {
            const remainingPieces: EncapsuleRemainingPieces =
                EncapsuleRules.get().getEncapsulePieceMapFrom([0], [1]);
            const state: EncapsuleState = new EncapsuleState(emptyBoard, 0, remainingPieces, 3);
            expect(state.isDroppable(smallLight)).toBeFalse();
        });

        it('should not consider pieces not remaining as droppable', () => {
            const state: EncapsuleState = new EncapsuleState(emptyBoard, 0, noMorePiece, 3);
            expect(state.isDroppable(smallDark)).toBeFalse();
        });

        it('should only consider a piece that is remaining and of the current player as droppable', () => {
            const remainingPieces: EncapsuleRemainingPieces =
                EncapsuleRules.get().getEncapsulePieceMapFrom([1], [0]);
            const state: EncapsuleState = new EncapsuleState(emptyBoard, 0, remainingPieces, 3);
            expect(state.isDroppable(smallDark)).toBeTrue();
        });

    });

});

describe('EncapsuleSpace', () => {

    describe('isEmpty', () => {

        it('should consider the empty space empty', () => {
            expect(_.isEmpty()).toBeTrue();
        });

        it('should consider other spaces non empty', () => {
            const someSpace: EncapsuleSpace = _.put(smallLight);
            expect(someSpace.isEmpty()).toBeFalse();
        });

    });

    describe('toList', () => {

        it('should produce a list containing all pieces of the space', () => {
            const someSpace: EncapsuleSpace = _.put(smallLight).put(mediumDark).put(bigDark);
            const list: EncapsulePiece[] = someSpace.toList();
            expect(list.length).toBe(3);
            expect(list[0]).toEqual(smallLight);
            expect(list[1]).toEqual(mediumDark);
            expect(list[2]).toEqual(bigDark);
        });

        it('should not include empty pieces in the list', () => {
            const someSpace: EncapsuleSpace = _.put(smallLight);
            expect(someSpace.toList().length).toBe(1);
        });

    });

    describe('getBiggest', () => {

        it('should return the biggest piece of the space', () => {
            const c: EncapsuleSpace = _.put(smallDark).put(mediumLight).put(bigDark);
            expect(c.getBiggest()).toEqual(EncapsulePiece.ofSizeAndPlayer(3, Player.ZERO));
        });

    });

    describe('tryToSupperposePiece', () => {

        it('should forbid supperposing the empty piece', () => {
            const c: EncapsuleSpace = _.put(smallDark).put(mediumLight);
            expect(() => c.tryToSuperposePiece(EncapsulePiece.NONE)).toThrow();
        });

        it('should forbid superposing a smaller piece', () => {
            const c: EncapsuleSpace = _.put(smallDark).put(mediumLight);
            expect(c.tryToSuperposePiece(mediumDark).isPresent()).toBeFalse();
        });

        it('should allow superposing a bigger piece', () => {
            const c: EncapsuleSpace = _.put(smallDark).put(mediumLight);
            const expected: EncapsuleSpace = _.put(smallDark).put(mediumLight).put(bigDark);

            const superposed: MGPOptional<EncapsuleSpace> = c.tryToSuperposePiece(bigDark);

            expect(superposed.isPresent()).toBeTrue();
            expect(superposed.get()).toEqual(expected);
        });

    });

    describe('removeBiggest', () => {

        it('should forbid to remove a piece from the empty space', () => {
            expect(() => _.removeBiggest()).toThrow();
        });

        it('should remove the biggest piece of the space', () => {
            // Given a space with several pieces
            const c: EncapsuleSpace = _.put(smallDark).put(mediumLight).put(bigDark);

            // When removing the biggest one
            const result: {removedSpace: EncapsuleSpace, removedPiece: EncapsulePiece} = c.removeBiggest();

            // Then the removed piece should be the biggest piece and the resulting space should contains what remains
            const expectedSpace: EncapsuleSpace = _.put(smallDark).put(mediumLight);
            const expectedPiece: EncapsulePiece = bigDark;
            expect(result.removedSpace).withContext('removed space should be valid').toEqual(expectedSpace);
            expect(result.removedPiece).withContext('removed piece should be valid').toEqual(expectedPiece);
        });

    });

    describe('put', () => {

        it('should forbid putting an empty piece', () => {
            expect(() => _.put(EncapsulePiece.NONE)).toThrow();
        });

        it('should put on top of smaller pieces', () => {
            const c: EncapsuleSpace = _.put(smallLight);

            const newSpace: EncapsuleSpace = c.put(mediumDark);

            const expectedSpace: EncapsuleSpace = _.put(smallLight).put(mediumDark);
            expect(newSpace).toEqual(expectedSpace);
        });

    });

});
