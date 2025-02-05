import { BrowserModule } from '@angular/platform-browser';
import { LOCALE_ID, NgModule } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Route } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import * as Firebase from '@firebase/app';
import * as Firestore from '@firebase/firestore';
import * as Auth from '@firebase/auth';
import localeFr from '@angular/common/locales/fr';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { ChatService } from './services/ChatService';
import { UserService } from './services/UserService';
import { ConnectedUserService } from './services/ConnectedUserService';
import { GameService } from './services/GameService';
import { ConfigRoomService } from './services/ConfigRoomService';
import { GameEventService } from './services/GameEventService';
import { ThemeService } from './services/ThemeService';

import { AppComponent } from './app.component';
import { HeaderComponent } from './components/normal-component/header/header.component';
import { WelcomeComponent } from './components/normal-component/welcome/welcome.component';
import { DemoPageComponent } from './components/normal-component/demo-page/demo-page.component';
import { LoginComponent } from './components/normal-component/login/login.component';
import { LobbyComponent } from './components/normal-component/lobby/lobby.component';
import { AccountComponent } from './components/normal-component/account/account.component';
import { PickGameComponent } from './components/normal-component/pick-game/pick-game.component';
import { PartCreationComponent } from './components/wrapper-components/part-creation/part-creation.component';
import { NotFoundComponent } from './components/normal-component/not-found/not-found.component';
import { ChatComponent } from './components/normal-component/chat/chat.component';
import { CountDownComponent } from './components/normal-component/count-down/count-down.component';
import { OnlineGameWrapperComponent }
    from './components/wrapper-components/online-game-wrapper/online-game-wrapper.component';
import { LocalGameWrapperComponent }
    from 'src/app/components/wrapper-components/local-game-wrapper/local-game-wrapper.component';
import { TutorialGameWrapperComponent }
    from './components/wrapper-components/tutorial-game-wrapper/tutorial-game-wrapper.component';
import { RegisterComponent } from './components/normal-component/register/register.component';
import { LocalGameCreationComponent }
    from './components/normal-component/local-game-creation/local-game-creation.component';
import { OnlineGameSelectionComponent }
    from './components/normal-component/online-game-selection/online-game-selection.component';
import { TutorialGameCreationComponent }
    from './components/normal-component/tutorial-game-creation/tutorial-game-creation.component';
import { DemoCardWrapperComponent } from './components/wrapper-components/demo-card-wrapper/demo-card-wrapper.component';
import { NextGameLoadingComponent } from './components/normal-component/next-game-loading/next-game-loading.component';
import { VerifyAccountComponent } from './components/normal-component/verify-account/verify-account.component';
import { ResetPasswordComponent } from './components/normal-component/reset-password/reset-password.component';
import { SettingsComponent } from './components/normal-component/settings/settings.component';
import { OnlineGameCreationComponent } from './components/normal-component/online-game-creation/online-game-creation.component';

import { DirArrowComponent } from './components/game-components/arrow-component/dir-arrow.component';
import { HexArrowComponent } from './components/game-components/arrow-component/hex-arrow.component';

import { AbaloneComponent } from './games/abalone/abalone.component';
import { BaAwaComponent } from './games/mancala/ba-awa/ba-awa.component';
import { ApagosComponent } from './games/apagos/apagos.component';
import { AwaleComponent } from './games/mancala/awale/awale.component';

import { BrandhubComponent } from './games/tafl/brandhub/brandhub.component';

import { CoerceoComponent } from './games/coerceo/coerceo.component';
import { ConnectSixComponent } from './games/connect-six/connect-six.component';
import { ConspirateursComponent } from './games/conspirateurs/conspirateurs.component';

import { DiaballikComponent } from './games/diaballik/diaballik.component';
import { DiamComponent } from './games/diam/diam.component';
import { DvonnComponent } from './games/dvonn/dvonn.component';

import { EncapsuleComponent } from './games/encapsule/encapsule.component';
import { EpaminondasComponent } from './games/epaminondas/epaminondas.component';

import { GipfComponent } from './games/gipf/gipf.component';
import { GoComponent } from './games/gos/go/go.component';

