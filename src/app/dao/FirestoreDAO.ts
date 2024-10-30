import { FirestoreJSONObject, MGPOptional, Utils } from '@everyboard/lib';
import * as Firestore from '@firebase/firestore';
import { FirestoreCollectionObserver } from './FirestoreCollectionObserver';
import { Subscription } from 'rxjs';
import { Debug } from '../utils/Debug';

export interface FirestoreDocument<T> {
    id: string
    data: T
}

export type FirestoreCondition = [string, Firestore.WhereFilterOp, unknown]

export interface IFirestoreDAO<T extends FirestoreJSONObject> {

    create(newElement: T): Promise<string>;

    read(id: string): Promise<MGPOptional<T>>;

    update(id: string, update: Firestore.UpdateData<T>): Promise<void>;

    delete(id: string): Promise<void>;

    set(id: string, element: T): Promise<void>;

    /**
     * Subscribes to changes of a document given its id.
     * The is given an optional, set to empty when the document is deleted.
     * If the document does not exist initially, the optional is also empty.
     */
    subscribeToChanges(id: string, callback: (doc: MGPOptional<T>) => void): Subscription;

    observingWhere(conditions: FirestoreCondition[],
                   callback: FirestoreCollectionObserver<T>,
                   order?: string): Subscription;

    findWhere(conditions: FirestoreCondition[], order?: string, limit?: number): Promise<FirestoreDocument<T>[]>

    subCollectionDAO<U extends FirestoreJSONObject>(id: string, name: string): IFirestoreDAO<U>;
}

export abstract class FirestoreDAO<T extends FirestoreJSONObject> implements IFirestoreDAO<T> {

    public readonly collection: Firestore.CollectionReference<T>;

    private readonly subDAOs: Record<string, IFirestoreDAO<FirestoreJSONObject>> = {};

    public constructor(public readonly collectionName: string) {
        const genericConverter: Firestore.FirestoreDataConverter<T> = {
            fromFirestore(snapshot: Firestore.QueryDocumentSnapshot): T {
                return snapshot.data() as T;
            },
            toFirestore(data: Firestore.PartialWithFieldValue<T>) {
                return data;
            },
        };
        const firestore: Firestore.Firestore = Firestore.getFirestore();
        this.collection = Firestore.collection(firestore, this.collectionName).withConverter<T>(genericConverter);
    }

    public async create(newElement: T): Promise<string> {
        const docRef: Firestore.DocumentReference = await Firestore.addDoc(this.collection, newElement);
        return docRef.id;
    }

    public async read(id: string): Promise<MGPOptional<T>> {
        const docSnapshot: Firestore.DocumentSnapshot<T> = await Firestore.getDoc(Firestore.doc(this.collection, id));
        if (docSnapshot.exists()) {
            return MGPOptional.of(Utils.getNonNullable(docSnapshot.data()));
        } else {
            return MGPOptional.empty();
        }
    }

    public async exists(id: string): Promise<boolean> {
        return (await this.read(id)).isPresent();
    }

    public async update(id: string, update: Firestore.UpdateData<T>): Promise<void> {
        return Firestore.updateDoc(Firestore.doc(this.collection, id), update);
    }

    public async delete(id: string): Promise<void> {
        return Firestore.deleteDoc(Firestore.doc(this.collection, id));
    }

    public async set(id: string, element: T): Promise<void> {
        return Firestore.setDoc(Firestore.doc(this.collection, id), element);
    }

    public subscribeToChanges(id: string, callback: (doc: MGPOptional<T>) => void): Subscription {
        return new Subscription(Firestore.onSnapshot(Firestore.doc(this.collection, id),
                                                     (doc: Firestore.DocumentSnapshot<T>) => {
                                                         callback(MGPOptional.ofNullable(doc.data()));
                                                     }));
    }

    public async findWhere(conditions: FirestoreCondition[], order?: string, limit?: number)
    : Promise<FirestoreDocument<T>[]>
    {
        const query: Firestore.Query<T> = this.constructQuery(conditions, order, limit);
        const snapshot: Firestore.QuerySnapshot<T> = await Firestore.getDocs(query);
        return snapshot.docs.map((doc: Firestore.QueryDocumentSnapshot<T>) => {
            return {
                id: doc.id,
                data: doc.data(),
            };
        });
    }

    /**
     * Observe the data according to the given conditions, where a condition consists of:
     * - a field
     * - a comparison
     * - a value that is matched against the field using the comparison
     **/
    public observingWhere(conditions: FirestoreCondition[],
                          callback: FirestoreCollectionObserver<T>,
                          order?: string)
    : Subscription
    {
        const query: Firestore.Query<T> = this.constructQuery(conditions, order);
        return new Subscription(Firestore.onSnapshot(query, (snapshot: Firestore.QuerySnapshot<T>) => {
            const createdDocs: FirestoreDocument<T>[] = [];
            const modifiedDocs: FirestoreDocument<T>[] = [];
            const deletedDocs: FirestoreDocument<T>[] = [];
            snapshot.docChanges()
                .forEach((change: Firestore.DocumentChange<T>) => {
                    const doc: FirestoreDocument<T> = {
                        id: change.doc.id,
                        data: change.doc.data(),
                    };
                    switch (change.type) {
                        case 'added':
                            createdDocs.push(doc);
                            break;
                        case 'modified':
                            modifiedDocs.push(doc);
                            break;
                        case 'removed':
                            deletedDocs.push(doc);
                            break;
                    }
                });
            if (createdDocs.length > 0) {
                Debug.display('FirestoreDAO', 'subscription',
                              'firebase gave us ' + createdDocs.length + ' NEW ' + this.collectionName);
                callback.onDocumentCreated(createdDocs);
            }
            if (modifiedDocs.length > 0) {
                Debug.display('FirestoreDAO', 'subscription',
                              'firebase gave us ' + modifiedDocs.length + ' MODIFIED ' + this.collectionName);
                callback.onDocumentModified(modifiedDocs);
            }
            if (deletedDocs.length > 0) {
                Debug.display('FirestoreDAO', 'subscription',
                              'firebase gave us ' + deletedDocs.length + ' DELETED ' + this.collectionName);
                callback.onDocumentDeleted(deletedDocs);
            }
        }));
    }

    private constructQuery(conditions: FirestoreCondition[], order?: string, limit?: number): Firestore.Query<T> {
        let query: Firestore.Query<T> = Firestore.query(this.collection);
        if (order != null) {
            query = Firestore.query(query, Firestore.orderBy(order));
        }
        if (limit != null) {
            query = Firestore.query(query, Firestore.limit(limit));
        }
        for (const condition of conditions) {
            query = Firestore.query(query, Firestore.where(condition[0], condition[1], condition[2]));
        }
        return query;
    }

    public subCollectionDAO<U extends FirestoreJSONObject>(id: string, name: string): IFirestoreDAO<U> {
        const fullPath: string = `${this.collection.path}/${id}/${name}`;
        if (fullPath in this.subDAOs) {
            return this.subDAOs[fullPath] as IFirestoreDAO<U>;
        } else {
            const subDAO: FirestoreDAO<U> = new class extends FirestoreDAO<U> {
                public constructor() {
                    super(fullPath);
                }
            }();
            this.subDAOs[fullPath] = subDAO;
            return subDAO;
        }
    }

}
