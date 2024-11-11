import { MGPOptional } from '@everyboard/lib';
import { AbstractCheckersRules, CheckersConfig, CheckersLocalizable } from '../common/AbstractCheckersRules';
import { BooleanConfig, NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';

export class LascaRules extends AbstractCheckersRules {

    private static singleton: MGPOptional<LascaRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<CheckersConfig> =
        new RulesConfigDescription<CheckersConfig>({
            name: (): string => $localize`Lasca`,
            config: {
                playerRows: new NumberConfig(3,
                                             RulesConfigDescriptionLocalizable.NUMBER_OF_PIECES_ROWS,
                                             MGPValidators.range(1, 99)),
                emptyRows: new NumberConfig(1,
                                            RulesConfigDescriptionLocalizable.NUMBER_OF_EMPTY_ROWS,
                                            MGPValidators.range(1, 99)),
                width: new NumberConfig(7, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(2, 99)),
                canStackPiece:
                    new BooleanConfig(true, CheckersLocalizable.STACK_PIECES),
                mustMakeMaximalCapture:
                    new BooleanConfig(false, CheckersLocalizable.MAXIMAL_CAPTURE),
                simplePieceCanCaptureBackwards:
                    new BooleanConfig(false, CheckersLocalizable.SIMPLE_PIECE_CAN_CAPTURE_BACKWARDS),
                promotedPiecesCanFly:
                    new BooleanConfig(false, CheckersLocalizable.PROMOTED_PIECES_CAN_TRAVEL_LONG_DISTANCES),
                occupyEvenSquare:
                    new BooleanConfig(true, CheckersLocalizable.OCCUPY_EVEN_SQUARE),
                frisianCaptureAllowed:
                    new BooleanConfig(false, CheckersLocalizable.FRISIAN_CAPTURE_ALLOWED),
            },
        });

    public static get(): LascaRules {
        if (LascaRules.singleton.isAbsent()) {
            LascaRules.singleton = MGPOptional.of(new LascaRules());
        }
        return LascaRules.singleton.get();
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<CheckersConfig>> {
        return MGPOptional.of(LascaRules.RULES_CONFIG_DESCRIPTION);
    }

}
