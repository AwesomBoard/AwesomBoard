import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { ConfigurableRules } from '../../jscaip/Rules';
import { Coord } from '../../jscaip/Coord';
import { TaflMove } from './TaflMove';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { TaflPawn } from './TaflPawn';
import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';
import { RelativePlayer } from 'src/app/jscaip/RelativePlayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { TaflFailure } from './TaflFailure';
import { TaflConfig } from './TaflConfig';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { TaflState } from './TaflState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { Debug } from 'src/app/utils/Debug';
import { Localized } from 'src/app/utils/LocaleUtils';

export class TaflNode<M extends TaflMove> extends GameNode<M, TaflState> {}

export abstract class TaflRules<M extends TaflMove> extends ConfigurableRules<M, TaflState, TaflConfig> {

    public static readonly CAN_RETURN_IN_CASTLE: Localized = () => $localize`Central throne is left for good`;
    public static readonly EDGE_ARE_KING_S_ENNEMY: Localized = () => $localize`Edges are king's ennemy`;
    public static readonly CENTRAL_THRONE_CAN_SURROUND_KING: Localized = () => $localize`Central throne can surround king`;
    public static readonly KING_FAR_FROM_HOME_CAN_BE_SANDWICHED: Localized = () => $localize`King far from home can be sandwiched`;
    public static readonly INVADER_STARTS: Localized = () => $localize`Invader starts`;

    protected constructor(public generateMove: (start: Coord, end: Coord) => MGPFallible<M>)
    {
        super();
    }

    public override isLegal(move: TaflMove, state: TaflState, optionalConfig: MGPOptional<TaflConfig>)
    : MGPValidation
    {
        const config: TaflConfig = optionalConfig.get();
        const player: Player = state.getCurrentPlayer();
        const validity: MGPValidation = this.getMoveValidity(player, move, state, config);
        if (validity.isFailure()) {
            return MGPValidation.failure(validity.getReason());
        }
        return MGPValidation.SUCCESS;
    }

    private getMoveValidity(player: Player, move: TaflMove, state: TaflState, config: TaflConfig): MGPValidation {
        const owner: RelativePlayer = state.getRelativeOwner(player, move.getStart());
        if (owner === RelativePlayer.NONE) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (owner === RelativePlayer.OPPONENT) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        const landingCoordOwner: RelativePlayer = state.getRelativeOwner(player, move.getEnd());
        if (landingCoordOwner !== RelativePlayer.NONE) {
            return MGPValidation.failure(TaflFailure.LANDING_ON_OCCUPIED_SQUARE());
        }
        if (this.isThrone(state, move.getEnd())) {
            if (state.getPieceAt(move.getStart()).isKing()) {
                if (state.isCentralThrone(move.getEnd()) && config.canReturnToCastle === false) {
                    return MGPValidation.failure(TaflFailure.THRONE_IS_LEFT_FOR_GOOD());
                }
            } else {
                return MGPValidation.failure(TaflFailure.SOLDIERS_CANNOT_SIT_ON_THRONE());
            }
        }
        const dir: Ordinal = move.getStart().getDirectionToward(move.getEnd()).get();
        const dist: number = move.getStart().getOrthogonalDistance(move.getEnd());
        let inspectedCoord: Coord = move.getStart().getNext(dir);
        for (let i: number = 1; i < dist; i++) {
            if (state.getPieceAt(inspectedCoord) !== TaflPawn.UNOCCUPIED) {
                return MGPValidation.failure(RulesFailure.SOMETHING_IN_THE_WAY());
            }
            inspectedCoord = inspectedCoord.getNext(dir);
        }
        return MGPValidation.SUCCESS;
    }

    public isThrone(state: TaflState, coord: Coord): boolean {
        if (state.isExternalThrone(coord)) {
            return true;
        } else {
            return state.isCentralThrone(coord);
        }
    }

    public tryCapture(player: Player, landingPawn: Coord, d: Orthogonal, state: TaflState, config: TaflConfig)
    : MGPOptional<Coord>
    {
        /* landingPawn is the piece that just moved
         * d the direction in witch we look for capture
         * return the captured coord, or null if no capture possible
         * 1. the threatened square doesn't exist      -> no capture
         * 2: the threatened square is not an opponent -> no capture
         * 3: the threatened square is a king          -> delegate calculation
         * 4: the threatened square is a piece         -> delegate calculation
         */
        const threatened: Coord = landingPawn.getNext(d);
        if (state.isNotOnBoard(threatened)) {
            return MGPOptional.empty(); // 1: the threatened square dont exist, no capture
        }
        const threatenedPawnOwner: RelativePlayer = state.getRelativeOwner(player, threatened);
        if (threatenedPawnOwner !== RelativePlayer.OPPONENT) {
            return MGPOptional.empty(); // 2: the threatened square is not an opponent
        }
        if (state.getPieceAt(threatened).isKing()) {
            return this.captureKing(player, landingPawn, d, state, config);
        }
        return this.capturePawn(player, landingPawn, d, state);
    }

