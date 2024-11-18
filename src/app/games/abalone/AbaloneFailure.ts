import { Localized } from 'src/app/utils/LocaleUtils';

export class AbaloneFailure {

    public static readonly CANNOT_MOVE_MORE_THAN_N_PIECES: (n: number) => string = (n: number) => $localize`You cannot move more than ${ n } of your pieces!`;

    public static readonly NOT_ENOUGH_PIECE_TO_PUSH: Localized = () => $localize`You don't have enough pieces to push that group!`;

    public static readonly CANNOT_PUSH_YOUR_OWN_PIECES: Localized = () => $localize`You cannot push this piece because it is blocked by one of yours!`;

    public static readonly MUST_ONLY_TRANSLATE_YOUR_PIECES: Localized = () => $localize`This line contains pieces of your opponent or empty spaces, which is forbidden.`;

    public static readonly TRANSLATION_IMPOSSIBLE: Localized = () => $localize`This move is impossible, some landing spaces are occupied.`;

    public static readonly LINE_AND_COORD_NOT_ALIGNED: Localized = () => $localize`This space is not aligned with the current line.`;
}
