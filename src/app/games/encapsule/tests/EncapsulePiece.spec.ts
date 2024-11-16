/* eslint-disable max-lines-per-function */
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { EncapsulePiece } from '../EncapsulePiece';

describe('EncapsulePiece', () => {

    describe('ofSizeAndPlayer', () => {

        it('should construct the expected piece', () => {
            const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, Player.ONE);
            expect(piece.getPlayer()).toEqual(Player.ONE);
            expect(piece.getSize()).toEqual(3);
        });

        it('should return the none piece if size is none', () => {
            // Given a piece with size 0
            const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(0, PlayerOrNone.ZERO);

            // When checking it's player and size
            // Then player should be NONE
            expect(piece.getPlayer()).toEqual(PlayerOrNone.NONE);
            // And piece should be NONE as well
            expect(piece.getSize()).toEqual(0);
        });

        it('should return the none piece if player is none', () => {
            // Given a piece with Player.NONE
            const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, PlayerOrNone.NONE);

            // When checking it's player and size
            // Then player should be NONE
            expect(piece.getPlayer()).toEqual(PlayerOrNone.NONE);
            // And piece should be NONE as well
            expect(piece.getSize()).toEqual(0);
        });

    });

    describe('getPlayer', () => {

        it('should return the owner of the piece', () => {
            const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, PlayerOrNone.ZERO);
            expect(piece.getPlayer()).toBe(Player.ZERO);
        });

    });

    describe('getSize', () => {

        it('should return the size of the piece', () => {
            const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, PlayerOrNone.ZERO);
            expect(piece.getSize()).toBe(2);
        });

    });

    describe('belongsTo', () => {

        it('should identify that a piece belong to its owner only', () => {
            const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, PlayerOrNone.ZERO);
            expect(piece.belongsTo(Player.ZERO)).toBeTrue();
            expect(piece.belongsTo(Player.ONE)).toBeFalse();
        });

    });

});
