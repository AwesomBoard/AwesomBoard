import { Encoder } from '@everyboard/lib';

import { Move } from 'src/app/jscaip/Move';

/**
  * This class represents the moves of your game.
  * In most cases, your moves into one of the following categories, already implemented by the class of the same name:
  *   - `MoveCoord`: for moves that consist of selecting only a single space (e.g., dropping a piece on a board)
  *   - `MoveCoordToCoord`: for moves that consist of moving from one space to another
  *   - `MoveWithTwoCoords`: for moves that affect two spaces, but are not moves from one to the other.
  * All move must extends the `Move` parent class
  */
export class NewGameMove extends Move {
    /*
     * A move needs an Encoder to be able to play online.
     * There are multiple helpers to create encoders.
     * You'll likely be interested in:
     *   - `MoveCoord.getEncoder` and `MoveWithTwoCoords` to get an encoder for a move of the corresponding type.
     *   - `Encoder.tuple` to get an encoder for a move that has multiple fields
     *   - `Encoder.disjunction` to get an encoder for a move that may be of different types
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static encoder: Encoder<NewGameMove> = undefined as any;

    public toString(): string {
        return 'This method is really more debug oriented';
    }
    public equals(other: this): boolean {
        // This method helps the minimaxes avoid creating two times the same move, which would slow its calculations
        return true;
    }
}
