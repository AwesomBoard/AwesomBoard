import { Component, EventEmitter, Output, Type } from '@angular/core';

import { ApagosTutorial } from 'src/app/games/apagos/ApagosTutorial';
import { ApagosRules } from 'src/app/games/apagos/ApagosRules';
import { AbaloneComponent } from 'src/app/games/abalone/abalone.component';
import { ApagosComponent } from 'src/app/games/apagos/apagos.component';
import { AwaleComponent } from 'src/app/games/awale/awale.component';
import { AwaleRules } from 'src/app/games/awale/AwaleRules';
import { AwaleTutorial } from 'src/app/games/awale/AwaleTutorial';
import { AbaloneTutorial } from 'src/app/games/abalone/AbaloneTutorial';
import { AbaloneRules } from 'src/app/games/abalone/AbaloneRules';
import { AbaloneState } from 'src/app/games/abalone/AbaloneState';
import { AwaleState } from 'src/app/games/awale/AwaleState';

import { BrandhubComponent } from 'src/app/games/tafl/brandhub/brandhub.component';
import { BrandhubTutorial } from 'src/app/games/tafl/brandhub/BrandhubTutorial';
import { BrandhubRules } from 'src/app/games/tafl/brandhub/BrandhubRules';

import { ConspirateursTutorial } from 'src/app/games/conspirateurs/ConspirateursTutorial';
import { ConspirateursRules } from 'src/app/games/conspirateurs/ConspirateursRules';

import { DiamRules } from 'src/app/games/diam/DiamRules';
import { DiamTutorial } from 'src/app/games/diam/DiamTutorial';

import { CoerceoComponent } from 'src/app/games/coerceo/coerceo.component';
import { CoerceoTutorial } from 'src/app/games/coerceo/CoerceoTutorial';
import { CoerceoRules } from 'src/app/games/coerceo/CoerceoRules';
import { CoerceoState } from 'src/app/games/coerceo/CoerceoState';
import { ConspirateursComponent } from 'src/app/games/conspirateurs/conspirateurs.component';

import { DiamComponent } from 'src/app/games/diam/diam.component';
import { DvonnTutorial } from 'src/app/games/dvonn/DvonnTutorial';
import { DvonnRules } from 'src/app/games/dvonn/DvonnRules';
import { DvonnState } from 'src/app/games/dvonn/DvonnState';
import { DvonnComponent } from 'src/app/games/dvonn/dvonn.component';

import { EncapsuleComponent } from 'src/app/games/encapsule/encapsule.component';
import { EncapsuleTutorial } from 'src/app/games/encapsule/EncapsuleTutorial';
import { EncapsuleRules } from 'src/app/games/encapsule/EncapsuleRules';
import { EncapsuleState } from 'src/app/games/encapsule/EncapsuleState';
import { EpaminondasComponent } from 'src/app/games/epaminondas/epaminondas.component';
import { EpaminondasTutorial } from 'src/app/games/epaminondas/EpaminondasTutorial';
import { EpaminondasRules } from 'src/app/games/epaminondas/EpaminondasRules';
import { EpaminondasState } from 'src/app/games/epaminondas/EpaminondasState';

import { GipfComponent } from 'src/app/games/gipf/gipf.component';
import { GoTutorial } from 'src/app/games/go/GoTutorial';
import { GoRules } from 'src/app/games/go/GoRules';
import { GoState } from 'src/app/games/go/GoState';
import { GoComponent } from 'src/app/games/go/go.component';
import { GipfTutorial } from 'src/app/games/gipf/GipfTutorial';
import { GipfRules } from 'src/app/games/gipf/GipfRules';
import { GipfState } from 'src/app/games/gipf/GipfState';

import { HiveComponent } from 'src/app/games/hive/hive.component';
import { HiveTutorial } from 'src/app/games/hive/HiveTutorial';
import { HiveRules } from 'src/app/games/hive/HiveRules';
import { HnefataflRules } from 'src/app/games/tafl/hnefatafl/HnefataflRules';
import { HnefataflTutorial } from 'src/app/games/tafl/hnefatafl/HnefataflTutorial';
import { HnefataflComponent } from 'src/app/games/tafl/hnefatafl/hnefatafl.component';

