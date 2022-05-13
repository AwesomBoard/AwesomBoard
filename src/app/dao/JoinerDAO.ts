import { FirebaseFirestoreDAO } from './FirebaseFirestoreDAO';
import { Joiner } from '../domain/Joiner';
import { Injectable } from '@angular/core';
import { display } from 'src/app/utils/utils';
import { Firestore } from '@angular/fire/firestore';
import { MinimalUser } from '../domain/MinimalUser';

@Injectable({
    providedIn: 'root',
})
export class JoinerDAO extends FirebaseFirestoreDAO<Joiner> {
    public static VERBOSE: boolean = false;

    constructor(firestore: Firestore) {
        super('joiners', firestore);
        display(JoinerDAO.VERBOSE, 'JoinerDAO.constructor');
    }
    public addCandidate(partId: string, candidate: MinimalUser): Promise<void> {
        return this.subCollectionDAO(partId, 'candidates').set(candidate.id, candidate);
    }
    public removeCandidate(partId: string, candidate: MinimalUser): Promise<void> {
        return this.subCollectionDAO(partId, 'candidates').delete(candidate.id);
    }
}
