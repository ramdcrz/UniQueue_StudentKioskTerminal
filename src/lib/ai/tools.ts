import { tool } from 'ai';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { endOfDay, startOfDay } from 'date-fns';
import { z } from 'zod';

import { getOrchestratorFirestore, getDateRange } from '@/lib/ai/firestore';
import type { Department, Ticket, User } from '@/lib/types';

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

export const getAvgTransactionTimeByDept = tool({
  description:
    'Calculates the average transaction time (servedAt to completedAt) per department for completed tickets in the given date range.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
    daysBack: z.number().int().min(1).default(7),
  }),
  execute: async ({ departmentId, daysBack }) => {
    const { start, end } = getDateRange(daysBack);
    const db = getOrchestratorFirestore();

    const transactionQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('status', '==', 'COMPLETED'),
      where('completedAt', '>=', start.toDate().toISOString()),
      where('completedAt', '<=', end.toDate().toISOString()),
    );

    const snapshot = await getDocs(transactionQuery);

    let totalTransactionTimeMs = 0;
    let validSampleCount = 0;

    snapshot.forEach(documentSnapshot => {
      const ticket = documentSnapshot.data() as TicketDocument;
      const servedAt = parseTimestamp(ticket.servedAt) || parseTimestamp(ticket.calledAt);
      const completedAt = parseTimestamp(ticket.completedAt);

      if (servedAt === null || completedAt === null || completedAt < servedAt) {
        return;
      }

      totalTransactionTimeMs += completedAt - servedAt;
      validSampleCount += 1;
    });

    const avgTimeMs = validSampleCount > 0 ? totalTransactionTimeMs / validSampleCount : 0;

    return {
      departmentId,
      daysBack,
      sampleCount: validSampleCount,
      averageTransactionTimeMs: Math.round(avgTimeMs),
      averageTransactionTimeMinutes: Number((avgTimeMs / 60000).toFixed(1)),
      dateRange: {
        start: start.toDate().toISOString(),
        end: end.toDate().toISOString(),
      },
    };
  },
});

export const getAvgTransactionTimeByStaff = tool({
  description:
    'Calculates the average transaction time per staff member for completed tickets in the given date range. Excludes staff with fewer than 5 completed tickets.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
    daysBack: z.number().int().min(1).default(7),
  }),
  execute: async ({ departmentId, daysBack }) => {
    const { start, end } = getDateRange(daysBack);
    const db = getOrchestratorFirestore();

    const transactionQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('status', '==', 'COMPLETED'),
      where('completedAt', '>=', start.toDate().toISOString()),
      where('completedAt', '<=', end.toDate().toISOString()),
    );

    const snapshot = await getDocs(transactionQuery);

    const staffMetrics: Record<
      string,
      {
        staffId: string;
        totalTimeMs: number;
        count: number;
        calledAt?: string;
      }
    > = {};

    snapshot.forEach(documentSnapshot => {
      const ticket = documentSnapshot.data() as TicketDocument;
      const staffId = ticket.counterId || 'unknown'; // Use counterId as proxy for staffId
      const servedAt = parseTimestamp(ticket.servedAt) || parseTimestamp(ticket.calledAt);
      const completedAt = parseTimestamp(ticket.completedAt);

      if (servedAt === null || completedAt === null || completedAt < servedAt) {
        return;
      }

      if (!staffMetrics[staffId]) {
        staffMetrics[staffId] = {
          staffId,
          totalTimeMs: 0,
          count: 0,
        };
      }

      staffMetrics[staffId].totalTimeMs += completedAt - servedAt;
      staffMetrics[staffId].count += 1;
    });

    // Filter out staff with < 5 tickets, calculate averages
    const staffStats = Object.values(staffMetrics)
      .filter(s => s.count >= 5)
      .map(s => ({
        staffId: s.staffId,
        avgTransactionTimeMs: Math.round(s.totalTimeMs / s.count),
        avgTransactionTimeMinutes: Number((s.totalTimeMs / s.count / 60000).toFixed(1)),
        completedTickets: s.count,
      }))
      .sort((a, b) => a.avgTransactionTimeMs - b.avgTransactionTimeMs);

    return {
      departmentId,
      daysBack,
      staffCount: staffStats.length,
      totalSampleCount: Object.values(staffMetrics).reduce((acc, s) => acc + s.count, 0),
      staffStats,
      dateRange: {
        start: start.toDate().toISOString(),
        end: end.toDate().toISOString(),
      },
    };
  },
});

