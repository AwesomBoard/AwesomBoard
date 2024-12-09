import { ConnectedUserService } from './ConnectedUserService';
import { environment } from 'src/environments/environment';
import { JSONValue, MGPFallible, Utils } from '@everyboard/lib';

type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'HEAD' | 'DELETE';

export abstract class BackendService {

    public constructor(protected readonly connectedUserService: ConnectedUserService) {
    }

    protected async performRequest(method: HTTPMethod, endpoint: string): Promise<MGPFallible<Response>> {
        console.log('performRequest 0', endpoint)
        const token: string = await this.connectedUserService.getIdToken();
        console.log('performRequest 1', endpoint)
        const response: Response =
            await fetch(environment.backendURL + '/' + endpoint, {
                method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                },
            });
        console.log('performRequest 2')
        if (this.isSuccessStatus(response.status)) {
            console.log('performRequest 3 a')
            return MGPFallible.success(response);
        } else {
            console.log('performRequest 3 b')
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
        console.log('performRequestWithJSONResponse')
        const response: MGPFallible<Response> = await this.performRequest(method, endpoint);
        console.log('laaelaae')
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
