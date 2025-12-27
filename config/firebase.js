const admin = require('firebase-admin');

let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Initialize Firebase Admin with service account
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Option 1: Using service account JSON file path
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL
    ) {
      // Option 2: Using environment variables
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    } else {
      throw new Error(
        'Firebase configuration missing. Please provide either FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL',
      );
    }

    console.log('✓ Firebase Admin initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    throw error;
  }
};

const getFirebaseAuth = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
};

const getFirebaseAdmin = () => {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin;
};

module.exports = {
  initializeFirebase,
  getFirebaseAuth,
  getFirebaseAdmin,
};
