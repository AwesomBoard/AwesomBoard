import * as Firestore from '@angular/fire/firestore';
import { JSONObject } from '../utils/utils';

export interface Time extends JSONObject {

    seconds: number;

    nanoseconds: number;
}

export type FirestoreTime = Firestore.FieldValue | Time | null;