export const getStaffEfficiencyRating = tool({
  description:
    'Calculates staff efficiency rating (0–100) based on speed (60%) and CSAT satisfaction (40%) for the given date range.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
    daysBack: z.number().int().min(1).default(7),
  }),
  execute: async ({ departmentId, daysBack }) => {
    const { start, end } = getDateRange(daysBack);
    const db = getOrchestratorFirestore();

    const completedQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('status', '==', 'COMPLETED'),
      where('completedAt', '>=', start.toDate().toISOString()),
      where('completedAt', '<=', end.toDate().toISOString()),
    );

    const snapshot = await getDocs(completedQuery);

    const staffMetrics: Record<
      string,
      {
        staffId: string;
        totalTimeMs: number;
        count: number;
        csatPositive: number;
        csatNegative: number;
        csatTotal: number;
      }
    > = {};

    let allTransactionTimes: number[] = [];

    snapshot.forEach(documentSnapshot => {
      const ticket = documentSnapshot.data() as TicketDocument;
      const staffId = ticket.counterId || 'unknown';
      const servedAt = parseTimestamp(ticket.servedAt) || parseTimestamp(ticket.calledAt);
      const completedAt = parseTimestamp(ticket.completedAt);

      if (servedAt === null || completedAt === null || completedAt < servedAt) {
        return;
      }

      const transactionTimeMs = completedAt - servedAt;

      if (!staffMetrics[staffId]) {
        staffMetrics[staffId] = {
          staffId,
          totalTimeMs: 0,
          count: 0,
          csatPositive: 0,
          csatNegative: 0,
          csatTotal: 0,
        };
      }

      staffMetrics[staffId].totalTimeMs += transactionTimeMs;
      staffMetrics[staffId].count += 1;
      allTransactionTimes.push(transactionTimeMs);

      // Count CSAT
      if (ticket.csat === 'POSITIVE') {
        staffMetrics[staffId].csatPositive += 1;
        staffMetrics[staffId].csatTotal += 1;
      } else if (ticket.csat === 'NEGATIVE') {
        staffMetrics[staffId].csatNegative += 1;
        staffMetrics[staffId].csatTotal += 1;
      }
    });

    // Calculate speed scores (faster = higher, using percentile)
    const calculateSpeedScore = (staffAvgTimeMs: number): number => {
      // Scale: < 2min = 100, > 8min = 0
      const minMs = 2 * 60000;
      const maxMs = 8 * 60000;

      if (staffAvgTimeMs <= minMs) return 100;
      if (staffAvgTimeMs >= maxMs) return 0;

      return Math.round(100 * (1 - (staffAvgTimeMs - minMs) / (maxMs - minMs)));
    };

    const staffStats = Object.values(staffMetrics)
      .filter(s => s.count >= 5) // Exclude staff with < 5 completed tickets
      .map(s => {
        const avgTimeMs = s.totalTimeMs / s.count;
        const speedScore = calculateSpeedScore(avgTimeMs);
        const csatScore =
          s.csatTotal > 0 ? Math.round((s.csatPositive / s.csatTotal) * 100) : 50; // Default to 50 if no CSAT
        const efficiencyRating = Math.round(speedScore * 0.6 + csatScore * 0.4);

        return {
          staffId: s.staffId,
          avgTransactionTimeMs: Math.round(avgTimeMs),
          avgTransactionTimeMinutes: Number((avgTimeMs / 60000).toFixed(1)),
          speedScore,
          csatPositive: s.csatPositive,
          csatNegative: s.csatNegative,
          csatRatedTickets: s.csatTotal,
          csatScore,
          efficiencyRating,
          completedTickets: s.count,
        };
      })
      .sort((a, b) => b.efficiencyRating - a.efficiencyRating);

    return {
      departmentId,
      daysBack,
      staffCount: staffStats.length,
      totalCompletedTickets: Object.values(staffMetrics).reduce((acc, s) => acc + s.count, 0),
      staffStats,
      dateRange: {
        start: start.toDate().toISOString(),
        end: end.toDate().toISOString(),
      },
    };
  },
});

