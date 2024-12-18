/* eslint-disable max-lines-per-function */
import { Utils } from '@everyboard/lib';
import { Debug } from '../Debug';

@Debug.log
class MyClass {
    public someMethod(arg: number): string {
        return 'boo';
    }
    public someCycliclyUnprintableObjectIsReturned(): object {
        const a: object = {
            value: 5,
        };
        const b: object = {
            reference: a,
        };
        // eslint-disable-next-line dot-notation
        a['ref'] = b; // Will cause an infinite loop when JSON.stringify
        return a;
    }
}

describe('Debug', () => {
    describe('display', () => {
        it('should log when verbose is enabled on the current method', () => {
            // Given a verbose-enabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([true, true], 'Class', 'method');
            // When calling Debug.display
            Debug.display('Class', 'method', 'message');
            // Then it should have logged the message
            expect(console.log).toHaveBeenCalledOnceWith('Class.method: message');
        });
        it('should log when verbose is enabled on the current class', () => {
            // Given a verbose-enabled class
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([true, true], 'Class');
            // When calling Debug.display
            Debug.display('Class', 'method', 'message');
            // Then it should have logged the message
            expect(console.log).toHaveBeenCalledOnceWith('Class.method: message');
        });
        it('should not log when verbose is disabled', () => {
            // Given a verbose-disabled method and class
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([false, false], 'Class', 'method');
            // When calling Debug.display
            Debug.display('Class', 'method', 'message');
            // Then it should not have logged the message
            expect(console.log).not.toHaveBeenCalled();
        });
        it('should throw when verbose is set to something invalid', () => {
            // Given a verbose-disabled method and class
            spyOn(Utils, 'logError').and.callFake(Utils.logError);
            spyOn(console, 'log').and.returnValue();
            localStorage.setItem('verbosity', 'lolilol');
            // When calling Debug.display
            // Then it should throw and not log
            expect(() => Debug.display('Class', 'method', 'message'))
                .toThrowError('malformed verbosity object: lolilol');
            expect(console.log).not.toHaveBeenCalled();
            // because this is an error resulting from a user error, devs don't want to know about it
            expect(Utils.logError).not.toHaveBeenCalled();
        });
        it('should not log when verbose is unset', () => {
            // Given a verbose-unset method and class
            spyOn(console, 'log').and.returnValue();
            // When calling Debug.display
            Debug.display('Class', 'method', 'message');
            // Then it should have logged the message
            expect(console.log).not.toHaveBeenCalled();
        });
        it('should still work with multiple calls to enableLog', () => {
            // Given a verbose-enabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([true, true], 'Class', 'otherMethod');
            Debug.enableLog([true, true], 'Class', 'method');
            // When calling Debug.display
            Debug.display('Class', 'method', 'message');
            // Then it should have logged the message
            expect(console.log).toHaveBeenCalledOnceWith('Class.method: message');
        });
    });
    describe('log annotation', () => {
        it('should not crash when cyclicity stringification bug occur', () => {
            // Given a verbose-enabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([false, true], 'MyClass', 'someCycliclyUnprintableObjectIsReturned');
            // When calling the method
            const instance: MyClass = new MyClass();
            instance.someCycliclyUnprintableObjectIsReturned();

            // Then it should not have thrown when trying to log recursive object
            expect(console.log).toHaveBeenCalledWith('< MyClass.someCycliclyUnprintableObjectIsReturned -> recursive and not stringifiable!');
        });
        it('should log entry and exit when verbose is enabled', () => {
            // Given a verbose-enabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([true, true], 'MyClass', 'someMethod');
            // When calling the method
            const instance: MyClass = new MyClass();
            instance.someMethod(42);

            // Then it should have logged on entry and exit
            expect(console.log).toHaveBeenCalledWith('> MyClass.someMethod(42)');
            expect(console.log).toHaveBeenCalledWith('< MyClass.someMethod -> "boo"');
        });
        it('should log entry only when verbose is enabled for entry only', () => {
            // Given a verbose-enabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([true, false], 'MyClass', 'someMethod');
            // When calling the method
            const instance: MyClass = new MyClass();
            instance.someMethod(42);

            // Then it should have logged on entry only
            expect(console.log).toHaveBeenCalledWith('> MyClass.someMethod(42)');
            expect(console.log).not.toHaveBeenCalledWith('< MyClass.someMethod -> "boo"');
        });
        it('should log exit only when verbose is enabled for exit only', () => {
            // Given a verbose-enabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([false, true], 'MyClass', 'someMethod');
            // When calling the method
            const instance: MyClass = new MyClass();
            instance.someMethod(42);

            // Then it should have logged on exit only
            expect(console.log).not.toHaveBeenCalledWith('> MyClass.someMethod(42)');
            expect(console.log).toHaveBeenCalledWith('< MyClass.someMethod -> "boo"');
        });
        it('should not log when verbose is disabled', () => {
            // Given a verbose-disabled method
            spyOn(console, 'log').and.returnValue();
            Debug.enableLog([false, false], 'MyClass', 'someMethod');
            // When calling the method
            const instance: MyClass = new MyClass();
            instance.someMethod(42);

            // Then it should not have logged
            expect(console.log).not.toHaveBeenCalled();
        });
    });
    it('should remember settings across sessions through localStorage', () => {
        // Given a page
        spyOn(console, 'log').and.returnValue();
        // When enabling logging
        Debug.enableLog([true, true], 'Class', 'method');
        // Then it should be stored in localStorage for future sessions
        const verbosity: object = JSON.parse(Utils.getNonNullable(localStorage.getItem('verbosity')));
        expect(verbosity['Class.method']).toEqual([true, true]);
    });
    afterEach(() => {
        // We need to forget our debug settings after each test
        localStorage.clear();
    });

});
