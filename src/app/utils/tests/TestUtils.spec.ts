/* eslint-disable max-lines-per-function */
import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, DebugElement, Type } from '@angular/core';
import { ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GameState } from '../../jscaip/state/GameState';
import { Move } from '../../jscaip/Move';
import { AppModule } from '../../app.module';
import { UserDAO } from '../../dao/UserDAO';
import { ConnectedUserService, AuthUser } from '../../services/ConnectedUserService';
import { GameNode, GameNodeStats } from '../../jscaip/AI/GameNode';
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
import { Comparable, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ErrorLoggerService } from 'src/app/services/ErrorLoggerService';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { AbstractGameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { findMatchingRoute } from 'src/app/app.module.spec';
import { HumanDurationPipe } from 'src/app/pipes-and-directives/human-duration.pipe';
import { ToggleVisibilityDirective } from 'src/app/pipes-and-directives/toggle-visibility.directive';
import { FirestoreTimePipe } from 'src/app/pipes-and-directives/firestore-time.pipe';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { FirebaseError } from 'firebase/app';
import { Subscription } from 'rxjs';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { CurrentGameServiceMock } from 'src/app/services/tests/CurrentGameService.spec';
import { GameInfo } from 'src/app/components/normal-component/pick-game/pick-game.component';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Player } from 'src/app/jscaip/Player';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { TestVars } from 'src/TestVars.spec';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { SuperRules } from 'src/app/jscaip/Rules';
import { GameServiceMock } from 'src/app/services/tests/GameServiceMock.spec';
import { GameService } from 'src/app/services/GameService';
import { ConfigRoomService } from 'src/app/services/ConfigRoomService';
import { ServerTimeService } from 'src/app/services/ServerTimeService';
import { ServerTimeServiceMock } from 'src/app/services/tests/ServerTimeServiceMock.spec';
import { ConfigRoomServiceMock } from 'src/app/services/tests/ConfigRoomServiceMock.spec';

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
                    // This is the same behavior than ActivatedRoute
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

    protected fixture: ComponentFixture<T>;
    protected component: T;

    private infoMessageSpy: jasmine.Spy;
    private criticalMessageSpy: jasmine.Spy;
    protected gameMessageSpy: jasmine.Spy;

    public static async create<U>(componentType: Type<U>,
                                  activatedRouteStub?: ActivatedRouteStub,
                                  configureTestModule: boolean = true)
    : Promise<SimpleComponentTestUtils<U>>
    {
        if (configureTestModule) {
            await ConfigureTestingModuleUtils.configureTestingModule(componentType, activatedRouteStub);
        }
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        const testUtils: SimpleComponentTestUtils<U> = new SimpleComponentTestUtils<U>();
        testUtils.prepareFixture(componentType);
        testUtils.prepareMessageDisplayerSpies();
        return testUtils;
    }

    protected constructor() {}

    public prepareFixture(componentType: Type<T>): void {
        this.fixture = TestBed.createComponent(componentType);
        this.component = this.fixture.debugElement.componentInstance;
    }

    public getComponent(): T {
        return this.component;
    }

    public detectChanges(): void {
        this.fixture.detectChanges();
    }

    public destroy(): void {
        return this.fixture.destroy();
    }

    public prepareMessageDisplayerSpies(): void {
        const messageDisplayer: MessageDisplayer = TestBed.inject(MessageDisplayer);
        if (jasmine.isSpy(messageDisplayer.gameMessage)) {
            this.gameMessageSpy = messageDisplayer.gameMessage as jasmine.Spy;
        } else {
            this.gameMessageSpy = spyOn(messageDisplayer, 'gameMessage').and.callFake(this.failOn('gameMessage'));
        }
        if (jasmine.isSpy(messageDisplayer.criticalMessage)) {
            this.criticalMessageSpy = messageDisplayer.criticalMessage as jasmine.Spy;
        } else {
            this.criticalMessageSpy = spyOn(messageDisplayer, 'criticalMessage').and.callFake(this.failOn('criticalMessage'));
        }
        if (jasmine.isSpy(messageDisplayer.infoMessage)) {
            this.infoMessageSpy = messageDisplayer.infoMessage as jasmine.Spy;
        } else {
            this.infoMessageSpy = spyOn(messageDisplayer, 'infoMessage').and.callFake(this.failOn('infoMessage'));
        }
    }

    private failOn(typeOfMessage: string): (message: string) => void {
        return (message: string) => {
            fail(`MessageDisplayer: ${typeOfMessage} was called with '${message}' but no toast was expected, use expectToDisplay"!`);
        };
    }

    public async expectToDisplayGameMessage<U>(message: string, fn: () => Promise<U>): Promise<U> {
        this.gameMessageSpy.and.returnValue(undefined);
        const result: U = await fn();
        expect(this.gameMessageSpy).toHaveBeenCalledOnceWith(message);
        this.gameMessageSpy.calls.reset();
        this.gameMessageSpy.and.callFake(this.failOn('gameMessage')); // Restore previous spy behavior
        return result;
    }

    public async expectToDisplayCriticalMessage<U>(message: string, fn: () => Promise<U>): Promise<U> {
        this.criticalMessageSpy.and.returnValue(undefined);
        const result: U = await fn();
        expect(this.criticalMessageSpy).toHaveBeenCalledOnceWith(message);
        this.criticalMessageSpy.calls.reset();
        this.criticalMessageSpy.and.callFake(this.failOn('criticalMessage')); // Restore previous spy behavior
        return result;
    }

    public async expectToDisplayInfoMessage<U>(message: string, fn: () => Promise<U>): Promise<U> {
        this.infoMessageSpy.and.returnValue(undefined);
        const result: U = await fn();
        expect(this.infoMessageSpy).toHaveBeenCalledOnceWith(message);
        this.infoMessageSpy.calls.reset();
        this.infoMessageSpy.and.callFake(this.failOn('infoMessage')); // Restore previous spy behavior
        return result;
    }

    public async clickElement(elementName: string, waitInMs?: number): Promise<void> {
        const element: DebugElement = this.findElement(elementName);
        element.triggerEventHandler('click', null);
        tick(0);
        if (waitInMs !== undefined) {
            tick(waitInMs);
        }
        this.detectChanges();
    }

    public forceChangeDetection(): void {
        this.fixture.debugElement.injector.get<ChangeDetectorRef>(ChangeDetectorRef).markForCheck();
        this.detectChanges();
    }

    // Find a unique element given a CSS selector
    public findElement(elementName: string): DebugElement {
        this.forceChangeDetection();
        const elements: DebugElement[] = this.fixture.debugElement.queryAll(By.css(elementName));
        expect(elements.length)
            .withContext(`element should exist but does not: ${elementName}`)
            .toBeGreaterThan(0);
        expect(elements.length)
            .withContext(`findElement with id as argument expects a unique result, but got ${elements.length} results instead for element '${elementName}'`)
            .toBe(1);
        return elements[0];
    }

    public findElements(elementName: string): DebugElement[] {
        return this.fixture.debugElement.queryAll(By.css(elementName));
    }

    public findElementByDirective(directive: Type<unknown>): DebugElement {
        const element: DebugElement = this.fixture.debugElement.query(By.directive(directive));
        expect(element)
            .withContext(`element with directive '${directive}' should exist`)
            .not.toBeNull();
        return element;
    }

    public expectElementToHaveClass(elementId: string, cssClass: string): void {
        const element: DebugElement = this.findElement(elementId);
        expect(element.attributes.class).withContext(`${elementId} should have a class attribute`).toBeTruthy();
        expect(element.attributes.class).withContext(`${elementId} should have a class attribute`).not.toEqual('');
        if (element.attributes.class != null && element.attributes.class !== '') {
            const elementClasses: string[] = element.attributes.class.split(' ').sort();
            expect(elementClasses).withContext(`${elementId} should contain CSS class ${cssClass}`).toContain(cssClass);
        }
    }

    public expectElementsToHaveClass(selector: string, cssClass: string): void {
        const elements: DebugElement[] = this.fixture.debugElement.queryAll(By.css(selector));
        expect(elements.length)
            .withContext('expectElementsToHaveClass expects to check multiple elements')
            .toBeGreaterThan(1);
        for (const element of elements) {
            expect(element.attributes.class).withContext(`${selector} should have a class attribute`).toBeTruthy();
            expect(element.attributes.class).withContext(`${selector} should have a class attribute`).not.toEqual('');
            if (element.attributes.class != null && element.attributes.class !== '') {
                const elementClasses: string[] = element.attributes.class.split(' ').sort();
                expect(elementClasses).withContext(`${selector} should contain CSS class ${cssClass}`).toContain(cssClass);
            }
        }
    }

    public expectElementNotToHaveClass(elementName: string, cssClass: string): void {
        const element: DebugElement = this.findElement(elementName);
        if (element.attributes.class != null) {
            const elementClasses: string[] = element.attributes.class.split(' ').sort();
            expect(elementClasses).withContext(`${elementName} should not contain CSS class ${cssClass}`).not.toContain(cssClass);
        }
    }

    public expectElementToHaveClasses(elementName: string, classes: string[]): void {
        const classesSorted: string[] = [...classes].sort();
        const element: DebugElement = this.findElement(elementName);
        expect(element).withContext(`${elementName} should exist`).toBeTruthy();
        expect(element.attributes.class).withContext(`${elementName} should have a class attribute`).toBeTruthy();
        const elementClasses: string[] = Utils.getNonNullable(element.attributes.class).split(' ').sort();
        expect(elementClasses).withContext(`For ${elementName}`).toEqual(classesSorted);
    }

    public expectElementNotToExist(elementName: string): void {
        this.forceChangeDetection();
        const isValidElementName: boolean =
            elementName.startsWith('#') || elementName.startsWith('.') || elementName.startsWith('app-');
        expect(isValidElementName).withContext(`${elementName} should be an HTML element name (id, class, or app-)`).toBeTrue();
        const element: DebugElement | null = this.fixture.debugElement.query(By.css(elementName));
        expect(element).withContext(`${elementName} should not exist`).toBeNull();
    }

    public expectElementToExist(elementName: string): void {
        this.findElement(elementName); // findElement asserts that it should exist (and be unique)
    }

    public expectElementToBeEnabled(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeElement.disabled).withContext(`${elementName} should be enabled`).toBeFalsy();
    }

    public expectElementToBeDisabled(elementName: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeElement.disabled).withContext(`${elementName} should be disabled`).toBeTruthy();
    }

    public expectTextToBe(elementName: string, expectedText: string): void {
        const element: DebugElement = this.findElement(elementName);
        expect(element.nativeNode.innerHTML).toEqual(expectedText);
    }

    public fillInput(elementName: string, value: string): void {
        const element: DebugElement = this.findElement(elementName);
        element.nativeElement.value = value;
        element.nativeElement.dispatchEvent(new Event('input'));
    }

    public async selectChildElementOfDropDown(dropDownName: string, childName: string): Promise<void> {
        const selectedDropDOwn: HTMLSelectElement = this.findElement(dropDownName).nativeElement;
        selectedDropDOwn.value = selectedDropDOwn.options[childName].value;
        selectedDropDOwn.dispatchEvent(new Event('change'));
        this.detectChanges();
        tick();
    }

}

