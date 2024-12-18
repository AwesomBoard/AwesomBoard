/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { UserSettingsService } from '../UserSettingsService';

describe('UserSettingsService', () => {

    let userSettingsService: UserSettingsService;

    beforeEach(() => {
        userSettingsService = new UserSettingsService();
    });

    describe('theme', () => {
        it('should update local storage on theme change', () => {
            spyOn(localStorage, 'setItem').and.callThrough();

            // When changing the theme
            userSettingsService.changeTheme('light');

            // Then localStorage is updated
            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');

            localStorage.clear();
        });
        it('should rely on local storage to know the theme', () => {
            // Given that the stored theme is 'light'
            spyOn(localStorage, 'getItem').and.returnValue('light');
            // When getting the theme
            const theme: MGPOptional<string> = userSettingsService.getTheme();
            // Then the theme is 'light'
            expect(theme.isPresent()).toBeTrue();
            expect(theme.get()).toBe('light');
        });
    });
    describe('language', () => {
        it('should update local storage on language change', () => {
            spyOn(localStorage, 'setItem').and.callThrough();
            // When changing the language
            userSettingsService.changeLanguage('fr');
            // Then localStorage is updated
            expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'fr');

            localStorage.clear();
        });
        it('should rely on local storage to know the language', () => {
            // Given that the stored theme is 'light'
            spyOn(localStorage, 'getItem').and.returnValue('fr');
            // When getting the language
            const language: string = userSettingsService.getLanguage();
            // Then the theme is 'light'
            expect(language).toBe('fr');
        });
    });

});
