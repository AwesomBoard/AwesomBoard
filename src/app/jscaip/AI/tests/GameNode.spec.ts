/* eslint-disable max-lines-per-function */
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { GameState } from '../../state/GameState';
import { GameStatus } from '../../GameStatus';
import { GameNode } from '../GameNode';
import { Move } from '../../Move';
import { Rules } from '../../Rules';
import { NoConfig } from '../../RulesConfigUtil';

class GameStateMock extends GameState {

    public static getInitialState(): GameStateMock {
        return new GameStateMock(0);
    }
}
class MoveMock extends Move {

    public constructor(private readonly x: number) {
        super();
    }

    public override toString(): string {
        return 'MoveMock';
    }
    public equals(other: this): boolean {
        return this.x === other.x;
    }
}

class MockNode extends GameNode<MoveMock, GameStateMock> {}

class RulesMock extends Rules<MoveMock, GameStateMock> {

    public constructor() {
        super();
    }

    public override getInitialState(): GameStateMock {
        return GameStateMock.getInitialState();
    }

    public override applyLegalMove(_move: MoveMock,
                                   _state: GameStateMock,
                                   _config: NoConfig,
                                   _info: void)
    : GameStateMock
    {
        throw new Error('RulesMock.applyLegalMove method not implemented.');
    }

    public isLegal(move: MoveMock, state: GameStateMock): MGPValidation {
        throw new Error('RulesMock.isLegal method not implemented.');
    }

    public override getGameStatus(node: MockNode): GameStatus {
        throw new Error('RulesMock.getGameStatus method not implemented.');
    }
}

fdescribe('GameNode', () => {

    let rules: RulesMock;
    let config: NoConfig;

    describe('showDot', () => {

        let treeRoot: GameNode<MoveMock, GameStateMock>;
        let terminalNode: MockNode;
        let getGameStatusSpy: jasmine.Spy;

        beforeEach(() => {
            GameNode.ID = 0;
            rules = new RulesMock();
            config = rules.getDefaultRulesConfig();

            const move: MoveMock = new MoveMock(1);
            const optionalMove: MGPOptional<MoveMock> = MGPOptional.of(move);
            const otherMove: MoveMock = new MoveMock(2);
            const optionalOtherMove: MGPOptional<MoveMock> = MGPOptional.of(otherMove);

            const stateAtTurn0: GameStateMock = new GameStateMock(0);
            const stateAtTurn1: GameStateMock = new GameStateMock(1);
            const stateAtTurn2: GameStateMock = new GameStateMock(2);
            const stateAtTurn3: GameStateMock = new GameStateMock(3);

            treeRoot = new GameNode(stateAtTurn0);
            const optionalTreeRoot: MGPOptional<MockNode> = MGPOptional.of(treeRoot);
            const child: MockNode = new MockNode(stateAtTurn1, optionalTreeRoot, optionalMove);
            treeRoot.addChild(child);

            const otherChild: MockNode = new MockNode(stateAtTurn1, optionalTreeRoot, optionalOtherMove);
            treeRoot.addChild(otherChild);

            const grandChild: MockNode = new MockNode(stateAtTurn2, MGPOptional.of(child), optionalMove);
            child.addChild(grandChild);

            terminalNode = new MockNode(stateAtTurn3, MGPOptional.of(grandChild), optionalMove);
            grandChild.addChild(terminalNode);

            getGameStatusSpy = spyOn(rules, 'getGameStatus');
            getGameStatusSpy.and.callFake((node: MockNode) => {
                if (node.gameState.turn === 3) return GameStatus.ZERO_WON;
                else return GameStatus.ONGOING;
            });

        });

        it('should show a DOT representation of the node tree on standard output', () => {
            // Given a tree of game nodes
            // When getting its DOT graph
            const dot: string = treeRoot.showDot(rules, config).dot;
            // Then it should give the expected DOT graph
            const expectedDot: string = `digraph G {
    node_0 -> node_1 [label="MoveMock"; color="#994d00"];
    node_1 -> node_2 [label="MoveMock"; color="#ffc34d"];
    node_2 -> node_3 [label="MoveMock"; color="#994d00"];
    node_3 [label="#3: 4", style=filled, fillcolor="#994d00"];
    node_2 [label="#2: 3", style=filled, fillcolor="#994d00"];
    node_1 [label="#1: 1", style=filled, fillcolor="#994d00"];
    node_0 -> node_4 [label="MoveMock"; color="#994d00"];
    node_4 [label="#1: 2", style=filled, fillcolor="white"];
    node_0 [label="#0: 0", style=filled, fillcolor="#994d00"];
}`;
            expect(dot).toEqual(expectedDot);
        });

        it('should show DOT with extra label if needed', () => {
            // Given a tree of game nodes
            // When showing it with a specific label
            const dot: string = terminalNode.showDot(rules, config, (node: MockNode) => 'foo').dot;
            // Then it should have shown the tree with the extra label
            const expectedDot: string = `digraph G {
    node_0 [label="#3: 4 - foo", style=filled, fillcolor="#994d00"];
}`;
            expect(dot).toEqual(expectedDot);
        });

        it('should limit print depth to the provided max level', () => {
            // Given a tree of game nodes
            // When showing it up to depth 1
            const dot: string = treeRoot.showDot(rules, config, undefined, 1).dot;
            // Then it should have only shown the relevant nodes
            const expectedDot: string = `digraph G {
    node_0 -> node_1 [label="MoveMock"; color="#994d00"];
    node_1 [label="#1: 1", style=filled, fillcolor="#994d00"];
    node_0 -> node_2 [label="MoveMock"; color="#994d00"];
    node_2 [label="#1: 2", style=filled, fillcolor="#994d00"];
    node_0 [label="#0: 0", style=filled, fillcolor="#994d00"];
}`;
            expect(dot).toEqual(expectedDot);
        });

        it('should color nodes based on game status (Player.ZERO)', () => {
            // Given a terminal game node where Player.ZERO wins
            getGameStatusSpy.and.callFake((node: MockNode) => {
                return GameStatus.ZERO_WON;
            });
            // When printing it
            const dot: string = terminalNode.showDot(rules, config).dot;
            // Then it should have printed the node with the player color
            const expectedDot: string = `digraph G {
    node_0 [label="#3: 4", style=filled, fillcolor="#994d00"];
}`;
            expect(dot).toEqual(expectedDot);
        });

        it('should color nodes based on game status (Player.ONE)', () => {
            // Given a terminal game node where Player.ZERO wins
            getGameStatusSpy.and.callFake((node: MockNode) => {
                return GameStatus.ONE_WON;
            });
            // When printing it
            const dot: string = terminalNode.showDot(rules, config).dot;
            // Then it should have printed the node with the player color
            const expectedDot: string = `digraph G {
    node_0 [label="#3: 4", style=filled, fillcolor="#ffc34d"];
}`;
            expect(dot).toEqual(expectedDot);
        });

        it('should color nodes based on game status (draw)', () => {
            // Given a terminal game node where Player.ZERO wins
            getGameStatusSpy.and.callFake((node: MockNode) => {
                return GameStatus.DRAW;
            });
            // When printing it
            const dot: string = terminalNode.showDot(rules, config).dot;
            // Then it should have printed the node in gray
            const expectedDot: string = `digraph G {
    node_0 [label="#3: 4", style=filled, fillcolor="gray"];
}`;
            expect(dot).toEqual(expectedDot);
        });

    });

});
