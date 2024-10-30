/* eslint-disable max-lines-per-function */
import { DOCUMENT } from '@angular/common';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { WelcomeComponent } from 'src/app/components/normal-component/welcome/welcome.component';
import { ThemeService } from '../ThemeService';
import { SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';

describe('ThemeService', () => {

    let themeService: ThemeService;
    let testUtils: SimpleComponentTestUtils<WelcomeComponent>;

    function getThemeElement(): HTMLLinkElement {
        // We have to use DOCUMENT here, because the component fixture is not enough: it does not contain the head tag
        return TestBed.inject(DOCUMENT).getElementById('theme') as HTMLLinkElement;
    }

    async function prepare(): Promise<void> {
        testUtils = await SimpleComponentTestUtils.create(WelcomeComponent);
        themeService = TestBed.inject(ThemeService);
    }

    describe('without stored theme nor preferred color scheme', () => {
        beforeEach(fakeAsync(async() => {
            await prepare();
        }));

        it('should load some theme at construction', fakeAsync(async() => {
            // When the page loads
            testUtils.detectChanges();
            tick(1000);
            // Then the CSS is set to an existing theme
            expect(getThemeElement().href).toMatch('/(light|dark).css$');
        }));
        it('should change the theme when loadTheme is called', () => {
            // Given a loaded page
            testUtils.detectChanges();

            // When a new theme is loaded
            themeService.loadTheme('dark');

            // Then the CSS has been changed
            expect(getThemeElement().href).toMatch('/dark.css$');
            expect(themeService.getTheme()).toBe('dark');
        });
    });
    it('should use the stored theme if there is one', fakeAsync(async() => {
        // Given that the dark theme is the stored setting
        localStorage.setItem('theme', 'dark');
        spyOn(localStorage, 'getItem').and.callThrough();
        // When the page is loaded
        await prepare();
        testUtils.detectChanges();
        // Then the dark theme has been loaded
        expect(getThemeElement().href).toMatch('/dark.css$');
        localStorage.clear();
    }));
    it('should fall back to default if the stored theme is invalid', fakeAsync(async() => {
        const realMatchMedia: (query: string) => MediaQueryList = window.matchMedia;
        localStorage.setItem('theme', 'invalid-theme');
        spyOn(localStorage, 'getItem').and.callThrough();
        // Given that the stored theme is invalid and there is no preferred color scheme
        spyOn(window, 'matchMedia').and.callFake(function(query: string): MediaQueryList {
            const result: MediaQueryList = realMatchMedia(query);
            return { ...result, matches: false };
        });
        // When the page is loaded
        await prepare();
        testUtils.detectChanges();
        // Then the (default) dark theme has been loaded
        expect(getThemeElement().href).toMatch('/dark.css$');
        localStorage.clear();
    }));
    it('should use the preferred color scheme if there is one and no theme has been chosen (dark)', fakeAsync(async() => {
        const realMatchMedia: (query: string) => MediaQueryList = window.matchMedia;
        // Given that the preferred color scheme is dark
        spyOn(window, 'matchMedia').and.callFake(function(query: string): MediaQueryList {
            const result: MediaQueryList = realMatchMedia(query);
            return { ...result, matches: query === '(prefers-color-scheme: dark)' };

        });
        // When the page is loaded
        await prepare();
        testUtils.detectChanges();
        // Then the dark theme has been loaded
        expect(getThemeElement().href).toMatch('/dark.css$');
    }));
    it('should use the preferred color scheme if there is one and no theme has been chosen (light)', fakeAsync(async() => {
        const realMatchMedia: (query: string) => MediaQueryList = window.matchMedia;
        // Given that the preferred color scheme is dark
        spyOn(window, 'matchMedia').and.callFake(function(query: string): MediaQueryList {
            const result: MediaQueryList = realMatchMedia(query);
            return { ...result, matches: query === '(prefers-color-scheme: light)' };

        });
        // When the page is loaded
        await prepare();
        testUtils.detectChanges();
        // Then the dark theme has been loaded
        expect(getThemeElement().href).toMatch('/light.css$');
    }));
    it('should use the dark theme if there is no other preference', fakeAsync(async() => {
        const realMatchMedia: (query: string) => MediaQueryList = window.matchMedia;
        // Given that there is no preferred color scheme
        spyOn(window, 'matchMedia').and.callFake(function(query: string): MediaQueryList {
            const result: MediaQueryList = realMatchMedia(query);
            return { ...result, matches: false };
        });
        // When the page is loaded
        await prepare();
        testUtils.detectChanges();
        // Then the dark theme has been loaded
        expect(getThemeElement().href).toMatch('/dark.css$');
    }));
});
