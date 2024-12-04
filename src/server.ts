
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';

const app = express();
const port = 3000;

// Serve static files (including index.html)
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

let firebaseApp: admin.app.App | null = null;

// Helper function to initialize Firebase Admin SDK
function initializeFirebaseAdmin(serviceAccount: object) {
    if (firebaseApp) {
        return firebaseApp;
    }

    firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    return firebaseApp;
}
app.get('/', (req: any, res: Response) => {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
})
app.get('/theme', (req: any, res: Response) => {
    return res.sendFile(path.join(__dirname, '../public/theme.html'));
})
// Route to upload service account file
app.post('/uploadServiceAccount', (req: any, res: any) => {
    const file = req.body.file; // Assuming this comes from the frontend, like base64 or JSON
    if (file) {
        try {
            const parsedServiceAccount = JSON.parse(file);
            if (
                parsedServiceAccount && parsedServiceAccount.project_id && parsedServiceAccount.private_key
            ) {
                fs.writeFileSync(path.join(__dirname, 'serviceAccount.json'), JSON.stringify(parsedServiceAccount));
                initializeFirebaseAdmin(parsedServiceAccount); // Initialize Firebase Admin SDK

                return res.status(200).json({ message: 'Service account successfully uploaded and validated' });
            } else {
                return res.status(400).json({ error: 'Invalid service account file' });
            }
        } catch (err) {
            return res.status(400).json({ error: 'Failed to parse service account file' });
        }
    } else {
        return res.status(400).json({ error: 'No file provided' });
    }
});
// Route to save theme data to Firebase Remote Config
app.post('/saveTheme', async (req: any, res: any) => {
    try {
        const { themeType, colors } = req.body;

        if (!firebaseApp) {
            return res.status(500).json({ error: 'Firebase Admin SDK not initialized' });
        }

        const remoteConfig = admin.remoteConfig();

        // Get the current Remote Config template (to retrieve the etag)
        const template = await remoteConfig.getTemplate();

        // Format parameters based on the theme type (light or dark)
        const parameters: Record<string, any> = {};
        Object.keys(colors).forEach((key) => {
            parameters[`${key}`] = { defaultValue: { value: colors[key] } };
        });
        console.log('====================================');
        console.log();
        console.log('====================================');
        // Include the etag from the fetched template
        const configTemplate: admin.remoteConfig.RemoteConfigTemplate = {
            parameters,
            conditions: [],
            parameterGroups: {},
            etag: template.etag, // Use the etag from the current template
        };

        // Publish the new template to Firebase Remote Config
        await remoteConfig.publishTemplate(configTemplate);

        res.json({ message: 'Theme saved successfully to Firebase Remote Config' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error saving theme data');
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
