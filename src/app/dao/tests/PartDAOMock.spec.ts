/* eslint-disable max-lines-per-function */
import { Part, PartDocument, MGPResult } from 'src/app/domain/Part';
import { FirestoreDAOMock } from './FirestoreDAOMock.spec';
import { ObservableSubject } from 'src/app/utils/tests/ObservableSubject.spec';
import { MGPMap } from 'src/app/utils/MGPMap';
import { FirestoreCollectionObserver } from '../FirestoreCollectionObserver';
import { display } from 'src/app/utils/utils';
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { FirestoreDocument } from '../FirestoreDAO';

type PartOS = ObservableSubject<MGPOptional<PartDocument>>

export class PartDAOMock extends FirestoreDAOMock<Part> {

    public static VERBOSE: boolean = false;

    private static partDB: MGPMap<string, PartOS>;

    public constructor() {
        super('PartDAOMock', PartDAOMock.VERBOSE);
        display(this.VERBOSE || FirestoreDAOMock.VERBOSE, 'PartDAOMock.constructor');
    }
    public getStaticDB(): MGPMap<string, PartOS> {
        return PartDAOMock.partDB;
    }
    public resetStaticDB(): void {
        PartDAOMock.partDB = new MGPMap();
    }
    public async updateAndBumpIndex(id: string,
                                    user: Player,
                                    lastIndex: number,
                                    update: Partial<Part>)
    : Promise<void>
    {
        update = {
            ...update,
            lastUpdate: {
                index: lastIndex + 1,
                player: user.value,
            },
        };
        return this.update(id, update);
    }
    public observeActiveParts(callback: FirestoreCollectionObserver<Part>): () => void {
        return this.observingWhere([['result', '==', MGPResult.UNACHIEVED.value]], callback);
    }
}
