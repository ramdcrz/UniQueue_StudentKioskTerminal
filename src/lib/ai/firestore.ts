import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '@/firebase/config';

function getOrchestratorApp() {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApp();
}

export function getOrchestratorFirestore() {
  return getFirestore(getOrchestratorApp());
}