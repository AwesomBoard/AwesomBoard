import { Localized } from 'src/app/utils/LocaleUtils';

export class CheckersFailure {

    public static readonly CANNOT_GO_BACKWARD: Localized = () => $localize`You cannot go backward with normal pieces!`;

    public static readonly CANNOT_SKIP_CAPTURE: Localized = () => $localize`You must capture when it is possible!`;

    public static readonly MUST_FINISH_CAPTURING: Localized = () => $localize`You must finish this capture!`;

    public static readonly THIS_PIECE_CANNOT_MOVE: Localized = () => $localize`This piece cannot move!`;

    public static readonly CAPTURE_STEPS_MUST_BE_DIAGONAL: Localized = () => $localize`A capture should be diagonal. Look at the indicators to help you!`;

    public static readonly CAPTURE_STEPS_MUST_BE_ORDINAL: Localized = () => $localize`A capture should be in straight line. Look at the indicators to help you!`;

    public static readonly INVALID_UNEVEN_FRISIAN_MOVE: Localized = () => $localize`Frisian move cannot be of uneven length!`;

    public static readonly INVALID_FRISIAN_MOVE: Localized = () => $localize`This is an invalid orthogonal move, frisian capture must be at least steps of 4. Look at the indicators to help you!`;

    public static readonly NORMAL_PIECES_CANNOT_MOVE_LIKE_THIS: Localized = () => $localize`Normal pieces cannot move like this!`;

    public static readonly FLYING_CAPTURE_IS_FORBIDDEN_FOR_NORMAL_PIECES: Localized = () => $localize`Flying capture is forbidden for normal pieces!`;

    public static readonly NO_PIECE_CAN_DO_LONG_JUMP: Localized = () => $localize`No piece is allowed to do a long jump`;

    public static readonly CANNOT_DO_ORTHOGONAL_CAPTURE: Localized = () => $localize`You cannot do orthogonal capture!`;

    public static readonly CANNOT_CAPTURE_TWICE_THE_SAME_COORD: Localized = () => $localize`You cannot jump over the same square several times!`;

    public static readonly MUST_DO_LONGEST_CAPTURE: Localized = () => $localize`You must do the longest capture possible!`;

    public static readonly CANNOT_JUMP_OVER_SEVERAL_PIECES: Localized = () => $localize`Cannot jump over several pieces!`;

}
