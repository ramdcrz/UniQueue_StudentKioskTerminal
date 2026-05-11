import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manilaTimeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()); // MM/DD/YYYY
    const [month, day, year] = manilaTimeStr.split('/');
    const manilaDateString = `${year}-${month}-${day}`;

    const adminDb = getAdminDb();
    const batch = adminDb.batch();

    // 1. Fetch active tickets and cancel them
    const activeStatuses = ['PENDING', 'WAITING', 'CALLED'];
    const departmentsSnapshot = await adminDb.collection('departments').get();

    for (const deptDoc of departmentsSnapshot.docs) {
      const ticketsRef = adminDb.collection('departments').doc(deptDoc.id).collection('tickets');
      const countersRef = adminDb.collection('departments').doc(deptDoc.id).collection('counters');

      const activeTicketsSnapshot = await ticketsRef.where('status', 'in', activeStatuses).get();

      activeTicketsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          status: 'CANCELLED',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      const countersSnapshot = await countersRef.get();
      countersSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          status: 'VACANT',
          currentTicketId: null,
          ticketCount: 0,
          currentNumber: 0,
          date: manilaDateString
        });
      });
    }

    await batch.commit();

    return NextResponse.json({ success: true, message: 'Queue reset successfully', date: manilaDateString });
  } catch (error: any) {
    console.error('Queue reset error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
