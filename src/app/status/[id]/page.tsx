"use client";

import { useParams } from 'next/navigation';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Clock, Building2, UserCheck, RefreshCw } from 'lucide-react';

/**
 * Consolidated mobile status tracking page.
 * Displays real-time position in line and estimated wait time.
 */
function StatusContent() {
  const { id } = useParams();
  const { tickets, counters, departments, isUserLoading } = useQueue();
  
  // Search for the ticket across all synchronized departmental queues
  const ticket = tickets.find(t => t.id === id);
  
  // Show loading state while auth is resolving or if tickets are still syncing
  if (isUserLoading || (tickets.length === 0 && !ticket)) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="p-4 bg-white/50 rounded-full shadow-inner animate-pulse">
          <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Connecting to Queue...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6">
        <Card className="glass p-8 text-center space-y-4 rounded-[2rem] max-w-sm">
          <div className="p-4 bg-destructive/10 text-destructive rounded-full w-fit mx-auto">
            <Clock size={32} />
          </div>
          <h1 className="text-xl font-black text-secondary uppercase">Ticket Not Found</h1>
          <p className="text-muted-foreground font-medium">This ticket may have expired, or the ID is invalid.</p>
          <div className="pt-4">
            <Badge variant="outline" className="text-[10px] opacity-50">ID: {id}</Badge>
          </div>
        </Card>
      </div>
    );
  }

  const department = departments.find(d => d.id === ticket.departmentId);
  
  // Find the counter assigned to this ticket
  const counter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticket.id);
  
  // Calculate students ahead in the same department and service type
  const waitingAhead = tickets.filter(t => 
    t.status === 'WAITING' && 
    t.departmentId === ticket.departmentId && 
    t.serviceType === ticket.serviceType &&
    new Date(t.createdAt).getTime() < new Date(ticket.createdAt).getTime()
  ).length;

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'WAITING': return 'bg-warning/10 text-warning border-warning/20';
      case 'CALLED':
      case 'SERVING': return 'bg-success/10 text-success border-success/20 animate-pulse';
      case 'COMPLETED': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-6 flex flex-col items-center justify-center space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 space-y-2">
          <div className="flex items-center justify-center space-x-2 text-primary">
            <Building2 size={24} />
            <h1 className="text-xl font-black tracking-tighter uppercase">UniQueue Live</h1>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mobile Tracking Active</p>
        </div>

        <Card className="liquid-glass rounded-[2.5rem] border-white/40 shadow-2xl overflow-hidden">
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{department?.name}</p>
                <h2 className="text-lg font-black text-secondary uppercase">{ticket.serviceType} OFFICE</h2>
              </div>
              <Badge variant="outline" className={`px-3 py-1 rounded-full font-bold uppercase tracking-tighter ${getStatusColor()}`}>
                {ticket.status}
              </Badge>
            </div>

            <div className="text-center py-6 bg-white/30 rounded-[2rem] border border-white/40 shadow-inner">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Your Number</p>
              <div className="text-7xl font-black jet-mono text-secondary">
                {ticket.queueNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Waiting Ahead</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-secondary">{waitingAhead}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">STUDENTS</span>
                </div>
              </div>
              <div className="bg-white/50 p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Est. Wait</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-secondary">~{waitingAhead * 5}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">MINS</span>
                </div>
              </div>
            </div>

            {(ticket.status === 'CALLED' || ticket.status === 'SERVING') && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-success p-6 rounded-[2rem] text-white text-center shadow-xl space-y-2"
              >
                <UserCheck size={32} className="mx-auto" />
                <h3 className="text-xl font-black uppercase">IT&apos;S YOUR TURN!</h3>
                <p className="text-sm font-bold opacity-90 uppercase">
                  Proceed to Counter {counter?.counterNumber || '??'}
                </p>
              </motion.div>
            )}
          </div>

          <div className="bg-secondary p-4 text-center">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center justify-center gap-2">
              <RefreshCw size={10} className="animate-spin" />
              Live cloud synchronization active
            </p>
          </div>
        </Card>

        <p className="text-center mt-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 px-8">
          This page updates automatically. Please keep it open until your number is called.
        </p>
      </motion.div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <QueueProvider>
      <StatusContent />
    </QueueProvider>
  );
}
