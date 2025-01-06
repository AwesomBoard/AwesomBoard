import { ConnectedUserService } from './ConnectedUserService';
import { environment } from 'src/environments/environment';
import { JSONValue, MGPFallible, MGPMap, MGPOptional, Utils } from '@everyboard/lib';
import { Injectable } from '@angular/core';

type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'HEAD' | 'DELETE';

export type Callback = (args: JSONValue[]) => void
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

    public async connect(): Promise<void> {
        // TODO: let user know we're trying to connect to the server somehow visually?
        Utils.assert(this.webSocket.isAbsent(), 'Should not connect twice to WebSocket!');
        const token: string = await this.connectedUserService.getIdToken();

        console.log('connect')
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
                console.log('WS: message: ');
                console.log(ev);
                Utils.assert(typeof(ev.data) === 'string', `Received malformed WebSocket message: ${ev.data}`);
                const json: NonNullable<JSONValue> = Utils.getNonNullable(JSON.parse(ev.data as string));
                Utils.assert(typeof(json) === 'object', // i.e., an array
                             `Received malformed WebSocket message: ${json}`);
                const tag: unknown = json[0]; // the tag is the first element of the array
                const args: JSONValue[] = (json as JSONValue[]).slice(1);
                Utils.assert(tag != null && typeof(tag) === 'string', `Received malformed WebSocket message: ${json}`);
                // each callback is associated to a tag
                const callback: MGPOptional<Callback> = this.callbacks.get(tag as string);
                Utils.assert(callback.isPresent(), `Received a message with no callback registered: ${json}`);
                // NOTE: in case we need async for callbacks, use void to not wait for the async here.
                callback.get()(args);
            };
        });
    }

    public async subscribeTo(gameId: string): Promise<void> {
        return this.send(['Subscribe', { gameId }]);
    }

    public async send(message: JSONValue): Promise<void> {
        Utils.assert(this.webSocket.isPresent(), 'Trying to send message over closed WebSocket');
        this.webSocket.get().send(JSON.stringify(message));
    }

    public async sendAndWaitForReply(message: JSONValue, replyTag: string): Promise<JSONValue[]> {
        await this.send(message);
        return this.waitForMessage(replyTag);
    }

    private async waitForMessage(tag: string): Promise<JSONValue[]> {
        return new Promise((resolve: (value: JSONValue[]) => void) => {
            this.setCallback(tag, (args: JSONValue[]) => {
                this.removeCallback(tag);
                resolve(args);
            });
        });
    }

    public setCallback(tag: string, callback: Callback): void {
        this.callbacks.set(tag, callback);
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
