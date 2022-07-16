import { FirestoreDAO } from './FirestoreDAO';
import { Part } from '../domain/Part';
import { Injectable } from '@angular/core';
import { display } from 'src/app/utils/utils';
import { Firestore } from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root',
})
export class PartDAO extends FirestoreDAO<Part> {

    public static VERBOSE: boolean = false;

    constructor(firestore: Firestore) {
        super('parties', firestore);
        display(PartDAO.VERBOSE, 'PartDAO.constructor');
    }
}
