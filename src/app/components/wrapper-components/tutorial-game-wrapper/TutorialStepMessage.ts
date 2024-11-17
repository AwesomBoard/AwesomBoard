import { Localized } from 'src/app/utils/LocaleUtils';

export class TutorialStepMessage {

    public static readonly YOU_DID_NOT_CAPTURE_ANY_PIECE: Localized = () => $localize`Failed, you did not capture any piece.`;

    public static readonly END_OF_THE_GAME: Localized = () => $localize`End of the game`;

    public static readonly CONGRATULATIONS: Localized = () => $localize`Congratulations!`;

    public static readonly CONGRATULATIONS_YOU_WON: Localized = () => $localize`Congratulations, you won!`;

    public static readonly FAILED_TRY_AGAIN: Localized = () => $localize`Failed, try again.`;

    public static readonly OBJECT_OF_THE_GAME: Localized = () => $localize`Object of the game`;

    public static readonly INITIAL_BOARD_AND_OBJECT_OF_THE_GAME: Localized = () => $localize`Initial board and object of the game`;

    public static readonly TRANSLATIONS: Localized = () => $localize`Translations`;

    public static readonly RULES_CONFIGURATION: Localized = () => $localize`Rules configuration`;

}
