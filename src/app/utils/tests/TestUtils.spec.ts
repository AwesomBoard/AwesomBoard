/* eslint-disable max-lines-per-function */
import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, DebugElement, Type } from '@angular/core';
import { ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GameState } from '../../jscaip/GameState';
import { Move } from '../../jscaip/Move';
import { MGPValidation } from '../MGPValidation';
import { AppModule, FirebaseProviders } from '../../app.module';
import { UserDAO } from '../../dao/UserDAO';
import { ConnectedUserService, AuthUser } from '../../services/ConnectedUserService';
import { MGPNode } from '../../jscaip/MGPNode';
import { GameWrapper } from '../../components/wrapper-components/GameWrapper';
import { ConnectedUserServiceMock } from '../../services/tests/ConnectedUserService.spec';
import { OnlineGameWrapperComponent }
    from '../../components/wrapper-components/online-game-wrapper/online-game-wrapper.component';
import { ChatDAO } from '../../dao/ChatDAO';
import { ConfigRoomDAOMock } from '../../dao/tests/ConfigRoomDAOMock.spec';
import { PartDAO } from '../../dao/PartDAO';
import { ConfigRoomDAO } from '../../dao/ConfigRoomDAO';
import { UserDAOMock } from '../../dao/tests/UserDAOMock.spec';
import { ChatDAOMock } from '../../dao/tests/ChatDAOMock.spec';
import { PartDAOMock } from '../../dao/tests/PartDAOMock.spec';
import { LocalGameWrapperComponent }
    from '../../components/wrapper-components/local-game-wrapper/local-game-wrapper.component';
