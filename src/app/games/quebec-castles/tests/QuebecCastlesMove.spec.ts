/* eslint-disable max-lines-per-function */
import { EncoderTestUtils } from '@everyboard/lib';

import { QuebecCastlesDrop, QuebecCastlesMove } from '../QuebecCastlesMove';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { QuebecCastlesMoveGenerator } from '../QuebecCastlesMoveGenerator';
import { TMPMoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { Coord } from 'src/app/jscaip/Coord';
import { QuebecCastlesRules } from '../QuebecCastlesRules';

fdescribe('QuebecCastlesMove', () => {

    const rule: QuebecCastlesRules = QuebecCastlesRules.get();

    it('should have a bijective encoder', () => {
        const moveGenerator: QuebecCastlesMoveGenerator = new QuebecCastlesMoveGenerator();
        const moves: QuebecCastlesMove[] = [
            TMPMoveCoordToCoord.of(new Coord(0, 0), new Coord(1, 1)),
            new QuebecCastlesDrop([new Coord(0, 0), new Coord(1, 1), new Coord(2, 2)]),
        ];
        for (const move of moves) {
            EncoderTestUtils.expectToBeBijective(QuebecCastlesMove.encoder, move);
        }
        MoveTestUtils.testFirstTurnMovesBijectivity(rule, moveGenerator, QuebecCastlesMove.encoder);
    });

    // it('should stringify nicely', () => {
    //     expect(QuebecCastlesMove.PASS.toString()).toBe('QuebecCastlesMove.PASS');
    //     expect(QuebecCastlesMove.ACCEPT.toString()).toBe('QuebecCastlesMove.ACCEPT');
    //     expect(new QuebecCastlesMove(0, 1).toString()).toBe('QuebecCastlesMove(0, 1)');
    // });

});
