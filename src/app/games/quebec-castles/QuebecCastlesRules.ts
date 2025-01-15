import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';

import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { QuebecCastlesDrop, QuebecCastlesMove } from './QuebecCastlesMove';
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
import { MoveCoordToCoord, TMPMoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { DirectionFailure } from 'src/app/jscaip/Direction';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Localized } from 'src/app/utils/LocaleUtils';

export class QuebecCastlesFailure {

    public static readonly INVALID_INVADER_DISTANCE: (distance: number) => string = (distance: number) => $localize`Move distance must be 2 for invader, not ${ distance }`;

    public static readonly INVALID_DEFENDER_DISTANCE: (distance: number) => string = (distance: number) => $localize`Move distance must be 1 for defender, not ${ distance }`;

    public static readonly MUST_DROP_IN_YOUR_TERRITORY: Localized = () => $localize`Must drop in your own territory`;

}

export type QuebecCastlesConfig = {

    width: number;

    height: number;

    linesForTerritory: number;

    invader: number;

    defender: number;

    isRhombic: boolean;

    dropKingYourself: boolean;

    dropPieceByPiece: boolean

}

export class QuebecCastlesNode extends GameNode<QuebecCastlesMove, QuebecCastlesState> { }

export class QuebecCastlesRules extends ConfigurableRules<QuebecCastlesMove, QuebecCastlesState, QuebecCastlesConfig> {

