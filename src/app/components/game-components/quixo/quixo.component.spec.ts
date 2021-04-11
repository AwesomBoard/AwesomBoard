import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AuthenticationService } from 'src/app/services/authentication/AuthenticationService';
import { ActivatedRoute } from '@angular/router';
import { AppModule } from 'src/app/app.module';
import { LocalGameWrapperComponent }
    from 'src/app/components/wrapper-components/local-game-wrapper/local-game-wrapper.component';
import { JoueursDAO } from 'src/app/dao/joueurs/JoueursDAO';
import { JoueursDAOMock } from 'src/app/dao/joueurs/JoueursDAOMock';
import { QuixoComponent } from './quixo.component';
import { QuixoMove } from 'src/app/games/quixo/QuixoMove';
import { Orthogonal } from 'src/app/jscaip/Direction';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { GameComponentUtils } from '../GameComponentUtils';
import { MGPValidation } from 'src/app/utils/mgp-validation/MGPValidation';
import { Rules } from 'src/app/jscaip/Rules';

const activatedRouteStub = {
    snapshot: {
        paramMap: {
            get: (str: string) => {
                return 'Quixo';
            },
        },
    },
};
const authenticationServiceStub = {

    getJoueurObs: () => of({ pseudo: null, verified: null }),

    getAuthenticatedUser: () => {
        return { pseudo: null, verified: null };
    },
};
describe('QuixoComponent', () => {
    let wrapper: LocalGameWrapperComponent;

    let fixture: ComponentFixture<LocalGameWrapperComponent>;

    let gameComponent: QuixoComponent;

    const doMove: (move: QuixoMove) => Promise<MGPValidation> = async(move: QuixoMove) => {
        return gameComponent.onBoardClick(move.coord.x, move.coord.y) &&
               await gameComponent.chooseDirection(move.direction.toString());
    };
    beforeEach(fakeAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                AppModule,
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ActivatedRoute, useValue: activatedRouteStub },
                { provide: JoueursDAO, useClass: JoueursDAOMock },
                { provide: AuthenticationService, useValue: authenticationServiceStub },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(LocalGameWrapperComponent);
        wrapper = fixture.debugElement.componentInstance;
        fixture.detectChanges();
        tick(1);
        gameComponent = wrapper.gameComponent as QuixoComponent;
    }));
    it('should create', () => {
        expect(wrapper).toBeTruthy('Wrapper should be created');
        expect(gameComponent).toBeTruthy('QuixoComponent should be created');
    });
    it('should style piece correctly', () => {
        gameComponent.chosenCoord = new Coord(0, 0);
        expect(gameComponent.getPieceClasses(0, 0)).toContain('selected');

        gameComponent.lastMoveCoord = new Coord(4, 4);
        expect(gameComponent.getPieceClasses(4, 4)).toContain('highlighted2');
    });
    it('should give correct direction', () => {
        let possibleDirections: [number, number, string][];

        gameComponent.onBoardClick(0, 0);
        possibleDirections = gameComponent.getPossiblesDirections();
        expect(possibleDirections).toEqual([[2, 1, 'RIGHT'], [1, 2, 'DOWN']]);

        gameComponent.onBoardClick(4, 4);
        possibleDirections = gameComponent.getPossiblesDirections();
        expect(possibleDirections).toEqual([[0, 1, 'LEFT'], [1, 0, 'UP']]);
    });
    it('should cancel move when trying to select ennemy piece or center coord', async() => {
        const firstMove: QuixoMove = new QuixoMove(0, 0, Orthogonal.RIGHT);

        const legal: MGPValidation = await doMove(firstMove);
        spyOn(gameComponent, 'message').and.callThrough();
        expect(legal.isSuccess()).toBeTrue();

        expect(gameComponent.onBoardClick(4, 0).isFailure()).toBeTrue();
        expect(gameComponent.message).toHaveBeenCalledWith(Rules.CANNOT_CHOOSE_ENNEMY_PIECE + '(4, 0)');

        expect(gameComponent.onBoardClick(1, 1).isFailure()).toBeTrue();
        expect(gameComponent.message).toHaveBeenCalledWith('Unvalid coord (1, 1)');
    });
    it('should delegate triangleCoord calculation to GameComponentUtils', () => {
        spyOn(GameComponentUtils, 'getTriangleCoordinate').and.callThrough();
        gameComponent.onBoardClick(0, 2);
        gameComponent.getTriangleCoordinate(2, 1);
        expect(GameComponentUtils.getTriangleCoordinate).toHaveBeenCalledWith(0, 2, 2, 1);
    });
    it('should delegate decoding to move', () => {
        spyOn(QuixoMove, 'decode').and.callThrough();
        gameComponent.decodeMove(new QuixoMove(0, 0, Orthogonal.DOWN).encode());
        expect(QuixoMove.decode).toHaveBeenCalledTimes(1);
    });
    it('should delegate encoding to move', () => {
        spyOn(QuixoMove, 'encode').and.callThrough();
        gameComponent.encodeMove(new QuixoMove(0, 0, Orthogonal.DOWN));
        expect(QuixoMove.encode).toHaveBeenCalledTimes(1);
    });
});
