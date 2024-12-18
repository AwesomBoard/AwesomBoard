/* eslint-disable max-lines-per-function */
import { Component } from '@angular/core';
import { fakeAsync } from '@angular/core/testing';
import { SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';

@Component({
    template: `<input id="password" type="password"/>
<span class="icon is-small is-right">
<p id="toggle" class="clickable-icon" toggleVisibility>show</p>
</span>
`,
})
class ToggleVisibilityTestComponent {}

describe('ToggleVisibilityDirective', () => {
    /**
     * Note: we need to use dispatchEvent for clicking in these tests because
     * toggleVisibility is adding an event handler with .addEventListener, which
     * are not triggered with Angular's triggerEventHandler.
     */
    let testUtils: SimpleComponentTestUtils<ToggleVisibilityTestComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(ToggleVisibilityTestComponent);
    }));

    it('should change the type to text when clicked, and back to password when clicked a second time', () => {
        // Given an element with the toggleVisibility directive
        expect(testUtils.findElement('#password').nativeElement.getAttribute('type')).toBe('password');
        testUtils.detectChanges();

        // When the component is clicked a first time
        testUtils.findElement('#toggle').nativeElement.dispatchEvent(new Event('click'));
        testUtils.detectChanges();

        // Then the input is now of type text
        expect(testUtils.findElement('#password').nativeElement.getAttribute('type')).toBe('text');

        // When the component is clicked a second time
        testUtils.findElement('#toggle').nativeElement.dispatchEvent(new Event('click'));
        testUtils.detectChanges();

        // Then the input is again a password
        expect(testUtils.findElement('#password').nativeElement.getAttribute('type')).toBe('password');
    });

});
