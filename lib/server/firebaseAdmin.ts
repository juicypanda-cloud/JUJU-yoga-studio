import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function initFromServiceAccountJson() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !String(raw).trim()) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON (service account JSON string)');
  }
  const credentials = JSON.parse(String(raw)) as Record<string, unknown>;
  initializeApp({ credential: cert(credentials as any) });
}

export function getServerFirestore() {
  if (!getApps().length) {
    initFromServiceAccountJson();
  }
  return getFirestore();
}

export function getServerAuth() {
  if (!getApps().length) {
    initFromServiceAccountJson();
  }
  return getAuth();
}