import { Utils } from '../utils';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MGPOptional } from '../MGPOptional';
import { ErrorLoggerService } from 'src/app/services/ErrorLoggerService';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { AbstractGameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { findMatchingRoute } from 'src/app/app.module.spec';
import * as Firestore from '@angular/fire/firestore';
import * as Auth from '@angular/fire/auth';
import { HumanDurationPipe } from 'src/app/pipes-and-directives/human-duration.pipe';
import { AutofocusDirective } from 'src/app/pipes-and-directives/autofocus.directive';
import { ToggleVisibilityDirective } from 'src/app/pipes-and-directives/toggle-visibility.directive';
import { FirestoreTimePipe } from 'src/app/pipes-and-directives/firestore-time.pipe';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { FirebaseError } from 'firebase/app';
import { Comparable } from '../Comparable';
import { Subscription } from 'rxjs';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { CurrentGameServiceMock } from 'src/app/services/tests/CurrentGameService.spec';
import { GameInfo } from 'src/app/components/normal-component/pick-game/pick-game.component';
import { GameConfig } from 'src/app/jscaip/ConfigUtil';

@Component({})
export class BlankComponent {}

export class ActivatedRouteStub {

    private route: {[key: string]: string} = {};
    public snapshot: { paramMap: { get: (str: string) => string } };
    public constructor(compo?: string, id?: string) {
        this.snapshot = {
            paramMap: {
                get: (str: string): string => {
                    // Returns null in case the route does not exist.
                    // This is the same behaviour than ActivatedRoute
                    return this.route[str];
                },
            },
        };
        if (compo != null) {
            this.setRoute('compo', compo);
        }
        if (id != null) {
            this.setRoute('id', id);
        }
    }
    public setRoute(key: string, value: string): void {
        this.route[key] = value;
    }
}
export class SimpleComponentTestUtils<T> {

    private fixture: ComponentFixture<T>;

    private component: T;

    public static async create<T>(componentType: Type<T>, activatedRouteStub?: ActivatedRouteStub)
    : Promise<SimpleComponentTestUtils<T>>
    {
        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes([
                    { path: '**', component: BlankComponent },
                ]),
                FormsModule,
                ReactiveFormsModule,
                NoopAnimationsModule,
            ],
            declarations: [
                componentType,
                FirestoreTimePipe,
                HumanDurationPipe,
                AutofocusDirective,
                ToggleVisibilityDirective,
            ],
            schemas: [
                CUSTOM_ELEMENTS_SCHEMA,
            ],
            providers: [
                { provide: ActivatedRoute, useValue: activatedRouteStub },
                { provide: PartDAO, useClass: PartDAOMock },
                { provide: ConfigRoomDAO, useClass: ConfigRoomDAOMock },
                { provide: ChatDAO, useClass: ChatDAOMock },
                { provide: UserDAO, useClass: UserDAOMock },
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
                { provide: CurrentGameService, useClass: CurrentGameServiceMock },
                { provide: ErrorLoggerService, useClass: ErrorLoggerServiceMock },
            ],
        }).compileComponents();
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        const testUtils: SimpleComponentTestUtils<T> = new SimpleComponentTestUtils<T>();
        testUtils.fixture = TestBed.createComponent(componentType);
        testUtils.component = testUtils.fixture.componentInstance;
        return testUtils;
    }
    private constructor() {}

    public async clickElement(elementName: string, awaitStability: boolean = true): Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist on the page').toBeTruthy();
        if (element == null) {
            return;
        }
        element.triggerEventHandler('click', null);
        if (awaitStability) {
            await this.fixture.whenStable();
        }
        this.detectChanges();
    }
    public getComponent(): T {
        return this.component;
    }
    public detectChanges(): void {
        this.fixture.detectChanges();
    }
    public findElement(elementName: string): DebugElement {
        return this.fixture.debugElement.query(By.css(elementName));
    }
    public findElements(elementName: string): DebugElement[] {
        return this.fixture.debugElement.queryAll(By.css(elementName));
    }
    public findElementByDirective(directive: Type<unknown>): DebugElement {
        return this.fixture.debugElement.query(By.directive(directive));
    }
    public destroy(): void {
        return this.fixture.destroy();
    }
    public async whenStable(): Promise<void> {
        return this.fixture.whenStable();
    }
    public expectElementToHaveClass(elementName: string, cssClass: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist').toBeTruthy();
        expect(element.attributes.class).withContext(`${elementName} should have a class attribute`).toBeTruthy();
        if (element.attributes.class != null && element.attributes.class !== '') {
            const elementClasses: string[] = element.attributes.class.split(' ').sort();
            expect(elementClasses).withContext(elementName + ' should contain class ' + cssClass).toContain(cssClass);
        }
    }
    public expectElementNotToExist(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should not exist').toBeNull();
    }
    public expectElementToExist(elementName: string): DebugElement {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist').toBeTruthy();
        return element;
    }
    public expectElementToBeEnabled(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeElement.disabled).withContext(elementName + ' should be enabled').toBeFalsy();
    }
    public expectElementToBeDisabled(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeElement.disabled).withContext(elementName + ' should be disabled').toBeTruthy();
    }
    public fillInput(elementName: string, value: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist in order to fill its value').toBeTruthy();
        element.nativeElement.value = value;
        element.nativeElement.dispatchEvent(new Event('input'));
    }
}

export class ComponentTestUtils<T extends AbstractGameComponent, P extends Comparable = string> {

    public fixture: ComponentFixture<GameWrapper<P>>;
    public wrapper: GameWrapper<P>;
    private debugElement: DebugElement;
    private gameComponent: AbstractGameComponent;

    private canUserPlaySpy: jasmine.Spy;
    private cancelMoveSpy: jasmine.Spy;
    private chooseMoveSpy: jasmine.Spy;
    private onLegalUserMoveSpy: jasmine.Spy;

