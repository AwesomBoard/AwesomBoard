import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { UserSettingsService } from './UserSettingsService';
import { MGPOptional } from '@everyboard/lib';

type Theme = 'dark' | 'light';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {

    private theme: Theme;
    private readonly availableThemes: Theme[] = ['dark', 'light'];

    public constructor(@Inject(DOCUMENT) private readonly document: Document,
                       private readonly userSettingsService: UserSettingsService)
    {
        const storedTheme: MGPOptional<Theme> = this.getStoredTheme();
        if (storedTheme.isPresent()) {
            this.loadTheme(storedTheme.get());
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.loadTheme('dark');
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            this.loadTheme('light');
        } else {
            this.loadTheme('dark'); // dark by default
        }
    }
    private getStoredTheme(): MGPOptional<Theme> {
        const theme: MGPOptional<string> = this.userSettingsService.getTheme();
        if (theme.isPresent()) {
            const actualTheme: string = theme.get();
            if (this.availableThemes.some((availableTheme: Theme) => availableTheme === actualTheme)) {
                return MGPOptional.of(actualTheme as Theme);
            }
        }
        return MGPOptional.empty();
    }
    public loadTheme(theme: Theme): void {
        // The data-theme attribute of the <html> element governs the bulma theme
        const htmlElement: HTMLElement = this.document.getElementsByTagName('html')[0];
        htmlElement.setAttribute('data-theme', theme);
        // And we also need to load our own CSS for our game colors
        this.loadStyle(theme + '.css');
        this.theme = theme;
    }
    private loadStyle(styleName: string): void {
        const head: HTMLHeadElement = this.document.getElementsByTagName('head')[0];

        const themeLink: HTMLLinkElement | null = this.document.getElementById('theme') as HTMLLinkElement | null;
        if (themeLink != null) {
            themeLink.href = styleName;
        } else {
            const style: HTMLLinkElement = this.document.createElement('link');
            style.id = 'theme';
            style.rel = 'stylesheet';
            style.href = `${styleName}`;

            head.appendChild(style);
        }
    }
    public getTheme(): Theme {
        return this.theme;
    }
}
