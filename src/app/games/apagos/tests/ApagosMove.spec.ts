/* eslint-disable max-lines-per-function */
import { EncoderTestUtils, MGPFallible } from '@everyboard/lib';

import { Player } from 'src/app/jscaip/Player';
import { ApagosFailure } from '../ApagosFailure';
import { ApagosMove } from '../ApagosMove';
import { ApagosMoveGenerator } from '../ApagosMoveGenerator';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { ApagosRules } from '../ApagosRules';

describe('ApagosMove', () => {

    it('should refuse creating static sliding', () => {
        // Given a move whose landing coord is lower than starting
        const invalidMove: MGPFallible<ApagosMove> = ApagosMove.transfer(0, 0);
        // Then it should not be legal
        expect(invalidMove).toEqual(MGPFallible.failure(ApagosFailure.PIECE_SHOULD_MOVE_DOWNWARD()));
    });

    it('should refuse creating "climbing" slide', () => {
        // Given a move whose landing coord is lower than starting
        const invalidMove: MGPFallible<ApagosMove> = ApagosMove.transfer(1, 2);
        // Then it should not be legal
        expect(invalidMove).toEqual(MGPFallible.failure(ApagosFailure.PIECE_SHOULD_MOVE_DOWNWARD()));
    });

    it('should have a bijective encoder for first-turn moves', () => {
        const rules: ApagosRules = ApagosRules.get();
        const moveGenerator: ApagosMoveGenerator = new ApagosMoveGenerator();
        MoveTestUtils.testFirstTurnMovesBijectivity(rules, moveGenerator, ApagosMove.encoder);
    });

    it('should have a bijective encoder for transfers', () => {
        const move: ApagosMove = ApagosMove.transfer(2, 0).get();
        EncoderTestUtils.expectToBeBijective(ApagosMove.encoder, move);
    });

    it('should override equals correctly', () => {
        const move: ApagosMove = ApagosMove.drop(1, Player.ZERO);
        const sameMove: ApagosMove = ApagosMove.drop(1, Player.ofTurn(0));
        const differentMove: ApagosMove = ApagosMove.transfer(3, 1).get();
        const otherDifferentMove: ApagosMove = ApagosMove.transfer(3, 2).get();
        expect(move.equals(sameMove)).toBeTrue();
        expect(move.equals(differentMove)).toBeFalse();
        expect(differentMove.equals(otherDifferentMove)).toBeFalse();
    });

});