    public static async forGame<T extends AbstractGameComponent>(
        game: string,
        configureTestModule: boolean = true)
    : Promise<ComponentTestUtils<T>>
    {
        const gameInfo: MGPOptional<GameInfo> =
            MGPOptional.ofNullable(GameInfo.ALL_GAMES().find((gameInfo: GameInfo) => gameInfo.urlName === game));
        if (gameInfo.isAbsent()) {
            throw new Error(game + ' is not a game developped on MGP, check if its name is in the second param of GameInfo');
        }
        return ComponentTestUtils.forGameWithWrapper(game,
                                                     LocalGameWrapperComponent,
                                                     {}, // TODO: remove this eh
                                                     AuthUser.NOT_CONNECTED,
                                                     configureTestModule);
    }
    public static async forGameWithWrapper<T extends AbstractGameComponent, P extends Comparable>(
        game: string,
        wrapperKind: Type<GameWrapper<P>>,
        config: GameConfig = {},
        user: AuthUser = AuthUser.NOT_CONNECTED,
        configureTestModule: boolean = true)
    : Promise<ComponentTestUtils<T, P>>
    {
        const testUtils: ComponentTestUtils<T, P> = await ComponentTestUtils.basic(game, configureTestModule, config);
        ConnectedUserServiceMock.setUser(user);
        testUtils.prepareFixture(wrapperKind);
        testUtils.detectChanges();
        tick(1);
        testUtils.bindGameComponent();
        testUtils.prepareSpies();
        return testUtils;
    }
    public static async basic<T extends AbstractGameComponent, P extends Comparable>(
        game?: string,
        configureTestModule: boolean = true,
        config: GameConfig = {}) // TODO: remove config
    : Promise<ComponentTestUtils<T, P>>
    {
        const activatedRouteStub: ActivatedRouteStub = new ActivatedRouteStub(game, 'configRoomId');
        if (configureTestModule) {
            await ComponentTestUtils.configureTestModule(activatedRouteStub, config);
        }
        return new ComponentTestUtils<T, P>(activatedRouteStub);
    }
    public static async configureTestModule(
        activatedRouteStub: ActivatedRouteStub,
        config: GameConfig = {}) // TODO: remove config
    : Promise<void>
    {
        await TestBed.configureTestingModule({
            imports: [
                AppModule,
                RouterTestingModule.withRoutes([
                    { path: 'play', component: OnlineGameWrapperComponent },
                    { path: 'server', component: BlankComponent },
                ]),
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ActivatedRoute, useValue: activatedRouteStub },
                // { provide: GameConfig, useValue: config }, // TODO KILL
                { provide: UserDAO, useClass: UserDAOMock },
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
                { provide: CurrentGameService, useClass: CurrentGameServiceMock },
                { provide: ChatDAO, useClass: ChatDAOMock },
                { provide: ConfigRoomDAO, useClass: ConfigRoomDAOMock },
                { provide: PartDAO, useClass: PartDAOMock },
                { provide: ErrorLoggerService, useClass: ErrorLoggerServiceMock },
            ],
        }).compileComponents();
    }

    public constructor(private readonly activatedRouteStub: ActivatedRouteStub) {}

    public prepareFixture(wrapperKind: Type<GameWrapper<P>>): void {
        this.fixture = TestBed.createComponent(wrapperKind);
        this.wrapper = this.fixture.debugElement.componentInstance;
        this.debugElement = this.fixture.debugElement;
    }
    public bindGameComponent(): void {
        expect(this.wrapper.gameComponent).withContext('gameComponent should be bound on the wrapper').toBeDefined();
        this.gameComponent = this.wrapper.gameComponent;
    }
    public prepareSpies(): void {
        this.cancelMoveSpy = spyOn(this.gameComponent, 'cancelMove').and.callThrough();
        this.chooseMoveSpy = spyOn(this.gameComponent, 'chooseMove').and.callThrough();
        this.onLegalUserMoveSpy = spyOn(this.wrapper, 'onLegalUserMove').and.callThrough();
        this.canUserPlaySpy = spyOn(this.gameComponent, 'canUserPlay').and.callThrough();
    }
    public expectToBeCreated(): void {
        expect(this.wrapper).withContext('Wrapper should be created').toBeTruthy();
        expect(this.getComponent()).withContext('Component should be created').toBeTruthy();
    }
    public detectChanges(): void {
        this.fixture.detectChanges();
    }
    public forceChangeDetection(): void {
        this.fixture.debugElement.injector.get<ChangeDetectorRef>(ChangeDetectorRef).markForCheck();
        this.detectChanges();
    }
    public setRoute(id: string, value: string): void {
        this.activatedRouteStub.setRoute(id, value);
    }
    public setupState(state: GameState,
                      previousState?: GameState,
                      previousMove?: Move)
    : void
    {
        this.gameComponent.node = new MGPNode(
            state,
            MGPOptional.ofNullable(previousState).map((previousState: GameState) =>
                new MGPNode(previousState)),
            MGPOptional.ofNullable(previousMove),
        );
        this.gameComponent.updateBoard();
        if (previousMove !== undefined) {
            this.gameComponent.showLastMove(previousMove);
        }
        this.forceChangeDetection();
    }
    public getComponent(): T {
        return (this.gameComponent as unknown) as T;
    }
    /**
     * @param nameInHtml The real name (id) of the element in the XML
     * @param nameInFunction Its name inside the code
     */
    public async expectClickSuccessWithAsymmetricNaming(nameInHtml: string, nameInFunction: string): Promise<void> {
        await this.expectInterfaceClickSuccess(nameInHtml);
        expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(nameInFunction);
        this.canUserPlaySpy.calls.reset();
    }
    public async expectClickSuccess(elementName: string): Promise<void> {
        return this.expectClickSuccessWithAsymmetricNaming(elementName, elementName);
    }
    public async expectInterfaceClickSuccess(elementName: string, waitOneMs: boolean = false): Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        const context: string = 'expectInterfaceClickSuccess(' + elementName + ')';
        expect(element).withContext('Element "' + elementName + '" should exist').toBeTruthy();
        element.triggerEventHandler('click', null);
        if (waitOneMs) {
            tick(1);
        }

        await this.fixture.whenStable();
        this.fixture.detectChanges();
        expect(this.cancelMoveSpy).not
            .withContext(context)
            .toHaveBeenCalledWith();
        expect(this.chooseMoveSpy).not
            .withContext(context)
            .toHaveBeenCalledWith();
        expect(this.onLegalUserMoveSpy).not
            .withContext(context)
            .toHaveBeenCalledWith();
    }
    public async expectClickFailureWithAsymmetricNaming(nameInHtml: string,
                                                        nameInFunction: string,
                                                        reason?: string)
    : Promise<void>
    {
        const element: DebugElement = this.findElement(nameInHtml);
        expect(element).withContext('Element "' + nameInHtml + '" should exist').toBeTruthy();
        if (element == null) {
            return;
        } else {
            element.triggerEventHandler('click', null);
            await this.fixture.whenStable();
            this.fixture.detectChanges();
            expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(nameInFunction);
            this.canUserPlaySpy.calls.reset();
            expect(this.chooseMoveSpy).not.toHaveBeenCalled();
            if (reason == null) {
                expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith();
            } else {
                expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith(reason);
            }
            this.cancelMoveSpy.calls.reset();
            tick(3000); // needs to be >2999
        }
    }
    public async expectClickFailure(elementName: string, reason?: string): Promise<void> {
        return this.expectClickFailureWithAsymmetricNaming(elementName, elementName, reason);
    }
    public async expectClickForbidden(elementName: string, reason: string): Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext('Element "' + elementName + '" should exist').toBeTruthy();
        if (element == null) {
            return;
        } else {
            const clickValidity: MGPValidation = this.gameComponent.canUserPlay(elementName);
            expect(clickValidity.getReason()).toBe(reason);
            this.canUserPlaySpy.calls.reset();
            element.triggerEventHandler('click', null);
            await this.fixture.whenStable();
            this.fixture.detectChanges();
            expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(elementName);
            this.canUserPlaySpy.calls.reset();
            expect(this.chooseMoveSpy).not.toHaveBeenCalled();
            expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith(clickValidity.getReason());
            tick(3000); // needs to be > 2999
        }
    }
    public async expectMoveSuccess(elementName: string, move: Move) : Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext('Element "' + elementName + '" should exist').toBeTruthy();
        if (element == null) {
            return;
        } else {
            element.triggerEventHandler('click', null);
            await this.fixture.whenStable();
            this.fixture.detectChanges();
            expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(elementName);
            this.canUserPlaySpy.calls.reset();
            expect(this.chooseMoveSpy).toHaveBeenCalledOnceWith(move);
            this.chooseMoveSpy.calls.reset();
            expect(this.onLegalUserMoveSpy).toHaveBeenCalledOnceWith(move);
            this.onLegalUserMoveSpy.calls.reset();
        }
    }
    public async expectMoveFailure(elementName: string, reason: string, move: Move): Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext('Element "' + elementName + '" should exist').toBeTruthy();
        if (element == null) {
            return;
        } else {
            element.triggerEventHandler('click', null);
            await this.fixture.whenStable();
            this.fixture.detectChanges();
            expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(elementName);
            this.canUserPlaySpy.calls.reset();
            expect(this.chooseMoveSpy).toHaveBeenCalledOnceWith(move);
            this.chooseMoveSpy.calls.reset();
            expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith(reason);
            this.cancelMoveSpy.calls.reset();
            expect(this.onLegalUserMoveSpy).not.toHaveBeenCalled();
            tick(3000); // needs to be >2999
        }
    }
    public expectPassToBeForbidden(): void {
        this.expectElementNotToExist('#passButton');
    }
    public async expectPassSuccess(move: Move): Promise<void> {
        const passButton: DebugElement = this.findElement('#passButton');
        expect(passButton).withContext('Pass button is expected to be shown, but it is not').toBeTruthy();
        if (passButton == null) {
            return;
        } else {
            passButton.triggerEventHandler('click', null);
            await this.fixture.whenStable();
            this.fixture.detectChanges();
            expect(this.chooseMoveSpy).toHaveBeenCalledOnceWith(move);
            this.chooseMoveSpy.calls.reset();
            expect(this.onLegalUserMoveSpy).toHaveBeenCalledOnceWith(move);
            this.onLegalUserMoveSpy.calls.reset();
        }
    }
    public async clickElement(elementName: string): Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist on the page').toBeTruthy();
        if (element == null) {
            return;
        }
        element.triggerEventHandler('click', null);
        await this.fixture.whenStable();
        this.detectChanges();
    }
    public expectElementNotToExist(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should not exist').toBeNull();
    }
    public expectElementToExist(elementName: string): DebugElement {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist').toBeTruthy();
        return element;
    }
    public expectElementToHaveClass(elementName: string, cssClass: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist').toBeTruthy();
        if (element.attributes.class == null) {
            expect(false).withContext(elementName + ' should have class attribute').toBeTrue();
        } else {
            const classAttribute: string = element.attributes.class;
            expect(classAttribute).withContext(elementName + ' should have a class attribute').toBeTruthy();
            const elementClasses: string[] = Utils.getNonNullable(classAttribute).split(' ').sort();
            expect(elementClasses).withContext(elementName + ' should contain ' + cssClass).toContain(cssClass);
        }
    }
    public expectElementNotToHaveClass(elementName: string, cssClass: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist').toBeTruthy();
        if (element.attributes.class == null) {
            throw new Error(`${elementName} should have a class attribute`);
        } else {
            const elementClasses: string[] = element.attributes.class.split(' ').sort();
            expect(elementClasses).withContext(elementName + ' should not contain ' + cssClass).not.toContain(cssClass);
        }
    }
    public expectElementToHaveClasses(elementName: string, classes: string[]): void {
        const classesSorted: string[] = [...classes].sort();
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(elementName + ' should exist').toBeTruthy();
        expect(element.attributes.class).withContext(`${elementName} should have a class attribute`).toBeTruthy();
        const elementClasses: string[] = Utils.getNonNullable(element.attributes.class).split(' ').sort();
        expect(elementClasses).toEqual(classesSorted);
    }
    public expectElementToBeEnabled(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeElement.disabled).withContext(elementName + ' should be enabled').toBeFalsy();
    }
    public expectElementToBeDisabled(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeElement.disabled).withContext(elementName + ' should be disabled').toBeTruthy();
    }
    public findElement(elementName: string): DebugElement {
        return this.debugElement.query(By.css(elementName));
    }
}

