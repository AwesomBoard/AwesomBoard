import { Utils, MGPOptional } from '@everyboard/lib';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserDAO } from '../dao/UserDAO';
import { User } from '../domain/User';
import { FirestoreTime } from '../domain/Time';
import { FirestoreDocument } from '../dao/FirestoreDAO';
import { serverTimestamp } from 'firebase/firestore';

/**
  * The aim of this service is to:
  *     A. subscribe to other users to see if they are online in those contexts:
  *         1. The candidates when you are creator in PartCreation
  *         2. The creator when you are candidate in PartCreation
  *         3. Your opponent when you are playing
  *     B. subscribe to yourself in the header for multitab purpose
  */
@Injectable({
    providedIn: 'root',
})
export class UserService {

    public constructor(private readonly userDAO: UserDAO)
    {
    }

    public async usernameIsAvailable(username: string): Promise<boolean> {
        const usersWithSameUsername: FirestoreDocument<User>[] = await this.userDAO.findWhere([['username', '==', username]]);
        return usersWithSameUsername.length === 0;
    }

    public async setUsername(uid: string, username: string): Promise<void> {
        await this.userDAO.update(uid, { username: username });
    }

    public async markAsVerified(uid: string): Promise<void> {
        await this.userDAO.update(uid, { verified: true });
    }

    /**
     * Observes an user, ignoring local updates.
     */
    public observeUserOnServer(userId: string, callback: (user: MGPOptional<User>) => void): Subscription {
        return this.userDAO.subscribeToChanges(userId, (user: MGPOptional<User>): void => {
            if (user.isPresent() && user.get().lastUpdateTime === null) {
                // Ignore this update as it does not come from firebase but from ourselves
                // We will get the firebase update later.
                return;
            }
            callback(user);
        });
    }

    public async getUserLastUpdateTime(id: string): Promise<MGPOptional<FirestoreTime>> {
        const user: MGPOptional<User> = await this.userDAO.read(id);
        if (user.isAbsent()) {
            return MGPOptional.empty();
        } else {
            const lastUpdateTime: FirestoreTime | undefined = user.get().lastUpdateTime;
            Utils.assert(lastUpdateTime != null, 'should not receive a lastUpdateTime equal to null');
            return MGPOptional.of(lastUpdateTime as FirestoreTime);
        }
    }

    public updatePresenceToken(userId: string): Promise<void> {
        return this.userDAO.update(userId, {
            lastUpdateTime: serverTimestamp(),
        });
    }

}
