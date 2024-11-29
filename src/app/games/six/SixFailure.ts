import { Localized } from 'src/app/utils/LocaleUtils';

export class SixFailure {

    public static readonly CANNOT_DO_DEPLACEMENT_YET: Localized = () => $localize`You cannot move yet. Pick a space where you will put a new piece.`;

    public static readonly MUST_CUT: Localized = () => $localize`Several groups are of the same size, you must pick the one to keep.`;

    public static readonly CANNOT_CHOOSE_TO_KEEP: Localized = () => $localize`You cannot choose which part to keep when one is smaller than the other.`;

    public static readonly CAN_NO_LONGER_DROP: Localized = () => $localize`You cannot put new pieces anymore. Pick a piece to move.`;

    public static readonly MUST_CAPTURE_BIGGEST_GROUPS: Localized = () => $localize`You must choose one of the biggest groups to keep it.`;

    public static readonly CANNOT_KEEP_EMPTY_COORD: Localized = () => $localize`You cannot pick an empty space. Pick one of the biggest groups.`;

    public static readonly MUST_DROP_NEXT_TO_OTHER_PIECE: Localized = () => $localize`You must put this piece next to another piece.`;
}
