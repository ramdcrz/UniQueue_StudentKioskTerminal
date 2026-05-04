import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay, subDays } from 'date-fns';

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

/**
 * Get date range for analytics queries (local day boundary).
 * @param daysBack - Number of days to go back (7, 30, etc.)
 * @returns Object with start and end Timestamp for the date range
 */
export function getDateRange(daysBack: number) {
  const today = new Date();
  const startDate = subDays(today, daysBack - 1); // daysBack - 1 because today is day 1
  
  return {
    start: Timestamp.fromDate(startOfDay(startDate)),
    end: Timestamp.fromDate(endOfDay(today)),
    label: `${daysBack}d`
  };
}