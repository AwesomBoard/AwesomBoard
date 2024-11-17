import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';

/**
 * Terminology:
 *     - surrounding: means capturing with 4 enemies (being border, opponent, or throne)
 *     - sandwiching: means capturing with 2 enemies (being border, opponent, or throne)
 */
export type TaflConfig = RulesConfig & {

    // once the king leave the castle he cannot re-station there
    readonly canReturnInCastle: boolean;
    // an Edge can be counted as participating to a 4-opponent capture
    readonly edgesAreKingsEnnemy: boolean;
    // the king can be captured by only three invaders if he's against a throne
    readonly centralThroneCanSurroundKing: boolean;
    // the king can be captured by two invaders when he doesn't touch a throne
    readonly kingFarFromHomeCanBeSandwiched: boolean;

    readonly invaderStarts: boolean;
}
