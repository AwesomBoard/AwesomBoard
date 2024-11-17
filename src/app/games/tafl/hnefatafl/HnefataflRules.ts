import { TaflState } from '../TaflState';
import { TaflNode, TaflRules } from '../TaflRules';
import { HnefataflMove } from './HnefataflMove';
import { MGPOptional } from '@everyboard/lib';
import { Table } from 'src/app/jscaip/TableUtils';
import { TaflConfig } from '../TaflConfig';
import { BooleanConfig, RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { TaflPawn } from '../TaflPawn';

export class HnefataflNode extends TaflNode<HnefataflMove> {}

export class HnefataflRules extends TaflRules<HnefataflMove> {

    private static singleton: MGPOptional<HnefataflRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<TaflConfig> =
        new RulesConfigDescription<TaflConfig>({
            name: (): string => $localize`Hnefatafl`,
            config: {
                canReturnInCastle:
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

    public static get(): HnefataflRules {
        if (HnefataflRules.singleton.isAbsent()) {
            HnefataflRules.singleton = MGPOptional.of(new HnefataflRules());
        }
        return HnefataflRules.singleton.get();
    }

    private constructor() {
        super(HnefataflMove.from);
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
            [_, _, _, I, I, I, I, I, _, _, _],
            [_, _, _, _, _, I, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [I, _, _, _, _, D, _, _, _, _, I],
            [I, _, _, _, D, D, D, _, _, _, I],
            [I, I, _, D, D, K, D, D, _, I, I],
            [I, _, _, _, D, D, D, _, _, _, I],
            [I, _, _, _, _, D, _, _, _, _, I],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, I, _, _, _, _, _],
            [_, _, _, I, I, I, I, I, _, _, _],
        ];
        return new TaflState(board, 0);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<TaflConfig>> {
        return MGPOptional.of(HnefataflRules.RULES_CONFIG_DESCRIPTION);
    }

}
