import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation, Set, Utils } from '@everyboard/lib';

import { QuebecCastlesConfig, QuebecCastlesRules } from './QuebecCastlesRules';
import { QuebecCastlesDrop, QuebecCastlesMove } from './QuebecCastlesMove';
import { QuebecCastlesState } from './QuebecCastlesState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { QuebecCastlesMoveGenerator } from './QuebecCastlesMoveGenerator';
import { QuebecCastlesMinimax } from './QuebecCastlesMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { TMPMoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
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

    public constructedState: QuebecCastlesState;

    private selected: MGPOptional<Coord> = MGPOptional.empty();
    private dropped: Set<Coord> = new Set();

    private leftSquare: MGPOptional<Coord> = MGPOptional.empty();
    private landingSquare: MGPOptional<Coord> = MGPOptional.empty();

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
        const originalViewBox: ViewBox = super.getViewBox();
        if (this.getConfig().get().isRhombic) {
            const state: QuebecCastlesState = this.constructedState;
            const minSize: number = Math.min(state.getWidth(), state.getHeight());
            const maxSize: number = Math.max(state.getWidth(), state.getHeight());
            const sizeDepassement: number = maxSize - minSize;
            const big: number = Math.sqrt(2);
            const newSize: number = minSize + (sizeDepassement / 2);
            const concreteDepassement: number = newSize * this.SPACE_SIZE * (big - 1) * 0.5;
            const concreteSize: number = newSize * this.SPACE_SIZE * big;
            return new ViewBox(-concreteDepassement, -concreteDepassement, concreteSize, concreteSize);
        } else {
            return originalViewBox;
        }
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + coord.x + '-' + coord.y);
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
            console.log('piece by piece)')
            const chosenMove: QuebecCastlesDrop = new QuebecCastlesDrop([coord]);
            return await this.chooseMove(chosenMove);
        } else {
            console.log('ALLERU')
            const currentPlayer: Player = this.constructedState.getCurrentPlayer();
            if (this.dropped.contains(coord)) {
                this.constructedState = this.constructedState.setPieceAt(coord, PlayerOrNone.NONE);
                this.dropped = this.dropped.removeElement(coord);
            } else {
                this.constructedState = this.constructedState.setPieceAt(coord, currentPlayer);
                this.dropped = this.dropped.addElement(coord);
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
                return this.chooseMove(TMPMoveCoordToCoord.of(this.selected.get(), coord));
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

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: QuebecCastlesState = this.getState();
        this.constructedState = state;
        this.board = state.getCopiedBoard();
    }

    public override async showLastMove(move: QuebecCastlesMove): Promise<void> {
        if (move instanceof TMPMoveCoordToCoord) {
            this.leftSquare = MGPOptional.of(move.getStart());
            this.landingSquare = MGPOptional.of(move.getEnd());
        }
    }

    public override hideLastMove(): void {
        return;
    }

    public override cancelMoveAttempt(): void {
        this.selected = MGPOptional.empty();
    }

    public getRectClasses(coord: Coord): string[] {
        const classes: string[] = [];
        if (this.leftSquare.equalsValue(coord) || this.landingSquare.equalsValue(coord)) {
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

}
