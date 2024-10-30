import { firebaseConfig } from 'src/app/firebaseConfig';
import { Environment } from './environment-type';

export const environment: Environment = {
    production: true,
    test: false,
    root: '/',
    firebaseConfig: firebaseConfig,
    useEmulators: false,
    backendURL: 'http://localhost:8081',
};