export class ComponentTestUtils<C extends AbstractGameComponent, P extends Comparable = string>
    extends SimpleComponentTestUtils<GameWrapper<P>>
{
    private gameComponent: AbstractGameComponent;

    private canUserPlaySpy: jasmine.Spy;
    private cancelMoveSpy: jasmine.Spy;
    private chooseMoveSpy: jasmine.Spy;
    private onLegalUserMoveSpy: jasmine.Spy;

    public static async forGame<Component extends AbstractGameComponent>(
        game: string,
        configureTestingModule: boolean = true,
        chooseDefaultConfig: boolean = true)
    : Promise<ComponentTestUtils<Component>>
    {
        const optionalGameInfo: MGPOptional<GameInfo> =
            MGPOptional.ofNullable(GameInfo.getAllGames().find((gameInfo: GameInfo) => gameInfo.urlName === game));
        if (optionalGameInfo.isAbsent()) {
            throw new Error(game + ' is not a game developed on EveryBoard, check if its name is in the second param of GameInfo');
        }
        return ComponentTestUtils.forGameWithWrapper(game,
                                                     LocalGameWrapperComponent,
                                                     AuthUser.NOT_CONNECTED,
                                                     configureTestingModule,
                                                     chooseDefaultConfig);
    }

    public static async forGameWithWrapper<Component extends AbstractGameComponent, Actor extends Comparable>(
        game: string,
        wrapperKind: Type<GameWrapper<Actor>>,
        user: AuthUser = AuthUser.NOT_CONNECTED,
        configureTestingModule: boolean = true,
        chooseDefaultConfig: boolean = true)
    : Promise<ComponentTestUtils<Component, Actor>>
    {
        const testUtils: ComponentTestUtils<Component, Actor> =
            await ComponentTestUtils.basic(game, configureTestingModule);
        ConnectedUserServiceMock.setUser(user);
        testUtils.prepareFixture(wrapperKind);
        testUtils.detectChanges();
        tick(1); // Need to be at least 1ms
        if (chooseDefaultConfig) {
            const wrapperIsLocal: boolean = testUtils.getWrapper() instanceof LocalGameWrapperComponent;
            const config: MGPOptional<RulesConfig> = GameInfo.getByUrlName(game).get().getRulesConfig();
            if (wrapperIsLocal && config.isPresent()) {
                await testUtils.acceptDefaultConfig();
            }
            /**
             * If we just choose default config, here, the local game wrapper is not yet in playing phase
             * so most things are not spyable
             */
            testUtils.bindGameComponent();
            testUtils.prepareSpies();
        }
        return testUtils;
    }

    public static async basic<Component extends AbstractGameComponent, Actor extends Comparable>(
        game: string,
        configureTestingModule: boolean = true)
    : Promise<ComponentTestUtils<Component, Actor>>
    {
        const activatedRouteStub: ActivatedRouteStub = new ActivatedRouteStub(game, 'configRoomId');
        if (configureTestingModule) {
            await ConfigureTestingModuleUtils.configureTestingModuleForGame(activatedRouteStub);
        }
        const testUtils: ComponentTestUtils<Component, Actor> = new ComponentTestUtils<Component, Actor>();
        testUtils.prepareMessageDisplayerSpies();
        return testUtils;
    }

    public async acceptDefaultConfig(): Promise<void> {
        await this.clickElement('#start-game-with-config');
        tick(1);
    }

    public bindGameComponent(): void {
        expect(this.component.gameComponent).withContext('gameComponent should be bound on the wrapper').toBeDefined();
        this.gameComponent = this.component.gameComponent;
    }

    public prepareSpies(): void {
        this.cancelMoveSpy = spyOn(this.gameComponent, 'cancelMove').and.callThrough();
        this.chooseMoveSpy = spyOn(this.gameComponent, 'chooseMove').and.callThrough();
        this.onLegalUserMoveSpy = spyOn(this.component, 'onLegalUserMove').and.callThrough();
        this.canUserPlaySpy = spyOn(this.gameComponent, 'canUserPlay').and.callThrough();
    }

    public resetSpies(): void {
        this.cancelMoveSpy.calls.reset();
        this.chooseMoveSpy.calls.reset();
        this.onLegalUserMoveSpy.calls.reset();
        this.canUserPlaySpy.calls.reset();
    }

    public expectToBeCreated(): void {
        expect(this.getWrapper()).withContext('Wrapper should be created').toBeTruthy();
        expect(this.getGameComponent()).withContext('Component should be created').toBeTruthy();
    }

    public override forceChangeDetection(): void {
        this.fixture.debugElement.injector.get<ChangeDetectorRef>(ChangeDetectorRef).markForCheck();
        this.detectChanges();
    }

    public setRoute(id: string, value: string): void {
        TestBed.inject(ActivatedRouteStub).setRoute(id, value);
    }

    public async setupState(state: GameState,
                            params: { previousState?: GameState,
                                      previousMove?: Move,
                                      config?: MGPOptional<RulesConfig>
                            } = {})
    : Promise<void>
    {
        const config: MGPOptional<RulesConfig> = this.getConfigFrom(params.config);
        if (config.isPresent()) {
            const wrapper: LocalGameWrapperComponent = this.getWrapper() as unknown as LocalGameWrapperComponent;
            wrapper.updateConfig(config);
            this.gameComponent.config = config;
            wrapper.markConfigAsFilled();
            tick(0);
        }
        this.gameComponent.node = new GameNode(
            state,
            MGPOptional.ofNullable(params.previousState).map((previousState: GameState) =>
                new GameNode(previousState)),
            MGPOptional.ofNullable(params.previousMove),
        );
        await this.gameComponent.updateBoardAndRedraw(false);
        if (params.previousMove !== undefined) {
            await this.gameComponent.showLastMove(params.previousMove);
        }
        this.forceChangeDetection();
    }

    private getConfigFrom(config?: MGPOptional<RulesConfig>): MGPOptional<RulesConfig> {
        if (config === undefined) {
            return this.gameComponent.rules.getDefaultRulesConfig();
        } else {
            return config;
        }
    }

    public getWrapper(): GameWrapper<P> {
        return this.component;
    }

    public getGameComponent(): C {
        return (this.gameComponent as unknown) as C;
    }

    /**
     * @param nameInHtml The real name (id) of the element in the XML
     * @param nameInFunction Its name inside the code
     */
    public async expectClickSuccessWithAsymmetricNaming(nameInHtml: string,
                                                        nameInFunction: string,
                                                        context?: string)
    : Promise<void>
    {
        await this.expectInterfaceClickSuccess(nameInHtml, context);
        expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(nameInFunction);
        this.canUserPlaySpy.calls.reset();
    }

    public expectTranslationYToBe(elementSelector: string, y: number): void {
        const element: DebugElement = this.findElement(elementSelector);
        const transform: SVGTransform = element.nativeElement.transform.baseVal.getItem(0);
        expect(transform.type).toBe(SVGTransform.SVG_TRANSFORM_TRANSLATE);
        // In a SVG transform, f is the y coordinate
        expect(transform.matrix.f).toBe(y);
    }

    public async expectClickSuccess(elementName: string, context?: string): Promise<void> {
        return this.expectClickSuccessWithAsymmetricNaming(elementName, elementName, context);
    }

    public async expectInterfaceClickSuccess(elementName: string, context?: string, waitInMs?: number): Promise<void> {
        if (context == null) {
            context = 'expectInterfaceClickSuccess(' + elementName + ')';
        }
        await this.clickElement(elementName, waitInMs);

        expect(this.cancelMoveSpy).withContext(context).not.toHaveBeenCalledWith();
        expect(this.chooseMoveSpy).withContext(context).not.toHaveBeenCalledWith();
        expect(this.onLegalUserMoveSpy).withContext(context).not.toHaveBeenCalledWith();
    }

    /**
     * To call when you expect the component to reject the click.
     * If you expect the code to submit the move, and the rules to reject it:
     *     then use expectMoveFailure[WithAsymmetricNaming]
     * @param nameInHtml name of the clicked element in the HTML file
     * @param nameInFunction name of the element inside the TS file
     * @param reason the toasted error message
     */
    public async expectClickFailureWithAsymmetricNaming(nameInHtml: string,
                                                        nameInFunction: string,
                                                        reason?: string)
    : Promise<void>
    {
        if (reason == null) {
            await this.clickElement(nameInHtml);
        } else {
            await this.expectToDisplayGameMessage(reason, async() => {
                await this.clickElement(nameInHtml);
            });
        }
        expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(nameInFunction);
        this.canUserPlaySpy.calls.reset();
        expect(this.chooseMoveSpy)
            .withContext('chooseMove should not be called in case of click failure. If you expect the code to submit the move, and the rules to reject it, use expectMoveFailure.')
            .not.toHaveBeenCalled();
        if (reason == null) {
            expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith();
        } else {
            expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith(reason);
        }
        this.cancelMoveSpy.calls.reset();
    }

    public async expectClickFailure(elementName: string, reason?: string): Promise<void> {
        return this.expectClickFailureWithAsymmetricNaming(elementName, elementName, reason);
    }

    public async expectClickForbidden(elementName: string, reason: string): Promise<void> {
        const clickValidity: MGPValidation = await this.gameComponent.canUserPlay(elementName);
        expect(clickValidity.getReason()).toBe(reason);
        this.canUserPlaySpy.calls.reset();

        await this.expectToDisplayGameMessage(reason, async() => {
            await this.clickElement(elementName);
        });
        expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(elementName);
        this.canUserPlaySpy.calls.reset();
        expect(this.chooseMoveSpy).not.toHaveBeenCalled();
        expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith(reason);
        this.cancelMoveSpy.calls.reset();
    }

    public async expectMoveSuccess(elementName: string,
                                   move: Move,
                                   clickAnimationDuration?: number)
    : Promise<void>
    {
        return this.expectMoveSuccessWithAsymmetricNaming(elementName, elementName, move, clickAnimationDuration);
    }

    public async expectMoveSuccessWithAsymmetricNaming(nameInHtml: string,
                                                       nameInFunction: string,
                                                       move: Move,
                                                       clickAnimationDuration?: number)
    : Promise<void>
    {
        await this.clickElement(nameInHtml);
        if (clickAnimationDuration === undefined) {
            tick(0);
        } else {
            tick(clickAnimationDuration);
        }
        expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(nameInFunction);
        this.canUserPlaySpy.calls.reset();
        expect(this.chooseMoveSpy).toHaveBeenCalledOnceWith(move);
        this.chooseMoveSpy.calls.reset();
        expect(this.onLegalUserMoveSpy).toHaveBeenCalledOnceWith(move);
        this.onLegalUserMoveSpy.calls.reset();
    }

    public async expectMoveFailure(elementName: string, reason: string, move: Move) : Promise<void> {
        await this.expectToDisplayGameMessage(reason, async() => {
            await this.clickElement(elementName);
        });
        expect(this.canUserPlaySpy).toHaveBeenCalledOnceWith(elementName);
        this.canUserPlaySpy.calls.reset();
        expect(this.chooseMoveSpy).toHaveBeenCalledOnceWith(move);
        this.chooseMoveSpy.calls.reset();
        expect(this.cancelMoveSpy).toHaveBeenCalledOnceWith(reason);
        this.cancelMoveSpy.calls.reset();
        expect(this.onLegalUserMoveSpy).not.toHaveBeenCalled();
    }

    public expectPassToBeForbidden(): void {
        this.expectElementNotToExist('#pass-button');
    }

    public async expectPassSuccess(move: Move): Promise<void> {
        await this.clickElement('#pass-button', 0);
        expect(this.chooseMoveSpy).toHaveBeenCalledOnceWith(move);
        this.chooseMoveSpy.calls.reset();
        expect(this.onLegalUserMoveSpy).toHaveBeenCalledOnceWith(move);
        this.onLegalUserMoveSpy.calls.reset();
    }

    public async selectAIPlayer(player: Player): Promise<void> {
        await this.choosingAIOrHuman(player, 'AI');
        await this.choosingAILevel(player);
    }

    public choosingAIOrHuman(player: Player, aiOrHuman: 'AI' | 'human'): void {
        const dropDownName: string = player === Player.ZERO ? '#player-select-0' : '#player-select-1';
        const selectAI: HTMLSelectElement = this.findElement(dropDownName).nativeElement;
        selectAI.value = aiOrHuman === 'AI' ? selectAI.options[1].value : selectAI.options[0].value;
        selectAI.dispatchEvent(new Event('change'));
        this.detectChanges();
        tick(0);
    }

    public async choosingAILevel(player: Player): Promise<void> {
        const dropDownName: string = player === Player.ZERO ? '#ai-option-select-0' : '#ai-option-select-1';
        const childrenName: string = player === Player.ZERO ? 'player-0-option-Level 1' : 'player-1-option-Level 1';
        await this.selectChildElementOfDropDown(dropDownName, childrenName);
        const selectDepth: HTMLSelectElement = this.findElement(dropDownName).nativeElement;
        const aiDepth: string = selectDepth.options[selectDepth.selectedIndex].label;
        expect(aiDepth).toBe('Level 1');
        this.detectChanges();
    }

}

