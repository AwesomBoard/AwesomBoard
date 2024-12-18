/* eslint-disable max-lines-per-function */
import { HumanDurationPipe } from '../human-duration.pipe';

describe('HumanDurationPipe', () => {
    let pipe: HumanDurationPipe;
    beforeEach(() => {
        pipe = new HumanDurationPipe();
    });
    it('should not fail if duration is 0', () => {
        expect(pipe.transform(0)).toBe('0 seconds');
    });
    it('should produce hours, minutes, and seconds', () => {
        expect(pipe.transform(7322)).toBe('2 hours, 2 minutes and 2 seconds');
    });
    it('should not pluralize if not necessary', () => {
        expect(pipe.transform(3661)).toBe('1 hour, 1 minute and 1 second');
    });
    it('should only include elements which are not zero', () => {
        expect(pipe.transform(3600)).toBe('1 hour');
        expect(pipe.transform(60)).toBe('1 minute');
        expect(pipe.transform(15)).toBe('15 seconds');
        expect(pipe.transform(3615)).toBe('1 hour and 15 seconds');
    });

});
