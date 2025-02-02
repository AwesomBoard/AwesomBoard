import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation, Set, Utils } from '@everyboard/lib';

import { QuebecCastlesConfig, QuebecCastlesRules } from './QuebecCastlesRules';
import { QuebecCastlesDrop, QuebecCastlesMove, QuebecCastlesTranslation } from './QuebecCastlesMove';
import { QuebecCastlesState } from './QuebecCastlesState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { QuebecCastlesMoveGenerator } from './QuebecCastlesMoveGenerator';
import { QuebecCastlesMinimax } from './QuebecCastlesMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';

@Component({
    selector: 'app-quebec-castles',
    templateUrl: './quebec-castles.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class QuebecCastlesComponent extends RectangularGameComponent<QuebecCastlesRules,
                                                                     QuebecCastlesMove,
                                                                     QuebecCastlesState,
                                                                     PlayerOrNone,
                                                                     QuebecCastlesConfig>
{

    // Last Move
    private leftSquare: MGPOptional<Coord> = MGPOptional.empty();
    private landingSquare: MGPOptional<Coord> = MGPOptional.empty();
    private lastDropped: Coord[] = [];

    // Current Move Attempt
    private dropped: Set<Coord> = new Set();
    private selected: MGPOptional<Coord> = MGPOptional.empty();

    // Board
    public constructedState: QuebecCastlesState;
    private missingPieces: PlayerNumberMap;
    public isDroppingGroup: boolean = false;


    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('QuebecCastles');
        this.availableAIs = [
            new QuebecCastlesMinimax(),
            new MCTS($localize`MCTS`, new QuebecCastlesMoveGenerator(), this.rules),
        ];
        this.encoder = QuebecCastlesMove.encoder;
        this.hasAsymmetricBoard = true;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public override getViewBox(): ViewBox {
        let viewBox: ViewBox = super.getViewBox();
        if (this.getConfig().get().isRhombic) {
            const state: QuebecCastlesState = this.constructedState;
            const minSize: number = Math.min(state.getWidth(), state.getHeight());
            const maxSize: number = Math.max(state.getWidth(), state.getHeight());
            const sizeDepassement: number = maxSize - minSize;
            const big: number = Math.sqrt(2);
            const newSize: number = minSize + (sizeDepassement / 2);
            const concreteDepassement: number = newSize * this.SPACE_SIZE * (big - 1) * 0.5;
            const concreteSize: number = newSize * this.SPACE_SIZE * big;
            viewBox = new ViewBox(-concreteDepassement, -concreteDepassement, concreteSize, concreteSize);
        }
        if (this.isDroppingGroup) {
            viewBox = viewBox.expandAll(this.SPACE_SIZE);
        }
        return viewBox;
    }

    private updateMissingPieces(): void {
        const config: QuebecCastlesConfig = this.getConfig().get();
        const nbDefender: number = this.constructedState.count(Player.ZERO);
        const nbInvader: number = this.constructedState.count(Player.ONE);
        this.missingPieces = PlayerNumberMap.of(
            config.defender - nbDefender,
            config.invader - nbInvader,
        );
        // this.isDroppingGroup = this.missingPieces.get(Player.ZERO) > 0 ||
        //                        this.missingPieces.get(Player.ONE) > 0;
        console.log('içi', config, this.constructedState)
        this.isDroppingGroup = this.rules.isDropPhase(this.constructedState, config);
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#square-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const config: QuebecCastlesConfig = this.getConfig().get();
        if (this.rules.isDropPhase(this.constructedState, config)) {
            return this.onDrop(coord, config);
        } else {
            return this.onMove(coord);
        }
    }

    private async onDrop(coord: Coord, config: QuebecCastlesConfig): Promise<MGPValidation> {
        Utils.assert(config.dropPieceYourself, 'enterred "onDrop" on a non-dropping-config');
        if (config.dropPieceByPiece) {
            const chosenMove: QuebecCastlesDrop = QuebecCastlesDrop.from([coord]).get();
            return await this.chooseMove(chosenMove);
        } else {
            const currentPlayer: Player = this.constructedState.getCurrentPlayer();
            if (this.dropped.contains(coord)) {
                this.constructedState = this.constructedState.setPieceAt(coord, PlayerOrNone.NONE);
                this.dropped = this.dropped.removeElement(coord);
            } else {
                if (this.dropped.size() < this.getNumberOfAwaitedDrop()) {
                    this.constructedState = this.constructedState.setPieceAt(coord, currentPlayer);
                    this.dropped = this.dropped.addElement(coord);
                }
            }
            return MGPValidation.SUCCESS;
        }
    }

    private async onMove(coord: Coord): Promise<MGPValidation> {
        if (this.selected.isPresent()) {
            if (this.selected.equalsValue(coord)) {
                this.selected = MGPOptional.empty();
                return MGPValidation.SUCCESS;
            } else {
                return this.chooseMove(QuebecCastlesTranslation.of(this.selected.get(), coord));
            }
        } else {
            const state: QuebecCastlesState = this.constructedState;
            const opponent: Player = state.getCurrentOpponent();
            const clickedPiece: PlayerOrNone = state.getPieceAt(coord);
            if (clickedPiece === opponent) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            } else if (clickedPiece === PlayerOrNone.NONE) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            } else {
                this.selected = MGPOptional.of(coord);
                return MGPValidation.SUCCESS;
            }
        }
    }

    public async validateGroupDrop(): Promise<MGPValidation> { // TODO: hidden if you're not player
        const clickValidity: MGPValidation = await this.canUserPlay('#drop-validator');
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        // TODO ensure in rule unicity of dropped coords
        const move: QuebecCastlesDrop = QuebecCastlesDrop.from(this.dropped.toList()).get();
        return this.chooseMove(move);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: QuebecCastlesState = this.getState();
        this.constructedState = state;
        this.board = state.getCopiedBoard();
        this.updateMissingPieces();
    }

    public override async showLastMove(move: QuebecCastlesMove): Promise<void> {
        if (move instanceof QuebecCastlesTranslation) {
            this.leftSquare = MGPOptional.of(move.getStart());
            this.landingSquare = MGPOptional.of(move.getEnd());
        } else {
            this.lastDropped = move.coords.toList();
        }
    }

    public override hideLastMove(): void {
        this.leftSquare = MGPOptional.empty();
        this.landingSquare = MGPOptional.empty();
        this.lastDropped = [];
    }

    public override cancelMoveAttempt(): void {
        this.dropped = new Set();
        this.selected = MGPOptional.empty();
    }

    public getRectClasses(coord: Coord): string[] {
        const classes: string[] = [];
        if (this.leftSquare.equalsValue(coord) || this.landingSquare.equalsValue(coord)) {
            classes.push('moved-fill');
        }
        if (this.lastDropped.some((c: Coord) => coord.equals(c))) {
            classes.push('moved-fill');
        }
        return classes;
    }

    public getPieceClasses(coord: Coord): string[] {
        const classes: string[] = [
            this.getPlayerClass(this.constructedState.getPieceAt(coord)),
        ];
        if (this.selected.equalsValue(coord) || this.dropped.contains(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public getBoardTransform(): string {
        if (this.getConfig().get().isRhombic) {
            const state: QuebecCastlesState = this.constructedState;
            const cx: number = (state.getWidth() / 2) * this.SPACE_SIZE;
            const cy: number = (state.getHeight() / 2) * this.SPACE_SIZE;
            return `rotate(45, ${ cx }, ${ cy })`;
        } else {
            return '';
        }
    }

    public getGroupDropValidationButtonClasses(): string[] {
        const numberToDrop: number = this.getNumberOfAwaitedDrop();
        const classes: string[] = ['capturable-fill'];
        if (this.dropped.size() < numberToDrop) {
            classes.push('semi-transparent');
        }
        return classes;
    }

    private getNumberOfAwaitedDrop(): number {
        const config: QuebecCastlesConfig = this.config.get(); // TODO this vs this.getConfig() ?
        return config.defender;
    }

}
