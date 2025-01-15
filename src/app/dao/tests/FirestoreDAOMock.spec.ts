/* eslint-disable max-lines-per-function */
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { FieldValue, UpdateData } from '@firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { FirestoreJSONObject, FirestoreJSONValue, MGPMap, MGPOptional, ObservableSubject, Utils } from '@everyboard/lib';

import { FirestoreCollectionObserver } from '../FirestoreCollectionObserver';
import { FirestoreCondition, FirestoreDocument, IFirestoreDAO } from '../FirestoreDAO';
import { Debug } from 'src/app/utils/Debug';

type DocumentSubject<T> = ObservableSubject<MGPOptional<FirestoreDocument<T>>>;

@Debug.log
export abstract class FirestoreDAOMock<T extends FirestoreJSONObject> implements IFirestoreDAO<T> {

    public static mockServerTime(): Timestamp {
        const dateNow: number = Date.now();
        const ms: number = dateNow % 1000;
        const seconds: number = (dateNow - ms) / 1000;
        const nanoseconds: number = ms * 1000 * 1000;
        return new Timestamp(seconds, nanoseconds);
    }

    public callbacks: [FirestoreCondition[], FirestoreCollectionObserver<T>][] = [];

    private readonly subDAOs: MGPMap<string, IFirestoreDAO<FirestoreJSONObject>> = new MGPMap();

    public constructor(public readonly collectionName: string) {
        this.reset();
    }
    public abstract getStaticDB(): MGPMap<string, DocumentSubject<T>>;

    public abstract resetStaticDB(): void;

    public reset(): void {
        this.resetStaticDB();
    }
    public subscribeToChanges(id: string, callback: (doc: MGPOptional<T>) => void): Subscription {
        const optionalOS: MGPOptional<DocumentSubject<T>> = this.getStaticDB().get(id);
        if (optionalOS.isPresent()) {
            return optionalOS.get().observable.subscribe((subject: MGPOptional<FirestoreDocument<T>>) =>
                callback(subject.map((doc: FirestoreDocument<T>) => doc.data)));
        } else {
            throw new Error('No doc of id ' + id + ' to observe in ' + this.collectionName);
        }
    }
    public async create(element: T): Promise<string> {
        const elemName: string = this.collectionName + this.getStaticDB().size();
        await this.set(elemName, element);
        return elemName;
    }
    private replaceFieldValueWith<N extends FirestoreJSONObject>(elementWithFieldValue: N,
                                                                 replacement: FirestoreJSONValue)
    : N
    {
        const elementWithReplacement: FirestoreJSONObject = {};
        for (const key of Object.keys(elementWithFieldValue)) {
            if (elementWithFieldValue[key] instanceof FieldValue) {
                elementWithReplacement[key] = replacement;
            } else {
                elementWithReplacement[key] = elementWithFieldValue[key];
            }
        }
        return elementWithReplacement as N;
    }
    private updateFieldValueWith<N extends FirestoreJSONObject>(element: N,
                                                                replacement: FirestoreJSONValue)
    : UpdateData<N>
    {
        const update: FirestoreJSONObject = {};
        for (const key of Object.keys(element)) {
            if (element[key] instanceof FieldValue) {
                update[key] = replacement;
            }
        }
        return update as UpdateData<N>;
    }