import { KamisadoComponent } from 'src/app/games/kamisado/kamisado.component';
import { KamisadoTutorial } from 'src/app/games/kamisado/KamisadoTutorial';
import { KamisadoState } from 'src/app/games/kamisado/KamisadoState';
import { KamisadoRules } from 'src/app/games/kamisado/KamisadoRules';

import { LascaComponent } from 'src/app/games/lasca/lasca.component';
import { LascaRules } from 'src/app/games/lasca/LascaRules';
import { LascaTutorial } from 'src/app/games/lasca/LascaTutorial';
import { LinesOfActionComponent } from 'src/app/games/lines-of-action/lines-of-action.component';
import { LinesOfActionTutorial } from 'src/app/games/lines-of-action/LinesOfActionTutorial';
import { LinesOfActionRules } from 'src/app/games/lines-of-action/LinesOfActionRules';
import { LinesOfActionState } from 'src/app/games/lines-of-action/LinesOfActionState';
import { LodestoneTutorial } from 'src/app/games/lodestone/LodestoneTutorial';
import { LodestoneComponent } from 'src/app/games/lodestone/lodestone.component';
import { LodestoneRules } from 'src/app/games/lodestone/LodestoneRules';

import { MartianChessTutorial } from 'src/app/games/martian-chess/MartianChessTutorial';
import { MartianChessRules } from 'src/app/games/martian-chess/MartianChessRules';
import { MartianChessState } from 'src/app/games/martian-chess/MartianChessState';
import { MartianChessComponent } from 'src/app/games/martian-chess/martian-chess.component';

import { P4Component } from 'src/app/games/p4/p4.component';
import { P4Tutorial } from 'src/app/games/p4/P4Tutorial';
import { P4Rules } from 'src/app/games/p4/P4Rules';
import { P4State } from 'src/app/games/p4/P4State';
import { PentagoComponent } from 'src/app/games/pentago/pentago.component';
import { PentagoTutorial } from 'src/app/games/pentago/PentagoTutorial';
import { PentagoRules } from 'src/app/games/pentago/PentagoRules';
import { PentagoState } from 'src/app/games/pentago/PentagoState';
import { PylosComponent } from 'src/app/games/pylos/pylos.component';
import { PylosTutorial } from 'src/app/games/pylos/PylosTutorial';
import { PylosRules } from 'src/app/games/pylos/PylosRules';
import { PylosState } from 'src/app/games/pylos/PylosState';

import { QuartoComponent } from 'src/app/games/quarto/quarto.component';
import { QuartoTutorial } from 'src/app/games/quarto/QuartoTutorial';
import { QuartoRules } from 'src/app/games/quarto/QuartoRules';
import { QuartoState } from 'src/app/games/quarto/QuartoState';
import { QuixoComponent } from 'src/app/games/quixo/quixo.component';
import { QuixoTutorial } from 'src/app/games/quixo/QuixoTutorial';
import { QuixoRules } from 'src/app/games/quixo/QuixoRules';
import { QuixoState } from 'src/app/games/quixo/QuixoState';

import { ReversiComponent } from 'src/app/games/reversi/reversi.component';
import { ReversiTutorial } from 'src/app/games/reversi/ReversiTutorial';
import { ReversiRules } from 'src/app/games/reversi/ReversiRules';
import { ReversiState } from 'src/app/games/reversi/ReversiState';

import { SaharaComponent } from 'src/app/games/sahara/sahara.component';
import { SaharaTutorial } from 'src/app/games/sahara/SaharaTutorial';
import { SaharaRules } from 'src/app/games/sahara/SaharaRules';
import { SaharaState } from 'src/app/games/sahara/SaharaState';
import { SiamComponent } from 'src/app/games/siam/siam.component';
import { SiamTutorial } from 'src/app/games/siam/SiamTutorial';
import { SiamRules } from 'src/app/games/siam/SiamRules';
import { SixComponent } from 'src/app/games/six/six.component';
import { SixTutorial } from 'src/app/games/six/SixTutorial';
import { SixRules } from 'src/app/games/six/SixRules';
import { SixState } from 'src/app/games/six/SixState';

import { TablutComponent } from 'src/app/games/tafl/tablut/tablut.component';
import { TablutTutorial } from 'src/app/games/tafl/tablut/TablutTutorial';
import { TablutRules } from 'src/app/games/tafl/tablut/TablutRules';
import { TrexoComponent } from 'src/app/games/trexo/trexo.component';
import { TrexoRules } from 'src/app/games/trexo/TrexoRules';
import { TrexoTutorial } from 'src/app/games/trexo/TrexoTutorial';

