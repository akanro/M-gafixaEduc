import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin
let db: Firestore | null = null;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Check if already initialized to avoid errors during HMR/restarts
    if (!getApps().length) {
      initializeApp({
        projectId: config.projectId,
      });
    }
    
    // Get firestore instance with database ID Support
    // The second argument to getFirestore is the databaseId
    db = getFirestore(config.firestoreDatabaseId || '(default)');
    
    console.log(`Firebase Admin initialized successfully (Project: ${config.projectId}, DB: ${config.firestoreDatabaseId || 'default'})`);
  } else {
    console.warn("firebase-applet-config.json not found. Cloud persistence will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

export { db as firestore };

