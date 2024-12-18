/* eslint-disable max-lines-per-function */
import { EncoderTestUtils } from '@everyboard/lib';
import { DiamPiece } from '../DiamPiece';

describe('DiamPiece', () => {

    it('should have a bijective encoder', () => {
        EncoderTestUtils.expectToBeBijective(DiamPiece.encoder, DiamPiece.EMPTY);
        for (const piece of DiamPiece.PLAYER_PIECES) {
            EncoderTestUtils.expectToBeBijective(DiamPiece.encoder, piece);
        }
    });

    it('should have redefined toString', () => {
        expect(DiamPiece.ZERO_FIRST.toString()).toBe('DiamPiece(PLAYER_ZERO, false)');
    });

    describe('equals', () => {
        it('should detect equal pieces', () => {
            expect(DiamPiece.ZERO_FIRST.equals(DiamPiece.ZERO_FIRST)).toBeTrue();
            expect(DiamPiece.ZERO_FIRST.equals(DiamPiece.ZERO_SECOND)).toBeFalse();
        });
    });

});