import { YinshComponent } from 'src/app/games/yinsh/yinsh.component';
import { YinshTutorial } from 'src/app/games/yinsh/YinshTutorial';
import { YinshRules } from 'src/app/games/yinsh/YinshRules';
import { YinshState } from 'src/app/games/yinsh/YinshState';

import { AbstractGameComponent } from '../../game-components/game-component/GameComponent';
import { AbstractRules } from 'src/app/jscaip/Rules';
import { Localized } from 'src/app/utils/LocaleUtils';
import { Tutorial } from '../../wrapper-components/tutorial-game-wrapper/TutorialStep';

class GameDescription {

    public static readonly ABALONE: Localized = () => $localize`Use simple mechanics to push 6 of the opponent's pieces out of the board!`;

    public static readonly APAGOS: Localized = () => $localize`Very simple game, but, will you be able to win everytime?`;

    public static readonly AWALE: Localized = () => $localize`The international version of the famous African strategy game!`;

    public static readonly BRANDHUB: Localized = () => $localize`The Irish version of the Tafl game family! Invaders must capture the king, defender must make him escape!`;

    public static readonly COERCEO: Localized = () => $localize`Get rid of all of your opponent's pieces on a board that shrinks little by little!`;

    public static readonly CONSPIRATEURS: Localized = () => $localize`Hide all of your pieces before your opponent does, or risk to be discovered!`;

    public static readonly DIAM: Localized = () => $localize`Drop your pieces and move them around to align two pieces of the same color across the board to win!`;

    public static readonly DVONN: Localized = () => $localize`Stack your pieces and control as many stacks as you can to win!`;

    public static readonly ENCAPSULE: Localized = () => $localize`An enhanced tic-tac-toe where piece can encapsule other and prevent them to win.`;

    public static readonly EPAMINONDAS: Localized = () => $localize`An antiquity-war inspired game. Be the first to pierce your opponent's lines!`;

    public static readonly GIPF: Localized = () => $localize`A hexagonal game of alignment. Insert your pieces on the board to capture your opponent's pieces!`;

    public static readonly GO: Localized = () => $localize`The oldest strategy game still practiced widely. A territory control game.`;

    public static readonly HIVE: Localized = () => $localize`You are in charge of a hive full of insects. Use the abilities of your insects to block the opponent's queen in order to win!`;

    public static readonly HNEFATAFL: Localized = () => $localize`The Viking board game! Invaders must capture the king, defender must make him escape!`;

    public static readonly KAMISADO: Localized = () => $localize`Your goal is simple: reach the last line. But the piece you move depends on your opponent's last move!`;

    public static readonly LASCA: Localized = () => $localize`Similar to checkers, capture opponent's pieces, free your own, and immobilize your opponent to win the game!`;

    public static readonly LINES_OF_ACTION: Localized = () => $localize`Regroup your pieces to win. But your possible moves will often change!`;

    public static readonly LODESTONE: Localized = () => $localize`Push and crush your opponent's pieces using magnetic forces!`;

    public static readonly MARTIAN_CHESS: Localized = () => $localize`Win points by capturing pieces, but you only control pieces on your side of the board!`;

    public static readonly P4: Localized = () => $localize`The classical 4 in a row game!`;

    public static readonly PENTAGO: Localized = () => $localize`Drop a piece, then rotate a quadrant. The first player to align 5 pieces wins!`;

    public static readonly PYLOS: Localized = () => $localize`Overlay your pieces and use two game mechanics to conserve your pieces. First player to run out of pieces loses!`;

    public static readonly QUARTO: Localized = () => $localize`Create a winning alignment. The problem: you don't pick the piece that you're placing on the board!`;

    public static readonly QUIXO: Localized = () => $localize`Align 5 of your pieces on a board where pieces slide!`;

    public static readonly REVERSI: Localized = () => $localize`Sandwich your opponent's pieces to dominate the board!`;

    public static readonly SAHARA: Localized = () => $localize`Immobilize one of your opponent's pyramids before your opponent does!`;

    public static readonly SIAM: Localized = () => $localize`Be the first to push a mountain out of the board!`;

    public static readonly SIX: Localized = () => $localize`Put your hexagonal pieces next to another one, and create one of the 3 victorious shapes to win!`;