import { HexodiaComponent } from './games/hexodia/hexodia.component';
import { HiveComponent } from './games/hive/hive.component';
import { HivePieceComponent } from './games/hive/hive-piece.component';
import { HnefataflComponent } from './games/tafl/hnefatafl/hnefatafl.component';

import { InternationalCheckersComponent } from './games/checkers/international-checkers/international-checkers.component';

import { KalahComponent } from './games/mancala/kalah/kalah.component';
import { KamisadoComponent } from './games/kamisado/kamisado.component';

import { LascaComponent } from './games/checkers/lasca/lasca.component';
import { LinesOfActionComponent } from './games/lines-of-action/lines-of-action.component';
import { LodestoneComponent } from './games/lodestone/lodestone.component';
import { LodestoneLodestoneComponent } from './games/lodestone/lodestone-lodestone.component';

import { MartianChessComponent } from './games/martian-chess/martian-chess.component';
import { MartianChessQueenComponent } from './games/martian-chess/martian-chess-queen.component';
import { MartianChessDroneComponent } from './games/martian-chess/martian-chess-drone.component';
import { MartianChessPawnComponent } from './games/martian-chess/martian-chess-pawn.component';

import { NumberedCircleComponent } from './games/mancala/common/numbered-circle.component';

import { P4Component } from './games/p4/p4.component';
import { PentagoComponent } from './games/pentago/pentago.component';
import { PenteComponent } from './games/pente/pente.component';
import { PylosComponent } from './games/pylos/pylos.component';

import { QuartoComponent } from './games/quarto/quarto.component';
import { QuixoComponent } from './games/quixo/quixo.component';

import { ReversiComponent } from './games/reversi/reversi.component';

import { SaharaComponent } from './games/sahara/sahara.component';
import { SiamComponent } from './games/siam/siam.component';
import { SiamOrientationArrowComponent } from './games/siam/siam-orientation-arrow.component';
import { SixComponent } from './games/six/six.component';
import { SquarzComponent } from './games/squarz/squarz.component';

import { TablutComponent } from './games/tafl/tablut/tablut.component';
import { TeekoComponent } from './games/teeko/teeko.component';
import { TrexoComponent } from './games/trexo/trexo.component';
import { TrexoHalfPieceComponent } from './games/trexo/trexo-half-piece.component';
import { TrigoComponent } from './games/gos/trigo/trigo.component';

import { YinshComponent } from './games/yinsh/yinsh.component';

import { environment } from 'src/environments/environment';

import { VerifiedAccountGuard } from './guard/verified-account.guard';
import { ExclusiveOnlineGameGuard } from './guard/exclusive-online-game-guard';
import { ConnectedButNotVerifiedGuard } from './guard/connected-but-not-verified.guard';
import { NotConnectedGuard } from './guard/not-connected.guard';

import { HumanDurationPipe } from './pipes-and-directives/human-duration.pipe';
import { AutofocusDirective } from './pipes-and-directives/autofocus.directive';
import { FirestoreTimePipe } from './pipes-and-directives/firestore-time.pipe';

import { ToggleVisibilityDirective } from './pipes-and-directives/toggle-visibility.directive';
import { RulesConfigurationComponent } from './components/wrapper-components/rules-configuration/rules-configuration.component';
import { BlankGobanComponent } from './components/game-components/goban-game-component/blank-goban/blank-goban.component';
import { LocaleUtils } from './utils/LocaleUtils';

registerLocaleData(localeFr);

export const routes: Route[] = [
    { path: 'login', component: LoginComponent },
    { path: 'lobby', component: LobbyComponent, canActivate: [VerifiedAccountGuard] },
    { path: 'account', component: AccountComponent, canActivate: [VerifiedAccountGuard] },
    { path: 'settings', component: SettingsComponent },
    { path: 'register', component: RegisterComponent, canActivate: [NotConnectedGuard] },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'notFound/:message', component: NotFoundComponent },
    { path: 'nextGameLoading', component: NextGameLoadingComponent, canActivate: [VerifiedAccountGuard] },
    { path: 'verify-account', component: VerifyAccountComponent, canActivate: [ConnectedButNotVerifiedGuard] },
    { path: 'play', component: OnlineGameSelectionComponent, canActivate: [VerifiedAccountGuard, ExclusiveOnlineGameGuard] },
    { path: 'play/:compo', component: OnlineGameCreationComponent, canActivate: [VerifiedAccountGuard, ExclusiveOnlineGameGuard] },
    { path: 'play/:compo/:id', component: OnlineGameWrapperComponent, canActivate: [VerifiedAccountGuard, ExclusiveOnlineGameGuard] },
    { path: 'local', component: LocalGameCreationComponent },
    { path: 'local/:compo', component: LocalGameWrapperComponent },
    { path: 'tutorial', component: TutorialGameCreationComponent },
    { path: 'tutorial/:compo', component: TutorialGameWrapperComponent },
    { path: '', component: WelcomeComponent },
    { path: 'demo', component: DemoPageComponent },
    { path: '**', component: NotFoundComponent },
];