    private captureKing(player: Player, landingPiece: Coord, d: Orthogonal, state: TaflState, config: TaflConfig)
    : MGPOptional<Coord>
    {
        const kingCoord: Coord = landingPiece.getNext(d);

        const {
            backCoord, back, backInRange,
            left, leftCoord,
            right, rightCoord,
        } = this.getSurroundings(kingCoord, d, player, state);

        if (backInRange === false) {
            return this.captureKingAgainstTheWall(left, right, kingCoord, config);
        }
        if (back === RelativePlayer.NONE && this.isThrone(state, backCoord)) {
            return this.captureKingAgainstThrone(state, backCoord, kingCoord, left, right, config);
        }
        if (back === RelativePlayer.PLAYER) {
            return this.captureKingWithAtLeastASandwich(state, kingCoord, left, leftCoord, right, rightCoord, config);
        }
        return MGPOptional.empty();
    }

    public getSurroundings(c: Coord, d: Orthogonal, player: Player, state: TaflState)
    : { backCoord: Coord, back: RelativePlayer, backInRange: boolean,
        leftCoord: Coord, left: RelativePlayer,
        rightCoord: Coord, right: RelativePlayer }
    {
        // the piece that just moved came from the front direction (by definition)
        const backCoord: Coord = c.getNext(d);
        const backInRange: boolean = state.isOnBoard(backCoord);
        const back: RelativePlayer = backInRange ?
            state.getRelativeOwner(player, backCoord) :
            RelativePlayer.NONE;

        const leftCoord: Coord = c.getLeft(d);
        const leftInRange: boolean = state.isOnBoard(leftCoord);
        const left: RelativePlayer = leftInRange ?
            state.getRelativeOwner(player, leftCoord) :
            RelativePlayer.NONE;

        const rightCoord: Coord = c.getRight(d);
        const rightInRange: boolean = state.isOnBoard(rightCoord);
        const right: RelativePlayer = rightInRange ?
            state.getRelativeOwner(player, rightCoord) :
            RelativePlayer.NONE;
        return {
            backCoord, back, backInRange,
            leftCoord, left,
            rightCoord, right,
        };
    }

    private captureKingAgainstTheWall(left: RelativePlayer,
                                      right: RelativePlayer,
                                      kingCoord: Coord,
                                      config: TaflConfig)
    : MGPOptional<Coord>
    {
        let nbInvaders: number = (left === RelativePlayer.PLAYER ? 1 : 0);
        nbInvaders += (right === RelativePlayer.PLAYER ? 1 : 0);
        if (nbInvaders === 2 && config.edgesAreKingsEnnemy) { // 2
            // king captured by 3 invaders against 1 border
            return MGPOptional.of(kingCoord);
        }
        // those were the only two way to capture against the border
        return MGPOptional.empty();
    }

    private captureKingAgainstThrone(state: TaflState,
                                     backCoord: Coord,
                                     kingCoord: Coord,
                                     left: RelativePlayer,
                                     right: RelativePlayer,
                                     config: TaflConfig)
    : MGPOptional<Coord>
    {
        if (state.isExternalThrone(backCoord) === true) {
            if (config.kingFarFromHomeCanBeSandwiched) {
                return MGPOptional.of(kingCoord);
            }
        } else { // Central throne
            const kingHasOpponentOnItsLeft: boolean = left === RelativePlayer.PLAYER;
            const kingHasOpponentOnItsRight: boolean = right === RelativePlayer.PLAYER;
            const kingHasThreeOpponentAround: boolean = kingHasOpponentOnItsLeft || kingHasOpponentOnItsRight;
            if (config.centralThroneCanSurroundKing && kingHasThreeOpponentAround) {
                return MGPOptional.of(kingCoord);
            }
        }
        return MGPOptional.empty();
    }

