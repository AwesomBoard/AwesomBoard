import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';

import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { QuebecCastlesDrop, QuebecCastlesMove, QuebecCastlesTranslation } from './QuebecCastlesMove';
import { QuebecCastlesState } from './QuebecCastlesState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { BooleanConfig, NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { DirectionFailure } from 'src/app/jscaip/Direction';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Localized } from 'src/app/utils/LocaleUtils';

export class QuebecCastlesFailure {

    public static readonly INVALID_INVADER_DISTANCE: (distance: number) => string = (distance: number) => $localize`Move distance must be 2 for invader, not ${ distance }`;

    public static readonly INVALID_DEFENDER_DISTANCE: (distance: number) => string = (distance: number) => $localize`Move distance must be 1 for defender, not ${ distance }`;

    public static readonly MUST_DROP_IN_YOUR_TERRITORY: Localized = () => $localize`Must drop in your own territory`;

    public static readonly CANNOT_DROP_IN_MOVE_PHASE: Localized = () => $localize`Cannot drop in move phase`;

    public static readonly CANNOT_MOVE_IN_DROP_PHASE: Localized = () => $localize`Cannot drop in move phase`;

    public static readonly MUST_DROP_ALL_YOUR_PIECES: Localized = () => $localize`Must drop all your pieces`;

    public static readonly MUST_DROP_ALL_YOUR_REMAINING_PIECES: Localized = () => $localize`Must drop all your remaining pieces, not more not less`;

    public static readonly CANNOT_DROP_THAT_MUCH: Localized = () => $localize`Cannot drop that much pieces`;

    public static readonly MUST_DROP_ONE_BY_ONE: Localized = () => $localize`Must drop pieces one by one`;

    public static readonly CANNOT_LAND_IN_YOUR_TRONE: Localized = () => $localize`You cannot land on your trone`;

    public static readonly PLACE_ONLY_ONE_TRONE: Localized = () => $localize`You must only place your trone`;

    public static readonly CANNOT_PUT_THAT_MUCH_PIECE_IN_THERE: (max: number, line: number) => string = (max: number, line: number) => $localize`If you have ${ line } line, you can only have ${ max } pieces`;

    public static readonly TOO_MUCH_LINES_FOR_TERRITORY: Localized = () => $localize`Too much lines for territory, your opponent lines would merged with yours!`;
}
// TODO show captures
// TODO show score
// TODO meilleur trone en cas de victoire
export type QuebecCastlesConfig = {

    width: number;

    height: number;

    linesForTerritory: number;

    invader: number;

    defender: number;

    isRhombic: boolean;

    placeThroneYourself: boolean;

    dropPieceByPiece: boolean;

    dropPieceYourself: boolean

}

export class QuebecCastlesNode extends GameNode<QuebecCastlesMove, QuebecCastlesState> { }

export class QuebecCastlesRules extends ConfigurableRules<QuebecCastlesMove, QuebecCastlesState, QuebecCastlesConfig> {

