import { Injectable } from '@angular/core';
import { JSONValue } from '@everyboard/lib';

import { FirestoreTime } from '../domain/Time';
import { FirestoreDocument, FirestoreDAO } from './FirestoreDAO';

export type MGPError = {
    // The component in which the error occured
    component: string,
    // Route on which the error occured
    route: string,
    // A message detailing the error
    message: string,
    // Some extra data for the error
    data?: NonNullable<JSONValue>,
    // First time the error occured
    firstEncounter: FirestoreTime,
    // Last time the error occured
    lastEncounter: FirestoreTime,
    // Number of times the error occured
    occurences: number,
}
export type ErrorDocument = FirestoreDocument<MGPError>;

@Injectable({
    providedIn: 'root',
})
// The DAO used to log the errors within firebase
export class ErrorDAO extends FirestoreDAO<MGPError> {
    public constructor() {
        super('errors');
    }
}
