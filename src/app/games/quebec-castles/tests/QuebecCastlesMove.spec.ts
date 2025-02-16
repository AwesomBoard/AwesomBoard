/* eslint-disable max-lines-per-function */
import { EncoderTestUtils } from '@everyboard/lib';

import { QuebecCastlesDrop, QuebecCastlesMove, QuebecCastlesTranslation } from '../QuebecCastlesMove';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { QuebecCastlesMoveGenerator } from '../QuebecCastlesMoveGenerator';
import { Coord } from 'src/app/jscaip/Coord';
import { QuebecCastlesRules } from '../QuebecCastlesRules';

fdescribe('QuebecCastlesMove', () => {

    const rule: QuebecCastlesRules = QuebecCastlesRules.get();
    const moveGenerator: QuebecCastlesMoveGenerator = new QuebecCastlesMoveGenerator();

    it('should have a bijective encoder', () => {
        const moves: QuebecCastlesMove[] = [
            QuebecCastlesTranslation.of(new Coord(0, 0), new Coord(1, 1)),
            QuebecCastlesDrop.of([new Coord(0, 0), new Coord(1, 1), new Coord(2, 2)]),
        ];
        for (const move of moves) {
            EncoderTestUtils.expectToBeBijective(QuebecCastlesMove.encoder, move);
        }
        MoveTestUtils.testFirstTurnMovesBijectivity(rule, moveGenerator, QuebecCastlesMove.encoder);
    });

    it('should stringify nicely', () => {
        const moves: QuebecCastlesMove[] = [
            QuebecCastlesTranslation.of(new Coord(0, 0), new Coord(1, 1)),
            QuebecCastlesDrop.of([new Coord(0, 0), new Coord(1, 1), new Coord(2, 2)]),
        ];
        expect(moves[0].toString()).toBe('QuebecCastlesTranslation((0, 0) -> (1, 1))');
        expect(moves[1].toString()).toBe('QuebecCastlesDrop([(0, 0), (1, 1), (2, 2)])');
    });

    describe('equals', () => {

        it('should return true for equal moves');

        it('should return false for equal moves');

    });

});