    private static singleton: MGPOptional<QuebecCastlesRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<QuebecCastlesConfig> =
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
                            return MGPValidation.failure("TODO LA JAAJ");
                        }
                    }),
                    invader: new NumberConfig<QuebecCastlesConfig>(10, () => $localize`Number of invader`, (value: number, config: QuebecCastlesConfig) => {
                        return QuebecCastlesRules.isThereEnoughPlaceForPiece(Player.ZERO, config, value);
                    }),
                    defender: new NumberConfig(10, () => $localize`Number of defender`, (value: number, config: QuebecCastlesConfig) => {
                        return QuebecCastlesRules.isThereEnoughPlaceForPiece(Player.ONE, config, value);
                    }),
                    isRhombic: new BooleanConfig(true, () => $localize`Is Rhombic`),
                    dropKingYourself: new BooleanConfig(false, () => $localize`Drop King Yourself`),
                    dropPieceByPiece: new BooleanConfig(false, () => $localize`Drop piece by piece`),
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
        const spaceForPiece: number = QuebecCastlesRules.get().getLegalDropCoords(player, config).length;
        // TODO include throne in calculs
        if (spaceForPiece < numberOfPiece) {
            return MGPValidation.failure($localize`Dude, there is not enough place for this, augmente linesForTerritory`);
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
        if (config.dropPieceByPiece === false) {
            state = this.fillBoard(state, config);
        }
        return state;
    }

    private getThrones(config: QuebecCastlesConfig): PlayerMap<MGPOptional<Coord>> {
        if (config.dropKingYourself) {
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
        // let availableLines: number = (1 + lineToFillRange.max) - lineToFillRange.min;
        while (pieceToDrop > 0) {
            const availableSpaceAtLine: Coord[] =
                this.getAvailableSpacesAtLine(lineToFillIndex, state, config); console.log('must still drop at line', lineToFillIndex, 'pieceToDrop=', pieceToDrop, 'availableSpaceAtLine=', availableSpaceAtLine.length)
            if (pieceToDrop < availableSpaceAtLine.length) {
                const availableSpaceEvenness: boolean = availableSpaceAtLine.length % 2 === 0;
                const remainingSpace: number = availableSpaceAtLine.length - pieceToDrop;
                const skipCenter: boolean = availableSpaceEvenness === false && (pieceToDrop % 2 === 0);
                const indexStart: number = Math.floor(remainingSpace / 2);
                console.log('partial drop start at', indexStart)
                let coord: Coord = availableSpaceAtLine[indexStart]; // start on middle part that is on the right
                // non centered
                state = state.setPieceAt(coord, player);
                pieceToDrop--;
                const center: Coord = availableSpaceAtLine[Math.floor(availableSpaceAtLine.length / 2)];
                while (pieceToDrop > 0) {
                    coord = coord.getNext(coordDirection, 1); console.log('dropping', coord.toString())
                    if (skipCenter && coord.equals(center)) {
                        coord = coord.getNext(coordDirection, 1); console.log('dropping', coord.toString())
                    }
                    state = state.setPieceAt(coord, player);
                    pieceToDrop--;
                }
            } else { console.log('drop all', availableSpaceAtLine) // DROP ALL
                for (const coord of availableSpaceAtLine) {
                    state = state.setPieceAt(coord, player);
                }
                pieceToDrop -= availableSpaceAtLine.length;
            }
            lineToFillIndex += lineDirection;
            // availableLines--;
        }
        return state;
    }

    private getAvailableSpacesAtLine(line: number, state: QuebecCastlesState, config: QuebecCastlesConfig): Coord[] {
        let defaultAvailableSpace: number;
        let coord: Coord;
        let direction: Ordinal;
        const coords: Coord[] = [];
        if (config.isRhombic) {
            // TODO: get legal range index here instead of this calculation
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
            } else {
                console.log('JAJU', coord.toString(), line)
            }
            coord = coord.getNext(direction);
            defaultAvailableSpace--;
        }
        return coords;
    }

    public isDropPhase(state: QuebecCastlesState, optionalConfig: MGPOptional<QuebecCastlesConfig>): boolean {
        const config: QuebecCastlesConfig = optionalConfig.get();
        let lastDropTurn: number = 0;
        if (config.dropKingYourself) {
            lastDropTurn += 2;
        }
        if (config.dropPieceByPiece) {
            lastDropTurn += config.defender + config.invader;
        } else {
            lastDropTurn += 2;
        }
        return state.turn <= lastDropTurn;
    }

    public override isLegal(move: QuebecCastlesMove,
                            state: QuebecCastlesState,
                            optionalConfig: MGPOptional<QuebecCastlesConfig>)
    : MGPValidation
    {
        if (this.isDropPhase(state, optionalConfig)) {
            return this.isLegalDrop(move, state, optionalConfig.get());
        } else {
            return this.isLegalNormalMove(move, state);
        }
    }

    public isLegalDrop(move: QuebecCastlesMove, state: QuebecCastlesState, config: QuebecCastlesConfig)
    : MGPValidation
    {
        if (QuebecCastlesMove.isNormalMove(move)) {
            return MGPValidation.failure($localize`This move is a normal move, drop expected`);
        }
        for (const coord of move.coords) {
            const dropLegality: MGPValidation = this.getDropLegality(coord, state, config);
            if (dropLegality.isFailure()) {
                return dropLegality;
            }
        }
        return MGPValidation.SUCCESS;
    }

    private getDropLegality(coord: Coord, state: QuebecCastlesState, config: QuebecCastlesConfig): MGPValidation {
        if (state.isOnBoard(coord) === false) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(coord));
        }
        const landingSquare: PlayerOrNone = state.getPieceAt(coord);
        if (landingSquare.isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
        }
        const player: Player = state.getCurrentPlayer();
        if (state.thrones.get(player).equalsValue(coord)) {
            return MGPValidation.failure('TODO: not on your throne dude!');
        }
        if (this.isLegalDropCoord(coord, player, config)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY());
        }
    }

    public getLegalDropCoords(player: Player, config: QuebecCastlesConfig): Coord[] {
        const drops: Coord[] = [];
        for (let y: number = 0; y < config.height; y++) {
            for (let x: number = 0; x < config.width; x++) {
                const coord: Coord = new Coord(x, y);
                if (this.isLegalDropCoord(coord, player, config)) {
                    drops.push(coord);
                }
            }
        }
        return drops;
    }

    public isLegalDropCoord(coord: Coord, player: Player, config: QuebecCastlesConfig): boolean {
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
            return MGPValidation.failure($localize`This move is a drop, normal move expected`);
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
        return MGPValidation.SUCCESS;
    }

    private getMiddleValidity(state: QuebecCastlesState, move: MoveCoordToCoord): MGPValidation {
        const direction: MGPFallible<Ordinal> = move.getDirection();
        if (direction.isFailure()) {
            return MGPValidation.failure(DirectionFailure.DIRECTION_MUST_BE_LINEAR());
        }
        const distance: number = move.getDistance();
        if (state.getCurrentPlayer() === Player.ZERO) {
            if (distance !== 2) {
                return MGPValidation.failure(QuebecCastlesFailure.INVALID_INVADER_DISTANCE(distance));
            }
            const middle: Coord[] = move.getJumpedOverCoords();
            const middlePiece: PlayerOrNone = state.getPieceAt(middle[0]);
            if (middlePiece !== PlayerOrNone.NONE) {
                return MGPValidation.failure(RulesFailure.SOMETHING_IN_THE_WAY());
            }
        } else {
            if (distance !== 1) {
                return MGPValidation.failure(QuebecCastlesFailure.INVALID_DEFENDER_DISTANCE(distance));
            }
        }
        return MGPValidation.SUCCESS;
    }

    public override applyLegalMove(move: QuebecCastlesMove,
                                   state: QuebecCastlesState,
                                   config: MGPOptional<QuebecCastlesConfig>)
    : QuebecCastlesState
    {
        if (this.isDropPhase(state, config)) {
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
        if (config.dropKingYourself && state.turn < 2) {
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
            stepSize = 2;
        } else {
            stepSize = 1;
        }
        for (const direction of Ordinal.ORDINALS) {
            const step: Coord = coord.getNext(direction);
            if (state.isOnBoard(step)) {
                if (stepSize === 1) {
                    if (state.getPieceAt(step) !== owner) {
                        moves.push(TMPMoveCoordToCoord.of(coord, step));
                    }
                } else {
                    if (state.getPieceAt(step) === PlayerOrNone.NONE) {
                        const landing: Coord = coord.getNext(direction, 2);
                        if (state.isOnBoard(landing) && state.getPieceAt(landing) !== owner) {
                            moves.push(TMPMoveCoordToCoord.of(coord, landing));
                        }
                    }
                }
            }
        }
        return moves;
    }

}