export class TestUtils {

    public static expectValidationSuccess(validation: MGPValidation, context?: string): void {
        const reason: string = validation.getReason();
        expect(validation.isSuccess()).withContext(context + ': ' + reason).toBeTrue();
    }
}

export async function setupEmulators(): Promise<unknown> {
    await TestBed.configureTestingModule({
        imports: [
            HttpClientModule,
            FirebaseProviders.app(),
            FirebaseProviders.firestore(),
            FirebaseProviders.auth(),
        ],
        providers: [
            ConnectedUserService,
        ],
    }).compileComponents();
    TestBed.inject(Firestore.Firestore);
    TestBed.inject(Auth.Auth);
    const http: HttpClient = TestBed.inject(HttpClient);
    // Clear the content of the firestore database in the emulator
    await http.delete('http://localhost:8080/emulator/v1/projects/my-project/databases/(default)/documents').toPromise();
    // Clear the auth data in the emulator before each test
    await http.delete('http://localhost:9099/emulator/v1/projects/my-project/accounts').toPromise();
    return;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getComponentClassName(component: Type<any>): string {
    // We need to match their string representations, as it is the only way to get the name from a Type<any>
    const matches: RegExpMatchArray | null = component.toString().match(/class ([a-zA-Z0-9]+)/);
    expect(matches).withContext(`getComponentClassName should find a match in the component string representation: ${component.toString().substring(0, 40)})`).not.toBeNull();
    return Utils.getNonNullable(matches)[1];
}

/**
 * Tests that the routes are used as expected. The router.navigate method should
 * be spyed on. This function will match the route that is navigated to with
 * the declared routes of the application, and ensure that the component that is
 * routed to matches `component`. In case multiple router.navigate calls happen,
 * set otherRoutes to true.
 */
export function expectValidRouting(router: Router,
                                   path: string[],
                                   component: Type<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
                                   options?: { otherRoutes?: boolean, skipLocationChange?: boolean})
: void
{
    expect(path[0][0]).withContext('Routings should start with /').toBe('/');
    for (const pathPart of path) {
        expect(pathPart[pathPart.length-1]).withContext('Routing should not include superfluous / at the end').not.toBe('/');
    }
    const fullPath: string = path.join('/');
    const matchingRoute: MGPOptional<Route> = findMatchingRoute(fullPath);
    expect(matchingRoute.isPresent()).withContext(`Expected route to be present for path: ${path}`).toBeTrue();
    const routedToComponent: string = getComponentClassName(Utils.getNonNullable(matchingRoute.get().component));
    const expectedComponent: string = getComponentClassName(component);
    expect(routedToComponent).withContext('It should route to the expected component').toEqual(expectedComponent);
    const otherRoutes: boolean = options != null && options.otherRoutes != null && options.otherRoutes;
    const skipLocationChange: boolean =
        options != null && options.skipLocationChange != null && options.skipLocationChange;
    if (otherRoutes) {
        if (skipLocationChange) {
            expect(router.navigate).toHaveBeenCalledWith(path, { skipLocationChange: true });
        } else {
            expect(router.navigate).toHaveBeenCalledWith(path);
        }
    } else {
        if (skipLocationChange) {
            expect(router.navigate).toHaveBeenCalledOnceWith(path, { skipLocationChange: true });
        } else {
            expect(router.navigate).toHaveBeenCalledOnceWith(path);
        }
    }
}

/**
 * Similar to expectValidRouting, but for checking HTML elements that provide a routerLink.
 */
export function expectValidRoutingLink(element: DebugElement, fullPath: string, component: Type<unknown>): void {
    expect(fullPath[0]).withContext('Routings should start with /').toBe('/');

    expect(element.attributes.routerLink).withContext('Routing links should have a routerLink').toBeDefined();
    expect(element.attributes.routerLink).toEqual(fullPath);
    const matchingRoute: MGPOptional<Route> = findMatchingRoute(fullPath);
    expect(matchingRoute.isPresent()).withContext(`Expected route to be present for path: ${fullPath}`).toBeTrue();
    const routedToComponent: string = getComponentClassName(Utils.getNonNullable(matchingRoute.get().component));
    const expectedComponent: string = getComponentClassName(component);
    expect(routedToComponent).withContext('It should route to the expected component').toEqual(expectedComponent);
}

/**
 * Checks that a promise resulted in a firestore 'permission-denied' error.
 * Useful to test that permissions on firestore work as expected.
 */
export async function expectPermissionToBeDenied<T>(promise: Promise<T>): Promise<void> {
    const throwIfFulfilled: () => void = () => {
        throw new Error('Expected a promise to be rejected but it was resolved');
    };
    const checkErrorCode: (actualValue: FirebaseError) => void = (actualValue: FirebaseError) => {
        expect(actualValue.code).toBe('permission-denied');
    };
    await promise.then(throwIfFulfilled, checkErrorCode);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareUnsubscribeCheck(service: any, subscribeMethod: string): () => void {

    let unsubscribed: boolean = false;
    spyOn(service, subscribeMethod).and.returnValue(new Subscription(() => {
        unsubscribed = true;
    }));
    return () => {
        expect(unsubscribed)
            .withContext('Service should have unsubscribed to ' + subscribeMethod + ' method bub did not')
            .toBeTrue();
    };
}
