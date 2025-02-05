import { MGPOptional } from '@everyboard/lib';

import { Coord } from '../../jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { TaflPawn } from './TaflPawn';
import { RelativePlayer } from 'src/app/jscaip/RelativePlayer';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';

export class TaflState extends GameStateWithTable<TaflPawn> {

    public isCentralThrone(coord: Coord): boolean {
        return coord.equals(this.getCentralThrone());
    }

    public getCentralThrone(): Coord {
        const center: number = (this.getSize() - 1) / 2;
        return new Coord(center, center);
    }

    public getRelativeOwner(player: Player, coord: Coord): RelativePlayer {
        const owner: PlayerOrNone = this.getAbsoluteOwner(coord);
        let relativeOwner: RelativePlayer;
        if (owner.isNone()) {
            relativeOwner = RelativePlayer.NONE;
        } else if (player === owner) {
            relativeOwner = RelativePlayer.PLAYER;
        } else {
            relativeOwner = RelativePlayer.OPPONENT;
        }
        return relativeOwner;
    }

    public getAbsoluteOwner(coord: Coord): PlayerOrNone {
        const piece: TaflPawn = this.getPieceAt(coord);
        return piece.getOwner();
    }

    public getSize(): number {
        return this.getHeight();
    }

    public hasOwnerAt(coord: Coord, owner: PlayerOrNone): boolean {
        const optional: MGPOptional<TaflPawn> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().getOwner().equals(owner);
        } else {
            return false;
        }
    }

    public isExternalThrone(coord: Coord): boolean {
        return this.isCorner(coord);
    }

}
