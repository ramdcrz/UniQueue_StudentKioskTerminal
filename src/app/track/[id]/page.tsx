
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueue, QueueProvider } from '@/context/QueueContext';

function TrackRedirectContent() {
  const router = useRouter();
  const { id } = useParams();
  const { tickets } = useQueue();

  useEffect(() => {
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
      router.replace(`/status/${ticket.departmentId}/${id}`);
    } else if (tickets.length > 0) {
      // If we have tickets but this ID isn't found, it might be an invalid URL or deleted ticket
      router.replace('/');
    }
  }, [id, tickets, router]);

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Redirecting to status...</p>
      </div>
    </div>
  );
}

export default function TrackRedirect() {
  return (
    <QueueProvider>
      <TrackRedirectContent />
    </QueueProvider>
  );
}
