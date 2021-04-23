import { TablutComponent } from './tablut.component';
import { TablutMove } from 'src/app/games/tablut/tablut-move/TablutMove';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { TablutCase } from 'src/app/games/tablut/tablut-rules/TablutCase';
import { TablutPartSlice } from 'src/app/games/tablut/TablutPartSlice';
import { ComponentTestUtils } from 'src/app/utils/TestUtils.spec';
import { fakeAsync } from '@angular/core/testing';

describe('TablutComponent', () => {
    let componentTestUtils: ComponentTestUtils<TablutComponent>;

    const _: number = TablutCase.UNOCCUPIED.value;
    const x: number = TablutCase.INVADERS.value;
    const i: number = TablutCase.DEFENDERS.value;
    const A: number = TablutCase.PLAYER_ONE_KING.value;

    beforeEach(fakeAsync(async() => {
        componentTestUtils = new ComponentTestUtils<TablutComponent>('Tablut');
    }));
    it('should create', () => {
        expect(componentTestUtils.wrapper).toBeTruthy('Wrapper should be created');
        expect(componentTestUtils.getComponent()).toBeTruthy('Component should be created');
    });
    it('Should cancel move when clicking on opponent piece', fakeAsync( async() => {
        await componentTestUtils.expectClickFailure('#click_4_4', 'Cette pièce ne vous appartient pas.');
    }));
    it('Should cancel move when first click on empty case', fakeAsync( async() => {
        const message: string = 'Pour votre premier clic, choisissez une de vos pièces.';
        await componentTestUtils.expectClickFailure('#click_0_0', message);
    }));
    it('Should allow simple move', async() => {
        await componentTestUtils.expectClickSuccess('#click_4_1');
        const move: TablutMove = new TablutMove(new Coord(4, 1), new Coord(0, 1));
        await componentTestUtils.expectMoveSuccess('#click_0_1', move);
    });
    it('Diagonal move attempt should not throw', async() => {
        await componentTestUtils.expectClickSuccess('#click_3_0');
        let threw: boolean = false;
        try {
            const message: string = 'TablutMove cannot be diagonal.';
            await componentTestUtils.expectClickFailure('#click_4_1', message);
        } catch (error) {
            threw = true;
        } finally {
            expect(threw).toBeFalse();
        }
    });
    it('Should show captured piece and left cases', fakeAsync(async() => {
        const board: number[][] = [
            [_, A, _, _, _, _, _, _, _],
            [_, x, x, _, _, _, _, _, _],
            [_, _, i, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const initialSlice: TablutPartSlice = new TablutPartSlice(board, 1);
        componentTestUtils.setupSlice(initialSlice);

        await componentTestUtils.expectClickSuccess('#click_1_0');
        const move: TablutMove = new TablutMove(new Coord(1, 0), new Coord(2, 0));
        await componentTestUtils.expectMoveSuccess('#click_2_0', move);

        const tablutGameComponent: TablutComponent = componentTestUtils.getComponent();
        expect(tablutGameComponent.getRectClasses(2, 1)).toContain('captured');
        expect(tablutGameComponent.getRectClasses(1, 0)).toContain('moved');
        expect(tablutGameComponent.getRectClasses(2, 0)).toContain('moved');
    }));
    it('should delegate decoding to move', () => {
        spyOn(TablutMove, 'decode').and.callThrough();
        componentTestUtils.getComponent().decodeMove(1);
        expect(TablutMove.decode).toHaveBeenCalledTimes(1);
    });
    it('should delegate encoding to move', () => {
        spyOn(TablutMove, 'encode').and.callThrough();
        componentTestUtils.getComponent().encodeMove(new TablutMove(new Coord(1, 1), new Coord(2, 1)));
        expect(TablutMove.encode).toHaveBeenCalledTimes(1);
    });
});