    private capturePawn(player: Player, coord: Coord, direction: Orthogonal, state: TaflState): MGPOptional<Coord> {
        /**
         * the captured piece is on the next coord after 'coord' (in direction 'direction')
         * coord partipate in the capture
         *
         * So these are the different capture ways :
         * - 2 opponents
         * - 1 opponents 1 empty-throne
         */
        const threatenedPieceCoord: Coord = coord.getNext(direction);

        const backCoord: Coord = threatenedPieceCoord.getNext(direction);
        // the piece that just move is always considered in front
        let back: RelativePlayer = RelativePlayer.NONE;
        if (state.isOnBoard(backCoord)) {
            back = state.getRelativeOwner(player, backCoord);
        }
        if (back === RelativePlayer.NONE) {
            if (this.isThrone(state, backCoord) === false) {
                Debug.display('TaflRules', 'capturePawn',
                              'cannot capture a piece without an ally; ' +
                              threatenedPieceCoord + 'threatened by ' + player + `'s piece in ` + coord +
                              ' coming from this direction (' + direction.x + ', ' + direction.y + ')' +
                              'cannot capture a piece without an ally behind');
                return MGPOptional.empty();
            } // here, back is an empty throne
            Debug.display('TaflRules', 'capturePawn',
                          'piece captured by 1 opponent and 1 throne; ' +
                          threatenedPieceCoord + 'threatened by ' + player + `'s piece in ` + coord +
                          ' coming from this direction (' + direction.x + ', ' + direction.y + ')');
            return MGPOptional.of(threatenedPieceCoord); // piece captured by 1 opponent and 1 throne
        }
        if (back === RelativePlayer.PLAYER) {
            Debug.display('TaflRules', 'capturePawn',
                          'piece captured by 2 opponents; ' + threatenedPieceCoord +
                          'threatened by ' + player + `'s piece in ` + coord +
                          ' coming from this direction (' + direction.x + ', ' + direction.y + ')');
            return MGPOptional.of(threatenedPieceCoord); // piece captured by two opponents
        }
        Debug.display('TaflRules', 'capturePawn',
                      'no captures; ' + threatenedPieceCoord + 'threatened by ' + player + `'s piece in ` + coord +
                      ' coming from this direction (' + direction.x + ', ' + direction.y + ')');
        return MGPOptional.empty();
    }

    private captureKingWithAtLeastASandwich(state: TaflState,
                                            kingCoord: Coord,
                                            left: RelativePlayer,
                                            leftCoord: Coord,
                                            right: RelativePlayer,
                                            rightCoord: Coord,
                                            config: TaflConfig)
    : MGPOptional<Coord>
    {
        if (this.kingTouchCentralThrone(state, kingCoord) === false &&
            config.kingFarFromHomeCanBeSandwiched)
        {
            return MGPOptional.of(kingCoord);
        }
        const throneCanSurrond: boolean = config.centralThroneCanSurroundKing;
        const leftIsThrone: boolean = this.isThrone(state, leftCoord);
        const leftCanSurround: boolean = left === RelativePlayer.PLAYER || (leftIsThrone && throneCanSurrond);
        const rightIsThrone: boolean = this.isThrone(state, rightCoord);
        const rightCanSurround: boolean = right === RelativePlayer.PLAYER || (rightIsThrone && throneCanSurrond);
        if (leftCanSurround && rightCanSurround) {
            return MGPOptional.of(kingCoord); // king captured by 4 invaders
        }
        return MGPOptional.empty();
    }

    private kingTouchCentralThrone(state: TaflState, kingCoord: Coord): boolean {
        const centralThrone: Coord = state.getCentralThrone();
        return kingCoord.getOrthogonalDistance(centralThrone) <= 1;
    }

    public override applyLegalMove(move: TaflMove,
                                   state: TaflState,
                                   config: MGPOptional<TaflConfig>,
                                   _info: void): TaflState {
        const turn: number = state.turn;

        const board: TaflPawn[][] = state.getCopiedBoard();
        const player: Player = state.getCurrentPlayer();
        const start: Coord = move.getStart();
        const end: Coord = move.getEnd();
        board[end.y][end.x] = board[start.y][start.x]; // move the piece to the new position
        board[start.y][start.x] = TaflPawn.UNOCCUPIED; // remove it from the previous position
        for (const d of Orthogonal.ORTHOGONALS) {
            const captured: MGPOptional<Coord> = this.tryCapture(player, move.getEnd(), d, state, config.get());
            if (captured.isPresent()) {
                board[captured.get().y][captured.get().x] = TaflPawn.UNOCCUPIED;
            }
        }
        return new TaflState(board, turn + 1);
    }

