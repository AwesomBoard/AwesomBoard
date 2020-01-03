import {Component} from '@angular/core';
import {P4PartSlice} from '../../../games/p4/P4PartSlice';
import {MoveX} from '../../../jscaip/MoveX';
import {P4Rules} from '../../../games/p4/P4Rules';
import {ActivatedRoute, Router} from '@angular/router';
import {UserService} from '../../../services/UserService';
import {JoinerService} from '../../../services/JoinerService';
import {GameService} from '../../../services/GameService';
import {Move} from '../../../jscaip/Move';
import {AbstractGameComponent} from '../AbstractGameComponent';

@Component({
	selector: 'app-p4-new',
	templateUrl: './p4.component.html',
	styleUrls: []
})
export class P4Component extends AbstractGameComponent<MoveX, P4PartSlice> {

	/*************************** Common Fields **************************/

	rules = new P4Rules();

	imagesLocation = 'assets/images/';

	imagesNames: string[] = ['empty_circle.svg', 'yellow_circle.svg.png', 'brown_circle.svg.png'];

	lastX: number;

	onClick(x: number) {
		console.log('click');
		const chosenMove = MoveX.get(x);
		this.chooseMove(chosenMove, null, null);
	}

	updateBoard() {
		const p4PartSlice: P4PartSlice = this.rules.node.gamePartSlice;
		const lastMove: MoveX = this.rules.node.move;

		this.board = p4PartSlice.getCopiedBoard().reverse();
		if (lastMove !== null) {
			this.lastX = lastMove.x;
		}
	}

	decodeMove(encodedMove: number): Move {
		return MoveX.get(encodedMove);
	}

	encodeMove(move: MoveX): number {
		return move.x;
	}

}
