import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

import type { Ticket } from '@/lib/types';

const CAMPUS_TIMEZONE = 'Asia/Manila';
const MAX_COMPLETED_SAMPLES = 10;
const DEFAULT_AHT_MINUTES = 5;

export interface WaitTimeEstimate {
  waitingAhead: number;
  sampleCount: number;
  averageHandlingTimeMinutes: number;
  estimatedWaitMinutes: number;
  usedFallback: boolean;
}

function parseTimestamp(value?: string) {
  if (!value) return null;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getCampusDayWindow(now = new Date()) {
  const zonedNow = toZonedTime(now, CAMPUS_TIMEZONE);

  return {
    start: fromZonedTime(startOfDay(zonedNow), CAMPUS_TIMEZONE),
    end: fromZonedTime(endOfDay(zonedNow), CAMPUS_TIMEZONE),
  };
}

function getTicketQueueKey(ticket: Ticket) {
  return `${ticket.departmentId}:${ticket.serviceType}`;
}

/**
 * QA mock recipe:
 * 1. Seed 3-5 tickets under departments/{deptId}/tickets with status COMPLETED.
 * 2. Set calledAt and completedAt so each ticket has a known handling duration, for example:
 *    - 2 minutes
 *    - 4 minutes
 *    - 6 minutes
 * 3. Put at least one WAITING ticket ahead of the test ticket.
 * 4. Reload the kiosk success screen or mobile status page and verify:
 *    - AHT = average(calledAt -> completedAt)
 *    - Estimated Wait = AHT x waitingAhead
 * 5. Delete or archive the completed samples and confirm the fallback becomes 5 mins per waiting ticket.
 */
export function getWaitTimeEstimate(tickets: Ticket[], targetTicket: Ticket): WaitTimeEstimate {
  const targetCreatedAt = parseTimestamp(targetTicket.createdAt);
  const queueKey = getTicketQueueKey(targetTicket);

  const waitingAhead = targetCreatedAt === null
    ? 0
    : tickets.filter(ticket => {
        if (ticket.status !== 'WAITING') return false;
        if (ticket.departmentId !== targetTicket.departmentId) return false;
        if (getTicketQueueKey(ticket) !== queueKey) return false;

        const createdAt = parseTimestamp(ticket.createdAt);
        return createdAt !== null && createdAt < targetCreatedAt;
      }).length;

  const { start, end } = getCampusDayWindow();
  const startTime = start.getTime();
  const endTime = end.getTime();

  const completedSamples = tickets
    .filter(ticket => {
      if (ticket.status !== 'COMPLETED') return false;
      if (ticket.departmentId !== targetTicket.departmentId) return false;

      const completedAt = parseTimestamp(ticket.completedAt);
      return completedAt !== null && completedAt >= startTime && completedAt <= endTime;
    })
    .map(ticket => {
      const calledAt = parseTimestamp(ticket.calledAt);
      const completedAt = parseTimestamp(ticket.completedAt);

      if (calledAt === null || completedAt === null || completedAt < calledAt) {
        return null;
      }

      return {
        completedAt,
        handlingMinutes: (completedAt - calledAt) / 60000,
      };
    })
    .filter((sample): sample is { completedAt: number; handlingMinutes: number } => sample !== null)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, MAX_COMPLETED_SAMPLES);

  const sampleCount = completedSamples.length;
  const averageHandlingTimeMinutes = sampleCount > 0
    ? completedSamples.reduce((total, sample) => total + sample.handlingMinutes, 0) / sampleCount
    : DEFAULT_AHT_MINUTES;

  return {
    waitingAhead,
    sampleCount,
    averageHandlingTimeMinutes,
    estimatedWaitMinutes: waitingAhead * averageHandlingTimeMinutes,
    usedFallback: sampleCount === 0,
  };
}

export function formatEstimatedWait(minutes: number) {
  const roundedMinutes = Math.max(0, Math.round(minutes));

  if (roundedMinutes < 60) {
    return `~${roundedMinutes} min${roundedMinutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (remainingMinutes === 0) {
    return `~${hours} hr${hours === 1 ? '' : 's'}`;
  }

  return `~${hours} hr${hours === 1 ? '' : 's'} ${remainingMinutes} min${remainingMinutes === 1 ? '' : 's'}`;
}