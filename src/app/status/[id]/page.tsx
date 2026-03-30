
"use client";

import { useParams } from 'next/navigation';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Clock, Building2, UserCheck, RefreshCw } from 'lucide-react';

function StatusContent() {
  const { id } = useParams();
  const { tickets, counters, departments } = useQueue();
  
  const ticket = tickets.find(t => t.id === id);
  
  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6">
        <Card className="glass p-8 text-center space-y-4 rounded-[2rem] max-w-sm">
          <div className="p-4 bg-destructive/10 text-destructive rounded-full w-fit mx-auto">
            <Clock size={32} />
          </div>
          <h1 className="text-xl font-black text-secondary uppercase">Ticket Not Found</h1>
          <p className="text-muted-foreground font-medium">This ticket may have expired or is invalid.</p>
        </Card>
      </div>
    );
  }

  const department = departments.find(d => d.id === ticket.departmentId);
  const counter = counters.find(c => c.id === ticket.counterId);
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
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{department?.name}</p>
                <h2 className="text-lg font-black text-secondary uppercase">{ticket.serviceType} OFFICE</h2>
              </div>
              <Badge variant="outline" className={`px-3 py-1 rounded-full font-bold uppercase tracking-tighter ${getStatusColor()}`}>
                {ticket.status}
              </Badge>
            </div>

            {/* Ticket Number */}
            <div className="text-center py-6 bg-white/30 rounded-[2rem] border border-white/40 shadow-inner">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Your Number</p>
              <div className="text-7xl font-black jet-mono text-secondary">
                {ticket.queueNumber}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Waiting Ahead</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-secondary">{waitingAhead}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">STUDENTS</span>
                </div>
              </div>
              <div className="bg-white/50 p-4 rounded-2xl border border-white/20">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Est. Time</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-secondary">{waitingAhead * 5}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">MINS</span>
                </div>
              </div>
            </div>

            {ticket.status === 'CALLED' && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-success p-6 rounded-[2rem] text-white text-center shadow-xl space-y-2"
              >
                <UserCheck size={32} className="mx-auto" />
                <h3 className="text-xl font-black uppercase">IT&apos;S YOUR TURN!</h3>
                <p className="text-sm font-bold opacity-90 uppercase">Proceed to Counter {counter?.counterNumber}</p>
              </motion.div>
            )}
          </div>

          <div className="bg-secondary p-4 text-center">
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center justify-center gap-2">
              <RefreshCw size={10} className="animate-spin" />
              Auto-updating every 30 seconds
            </p>
          </div>
        </Card>

        <p className="text-center mt-8 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 px-8">
          Please keep this page open. You will receive a notification when your number is called.
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
