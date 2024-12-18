/* eslint-disable max-lines-per-function */
import { LocaleUtils } from '../LocaleUtils';

describe('@everyboard/lib', () => {
    describe('getLocale', () => {
        it('should use locale stored in localStorage', () => {
            // Given a localStage that defines a locale
            spyOn(localStorage, 'getItem').and.returnValue('en');
            localStorage.setItem('locale', 'en');

            // When the locale is computed
            const locale: string = LocaleUtils.getLocale();

            // Then it should use the one from localStorage
            expect(locale).toEqual('en');
            expect(localStorage.getItem).toHaveBeenCalledWith('locale');
        });
        it('should use navigator language if nothing is in localStorage', () => {
            // Given that the localStorage is empty and that the navigator language is set
            localStorage.clear();
            spyOn(LocaleUtils, 'getNavigatorLanguage').and.returnValue('en-US');

            // When the locale is computed
            const locale: string = LocaleUtils.getLocale();

            // Then it should use the one from the navigator
            expect(locale).toEqual('en');
            expect(LocaleUtils.getNavigatorLanguage).toHaveBeenCalledOnceWith();
        });
        it('should default to the fr locale', () => {
            // Given that the localStorage is empty and that the navigator language is not set
            localStorage.clear();
            spyOn(LocaleUtils, 'getNavigatorLanguage').and.returnValue(null);

            // When the locale is computed
            const locale: string = LocaleUtils.getLocale();

            // Then it should default to fr
            expect(locale).toEqual('fr');
        });
        it('should use fr if an unknown locale is used', () => {
            // Given that the locale is unknown
            localStorage.setItem('locale', 'gr');

            // When the locale is computed
            const locale: string = LocaleUtils.getLocale();

            // Then it should default to fr
            expect(locale).toEqual('fr');

            localStorage.clear(); // clear local storage
        });
    });

});