export class ConfigureTestingModuleUtils {

    public static async configureTestingModuleForGame(activatedRouteStub: ActivatedRouteStub): Promise<void> {
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
                { provide: UserDAO, useClass: UserDAOMock },
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
                { provide: CurrentGameService, useClass: CurrentGameServiceMock },
                { provide: ChatDAO, useClass: ChatDAOMock },
                { provide: ConfigRoomDAO, useClass: ConfigRoomDAOMock },
                { provide: PartDAO, useClass: PartDAOMock },
                { provide: ErrorLoggerService, useClass: ErrorLoggerServiceMock },
                { provide: GameService, useClass: GameServiceMock },
                { provide: ConfigRoomService, useClass: ConfigRoomServiceMock },
                { provide: ServerTimeService, useClass: ServerTimeServiceMock },
            ],
        }).compileComponents();
    }

    public static async configureTestingModule(componentType: object,
                                               activatedRouteStub?: ActivatedRouteStub)
    : Promise<void>
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
                { provide: GameService, useClass: GameServiceMock },
                { provide: ConfigRoomService, useClass: ConfigRoomServiceMock },
                { provide: ServerTimeService, useClass: ServerTimeServiceMock },
            ],
        }).compileComponents();
    }
}

export async function setupEmulators(): Promise<unknown> {
    new AppModule(); // This will initialize firebase with the emulators
    await TestBed.configureTestingModule({
        imports: [
            HttpClientModule,
        ],
        providers: [
            ConnectedUserService,
        ],
    }).compileComponents();
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
 * be spied on. This function will match the route that is navigated to with
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

/**
 * Returns a checker to verify that a subscription method has been correctly unsubscribed
 * to in case it has been subscribed first.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prepareUnsubscribeCheck(service: any, subscribeMethod: string): () => void {

    let subscribed: boolean = false;
    let unsubscribed: boolean = false;
    const spy: jasmine.Spy = spyOn(service, subscribeMethod);
    spy.and.callFake((...args: unknown[]): Subscription => {
        subscribed = true;
        // We need to call the original function.
        // This is a bit hacky, but seems to be the only way:
        // we change the spy to call through, and apply the original method.
        // This is fine for subscribe methods as they are expected to be called only once.
        spy.and.callThrough();
        service[subscribeMethod](...args);
        return new Subscription(() => {
            unsubscribed = true;
        });
    });
    return () => {
        expect(subscribed)
            .withContext('Service should have subscribed to ' + subscribeMethod + ' method but did not')
            .toBeTrue();
        expect(unsubscribed)
            .withContext('Service should have unsubscribed to ' + subscribeMethod + ' method but did not')
            .toBeTrue();
    };
}

const regularIt: (name: string, testBody: () => void) => void = it;
const regularFit: (name: string, testBody: () => void) => void = fit;
const regularXit: (name: string, testBody: () => void) => void = xit;
export namespace SlowTest {

    // Run a slow test, only if that option is enabled
    export function it(name: string, testBody: () => void): void {
        if (TestVars.slowTests) {
            regularIt(name, testBody);
        } else {
            // Instead of doing nothing when slow tests are disabled, which would result in a potential karma error
            // ("describe without it"), we use xit
            regularXit(name, testBody);
        }
    }

    // Does a focused test (a fit), and ignores the TestVars.slowTests option
    export function fit(name: string, testBody: () => void): void {
        regularFit(name, testBody);
    }

}

export type MinimaxTestOptions<R extends SuperRules<M, S, C, L>,
                               M extends Move,
                               S extends GameState,
                               C extends RulesConfig,
                               L> = {
    rules: R,
    minimax: Minimax<M, S, C, L>,
    options: AIDepthLimitOptions,
    config: MGPOptional<C>,
    shouldFinish: boolean
}

/* Run a minimax test by battling it against itself for a number of turns */
export function minimaxTest<R extends SuperRules<M, S, C, L>,
                            M extends Move,
                            S extends GameState,
                            C extends RulesConfig,
                            L>(options: MinimaxTestOptions<R, M, S, C, L>): void
{
    // Given a component where AI plays against AI
    let node: GameNode<M, S> = options.rules.getInitialNode(options.config);
    const limit: number = 10000; // Play for 10 seconds at most

    // When playing the needed number of turns
    // Then it should not throw errors
    let turn: number = 0;
    const start: number = performance.now();
    const nodesBefore: number = GameNodeStats.createdNodes;
    while (performance.now() < start + limit && options.rules.getGameStatus(node, options.config).isEndGame === false) {
        const bestMove: M = options.minimax.chooseNextMove(node, options.options, options.config);
        expect(bestMove).toBeDefined();
        node = node.getChild(bestMove).get();
        turn++;
    }
    const seconds: number = (performance.now() - start) / 1000;
    const nodesCreated: number = GameNodeStats.createdNodes - nodesBefore;
    console.log(`${turn / seconds} turn/s for ${options.minimax.constructor.name} with ${turn} turns in ${seconds} seconds, created ${nodesCreated} nodes, so ${nodesCreated / seconds} nodes/s`);
    // And maybe the game needs to be over
    if (options.shouldFinish) {
        expect(options.rules.getGameStatus(node, options.config).isEndGame).toBeTrue();
    }
}
