import { ArrayUtils, MGPOptional, Utils } from '@everyboard/lib';
import { Player, PlayerOrNone } from '../jscaip/Player';

export abstract class BaseComponent {

    // Make some utilities available in all components
    public ArrayUtils: typeof ArrayUtils = ArrayUtils;

    public MGPOptional: typeof MGPOptional = MGPOptional;

    /**
     * Gets the CSS class for a player color
     */
    public getPlayerClass(player: PlayerOrNone, suffix: string = 'fill'): string {
        switch (player) {
            case Player.ZERO: return 'player0-' + suffix;
            case Player.ONE: return 'player1-' + suffix;
            default:
                Utils.expectToBe(player, PlayerOrNone.NONE);
                return '';
        }
    }

}
