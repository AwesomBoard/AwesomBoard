/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { TaflNode, TaflRules } from '../TaflRules';
import { MyTaflMove } from './MyTaflMove.spec';
import { Table } from 'src/app/jscaip/TableUtils';
import { TaflConfig } from '../TaflConfig';
import { BooleanConfig, RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { TaflPawn } from '../TaflPawn';
import { TaflState } from '../TaflState';

export class MyTaflNode extends TaflNode<MyTaflMove> {}

export class MyTaflRules extends TaflRules<MyTaflMove> {

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<TaflConfig> =
        new RulesConfigDescription<TaflConfig>({
            name: (): string => `MyTafl`,
            config: {
                canReturnToCastle: new BooleanConfig(false, () => $localize`Central throne is left for good`),
                edgesAreKingsEnnemy: new BooleanConfig(true, () => $localize`Edges are king's ennemy`),
                centralThroneCanSurroundKing: new BooleanConfig(true, () => $localize`Central throne can surround king`),
                kingFarFromHomeCanBeSandwiched: new BooleanConfig(true, () => $localize`King far from home can be sandwiched`),
                invaderStarts: new BooleanConfig(true, () => $localize`Invader starts`),
            },
        });

    private static singleton: MGPOptional<MyTaflRules> = MGPOptional.empty();

    public static get(): MyTaflRules {
        if (MyTaflRules.singleton.isAbsent()) {
            MyTaflRules.singleton = MGPOptional.of(new MyTaflRules());
        }
        return MyTaflRules.singleton.get();
    }

    private constructor() {
        super(MyTaflMove.from);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<TaflConfig>> {
        return MGPOptional.of(MyTaflRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(config: MGPOptional<TaflConfig>): TaflState {
        const _: TaflPawn = TaflPawn.UNOCCUPIED;
        let I: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
        let D: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
        let K: TaflPawn = TaflPawn.PLAYER_ONE_KING;
        if (config.get().invaderStarts === false) {
            I = TaflPawn.PLAYER_ONE_PAWN;
            D = TaflPawn.PLAYER_ZERO_PAWN;
            K = TaflPawn.PLAYER_ZERO_KING;
        }
        const board: Table<TaflPawn> = [
            [_, I, _, _, D, _, _, I, _],
            [_, _, I, _, D, _, I, _, _],
            [_, _, _, _, D, _, _, _, _],
            [_, D, D, D, K, D, D, D, _],
            [_, _, _, _, D, _, _, _, _],
            [_, _, I, _, D, _, I, _, _],
            [_, I, _, _, D, _, _, I, _],
            [I, _, _, _, D, _, _, _, I],
            [_, _, _, _, D, _, _, _, _],
        ];

        return new TaflState(board, 0);
    }

}
