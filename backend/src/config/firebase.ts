
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Note: You must place your serviceAccountKey.json in the Backend root or src/config folder
// OR provide the details via environment variables (more secure for production)

let db: admin.database.Database | null = null;

try {
    // Try to load from file first
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require('../../serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DB_URL // e.g., "https://your-project.firebaseio.com"
    });

    db = admin.database();
    console.log("🔥 Firebase Admin Initialized Successfully");

} catch (error) {
    console.warn("⚠️ Firebase Admin could not be initialized. Missing serviceAccountKey.json or config.");
    console.warn("Real-time sync from Cloud to MongoDB will not work without this.");
}

export const firebaseDb = db;
