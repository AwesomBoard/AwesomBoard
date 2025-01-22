import { ScoreName } from 'src/app/components/game-components/game-component/GameComponent';

export class GoPhase {
    public static PLAYING: GoPhase = new GoPhase();
    public static PASSED: GoPhase = new GoPhase();
    public static COUNTING: GoPhase = new GoPhase();
    public static ACCEPT: GoPhase = new GoPhase();
    public static FINISHED: GoPhase = new GoPhase();

    private constructor() {
    }

    public isPlaying(): boolean {
        return this === GoPhase.PLAYING;
    }

    public isPassed(): boolean {
        return this === GoPhase.PASSED;
    }

    public isCounting(): boolean {
        return this === GoPhase.COUNTING;
    }

    public isAccept(): boolean {
        return this === GoPhase.ACCEPT;
    }

    public isFinished(): boolean {
        return this === GoPhase.FINISHED;
    }

    public allowsPass(): boolean {
        return this.isFinished() === false;
    }

    public getScoreName(): ScoreName {

        if (this.isPlaying() || this.isPassed()) {
            return ScoreName.CAPTURES;
        } else {
            return ScoreName.POINTS;
        }
    }
}
