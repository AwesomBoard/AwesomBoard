import { Component } from '@angular/core';
import { AbstractGameComponent } from '../../wrapper-components/AbstractGameComponent';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { Orthogonal } from 'src/app/jscaip/Direction';
import { Player } from 'src/app/jscaip/player/Player';
import { QuixoMove } from 'src/app/games/quixo/QuixoMove';
import { QuixoPartSlice } from 'src/app/games/quixo/quixo-part-slice/QuixoPartSlice';
import { LegalityStatus } from 'src/app/jscaip/LegalityStatus';
import { QuixoRules } from 'src/app/games/quixo/quixo-rules/QuixoRules';
import { GameComponentUtils } from '../GameComponentUtils';
import { MGPValidation } from 'src/app/utils/mgp-validation/MGPValidation';
import { Rules } from 'src/app/jscaip/Rules';

@Component({
    selector: 'app-quixo',
    templateUrl: './quixo.component.html',
})
export class QuixoComponent extends AbstractGameComponent<QuixoMove, QuixoPartSlice, LegalityStatus> {
    public static VERBOSE: boolean = false;

    public rules: QuixoRules = new QuixoRules(QuixoPartSlice);

    public slice: QuixoPartSlice = this.rules.node.gamePartSlice;

    public lastMoveCoord: Coord = new Coord(-1, -1);

    public chosenCoord: Coord;

    public chosenDirection: Orthogonal;

    public updateBoard(): void {
        this.slice = this.rules.node.gamePartSlice;
        this.board = this.slice.board;
        const move: QuixoMove = this.rules.node.move;
        if (move) this.lastMoveCoord = move.coord;
        else this.lastMoveCoord = null;
    }
    public cancelMoveAttempt(): void {
        this.chosenCoord = null;
    }
    public decodeMove(encodedMove: number): QuixoMove {
        return QuixoMove.decode(encodedMove);
    }
    public encodeMove(move: QuixoMove): number {
        return QuixoMove.encode(move);
    }
    public getPieceStyle(x: number, y: number): { [key: string]: string } {
        const coord: Coord = new Coord(x, y);
        const c: Player = Player.of(this.board[y][x]);
        const fill: string = this.getPlayerColor(c);
        let stroke: string = 'black';

        if (coord.equals(this.chosenCoord)) stroke = 'grey';
        else if (coord.equals(this.lastMoveCoord)) stroke = 'orange';
        return { fill, stroke };
    }
    public onBoardClick(x: number, y: number): MGPValidation {
        const clickedCoord: Coord = new Coord(x, y);
        if (QuixoMove.isValidCoord(clickedCoord).valid === false) {
            // TODO: is this possible ? If not, should'nt it be a classic Error ?
            return this.cancelMove('Unvalid coord ' + clickedCoord.toString());
        }
        if (this.board[y][x] === this.slice.getCurrentEnnemy().value) {
            return this.cancelMove(Rules.CANNOT_CHOOSE_ENNEMY_PIECE + clickedCoord.toString());
        } else {
            this.chosenCoord = clickedCoord;
            return MGPValidation.SUCCESS;
        }
    }
    public getPossiblesDirections(): [number, number, string][] {
        const infos: [number, number, string][] = [];
        if (this.chosenCoord.x !== 4) infos.push([2, 1, 'RIGHT']);
        if (this.chosenCoord.x !== 0) infos.push([0, 1, 'LEFT']);
        if (this.chosenCoord.y !== 4) infos.push([1, 2, 'DOWN']);
        if (this.chosenCoord.y !== 0) infos.push([1, 0, 'UP']);
        return infos;
    }
    public async chooseDirection(direction: string): Promise<MGPValidation> {
        this.chosenDirection = Orthogonal.factory.fromString(direction);
        return await this.tryMove();
    }
    public async tryMove(): Promise<MGPValidation> {
        const move: QuixoMove = new QuixoMove(this.chosenCoord.x,
                                              this.chosenCoord.y,
                                              this.chosenDirection);
        this.cancelMove();
        return this.chooseMove(move, this.rules.node.gamePartSlice, null, null);
    }
    public getTriangleCoordinate(lx: number, ly: number): string {
        const x: number = this.chosenCoord.x;
        const y: number = this.chosenCoord.y;
        return GameComponentUtils.getTriangleCoordinate(x, y, lx, ly);
    }
}