export const getCrossValidationMetric = tool({
  description:
    'Calculates the conversion rate from Registrar tickets to subsequent Cashier tickets on the same day.',
  inputSchema: z.object({
    departmentId: departmentIdSchema,
    daysBack: z.number().int().min(1).default(7),
  }),
  execute: async ({ departmentId, daysBack }) => {
    const { start, end } = getDateRange(daysBack);
    const db = getOrchestratorFirestore();

    // Get all completed Registrar tickets in date range
    const registrarQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('status', '==', 'COMPLETED'),
      where('routingDepartment', '==', 'REGISTRAR'),
      where('completedAt', '>=', start.toDate().toISOString()),
      where('completedAt', '<=', end.toDate().toISOString()),
    );

    const registrarSnapshot = await getDocs(registrarQuery);
    const registrarTickets: Map<string, TicketDocument> = new Map();

    registrarSnapshot.forEach(doc => {
      const ticket = doc.data() as TicketDocument;
      if (ticket.studentName) {
        registrarTickets.set(ticket.studentName, ticket);
      }
    });

    // Get all completed Cashier tickets in date range
    const cashierQuery = query(
      collection(db, 'departments', departmentId, 'tickets'),
      where('status', '==', 'COMPLETED'),
      where('routingDepartment', '==', 'ACCOUNTING_CASHIER'),
      where('completedAt', '>=', start.toDate().toISOString()),
      where('completedAt', '<=', end.toDate().toISOString()),
    );

    const cashierSnapshot = await getDocs(cashierQuery);
    const cashierTickets: Map<string, TicketDocument[]> = new Map();

    cashierSnapshot.forEach(doc => {
      const ticket = doc.data() as TicketDocument;
      if (ticket.studentName) {
        if (!cashierTickets.has(ticket.studentName)) {
          cashierTickets.set(ticket.studentName, []);
        }
        cashierTickets.get(ticket.studentName)!.push(ticket);
      }
    });

    // Find cross-validations (same student, same day)
    let successfulConversions = 0;
    const conversions: Array<{
      studentName: string;
      registrarTicket: string;
      cashierTicket: string;
      registrarCompletedAt?: string;
      cashierCompletedAt?: string;
    }> = [];

    registrarTickets.forEach((registrarTicket, studentName) => {
      const cashierTicketsForStudent = cashierTickets.get(studentName) || [];
      const registrarDate = new Date(registrarTicket.completedAt || '').toDateString();

      for (const cashierTicket of cashierTicketsForStudent) {
        const cashierDate = new Date(cashierTicket.completedAt || '').toDateString();
        if (registrarDate === cashierDate) {
          successfulConversions += 1;
          conversions.push({
            studentName,
            registrarTicket: registrarTicket.queueNumber,
            cashierTicket: cashierTicket.queueNumber,
            registrarCompletedAt: registrarTicket.completedAt,
            cashierCompletedAt: cashierTicket.completedAt,
          });
          break; // Only count first conversion per student per day
        }
      }
    });

    const conversionRate =
      registrarTickets.size > 0
        ? Number(((successfulConversions / registrarTickets.size) * 100).toFixed(1))
        : 0;

    return {
      departmentId,
      daysBack,
      registrarCompletedCount: registrarTickets.size,
      successfulConversions,
      conversionRate,
      conversionRatePercent: `${conversionRate}%`,
      sampleConversions: conversions.slice(0, 10), // Return top 10 examples
      totalExamples: conversions.length,
      dateRange: {
        start: start.toDate().toISOString(),
        end: end.toDate().toISOString(),
      },
    };
  },
});

export const orchestratorTools = {
  getQueueLength,
  getWaitTimeAnalytics,
  getCounterEfficiency,
  getAvgTransactionTimeByDept,
  getAvgTransactionTimeByStaff,
  getStaffEfficiencyRating,
  getCrossValidationMetric,
};