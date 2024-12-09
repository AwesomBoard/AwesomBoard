import { Localized } from 'src/app/utils/LocaleUtils';

export class CheckersTutorialStep {

    public static readonly SIMPLE_STEPS: Localized = () => $localize`A simple step is made by one diagonal move forward left or forward right. Click on the chosen piece, then on its landing square.<br/><br/>You are playing Dark, do the first move.`;

    public static readonly BACKWARD_CAPTURES_TITLE: Localized = () => $localize`Backward captures`;

    public static readonly BACKWARD_CAPTURES: Localized = () => $localize`A capture can also be done backward<br/><br/>You're playing Dark, do a capture backward.`;

    public static readonly CAPTURES: Localized = () => $localize`A capture happens when you jump diagonally over an opponent piece to land right behind it. You have to capture when you can. It is the case here, so click on the piece that must capture, and then on its landing square.<br/><br/>You're playing Dark, do a capture.`;

    public static readonly MULTIPLE_CAPTURES_TITLE: Localized = () => $localize`Multiple captures`;

    public static readonly MULTIPLE_CAPTURES: Localized = () => $localize`If, after the beginning of your capture, the piece that you just moved can capture another piece, it has to capture until it can no longer capture. To do so, you must then click again on the next landing square. Note that, you cannot jump twice over the same square.<br/><br/>You are playing Dark, do a double capture.`;

    public static readonly PROMOTION_TITLE: Localized = () => $localize`Promotion`;

}