@NgModule({
    declarations: [
        AppComponent,
        HeaderComponent,
        WelcomeComponent,
        LoginComponent,
        LobbyComponent,
        PickGameComponent,
        ChatComponent,
        PartCreationComponent,
        RegisterComponent,
        NotFoundComponent,
        NextGameLoadingComponent,
        CountDownComponent,
        OnlineGameWrapperComponent,
        LocalGameWrapperComponent,
        TutorialGameWrapperComponent,
        LocalGameCreationComponent,
        OnlineGameSelectionComponent,
        TutorialGameCreationComponent,
        VerifyAccountComponent,
        ResetPasswordComponent,
        SettingsComponent,
        AccountComponent,
        DemoCardWrapperComponent,
        DemoPageComponent,

        DirArrowComponent,
        HexArrowComponent,

        AbaloneComponent,
        ApagosComponent,
        AwaleComponent, NumberedCircleComponent,

        BrandhubComponent,
        BaAwaComponent,

        CoerceoComponent,
        ConnectSixComponent,
        ConspirateursComponent,
        DiaballikComponent,
        DiamComponent,
        DvonnComponent,
        EncapsuleComponent,
        EpaminondasComponent,
        GipfComponent,
        BlankGobanComponent,
        GoComponent,
        HexodiaComponent,
        HiveComponent, HivePieceComponent,
        HnefataflComponent,
        InternationalCheckersComponent,
        KalahComponent,
        KamisadoComponent,
        LascaComponent,
        LinesOfActionComponent,
        LodestoneComponent, LodestoneLodestoneComponent,
        MartianChessComponent, MartianChessQueenComponent, MartianChessDroneComponent, MartianChessPawnComponent,
        P4Component,
        PentagoComponent,
        PenteComponent,
        PylosComponent,
        QuartoComponent,
        QuixoComponent,
        ReversiComponent,
        SaharaComponent,
        SiamComponent, SiamOrientationArrowComponent,
        SixComponent,
        SquarzComponent,
        TablutComponent,
        TeekoComponent,
        TrexoComponent, TrexoHalfPieceComponent,
        TrigoComponent,
        YinshComponent,

        HumanDurationPipe,
        FirestoreTimePipe,
        AutofocusDirective,
        ToggleVisibilityDirective,
        RulesConfigurationComponent,
    ],
    imports: [
        BrowserModule,
        HttpClientModule,
        RouterModule.forRoot(routes, { useHash: false }),
        ReactiveFormsModule,
        FormsModule,
        BrowserAnimationsModule,
        FontAwesomeModule,
    ],
    providers: [
        ConnectedUserService,
        GameService,
        GameEventService,
        ConfigRoomService,
        UserService,
        ChatService,
        ThemeService,
        { provide: LOCALE_ID, useValue: LocaleUtils.getLocale() },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {

    public constructor() {
        Firebase.initializeApp(environment.firebaseConfig);
        const firestore: Firestore.Firestore = Firestore.getFirestore();
        const host: string = firestore.toJSON()['settings'].host;
        if (environment.useEmulators && host !== 'localhost:8080') {
            Firestore.connectFirestoreEmulator(firestore, 'localhost', 8080);
        }

        const fireauth: Auth.Auth = Auth.getAuth();
        if (environment.useEmulators && fireauth.config['emulator'] == null) {
            Auth.connectAuthEmulator(fireauth, 'http://localhost:9099', { disableWarnings: true });
        }
    }

}
