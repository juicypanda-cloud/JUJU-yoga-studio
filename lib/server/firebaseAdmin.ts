import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const DEFAULT_FIRESTORE_DATABASE_ID = 'ai-studio-106d753f-3d40-40e6-9d7e-4f7b7903479c';
const STORAGE_BUCKET = 'gen-lang-client-0968768098.firebasestorage.app';

function initFromServiceAccountJson() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) {
    // If no service account JSON string is provided, initialize standard App with fallback project ID for unit testing
    initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'juju-yoga-studio' });
    return;
  }
  try {
    const credentials = JSON.parse(String(raw)) as Record<string, unknown>;
    initializeApp({ credential: cert(credentials as any) });
  } catch {
    initializeApp({ projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'juju-yoga-studio' });
  }
}

export function getServerFirestore() {
  if (!getApps().length) {
    initFromServiceAccountJson();
  }
  const app = getApps()[0];
  const dbId =
    process.env.FIRESTORE_DATABASE_ID ||
    process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
    process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    DEFAULT_FIRESTORE_DATABASE_ID;
  return getFirestore(app, dbId);
}

export function getServerAuth() {
  if (!getApps().length) {
    initFromServiceAccountJson();
  }
  return getAuth();
}

export function getServerStorageBucket() {
  if (!getApps().length) {
    initFromServiceAccountJson();
  }
  return getStorage().bucket(STORAGE_BUCKET);
}
