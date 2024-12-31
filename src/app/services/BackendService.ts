import { ConnectedUserService } from './ConnectedUserService';
import { environment } from 'src/environments/environment';
import { JSONValue, MGPFallible, MGPOptional, Utils } from '@everyboard/lib';
import { Injectable, OnInit } from '@angular/core';

type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'HEAD' | 'DELETE';

export type Callback = (type: string, data: JSONValue) => Promise<void>
@Injectable({
    providedIn: 'root', // This ensures that this is a singleton service
})
export class WebSocketManagerService {

    private webSocket: MGPOptional<WebSocket> = MGPOptional.empty();
    private callbacks: Callback[] = [];

    public constructor(private readonly connectedUserService: ConnectedUserService) {
        console.log('WebSocketManagerService created (should happen only once');
    }

    public async connect(): Promise<void> {
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
                console.log('WS: message: ');
                console.log(ev);
                Utils.assert(typeof(ev.data) === 'string', `Received malformed WebSocket message: ${ev.data}`);
                const json: NonNullable<JSONValue> = Utils.getNonNullable(JSON.parse(ev.data as string));
                Utils.assert(json['type'] != null && typeof(json['type']) === 'string' && json['data'] != null,
                             `Received malformed WebSocket message: ${json}`);
                for (const callback of this.callbacks) {
                    callback(Utils.getNonNullable(json['type']), Utils.getNonNullable(json['data']));
                }
            };
        });
    }

    public async send(message: JSONValue): Promise<void> {
        // TODO: get rid of the any
        if (this.webSocket.isAbsent()) {
            await this.connect();
        }
        this.webSocket.get().send(JSON.stringify(message));
    }

    public setCallback(callback: Callback): void {
        this.callbacks.push(callback);
    }

    public clearCallbacks(): void {
        this.callbacks = [];
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
