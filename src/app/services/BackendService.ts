import { ConnectedUserService } from './ConnectedUserService';
import { environment } from 'src/environments/environment';
import { JSONValue, MGPFallible, Utils } from '@everyboard/lib';

type HTTPMethod = 'POST' | 'GET' | 'PATCH' | 'HEAD' | 'DELETE';

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