    private static singleton: MGPOptional<QuebecCastlesRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription <QuebecCastlesConfig> =
        new RulesConfigDescription<QuebecCastlesConfig>(
            {
                name: (): string => $localize`Quebec Castles`,
                config: {
                    width: new NumberConfig(9, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(4, 20)),
                    height: new NumberConfig(9, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(4, 20)),
                    linesForTerritory: new NumberConfig(4, () => $localize`Lines for territory`, (value: number, config: QuebecCastlesConfig) => {
                        let height: number;
                        if (config.isRhombic) {
                            height = config.width + config.height - 2;
                        } else {
                            height = config.height;
                        }
                        if (value < (height / 2)) {
                            return MGPValidation.SUCCESS;
                        } else {
                            return MGPValidation.failure(QuebecCastlesFailure.TOO_MUCH_LINES_FOR_TERRITORY());
                        }
                    }),
                    invader: new NumberConfig<QuebecCastlesConfig>(14, () => $localize`Number of invader`, (value: number, config: QuebecCastlesConfig) => {
                        return QuebecCastlesRules.isThereEnoughPlaceForPiece(Player.ZERO, config, value);
                    }),
                    defender: new NumberConfig(9, () => $localize`Number of defender`, (value: number, config: QuebecCastlesConfig) => {
                        return QuebecCastlesRules.isThereEnoughPlaceForPiece(Player.ONE, config, value);
                    }),
                    isRhombic: new BooleanConfig(true, () => $localize`Is Rhombic`),
                    placeThroneYourself: new BooleanConfig(false, () => $localize`Place throne yourself`),
                    dropPieceByPiece: new BooleanConfig(false, () => $localize`Drop piece by piece`),
                    dropPieceYourself: new BooleanConfig(false, () => $localize`Drop piece yourself`),
                },
            },
            [
                // {
                //     name: (): string => $localize`Deadly Abalone`,
                //     config: {
                //         width: 10,
                //         height: 10,
                //     },
                // },
            ],
        );

    public static get(): QuebecCastlesRules {
        if (QuebecCastlesRules.singleton.isAbsent()) {
            QuebecCastlesRules.singleton = MGPOptional.of(new QuebecCastlesRules());
        }
        return QuebecCastlesRules.singleton.get();
    }

