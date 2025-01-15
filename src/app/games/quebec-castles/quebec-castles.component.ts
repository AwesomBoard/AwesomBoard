import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation } from '@everyboard/lib';

import { QuebecCastlesConfig, QuebecCastlesRules } from './QuebecCastlesRules';
import { QuebecCastlesDrop, QuebecCastlesMove } from './QuebecCastlesMove';
import { QuebecCastlesState } from './QuebecCastlesState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { QuebecCastlesMoveGenerator } from './QuebecCastlesMoveGenerator';
import { QuebecCastlesMinimax } from './QuebecCastlesMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { TMPMoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';

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

    private selected: MGPOptional<Coord> = MGPOptional.empty();

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
            const state: QuebecCastlesState = this.getState();
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
        if (this.rules.isDropPhase(this.getState(), this.getConfig())) {
            const chosenMove: QuebecCastlesDrop = new QuebecCastlesDrop([coord]);
            return await this.chooseMove(chosenMove);
        } else {
            if (this.selected.isPresent()) {
                if (this.selected.equalsValue(coord)) {
                    this.selected = MGPOptional.empty();
                    return MGPValidation.SUCCESS;
                } else {
                    return this.chooseMove(TMPMoveCoordToCoord.of(this.selected.get(), coord));
                }
            } else {
                this.selected = MGPOptional.of(coord);
                return MGPValidation.SUCCESS;
            }
        }
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: QuebecCastlesState = this.getState();
        this.board = state.getCopiedBoard();
    }

    public override async showLastMove(move: QuebecCastlesMove): Promise<void> {
        return;
    }

    public override hideLastMove(): void {
        return;
    }

    public override cancelMoveAttempt(): void {
        this.selected = MGPOptional.empty();
    }

    public getRectClasses(coord: Coord): string[] {
        const classes: string[] = [];
        return classes;
    }

    public getPieceClass(coord: Coord): string[] { // TODO classes
        const classes: string[] = [
            this.getPlayerClass(this.getState().getPieceAt(coord)),
        ];
        if (this.selected.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public getBoardTransform(): string {
        if (this.getConfig().get().isRhombic) {
            const state: QuebecCastlesState = this.getState();
            const cx: number = (state.getWidth() / 2) * this.SPACE_SIZE;
            const cy: number = (state.getHeight() / 2) * this.SPACE_SIZE;
            return `rotate(45, ${ cx }, ${ cy })`;
        } else {
            return '';
        }
    }

}
