/* eslint-disable max-lines-per-function */
import { MGPMap, MGPOptional } from '@everyboard/lib';
import { EncapsuleConfig, EncapsuleNode, EncapsuleRules } from '../EncapsuleRules';
import { EncapsuleRemainingPieces, EncapsuleSpace, EncapsuleState } from '../EncapsuleState';
import { Player } from 'src/app/jscaip/Player';
import { EncapsuleMoveGenerator } from '../EncapsuleMoveGenerator';
import { EncapsuleMove } from '../EncapsuleMove';
import { EncapsulePiece } from '../EncapsulePiece';

const smallDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ZERO);
const smallLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ONE);
const ___: EncapsuleSpace = new EncapsuleSpace(new MGPMap());
const X__: EncapsuleSpace = ___.put(smallLight);
const O__: EncapsuleSpace = ___.put(smallDark);

describe('EncapsuleMoveGenerator', () => {

    let moveGenerator: EncapsuleMoveGenerator;
    const defaultConfig: MGPOptional<EncapsuleConfig> = EncapsuleRules.get().getDefaultRulesConfig();
    const customConfig: MGPOptional<EncapsuleConfig> = MGPOptional.of({
        ...defaultConfig.get(),
        height: 4,
    });

    beforeEach(() => {
        moveGenerator = new EncapsuleMoveGenerator();
    });

    describe('getListMoves', () => {

        it('should have 27 moves on first turn (standard config)', () => {
            // Given an initial node
            const node: EncapsuleNode = EncapsuleRules.get().getInitialNode(defaultConfig);

            // When listing the moves
            const moves: EncapsuleMove[] = moveGenerator.getListMoves(node, defaultConfig);

            // Then there should be 3 pieces x 9 coords = 27 moves
            expect(moves.length).toBe(27);
        });

        it('should have 36 moves on first turn (4x3 board)', () => {
            // Given an initial node and a custom 4x3 board config
            const node: EncapsuleNode = EncapsuleRules.get().getInitialNode(customConfig);

            // When listing the moves
            const moves: EncapsuleMove[] = moveGenerator.getListMoves(node, customConfig);

            // Then there should be 3 pieces x 12 coords = 36 moves
            expect(moves.length).toBe(36);
        });

        it('should have the expected number of moves on a specific custom state', () => {
            // Given a board like this
            const board: EncapsuleSpace[][] = [
                [O__, ___, ___, ___],
                [___, X__, ___, ___],
                [___, ___, ___, ___],
            ];
            const remainingPieces: EncapsuleRemainingPieces =
                EncapsuleRules.get().getEncapsulePieceMapFrom([1, 2, 2], [2, 2]);
            const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
            const node: EncapsuleNode = new EncapsuleNode(state);

            // When listing the moves
            const moves: EncapsuleMove[] = moveGenerator.getListMoves(node, customConfig);

            // Then there should be:
            // Drops medium              = 12
            // drops big                 = 12
            // drops small               = 10
            // Moving the piece on board = 10
            // ------------------------------
            // Total                     = 44
            expect(moves.length).toBe(44);
        });

        it('should have the expected number of moves on a specific custom state (custom config)', () => {
            // Given a board like this
            const board: EncapsuleSpace[][] = [
                [O__, ___, ___],
                [___, X__, ___],
                [___, ___, ___],
            ];
            const remainingPieces: EncapsuleRemainingPieces =
                EncapsuleRules.get().getEncapsulePieceMapFrom([1, 2, 2], [2, 2]);
            const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
            const node: EncapsuleNode = new EncapsuleNode(state);

            // When listing the moves
            const moves: EncapsuleMove[] = moveGenerator.getListMoves(node, defaultConfig);

            // Then there should be:
            // Drops medium              =  9
            // drops big                 =  9
            // drops small               =  7
            // Moving the piece on board =  7
            // ------------------------------
            // Total                     = 32
            expect(moves.length).toBe(32);
        });

    });

});
