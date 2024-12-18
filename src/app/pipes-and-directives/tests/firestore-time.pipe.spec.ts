/* eslint-disable max-lines-per-function */
import { formatDate } from '@angular/common';
import { Component, DebugElement } from '@angular/core';
import { fakeAsync } from '@angular/core/testing';
import { Timestamp } from 'firebase/firestore';
import { FirestoreTime } from 'src/app/domain/Time';
import { SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';

@Component({
    template: `<span id="time">{{ timestamp | firestoreTime }}</span>`,
})
class FirestoreTimeTestComponent {
    public static timestampInSeconds: number = 12 * 3600 + 34 * 60 + 56;
    public timestamp: FirestoreTime = new Timestamp(FirestoreTimeTestComponent.timestampInSeconds, 0);
}

describe('FirestoreTimePipe', () => {
    let testUtils: SimpleComponentTestUtils<FirestoreTimeTestComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(FirestoreTimeTestComponent);
    }));

    it('should display tie as HH:mm:ss', () => {
        // Given an element with the firestoreTime pipe
        const element: DebugElement = testUtils.findElement('#time');

        // When the component is displayed
        testUtils.detectChanges();

        // Then the element is shown in the expected format
        const actual: string = element.nativeElement.innerText;
        const expected: string = formatDate(FirestoreTimeTestComponent.timestampInSeconds * 1000, 'HH:mm:ss', 'en-US');

        expect(actual).toBe(expected);
    });

});
