import * as admin from 'firebase-admin';
import * as path from 'path';

let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (serviceAccountPath: string) => {
    if (!firebaseApp) {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
    return firebaseApp;
};

export const getRemoteConfig = () => {
    if (!firebaseApp) throw new Error('Firebase not initialized.');
    return firebaseApp.remoteConfig();
};
