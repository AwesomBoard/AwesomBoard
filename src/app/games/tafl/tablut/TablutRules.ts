import { TablutMove } from './TablutMove';
import { MGPOptional } from '@everyboard/lib';
import { TaflNode, TaflRules } from '../TaflRules';
import { TaflConfig } from '../TaflConfig';
import { BooleanConfig, RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { TaflPawn } from '../TaflPawn';
import { Table } from 'src/app/jscaip/TableUtils';
import { TaflState } from '../TaflState';

export class TablutNode extends TaflNode<TablutMove> {}

export class TablutRules extends TaflRules<TablutMove> {

    private static singleton: MGPOptional<TablutRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<TaflConfig> =
        new RulesConfigDescription<TaflConfig>({
            name: (): string => $localize`Tablut`,
            config: {
                canReturnToCastle:
                    new BooleanConfig(true, TaflRules.CAN_RETURN_IN_CASTLE),
                edgesAreKingsEnnemy:
                    new BooleanConfig(true, TaflRules.EDGE_ARE_KING_S_ENNEMY),
                centralThroneCanSurroundKing:
                    new BooleanConfig(false, TaflRules.CENTRAL_THRONE_CAN_SURROUND_KING),
                kingFarFromHomeCanBeSandwiched:
                    new BooleanConfig(false, TaflRules.KING_FAR_FROM_HOME_CAN_BE_SANDWICHED),
                invaderStarts:
                    new BooleanConfig(true, TaflRules.INVADER_STARTS),
            },
        });

    public static get(): TablutRules {
        if (TablutRules.singleton.isAbsent()) {
            TablutRules.singleton = MGPOptional.of(new TablutRules());
        }
        return TablutRules.singleton.get();
    }

    private constructor() {
        super(TablutMove.from);
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
            [_, _, _, I, I, I, _, _, _],
            [_, _, _, _, I, _, _, _, _],
            [_, _, _, _, D, _, _, _, _],
            [I, _, _, _, D, _, _, _, I],
            [I, I, D, D, K, D, D, I, I],
            [I, _, _, _, D, _, _, _, I],
            [_, _, _, _, D, _, _, _, _],
            [_, _, _, _, I, _, _, _, _],
            [_, _, _, I, I, I, _, _, _],
        ];
        return new TaflState(board, 0);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<TaflConfig>> {
        return MGPOptional.of(TablutRules.RULES_CONFIG_DESCRIPTION);
    }

}
