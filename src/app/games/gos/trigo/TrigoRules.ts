import { MGPOptional } from '@everyboard/lib';
import { AbstractGoRules } from '../AbstractGoRules';
import { GoState } from '../GoState';
import { GoPiece } from '../GoPiece';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { BooleanConfig, NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { TriangularGoGroupDataFactory } from '../GoGroupDataFactory';
import { GroupDataFactory } from 'src/app/jscaip/BoardData';
import { TriangularCheckerBoard } from 'src/app/jscaip/state/TriangularCheckerBoard';
import { HexagonalUtils } from 'src/app/jscaip/HexagonalUtils';

export type TrigoConfig = {

    size: number;

    hexagonal: boolean;

};

export class TrigoRules extends AbstractGoRules<TrigoConfig> {

    private static singleton: MGPOptional<TrigoRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<TrigoConfig> =
        new RulesConfigDescription<TrigoConfig>({
            name: (): string => $localize`Standard`,
            config: {
                size: new NumberConfig(
                    7,
                    RulesConfigDescriptionLocalizable.SIZE,
                    MGPValidators.range(1, 99)),
                hexagonal: new BooleanConfig(
                    false,
                    () => $localize`Hexagonal`),
            },
        });

    public static get(): TrigoRules {
        if (TrigoRules.singleton.isAbsent()) {
            TrigoRules.singleton = MGPOptional.of(new TrigoRules());
        }
        return TrigoRules.singleton.get();
    }

    public override getInitialState(optionalConfig: MGPOptional<TrigoConfig>): GoState {
        const config: TrigoConfig = optionalConfig.get();
        const size: number = config.size;
        let board: GoPiece[][];
        if (config.hexagonal) {
            board = HexagonalUtils.createBoard(size, GoPiece.UNREACHABLE, GoPiece.EMPTY);
        } else {
            board = TriangularCheckerBoard.createBoard(size, GoPiece.UNREACHABLE, GoPiece.EMPTY);
        }
        return new GoState(board, PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), 'PLAYING');
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<TrigoConfig>> {
        return MGPOptional.of(TrigoRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getGoGroupDataFactory(): GroupDataFactory<GoPiece> {
        return new TriangularGoGroupDataFactory();
    }

}
