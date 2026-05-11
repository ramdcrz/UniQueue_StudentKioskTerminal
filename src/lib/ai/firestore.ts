import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, Timestamp } from 'firebase/firestore';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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
  const timeZone = 'Asia/Manila';
  const today = new Date();
  const startDate = subDays(today, daysBack - 1); // daysBack - 1 because today is day 1
  
  const zonedStart = toZonedTime(startDate, timeZone);
  const zonedEnd = toZonedTime(today, timeZone);
  
  const startLocal = startOfDay(zonedStart);
  const endLocal = endOfDay(zonedEnd);

  return {
    start: Timestamp.fromDate(fromZonedTime(startLocal, timeZone)),
    end: Timestamp.fromDate(fromZonedTime(endLocal, timeZone)),
    label: `${daysBack}d`
  };
}