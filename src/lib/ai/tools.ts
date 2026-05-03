import { tool } from 'ai';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { endOfDay, startOfDay } from 'date-fns';
import { z } from 'zod';

import { getOrchestratorFirestore } from '@/lib/ai/firestore';
import type { Department, Ticket } from '@/lib/types';

type DepartmentId = Department['id'];
type TicketDocument = Ticket & { id: string };

const departmentIdSchema = z.string().min(1, 'departmentId is required');
const counterIdSchema = z.string().min(1, 'counterId is required');

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getLocalDayWindow(now = new Date()) {
  const start = startOfDay(now);
  const end = endOfDay(now);

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function getCompletedTicketsQuery(departmentId: DepartmentId, startIso: string, endIso: string) {
  const db = getOrchestratorFirestore();

  return query(
    collection(db, 'departments', departmentId, 'tickets'),
    where('status', '==', 'COMPLETED'),
    where('completedAt', '>=', startIso),
    where('completedAt', '<=', endIso),
  );
}

export const getQueueLength = tool({
  description: 'Returns the current number of WAITING tickets for a department.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
  }),
  execute: async ({ departmentId }) => {
    const db = getOrchestratorFirestore();
    const waitingTicketsQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('status', '==', 'WAITING'),
    );

    const snapshot = await getDocs(waitingTicketsQuery);

    return {
      departmentId,
      queueLength: snapshot.size,
    };
  },
});

export const getWaitTimeAnalytics = tool({
  description: 'Calculates the average wait time for tickets completed today in a department.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
  }),
  execute: async ({ departmentId }) => {
    const { start, end, startIso, endIso } = getLocalDayWindow();
    const completedTodayQuery = getCompletedTicketsQuery(departmentId, startIso, endIso);
    const snapshot = await getDocs(completedTodayQuery);

    let totalWaitTimeMs = 0;
    let validSampleCount = 0;

    snapshot.forEach(documentSnapshot => {
      const ticket = documentSnapshot.data() as TicketDocument;
      const createdAt = parseTimestamp(ticket.createdAt);
      const calledAt = parseTimestamp(ticket.calledAt);

      if (createdAt === null || calledAt === null || calledAt < createdAt) {
        return;
      }

      totalWaitTimeMs += calledAt - createdAt;
      validSampleCount += 1;
    });

    const averageWaitTimeMs = validSampleCount > 0 ? totalWaitTimeMs / validSampleCount : 0;

    return {
      departmentId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dayWindow: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      completedTicketCount: snapshot.size,
      validSampleCount,
      averageWaitTimeMs: Math.round(averageWaitTimeMs),
      averageWaitTimeMinutes: Number((averageWaitTimeMs / 60000).toFixed(1)),
    };
  },
});

export const getCounterEfficiency = tool({
  description: 'Returns the completion versus no-show ratio for a department counter.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
    counterId: counterIdSchema,
  }),
  execute: async ({ departmentId, counterId }) => {
    const db = getOrchestratorFirestore();
    const counterTicketsQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('counterId', '==', counterId),
      where('status', 'in', ['COMPLETED', 'NOSHOW']),
    );

    const snapshot = await getDocs(counterTicketsQuery);

    let completedCount = 0;
    let noShowCount = 0;

    snapshot.forEach(documentSnapshot => {
      const ticket = documentSnapshot.data() as TicketDocument;

      if (ticket.status === 'COMPLETED') {
        completedCount += 1;
      }

      if (ticket.status === 'NOSHOW') {
        noShowCount += 1;
      }
    });

    const completedToNoshowRatio = noShowCount > 0 ? completedCount / noShowCount : null;

    return {
      departmentId,
      counterId,
      completedCount,
      noShowCount,
      completedToNoshowRatio,
      ratioLabel: noShowCount > 0 ? `${completedCount}:${noShowCount}` : 'N/A',
    };
  },
});

export const orchestratorTools = {
  getQueueLength,
  getWaitTimeAnalytics,
  getCounterEfficiency,
};