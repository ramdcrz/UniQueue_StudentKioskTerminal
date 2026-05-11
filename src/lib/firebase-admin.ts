import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'studio-2915700153-cc2ad';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin: Missing required environment variables (projectId, clientEmail, or privateKey).');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export const adminDb = admin.firestore();
