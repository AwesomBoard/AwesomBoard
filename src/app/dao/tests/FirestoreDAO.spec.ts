/* eslint-disable max-lines-per-function */
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { FirestoreJSONObject, MGPOptional } from '@everyboard/lib';

import { FirestoreDocument, FirestoreDAO } from '../FirestoreDAO';
import { FirestoreCollectionObserver } from '../FirestoreCollectionObserver';
import { setupEmulators } from 'src/app/utils/tests/TestUtils.spec';

type Foo = {
    value: string,
    otherValue: number,
}

@Injectable({
    providedIn: 'root',
})
class FooDAO extends FirestoreDAO<Foo> {

    public constructor() {
        super('foo');
    }
}

describe('FirestoreDAO', () => {

    let fooDAO: FooDAO;

    beforeEach(async() => {
        await setupEmulators();
        fooDAO = TestBed.inject(FooDAO);
    });
    it('should not read an object that does not exist', async() => {
        await expectAsync(fooDAO.read('idonotexist')).toBeResolvedTo(MGPOptional.empty());
    });
    it('should be able to read back objects that exist', async() => {
        const id: string = await fooDAO.create({ value: 'this is my value', otherValue: 42 });
        const stored: Foo = (await fooDAO.read(id)).get();
        expect(stored.value).toBe('this is my value');
        expect(stored.otherValue).toBe(42);
    });
    it('should support partial updates', async() => {
        const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
        await fooDAO.update(id, { otherValue: 2 });
        const stored: Foo = (await fooDAO.read(id)).get();
        expect(stored.value).toBe('foo');
        expect(stored.otherValue).toBe(2);
    });
    it('should remove an object upon deletion', async() => {
        const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
        await fooDAO.delete(id);
        await expectAsync(fooDAO.exists(id)).toBeResolvedTo(false);
    });
    it('should update an object upon set', async() => {
        const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
        await fooDAO.set(id, { value: 'bar', otherValue: 2 });
        const stored: Foo = (await fooDAO.read(id)).get();
        expect(stored.value).toBe('bar');
        expect(stored.otherValue).toBe(2);
    });
    describe('subscribeToChanges', () => {
        it('should return an observable that can be used to see changes in objects', async() => {
            const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
            const allChangesSeenPromise: Promise<boolean> = new Promise((resolve: (value: boolean) => void) => {
                fooDAO.subscribeToChanges(id, (foo: MGPOptional<Foo>) => {
                    if (foo.isPresent() && foo.get().value === 'bar' && foo.get().otherValue === 2) {
                        resolve(true);
                    }
                });
            });
            await fooDAO.update(id, { otherValue: 2 });
            await fooDAO.update(id, { value: 'bar' });
            await expectAsync(allChangesSeenPromise).toBeResolvedTo(true);
        });
    });
    describe('observingWhere', () => {

        let promise: Promise<Foo[]>; // This promise will be resolved when the callback function is called

        let callbackFunction: (created: {data: Foo, id: string}[]) => void;
        let callbackFunctionLog: (created: {data: Foo, id: string}[]) => void;

        beforeEach(() => {
            let createdResolve: (value: Foo[]) => void;
            promise = new Promise((resolve: (value: Foo[]) => void) => {
                createdResolve = resolve;
            });
            callbackFunction = (created: {data: Foo, id: string}[]): void => {
                createdResolve(created.map((c: {data: Foo, id: string}): Foo => c.data));
            };
            callbackFunctionLog = (created: {data: Foo, id: string}[]): void => {
                for (const doc of created) {
                    console.log(doc);
                }
                createdResolve(created.map((c: {data: Foo, id: string}): Foo => c.data));
            };
        });
        it('should observe document creation with the given condition', async() => {
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                callbackFunction,
                () => void { },
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'foo']], callback);
            await fooDAO.create({ value: 'foo', otherValue: 1 });
            await expectAsync(promise).toBeResolvedTo([{ value: 'foo', otherValue: 1 }]);
            subscription.unsubscribe();
        });
        it('should observe document creation according to multiple conditions', async() => {
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                callbackFunction,
                () => void { },
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'foo'], ['otherValue', '==', 1]], callback);
            await fooDAO.create({ value: 'foo', otherValue: 1 });
            await expectAsync(promise).toBeResolvedTo([{ value: 'foo', otherValue: 1 }]);
            subscription.unsubscribe();
        });
        it('should not observe document creation when the condition does not hold (simple)', async() => {
            // This test is flaky: it fails from time to time. Check the output log when it fails.
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                callbackFunctionLog,
                () => void { },
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'baz']], callback);
            await fooDAO.create({ value: 'foo', otherValue: 1 });
            await expectAsync(promise).toBePending();
            subscription.unsubscribe();
        });
        it('should not observe document creation when the condition does not hold (complexe)', async() => {
            // This test is flaky: it fails from time to time. Check the output log when it fails.
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                callbackFunctionLog,
                () => void { },
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'baz'], ['otherValue', '==', 2]], callback);
            await fooDAO.create({ value: 'foo', otherValue: 1 });
            await expectAsync(promise).toBePending();
            subscription.unsubscribe();
        });
        it('should observe document update with the given condition', async() => {
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                () => void { },
                callbackFunction,
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'foo']], callback);
            const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
            await fooDAO.update(id, { otherValue: 42 });
            await expectAsync(promise).toBeResolvedTo([{ value: 'foo', otherValue: 42 }]);
            subscription.unsubscribe();
        });
        it('should not observe document update when the condition does not hold', async() => {
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                () => void { },
                callbackFunction,
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'baz']], callback);
            const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
            await fooDAO.update(id, { otherValue: 42 });
            await expectAsync(promise).toBePending();
            subscription.unsubscribe();
        });
        it('should observe document deletions with the given condition', async() => {
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                () => void { },
                () => void { },
                callbackFunction,
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'foo']], callback);
            const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
            await fooDAO.delete(id);
            await expectAsync(promise).toBeResolvedTo([{ value: 'foo', otherValue: 1 }]);
            subscription.unsubscribe();
        });
        it('should not observe document deletions when the condition does not hold', async() => {
            const callback: FirestoreCollectionObserver<Foo> = new FirestoreCollectionObserver(
                () => void { },
                callbackFunction,
                () => void { },
            );
            const subscription: Subscription = fooDAO.observingWhere([['value', '==', 'foo']], callback);
            const id: string = await fooDAO.create({ value: 'foo', otherValue: 1 });
            await fooDAO.delete(id);
            await expectAsync(promise).toBePending();
            subscription.unsubscribe();
        });
    });
    describe('findWhere', () => {
        it('should return the matching documents', async() => {
            // Given a DB with some documents
            await fooDAO.create({ value: 'foo', otherValue: 1 });
            await fooDAO.create({ value: 'foo', otherValue: 2 });

            // When calling findWhere
            const docs: FirestoreDocument<Foo>[] = await fooDAO.findWhere([['otherValue', '==', 1]]);

            // Then it should return the matching documents only
            expect(docs.length).toBe(1);
            expect(docs[0].data).toEqual({ value: 'foo', otherValue: 1 });
        });
    });
    describe('subCollectionDAO', () => {
        it('should provide the subcollection with the fully correct path', async() => {
            // Given a fooDAO with a certain path
            const path: string = fooDAO.collection.path;
            // When calling subCollectionDAO
            const subDAO: FirestoreDAO<FirestoreJSONObject> =
                fooDAO.subCollectionDAO('foo', 'sub') as FirestoreDAO<FirestoreJSONObject>;
            // Then it should have the right path
            const subDAOPath: string = subDAO.collection.path;
            expect(subDAOPath).toEqual(path + '/foo/sub');
        });
    });
});
