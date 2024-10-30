import { ArrayUtils, Utils } from '@everyboard/lib';
import { Player, PlayerOrNone } from '../jscaip/Player';

export abstract class BaseComponent {

    // Make ArrayUtils available in all components
    public ArrayUtils: typeof ArrayUtils = ArrayUtils;

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
