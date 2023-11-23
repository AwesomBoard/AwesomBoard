/* eslint-disable max-lines-per-function */
import { ConfigRoom, ConfigRoomDocument } from 'src/app/domain/ConfigRoom';
import { MGPMap } from 'src/app/utils/MGPMap';
import { ObservableSubject } from 'src/app/utils/tests/ObservableSubject.spec';
import { Debug } from 'src/app/utils/utils';
import { FirestoreDAOMock } from './FirestoreDAOMock.spec';
import { ConfigRoomMocks } from 'src/app/domain/ConfigRoomMocks.spec';
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { Subscription } from 'rxjs';

type ConfigRoomOS = ObservableSubject<MGPOptional<ConfigRoomDocument>>;

@Debug.log
export class ConfigRoomDAOMock extends FirestoreDAOMock<ConfigRoom> {

    private static configRoomDB: MGPMap<string, ConfigRoomOS>;

    public constructor() {
        super('ConfigRoomDAOMock');
    }
    public getStaticDB(): MGPMap<string, ConfigRoomOS> {
        return ConfigRoomDAOMock.configRoomDB;
    }
    public resetStaticDB(): void {
        ConfigRoomDAOMock.configRoomDB = new MGPMap();
    }
}

describe('ConfigRoomDAOMock', () => {

    let configRoomDAOMock: ConfigRoomDAOMock;

    let callCount: number;

    let lastConfigRoom: MGPOptional<ConfigRoom>;

    beforeEach(() => {
        configRoomDAOMock = new ConfigRoomDAOMock();
        callCount = 0;
        lastConfigRoom = MGPOptional.empty();
    });
    it('Total update should update', fakeAsync(async() => {
        // Given an initial configRoom to which we subscribed
        await configRoomDAOMock.set('configRoomId', ConfigRoomMocks.getInitial({}));

        expect(lastConfigRoom).toEqual(MGPOptional.empty());
        expect(callCount).toBe(0);

        const subscription: Subscription = configRoomDAOMock.subscribeToChanges('configRoomId', (configRoom: MGPOptional<ConfigRoom>) => {
            callCount++;
            lastConfigRoom = configRoom;
            expect(callCount).withContext('Should not have been called more than twice').toBeLessThanOrEqual(2);
        });

        expect(callCount).toEqual(1);
        expect(lastConfigRoom.get()).toEqual(ConfigRoomMocks.getInitial({}));

        // When it is updated
        await configRoomDAOMock.update('configRoomId', ConfigRoomMocks.withChosenOpponent({}));

        // Then we should have seen the update
        expect(callCount).toEqual(2);
        expect(lastConfigRoom.get()).toEqual(ConfigRoomMocks.withChosenOpponent({}));
        subscription.unsubscribe();
    }));
    it('Partial update should update', fakeAsync(async() => {
        // Given an initial configRoom to which we subscribed
        await configRoomDAOMock.set('configRoomId', ConfigRoomMocks.getInitial({}));

        expect(callCount).toEqual(0);
        expect(lastConfigRoom).toEqual(MGPOptional.empty());

        const subscription: Subscription = configRoomDAOMock.subscribeToChanges('configRoomId', (configRoom: MGPOptional<ConfigRoom>) => {
            callCount++;
            expect(callCount).withContext('Should not have been called more than twice').toBeLessThanOrEqual(2);
            lastConfigRoom = configRoom;
        });

        expect(callCount).toEqual(1);
        expect(lastConfigRoom.get()).toEqual(ConfigRoomMocks.getInitial({}));

        // When it is updated
        await configRoomDAOMock.update('configRoomId', { chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER });

        // Then we should see the update
        expect(callCount).toEqual(2);
        expect(lastConfigRoom.get()).toEqual(ConfigRoomMocks.withChosenOpponent({}));
        subscription.unsubscribe();
    }));
});