    public static readonly TABLUT: Localized = () => $localize`Lapland version of the Tafl game family! Invaders must capture the king, defender must make him escape!`;

    public static readonly TREXO: Localized = () => $localize`Align 5 pieces of your color in a row, but beware, the pieces can be put on top of other pieces!`;

    public static readonly YINSH: Localized = () => $localize`Align your pieces to score points, but beware, pieces can flip!`;

}

export class GameInfo {
    // Games sorted by creation date
    public static ALL_GAMES: () => GameInfo[] = () => [
        new GameInfo($localize`Four in a Row`, 'P4', P4Component, new P4Tutorial(), new P4Rules(P4State), new Date('2018-08-28'), GameDescription.P4()),
        new GameInfo($localize`Awalé`, 'Awale', AwaleComponent, new AwaleTutorial(), new AwaleRules(AwaleState), new Date('2018-11-29'), GameDescription.AWALE()), // 93 days after P4
        new GameInfo($localize`Quarto`, 'Quarto', QuartoComponent, new QuartoTutorial(), new QuartoRules(QuartoState), new Date('2018-12-09'), GameDescription.QUARTO()), // 10 days after Awale
        new GameInfo($localize`Tablut`, 'Tablut', TablutComponent, new TablutTutorial(), TablutRules.get(), new Date('2018-12-27'), GameDescription.TABLUT()), // 26 days after Quarto

        new GameInfo($localize`Reversi`, 'Reversi', ReversiComponent, new ReversiTutorial(), new ReversiRules(ReversiState), new Date('2019-01-16'), GameDescription.REVERSI()), // 20 days after Tablut
        new GameInfo($localize`Go`, 'Go', GoComponent, new GoTutorial(), new GoRules(GoState), new Date('2019-12-21'), GameDescription.GO()), // 11 months after Reversi
        new GameInfo($localize`Encapsule`, 'Encapsule', EncapsuleComponent, new EncapsuleTutorial(), new EncapsuleRules(EncapsuleState), new Date('2019-12-30'), GameDescription.ENCAPSULE()), // 9 days after Go

        new GameInfo($localize`Siam`, 'Siam', SiamComponent, new SiamTutorial(), SiamRules.get(), new Date('2020-01-11'), GameDescription.SIAM()), // 12 days after Encapsule
        new GameInfo($localize`Sahara`, 'Sahara', SaharaComponent, new SaharaTutorial(), new SaharaRules(SaharaState), new Date('2020-02-29'), GameDescription.SAHARA()), // 49 days after Siam
        new GameInfo($localize`Pylos`, 'Pylos', PylosComponent, new PylosTutorial(), new PylosRules(PylosState), new Date('2020-10-02'), GameDescription.PYLOS()), // 7 months after Sahara
        new GameInfo($localize`Kamisado`, 'Kamisado', KamisadoComponent, new KamisadoTutorial(), new KamisadoRules(KamisadoState), new Date('2020-10-03'), GameDescription.KAMISADO()), // 26 days after joining *Quentin
        new GameInfo($localize`Quixo`, 'Quixo', QuixoComponent, new QuixoTutorial(), new QuixoRules(QuixoState), new Date('2020-10-15'), GameDescription.QUIXO()), // 13 days after Pylos
        new GameInfo($localize`Dvonn`, 'Dvonn', DvonnComponent, new DvonnTutorial(), new DvonnRules(DvonnState), new Date('2020-10-21'), GameDescription.DVONN()), // 18 days after Kamisado *Quentin

        new GameInfo($localize`Epaminondas`, 'Epaminondas', EpaminondasComponent, new EpaminondasTutorial(), new EpaminondasRules(EpaminondasState), new Date('2021-01-16'), GameDescription.EPAMINONDAS()), // 22 days after Quixo
        new GameInfo($localize`Gipf`, 'Gipf', GipfComponent, new GipfTutorial(), new GipfRules(GipfState), new Date('2021-02-22'), GameDescription.GIPF()), // 4 months after Dvonn *Quentin
        new GameInfo($localize`Coerceo`, 'Coerceo', CoerceoComponent, new CoerceoTutorial(), new CoerceoRules(CoerceoState), new Date('2021-03-21'), GameDescription.COERCEO()), // 76 days after Epaminondas
        new GameInfo($localize`Six`, 'Six', SixComponent, new SixTutorial(), new SixRules(SixState), new Date('2021-04-08'), GameDescription.SIX()), // 18 days after Coerceo
        new GameInfo($localize`Lines of Action`, 'LinesOfAction', LinesOfActionComponent, new LinesOfActionTutorial(), new LinesOfActionRules(LinesOfActionState), new Date('2021-04-28'), GameDescription.LINES_OF_ACTION()), // 65 days after Gipf *Quentin
        new GameInfo($localize`Pentago`, 'Pentago', PentagoComponent, new PentagoTutorial(), new PentagoRules(PentagoState), new Date('2021-05-23'), GameDescription.PENTAGO()), // 25 days after Six
        new GameInfo($localize`Abalone`, 'Abalone', AbaloneComponent, new AbaloneTutorial(), new AbaloneRules(AbaloneState), new Date('2021-07-13'), GameDescription.ABALONE()), // 71 days after Pentago
        new GameInfo($localize`Yinsh`, 'Yinsh', YinshComponent, new YinshTutorial(), new YinshRules(YinshState), new Date('2021-07-31'), GameDescription.YINSH()), // 94 days after LinesOfAction *Quentin
        new GameInfo($localize`Apagos`, 'Apagos', ApagosComponent, new ApagosTutorial(), ApagosRules.get(), new Date('2021-11-04'), GameDescription.APAGOS()), // 4 month after Abalone
        new GameInfo($localize`Diam`, 'Diam', DiamComponent, new DiamTutorial(), DiamRules.get(), new Date('2021-11-30'), GameDescription.DIAM()), // 4 months after Yinsh *Quentin
        new GameInfo($localize`Brandhub`, 'Brandhub', BrandhubComponent, new BrandhubTutorial(), BrandhubRules.get(), new Date('2021-12-07'), GameDescription.BRANDHUB()), // 33 days after Apagos
        new GameInfo($localize`Conspirateurs`, 'Conspirateurs', ConspirateursComponent, new ConspirateursTutorial(), ConspirateursRules.get(), new Date('2021-12-30'), GameDescription.CONSPIRATEURS()), // 30 days after Diam *Quentin

        new GameInfo($localize`Lodestone`, 'Lodestone', LodestoneComponent, new LodestoneTutorial(), LodestoneRules.get(), new Date('2022-06-24'), GameDescription.LODESTONE()),
        new GameInfo($localize`Martian Chess`, 'MartianChess', MartianChessComponent, new MartianChessTutorial(), new MartianChessRules(MartianChessState), new Date('2022-07-01'), GameDescription.MARTIAN_CHESS()),
        new GameInfo($localize`Hnefatafl`, 'Hnefatafl', HnefataflComponent, new HnefataflTutorial(), HnefataflRules.get(), new Date('2022-09-21'), GameDescription.HNEFATAFL()),

        new GameInfo($localize`Hive`, 'Hive', HiveComponent, new HiveTutorial(), HiveRules.get(), new Date('2023-04-02'), GameDescription.HIVE()),
        new GameInfo($localize`Trexo`, 'Trexo', TrexoComponent, new TrexoTutorial(), TrexoRules.get(), new Date('2023-04-23'), GameDescription.TREXO()),
        new GameInfo($localize`Lasca`, 'Lasca', LascaComponent, new LascaTutorial(), LascaRules.get(), new Date('2023-05-05'), GameDescription.LASCA()),
    ].sort((a: GameInfo, b: GameInfo) => a.name.localeCompare(b.name));
    // After Apagos: median = 26d; average = 53d
    // 9d 10d 12d 13d 18d - 18d 20d 22d 25d 26d - (26d) - 49d 65d 71d 76d 93d - 94j 4m 4m 7m 11m

    public constructor(public readonly name: string,
                       public readonly urlName: string,
                       public readonly component: Type<AbstractGameComponent>,
                       public readonly tutorial: Tutorial,
                       public readonly rules: AbstractRules,
                       public readonly creationDate: Date,
                       public readonly description: string,
                       public readonly display: boolean = true)
    {
    }
}

@Component({
    selector: 'app-pick-game',
    templateUrl: './pick-game.component.html',
})
export class PickGameComponent {

    public readonly games: GameInfo[] = GameInfo.ALL_GAMES();

    @Output() pickGame: EventEmitter<string> = new EventEmitter<string>();

    public onChange(event: Event): void {
        const select: HTMLSelectElement = event.target as HTMLSelectElement;
        this.pickGame.emit(select.value);
    }
}