    public override getGameStatus(node: TaflNode<M>, optionalConfig: MGPOptional<TaflConfig>): GameStatus {
        const state: TaflState = node.gameState;
        const config: TaflConfig = optionalConfig.get();

        const winner: MGPOptional<Player> = this.getWinner(state, config);
        if (winner.isPresent()) {
            return GameStatus.getVictory(winner.get());
        }
        return GameStatus.ONGOING;
    }

    public getWinner(state: TaflState, config: TaflConfig): MGPOptional<Player> {
        const optionalKingCoord: MGPOptional<Coord> = this.getKingCoord(state);
        if (optionalKingCoord.isAbsent()) {
            Debug.display('TaflRules', 'getWinner', 'The king is dead, victory to invader');
            // the king is dead, long live the king
            return MGPOptional.of(this.getInvader(config));
        }
        const kingCoord: Coord = optionalKingCoord.get();
        if (state.isExternalThrone(kingCoord) === true) {
            Debug.display('TaflRules', 'getWinner', 'The king escape, victory to defender');
            // king reached one corner!
            return MGPOptional.of(this.getDefender(config));
        }
        if (this.isPlayerImmobilized(Player.ZERO, state, config)) {
            Debug.display('TaflRules', 'getWinner', 'Zero has no move, victory to one');
            return MGPOptional.of(Player.ONE);
        }
        if (this.isPlayerImmobilized(Player.ONE, state, config)) {
            Debug.display('TaflRules', 'getWinner', 'One has no move, victory to zero');
            return MGPOptional.of(Player.ZERO);
        }
        Debug.display('TaflRules', 'getWinner', 'no victory');
        return MGPOptional.empty();
    }

    public getKingCoord(state: TaflState): MGPOptional<Coord> {
        const size: number = state.getSize();
        for (let y: number = 0; y < size; y++) {
            for (let x: number = 0; x < size; x++) {
                if (state.getPieceAtXY(x, y).isKing()) {
                    return MGPOptional.of(new Coord(x, y));
                }
            }
        }
        return MGPOptional.empty();
    }

    public getInvader(config: TaflConfig): Player {
        return config.invaderStarts ? Player.ZERO : Player.ONE;
    }

    public getDefender(config: TaflConfig): Player {
        return this.getInvader(config).getOpponent();
    }

    public isPlayerImmobilized(player: Player, state: TaflState, config: TaflConfig): boolean {
        return this.getPlayerListMoves(player, state, config).length === 0;
    }

    public getPlayerListMoves(player: Player, state: TaflState, config: TaflConfig): M[] {
        const listMoves: M[] = [];
        const listPawns: Coord[] = this.getPlayerListPawns(player, state);

        for (const piece of listPawns) {
            const pawnDestinations: Coord[] = this.getPossibleDestinations(piece, state, config);
            for (const destination of pawnDestinations) {
                const newMove: M = this.generateMove(piece, destination).get();
                listMoves.push(newMove);
            }
        }
        return listMoves;
    }

    public getPlayerListPawns(player: Player, state: TaflState): Coord[] {
        const size: number = state.getSize();
        const listPawn: Coord[] = [];
        for (let y: number = 0; y < size; y++) {
            for (let x: number = 0; x < size; x++) {
                // for each square
                const piece: Coord = new Coord(x, y);
                const owner: PlayerOrNone = state.getAbsoluteOwner(piece);
                if (owner === player) {
                    listPawn.push(piece);
                }
            }
        }
        return listPawn;
    }

    public getPossibleDestinations(start: Coord, state: TaflState, config: TaflConfig): Coord[] {
        // search the possible destinations for the piece at "start"
        const destinations: Coord[] = [];
        let foundDestination: Coord;
        const pieceIsKing: boolean = state.getPieceAt(start).isKing();
        for (const dir of Orthogonal.ORTHOGONALS) {
            // we look for empty existing destinations in each direction as far as we can
            foundDestination = start.getNext(dir, 1);
            while (state.hasPieceAt(foundDestination, TaflPawn.UNOCCUPIED)) {
                if (state.isExternalThrone(foundDestination)) {
                    if (pieceIsKing) {
                        destinations.push(foundDestination);
                    }
                } else if (state.isCentralThrone(foundDestination)) {
                    if (pieceIsKing && config.canReturnToCastle) {
                        destinations.push(foundDestination);
                    }
                } else {
                    destinations.push(foundDestination);
                }
                foundDestination = foundDestination.getNext(dir, 1);
            }
        }
        return destinations;
    }
}