    public static isThereEnoughPlaceForPiece(player: Player, config: QuebecCastlesConfig, numberOfPiece: number)
    : MGPValidation
    {
        // Got to substract 1 as the trone is not included
        const spaceForPiece: number = QuebecCastlesRules.get().getValidDropCoords(player, config).length - 1;
        if (spaceForPiece < numberOfPiece) {
            const line: number = config.linesForTerritory;
            return MGPValidation.failure(QuebecCastlesFailure.CANNOT_PUT_THAT_MUCH_PIECE_IN_THERE(spaceForPiece, line));
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<QuebecCastlesConfig>> {
        return MGPOptional.of(QuebecCastlesRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(optionalConfig: MGPOptional<QuebecCastlesConfig>): QuebecCastlesState {
        const config: QuebecCastlesConfig = optionalConfig.get();
        const thrones: PlayerMap<MGPOptional<Coord>> = this.getThrones(config);
        const board: Table<PlayerOrNone> = TableUtils.create(config.width, config.height, PlayerOrNone.NONE);
        let state: QuebecCastlesState = new QuebecCastlesState(board, 0, thrones);
        if (config.dropPieceYourself === false) {
            state = this.fillBoard(state, config);
        }
        return state;
    }

    private getThrones(config: QuebecCastlesConfig): PlayerMap<MGPOptional<Coord>> {
        if (config.placeThroneYourself) {
            const empty: MGPOptional<Coord> = MGPOptional.empty();
            return PlayerMap.ofValues(empty, empty);
        } else {
            const upperLeft: MGPOptional<Coord> = MGPOptional.of(new Coord(0, 0));
            const bottomRight: MGPOptional<Coord> = MGPOptional.of(new Coord(config.width - 1, config.height - 1));
            return PlayerMap.ofValues(bottomRight, upperLeft);
        }
    }

    private fillBoard(state: QuebecCastlesState, config: QuebecCastlesConfig): QuebecCastlesState {
        state = this.fillBoardFor(Player.ONE, state, config);
        state = this.fillBoardFor(Player.ZERO, state, config);
        return state;
    }

    private fillBoardFor(player: Player, state: QuebecCastlesState, config: QuebecCastlesConfig): QuebecCastlesState {
        let pieceToDrop: number = player === Player.ZERO ? config.defender : config.invader;
        const lineToFillRange: { min: number, max: number } = this.getLegalRangeIndex(player, config);
        let lineDirection: number;
        const coordDirection: Ordinal = config.isRhombic ? Ordinal.UP_RIGHT : Ordinal.RIGHT;
        let lineToFillIndex: number;
        if (player === Player.ZERO) {
            lineDirection = -1;
            lineToFillIndex = lineToFillRange.max;
        } else {
            lineDirection = 1;
            lineToFillIndex = lineToFillRange.min;
        }
        while (pieceToDrop > 0) {
            const availableSpaceAtLine: Coord[] =
                this.getAvailableSpacesAtLine(lineToFillIndex, state, config);
            if (pieceToDrop < availableSpaceAtLine.length) {
                const availableSpaceEvenness: boolean = availableSpaceAtLine.length % 2 === 0;
                const remainingSpace: number = availableSpaceAtLine.length - pieceToDrop;
                const skipCenter: boolean = availableSpaceEvenness === false && (pieceToDrop % 2 === 0);
                const indexStart: number = Math.floor(remainingSpace / 2);
                let coord: Coord = availableSpaceAtLine[indexStart]; // start on middle part that is on the right
                // non centered
                state = state.setPieceAt(coord, player);
                pieceToDrop--;
                const center: Coord = availableSpaceAtLine[Math.floor(availableSpaceAtLine.length / 2)];
                while (pieceToDrop > 0) {
                    coord = coord.getNext(coordDirection, 1);
                    if (skipCenter && coord.equals(center)) {
                        coord = coord.getNext(coordDirection, 1);
                    }
                    state = state.setPieceAt(coord, player);
                    pieceToDrop--;
                }
            } else {
                for (const coord of availableSpaceAtLine) {
                    state = state.setPieceAt(coord, player);
                }
                pieceToDrop -= availableSpaceAtLine.length;
            }
            lineToFillIndex += lineDirection;
        }
        return state;
    }

    private getAvailableSpacesAtLine(line: number, state: QuebecCastlesState, config: QuebecCastlesConfig): Coord[] {
        let defaultAvailableSpace: number;
        let coord: Coord;
        let direction: Ordinal;
        const coords: Coord[] = [];
        if (config.isRhombic) {
            const xMax: number = config.width - 1;
            const yMax: number = config.height - 1;
            const max: number = xMax + yMax;
            defaultAvailableSpace = Math.min(line + 1, max + 1 - line);
            const xInitial: number = Math.max(line - yMax, 0);
            const yInitial: number = Math.min(line, yMax);
            coord = new Coord(xInitial, yInitial);
            direction = Ordinal.UP_RIGHT;
        } else {
            defaultAvailableSpace = config.width;
            coord = new Coord(0, line);
            direction = Ordinal.RIGHT;
        }
        while (defaultAvailableSpace > 0) {
            if (state.isThroneAt(coord) === false) {
                coords.push(coord);
            }
            coord = coord.getNext(direction);
            defaultAvailableSpace--;
        }
        return coords;
    }

    public isDropPhase(state: QuebecCastlesState, config: QuebecCastlesConfig): boolean {
        let lastDropTurn: number = 0;
        if (config.placeThroneYourself) {
            lastDropTurn += 2;
        }
        if (config.dropPieceYourself) {
            if (config.dropPieceByPiece) {
                lastDropTurn += config.defender + config.invader;
            } else {
                lastDropTurn += 2;
            }
        }
        return state.turn < lastDropTurn;
    }

    public override isLegal(move: QuebecCastlesMove,
                            state: QuebecCastlesState,
                            optionalConfig: MGPOptional<QuebecCastlesConfig>)
    : MGPValidation
    {
        const config: QuebecCastlesConfig = optionalConfig.get();
        if (this.isDropPhase(state, config)) {
            return this.isLegalDrop(move, state, config);
        } else {
            return this.isLegalNormalMove(move, state);
        }
    }

    public isLegalDrop(move: QuebecCastlesMove, state: QuebecCastlesState, config: QuebecCastlesConfig)
    : MGPValidation
    {
        if (QuebecCastlesMove.isTranslation(move)) {
            return MGPValidation.failure(QuebecCastlesFailure.CANNOT_MOVE_IN_DROP_PHASE());
        }
        if (state.turn <= 2 && config.placeThroneYourself ) {
            return this.isLegalTronePlacement(move, state, config);
        } else {
            return this.isLegalPieceDrop(move, state, config);
        }
    }

    private isLegalTronePlacement(move: QuebecCastlesDrop, state: QuebecCastlesState, config: QuebecCastlesConfig)
    : MGPValidation
    {
        if (move.coords.size() === 1) {
            return this.getDropLegality(move.coords.getAnyElement().get(), state, config, false);
        } else {
            return MGPValidation.failure(QuebecCastlesFailure.PLACE_ONLY_ONE_TRONE());
        }
    }

    private isLegalPieceDrop(move: QuebecCastlesDrop, state: QuebecCastlesState, config: QuebecCastlesConfig)
    : MGPValidation {
        if (config.dropPieceYourself) {
            if (config.dropPieceByPiece) { // TODO: unify with enumConfig
                if (this.isLastDrop(state, config)) {
                    const player: Player = state.getCurrentPlayer();
                    const playerCount: number = state.count(player);
                    const playerTotal: number = player === Player.ZERO ? config.defender : config.invader;
                    const remainToDrop: number = playerTotal - playerCount;
                    if (move.coords.size() !== remainToDrop) {
                        return MGPFallible.failure(QuebecCastlesFailure.MUST_DROP_ALL_YOUR_REMAINING_PIECES());
                    }
                } else {
                    if (move.coords.size() > 1) {
                        return MGPFallible.failure(QuebecCastlesFailure.MUST_DROP_ONE_BY_ONE());
                    }
                }
            } else {
                const numberToDrop: number =
                    state.getCurrentPlayer() === Player.ZERO ? config.defender : config.invader;
                if (move.coords.size() > numberToDrop) {
                    return MGPFallible.failure(QuebecCastlesFailure.CANNOT_DROP_THAT_MUCH());
                }
                if (move.coords.size() < numberToDrop) {
                    return MGPFallible.failure(QuebecCastlesFailure.MUST_DROP_ALL_YOUR_PIECES());
                }
            }
        }
        for (const coord of move.coords) {
            const dropLegality: MGPValidation = this.getDropLegality(coord, state, config, false);
            if (dropLegality.isFailure()) {
                return dropLegality;
            }
        }
        return MGPValidation.SUCCESS;
    }

    private isLastDrop(state: QuebecCastlesState, config: QuebecCastlesConfig): boolean {
        const opponent: Player = state.getCurrentOpponent();
        const opponentCount: number = state.count(opponent);
        const opponentTotal: number = opponent === Player.ZERO ? config.defender : config.invader;
        return opponentCount === opponentTotal; // If opponent dropped all its pieces (one by one)
        // Then you must now dropped them all at once
    }

    private getDropLegality(coord: Coord, state: QuebecCastlesState, config: QuebecCastlesConfig, isTrone: boolean)
    : MGPValidation
    {
        if (state.isOnBoard(coord) === false) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(coord));
        }
        const landingSquare: PlayerOrNone = state.getPieceAt(coord);
        if (landingSquare.isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
        }
        const player: Player = state.getCurrentPlayer();
        if (state.thrones.get(player).equalsValue(coord) && isTrone === false) {
            return MGPValidation.failure(QuebecCastlesFailure.CANNOT_LAND_IN_YOUR_TRONE());
        }
        if (this.isValidDropCoord(coord, player, config)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY());
        }
    }

    public getValidDropCoords(player: Player, config: QuebecCastlesConfig): Coord[] {
        const drops: Coord[] = [];
        for (let y: number = 0; y < config.height; y++) {
            for (let x: number = 0; x < config.width; x++) {
                const coord: Coord = new Coord(x, y);
                if (this.isValidDropCoord(coord, player, config)) {
                    drops.push(coord);
                }
            }
        }
        return drops;
    }

    private isValidDropCoord(coord: Coord, player: Player, config: QuebecCastlesConfig): boolean {
        const y: number = coord.y;
        let metric: number = 0;
        if (config.isRhombic) {
            const x: number = coord.x;
            metric = x + y;
        } else {
            metric = y;
        }
        const minMax: { min: number, max: number } = this.getLegalRangeIndex(player, config);
        return minMax.min <= metric && metric <= minMax.max;
    }

    public getLegalRangeIndex(player: Player, config: QuebecCastlesConfig): { min: number, max: number } {
        const yMax: number = config.height - 1;
        if (config.isRhombic) {
            const xMax: number = config.width - 1;
            const max: number = xMax + yMax;
            return this.getLegalRangeFromMaximum(player, config, max);
        } else {
            return this.getLegalRangeFromMaximum(player, config, yMax);
        }
    }

    private getLegalRangeFromMaximum(player: Player, config: QuebecCastlesConfig, max: number)
    : { min: number, max: number }
    {
        return {
            min: player === Player.ZERO ? max - config.linesForTerritory : 0,
            max: player === Player.ZERO ? max : config.linesForTerritory,
        };
    }

    public isLegalNormalMove(move: QuebecCastlesMove, state: QuebecCastlesState)
    : MGPValidation
    {
        if (QuebecCastlesMove.isDrop(move)) {
            return MGPValidation.failure(QuebecCastlesFailure.CANNOT_DROP_IN_MOVE_PHASE());
        }
        const startValidity: MGPValidation = this.getStartValidity(state, move.getStart());
        if (startValidity.isFailure()) {
            return startValidity;
        }
        const endValidity: MGPValidation = this.getLandingValidity(state, move.getEnd());
        if (endValidity.isFailure()) {
            return endValidity;
        }
        const middleValidity: MGPValidation = this.getMiddleValidity(state, move);
        if (middleValidity.isFailure()) {
            return middleValidity;
        }
        return MGPValidation.SUCCESS;
    }

    private getStartValidity(state: QuebecCastlesState, start: Coord): MGPValidation {
        if (state.isOnBoard(start) === false) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(start));
        }
        const startPiece: PlayerOrNone = state.getPieceAt(start);
        if (startPiece.isNone()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (startPiece === state.getCurrentOpponent()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        return MGPValidation.SUCCESS;
    }

    private getLandingValidity(state: QuebecCastlesState, landing: Coord): MGPValidation {
        if (state.isOnBoard(landing) === false) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(landing));
        }
        const landingSquare: PlayerOrNone = state.getPieceAt(landing);
        const currentPlayer: Player = state.getCurrentPlayer();
        if (landingSquare.isPlayer() && landingSquare.equals(currentPlayer)) {
            return MGPValidation.failure(RulesFailure.CANNOT_SELF_CAPTURE());
        }
        const playerThrone: Coord = state.thrones.get(currentPlayer).get();
        if (landing.equals(playerThrone)) {
            return MGPValidation.failure(QuebecCastlesFailure.CANNOT_LAND_IN_YOUR_TRONE());
        }
        return MGPValidation.SUCCESS;
    }

    private getMiddleValidity(state: QuebecCastlesState, move: MoveCoordToCoord): MGPValidation {
        const direction: MGPFallible<Ordinal> = move.getDirection();
        if (direction.isFailure()) {
            return MGPValidation.failure(DirectionFailure.DIRECTION_MUST_BE_LINEAR());
        }
        const distance: number = move.getDistance();
        if (state.getCurrentPlayer() === Player.ZERO) {
            if (distance !== 1) {
                return MGPValidation.failure(QuebecCastlesFailure.INVALID_DEFENDER_DISTANCE(distance));
            }
        } else {
            if (distance !== 2) {
                return MGPValidation.failure(QuebecCastlesFailure.INVALID_INVADER_DISTANCE(distance));
            }
            const middle: Coord[] = move.getJumpedOverCoords();
            const middlePiece: PlayerOrNone = state.getPieceAt(middle[0]);
            if (middlePiece !== PlayerOrNone.NONE) {
                return MGPValidation.failure(RulesFailure.SOMETHING_IN_THE_WAY());
            }
        }
        return MGPValidation.SUCCESS;
    }

    public override applyLegalMove(move: QuebecCastlesMove,
                                   state: QuebecCastlesState,
                                   config: MGPOptional<QuebecCastlesConfig>)
    : QuebecCastlesState
    {
        if (this.isDropPhase(state, config.get())) {
            return this.applyLegalDrop(move as QuebecCastlesDrop, state, config);
        } else {
            return this.applyLegalNormalMove(move as MoveCoordToCoord, state);
        }
    }

    private applyLegalDrop(move: QuebecCastlesDrop,
                           state: QuebecCastlesState,
                           optionalConfig: MGPOptional<QuebecCastlesConfig>)
    : QuebecCastlesState
    {
        const config: QuebecCastlesConfig = optionalConfig.get();
        const currentPlayer: Player = state.getCurrentPlayer();
        if (config.placeThroneYourself && state.turn < 2) {
            const thrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(
                state.thrones.get(Player.ZERO),
                state.thrones.get(Player.ONE),
            );
            // TODO: then expect exactly one drop
            const throneCoord: Coord = move.coords.getAnyElement().get();
            thrones.put(currentPlayer, MGPOptional.of(throneCoord));
            return new QuebecCastlesState(state.board, state.turn + 1, thrones);
        } else {
            let resultingState: QuebecCastlesState = state;
            for (const drop of move.coords) {
                resultingState = resultingState.setPieceAt(drop, currentPlayer);
            }
            return resultingState.incrementTurn();
        }
    }

    private applyLegalNormalMove(move: MoveCoordToCoord, state: QuebecCastlesState): QuebecCastlesState {
        const currentPlayer: Player = state.getCurrentPlayer();
        return state
            .setPieceAt(move.getStart(), PlayerOrNone.NONE)
            .setPieceAt(move.getEnd(), currentPlayer)
            .incrementTurn();
    }

    public override getGameStatus(node: QuebecCastlesNode, _config: MGPOptional<QuebecCastlesConfig>): GameStatus {
        const state: QuebecCastlesState = node.gameState;
        const defender: MGPOptional<Coord> = state.thrones.get(Player.ONE);
        if (defender.isPresent() && state.getPieceAt(defender.get()).equals(PlayerOrNone.ZERO)) {
            return GameStatus.ZERO_WON; // Invader victory
        }
        const invader: MGPOptional<Coord> = state.thrones.get(Player.ZERO);
        if (invader.isPresent() && state.getPieceAt(invader.get()).equals(PlayerOrNone.ONE)) {
            return GameStatus.ONE_WON; // Defender weird victory that I might want to rule out ? TODO
        }
        return GameStatus.ONGOING;
    }

    public getPossibleMoveFor(coord: Coord, state: QuebecCastlesState): QuebecCastlesMove[] {
        const owner: Player = state.getPieceAt(coord) as Player;
        let stepSize: number;
        const moves: QuebecCastlesMove[] = [];
        if (owner === Player.ZERO) {
            stepSize = 1;
        } else {
            stepSize = 2;
        }
        for (const direction of Ordinal.ORDINALS) {
            const step: Coord = coord.getNext(direction);
            if (state.isOnBoard(step)) {
                if (stepSize === 1) {
                    if (this.getLandingValidity(state, step).isSuccess()) {
                        moves.push(QuebecCastlesTranslation.of(coord, step));
                    }
                } else {
                    if (state.getPieceAt(step) === PlayerOrNone.NONE) {
                        const landing: Coord = coord.getNext(direction, 2);
                        if (this.getLandingValidity(state, landing).isSuccess()) {
                            moves.push(QuebecCastlesTranslation.of(coord, landing));
                        }
                    }
                }
            }
        }
        return moves;
    }

}
