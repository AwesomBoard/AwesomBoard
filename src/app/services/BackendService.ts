import { ConnectedUserService } from './ConnectedUserService';
import { environment } from 'src/environments/environment';
import { JSONValue, MGPFallible, MGPMap, MGPOptional, Utils } from '@everyboard/lib';
import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'HEAD' | 'DELETE';

export class WebSocketMessage {
    public constructor(private readonly tag: string,
                       private readonly args: JSONValue) {
    }

    public getArgument<T>(name: string): T {
        const value: T | null = this.getOptionalArgument<T>(name);
        if (value == null) {
            throw new Error(`Trying to extract argument from server reply, but there were no such argument: ${name} (on a ${this.tag} message: argunments are ${JSON.stringify(this.args)})`);
        } else {
            return value;
        }
    }

    public getOptionalArgument<T>(name: string): T | null {
        if (this.args == null) {
            throw new Error(`Trying to extract argument from server reply, but there were no argument: ${name} (on a ${this.tag} message)`);
        }
        const value: unknown = this.args[name];
        // The only thing we can't check is that the argument value really corresponds to the type.
        return value as T;
    }
}

export type Callback = (message: WebSocketMessage) => void


@Injectable({
    // This ensures that this is a singleton service, which is very important for this one
    // because we want only a single websocket connection, shared among all other services
    providedIn: 'root',
})
export class WebSocketManagerService {

    private webSocket: MGPOptional<WebSocket> = MGPOptional.empty();
    private readonly callbacks: MGPMap<string, Callback> = new MGPMap();

    public constructor(private readonly connectedUserService: ConnectedUserService) {
        console.log('WebSocketManagerService created (should happen only once');
    }

    private async connect(): Promise<void> {
        // TODO: let user know we're trying to connect to the server somehow visually?
        Utils.assert(this.webSocket.isAbsent(), 'Should not connect twice to WebSocket!');
        const token: string = await this.connectedUserService.getIdToken();

        return new Promise((resolve: () => void, reject) => {
            const ws: WebSocket = new WebSocket(environment.backendURL.replace('http://', 'ws://') + '/ws', ['Authorization', token]);

            ws.onopen = (): void => {
                console.log('WS: connected');
                this.webSocket = MGPOptional.of(ws);
                resolve();
            };
            ws.onerror = (error: Event): void => {
                console.log('WS: connection failed');
                reject(error);
            };
            ws.onclose = (): void => {
                console.log('WS: closed');
            };
            ws.onmessage = (ev: MessageEvent<unknown>): void => {
                Utils.assert(typeof(ev.data) === 'string', `Received malformed WebSocket message: ${ev.data}`);
                const json: NonNullable<JSONValue> = Utils.getNonNullable(JSON.parse(ev.data as string));
                console.log('%cWS: <<< ' + JSON.stringify(json), 'color: green');
                Utils.assert(typeof(json) === 'object', // i.e., an array
                             `Received malformed WebSocket message: ${json}`);
                const tag: unknown = json[0]; // the tag is the first element of the array
                const args: JSONValue = json[1]; // the arguments is an object being the second element
                Utils.assert(tag != null && typeof(tag) === 'string', `Received malformed WebSocket message: ${json}`);
                // each callback is associated to a tag
                const callback: MGPOptional<Callback> = this.callbacks.get(tag as string);
                Utils.assert(callback.isPresent(), `Received a message with no callback registered: ${json}`);
                // NOTE: in case we need async for callbacks, use void to not wait for the async here.
                callback.get()(new WebSocketMessage(tag as string, args));
            };
        });
    }

    public async subscribeTo(gameId: string): Promise<Subscription> {
        await this.send(['Subscribe', { gameId }]);
        return new Subscription(async() => this.send(['Unsubscribe']));
    }

    public async send(message: JSONValue): Promise<void> {
        if (this.webSocket.isAbsent()) {
            await this.connect();
        }
        console.log('%cWS: >>> ' + JSON.stringify(message), 'color: lightblue');
        this.webSocket.get().send(JSON.stringify(message));
    }

    public async sendAndWaitForReply(message: JSONValue, replyTag: string): Promise<WebSocketMessage> {
        await this.send(message);
        return this.waitForMessage(replyTag);
    }

    private async waitForMessage(tag: string): Promise<WebSocketMessage> {
        return new Promise((resolve: (value: WebSocketMessage) => void) => {
            this.setCallback(tag, (message: WebSocketMessage) => {
                this.removeCallback(tag);
                resolve(message);
            });
        });
    }

    public setCallback(tag: string, callback: Callback): Subscription {
        this.callbacks.set(tag, callback);
        return new Subscription(() => this.removeCallback(tag));
    }

    public removeCallback(tag: string): void {
        this.callbacks.delete(tag);
    }

    public disconnect(): void {
        console.log('WS: disconnect!')
        Utils.assert(this.webSocket.isPresent(), 'Should not disconnect from unconnected WebSocket!');
        this.webSocket.get().close();
        this.callbacks.clear();
    }

}

export abstract class BackendService {
    public constructor(protected readonly connectedUserService: ConnectedUserService) {
    }

    protected async performRequest(method: HTTPMethod, endpoint: string): Promise<MGPFallible<Response>> {
        const token: string = await this.connectedUserService.getIdToken();
        const response: Response =
            await fetch(environment.backendURL + '/' + endpoint, {
                method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                },
            });
        if (this.isSuccessStatus(response.status)) {
            return MGPFallible.success(response);
        } else {
            try {
                const jsonResponse: JSONValue = await response.json();
                // eslint-disable-next-line dot-notation
                if (jsonResponse == null || jsonResponse['reason'] == null) {
                    return MGPFallible.failure('No error message');
                } else {
                    // eslint-disable-next-line dot-notation
                    return MGPFallible.failure(jsonResponse['reason'] as string);
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            catch (err: unknown) {
                return MGPFallible.failure('Invalid JSON response from the server');
            }
        }
    }

    protected async performRequestWithJSONResponse(method: HTTPMethod,
                                                   endpoint: string)
    : Promise<MGPFallible<JSONValue>>
    {
        const response: MGPFallible<Response> = await this.performRequest(method, endpoint);
        if (response.isSuccess()) {
            const jsonResponse: JSONValue = await response.get().json();
            return MGPFallible.success(jsonResponse);
        } else {
            return MGPFallible.failure(response.getReason());
        }
    }

    private isSuccessStatus(status: number): boolean {
        return 200 <= status && status <= 299;
    }

    protected assertSuccess<T>(result: MGPFallible<T>): void {
        Utils.assert(result.isSuccess(), 'Unexpected error from backend: ' + result.getReasonOr(''));
    }

}