    private hasFieldValue(element: FirestoreJSONObject): boolean {
        for (const key of Object.keys(element)) {
            if (element[key] instanceof FieldValue) {
                return true;
            }
        }
        return false;
    }
    public async read(id: string): Promise<MGPOptional<T>> {
        const optionalOS: MGPOptional<DocumentSubject<T>> = this.getStaticDB().get(id);
        if (optionalOS.isPresent()) {
            return MGPOptional.of(Utils.getNonNullable(optionalOS.get().subject.getValue().get().data));
        } else {
            return MGPOptional.empty();
        }
    }
    public async set(id: string, data: T): Promise<void> {
        const localData: T = this.replaceFieldValueWith(data, null);
        await this.internalSet(id, localData);
        if (this.hasFieldValue(data)) {
            const serverData: UpdateData<T> =
                this.updateFieldValueWith(data, FirestoreDAOMock.mockServerTime());
            // We do not await here to simulate the fact that the server will take some time to send us the update
            await this.internalUpdate(id, serverData);
        }
    }
    public async internalSet(id: string, data: T): Promise<void> {
        const optionalOS: MGPOptional<DocumentSubject<T>> = this.getStaticDB().get(id);
        const tid: FirestoreDocument<T> = { id, data };
        if (optionalOS.isPresent()) {
            optionalOS.get().subject.next(MGPOptional.of(tid));
        } else {
            const subject: BehaviorSubject<MGPOptional<FirestoreDocument<T>>> =
                new BehaviorSubject(MGPOptional.of(tid));
            const observable: Observable<MGPOptional<FirestoreDocument<T>>> = subject.asObservable();
            this.getStaticDB().put(id, new ObservableSubject(subject, observable));
            for (const callback of this.callbacks) {
                if (this.conditionsHold(callback[0], subject.value.get().data)) {
                    callback[1].onDocumentCreated([subject.value.get()]);
                }
            }
        }
        return Promise.resolve();
    }
    public async update(id: string, update: UpdateData<T>): Promise<void> {
        const localUpdate: UpdateData<T> = this.replaceFieldValueWith(update, null);
        await this.internalUpdate(id, localUpdate);
        if (this.hasFieldValue(update)) {
            const serverUpdate: UpdateData<T> =
                this.replaceFieldValueWith(update, FirestoreDAOMock.mockServerTime());
            await this.internalUpdate(id, serverUpdate);
        }
    }
    private async internalUpdate(id: string, update: UpdateData<T>): Promise<void> {
        const optionalOS: MGPOptional<DocumentSubject<T>> = this.getStaticDB().get(id);
        if (optionalOS.isPresent()) {
            const observableSubject: DocumentSubject<T> = optionalOS.get();
            const oldDoc: T = observableSubject.subject.getValue().get().data;
            const newDoc: T = { ...oldDoc, ...update };
            observableSubject.subject.next(MGPOptional.of({ id, data: newDoc }));
            for (const callback of this.callbacks) {
                if (this.conditionsHold(callback[0], observableSubject.subject.value.get().data)) {
                    callback[1].onDocumentModified([observableSubject.subject.value.get()]);
                }
            }
            return Promise.resolve();
        } else {
            throw new Error(`Cannot update element '${id}' absent from '${this.collectionName}'`);
        }
    }
    public async delete(id: string): Promise<void> {
        const optionalOS: MGPOptional<DocumentSubject<T>> = this.getStaticDB().get(id);
        if (optionalOS.isPresent()) {
            const removed: FirestoreDocument<T> = optionalOS.get().subject.value.get();
            optionalOS.get().subject.next(MGPOptional.empty());
            this.getStaticDB().delete(id);
            for (const callback of this.callbacks) {
                if (this.conditionsHold(callback[0], removed.data)) {
                    callback[1].onDocumentDeleted([removed]);
                }
            }
        } else {
            throw new Error('Cannot delete element ' + id + ' absent from ' + this.collectionName);
        }
    }
    public observingWhere(conditions: FirestoreCondition[],
                          callback: FirestoreCollectionObserver<T>): Subscription
    {
        return this.subscribeToMatchers(conditions, callback);
    }
    private subscribeToMatchers(conditions: FirestoreCondition[],
                                callback: FirestoreCollectionObserver<T>)
    : Subscription
    {
        const db: MGPMap<string, DocumentSubject<T>> = this.getStaticDB();
        this.callbacks.push([conditions, callback]);
        const matchingDocs: FirestoreDocument<T>[] = [];
        db.forEach((item: {key: string, value: DocumentSubject<T> }) => {
            if (this.conditionsHold(conditions, item.value.subject.value.get().data)) {
                matchingDocs.push(item.value.subject.value.get());
            }
        });
        callback.onDocumentCreated(matchingDocs);
        return new Subscription(() => {
            // Upon unsubscription, remove this callback from the callbacks
            this.callbacks = this.callbacks.filter(
                (value: [FirestoreCondition[], FirestoreCollectionObserver<T>]): boolean => {
                    return (value[0] === conditions && value[1] === callback) === false;
                });
        });
    }
    private conditionsHold(conditions: FirestoreCondition[], doc: T): boolean {
        for (const condition of conditions) {
            Utils.assert(condition[1] === '==', 'FirestoreDAOMock currently only supports == as a condition');
            if (doc[condition[0]] !== condition[2]) {
                return false;
            }
        }
        return true;
    }
    public async findWhere(conditions: FirestoreCondition[],
                           order?: string,
                           limit?: number)
    : Promise<FirestoreDocument<T>[]>
    {
        const matchingDocs: FirestoreDocument<T>[] = [];
        this.getStaticDB().forEach((item: {key: string, value: DocumentSubject<T>}) => {
            const id: string = item.value.subject.value.get().id;
            const data: T = item.value.subject.value.get().data;
            if (this.conditionsHold(conditions, data)) {
                matchingDocs.push({ id, data });
            }
        });
        if (order != null) {
            matchingDocs.sort((a: FirestoreDocument<T>, b: FirestoreDocument<T>) => a[order] - b[order]);
        }
        if (limit != null) {
            return matchingDocs.slice(0, limit);
        } else {
            return matchingDocs;
        }
    }
    public subCollectionDAO<U extends FirestoreJSONObject>(id: string, name: string): IFirestoreDAO<U> {
        if (this.subDAOs.containsKey(name)) {
            return this.subDAOs.get(name).get() as IFirestoreDAO<U>;
        } else {
            const superName: string = this.collectionName;
            type OS = ObservableSubject<MGPOptional<FirestoreDocument<U>>>;
            class CustomMock extends FirestoreDAOMock<U> {
                private static db: MGPMap<string, OS>;
                public getStaticDB(): MGPMap<string, OS> {
                    return CustomMock.db;
                }
                public resetStaticDB(): void {
                    CustomMock.db = new MGPMap();
                }
                public constructor() {
                    super(`${superName}/${id}/${name}`);
                }
            }
            const mock: FirestoreDAOMock<U> = new CustomMock();
            this.subDAOs.set(name, mock);
            return mock;
        }
    }
}
