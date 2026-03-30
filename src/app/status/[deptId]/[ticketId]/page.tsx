
"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Clock, UserCheck, RefreshCw, Home } from 'lucide-react';

function StatusContent() {
  const { deptId, ticketId } = useParams();
  const { tickets, counters, departments, isUserLoading } = useQueue();
  
  const ticket = tickets.find(t => t.id === ticketId);
  
  if (isUserLoading || (tickets.length === 0 && !ticket)) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Finding your ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6">
        <Card className="glass p-8 text-center space-y-6 rounded-[2rem] max-w-sm">
          <Clock size={48} className="mx-auto text-destructive" />
          <div className="space-y-2">
            <h1 className="text-xl font-black text-secondary uppercase">Ticket Not Found</h1>
            <p className="text-muted-foreground font-medium text-sm">This ticket may have expired or the ID is invalid.</p>
          </div>
          <Link href="/" className="block">
            <Button className="w-full rounded-xl bg-secondary">Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const department = departments.find(d => d.id === ticket.departmentId);
  const counter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticket.id);
  
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="liquid-glass rounded-[2.5rem] p-8 space-y-8 shadow-2xl overflow-hidden relative">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{department?.name}</p>
              <h2 className="text-lg font-black text-secondary uppercase">{ticket.serviceType} OFFICE</h2>
            </div>
            <Badge variant="outline" className={`px-3 py-1 rounded-full font-bold uppercase ${getStatusColor()}`}>
              {ticket.status}
            </Badge>
          </div>

          <div className="text-center py-6 bg-white/30 rounded-[2rem] border shadow-inner">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Your Number</p>
            <div className="text-7xl font-black jet-mono text-secondary">{ticket.queueNumber}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 p-4 rounded-2xl border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Waiting Ahead</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-secondary">{waitingAhead}</span>
                <span className="text-[10px] font-bold text-muted-foreground">STUDENTS</span>
              </div>
            </div>
            <div className="bg-white/50 p-4 rounded-2xl border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Est. Wait</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-secondary">~{waitingAhead * 5}</span>
                <span className="text-[10px] font-bold text-muted-foreground">MINS</span>
              </div>
            </div>
          </div>

          {(ticket.status === 'CALLED' || ticket.status === 'SERVING') && (
            <div className="bg-success p-6 rounded-[2rem] text-white text-center shadow-xl space-y-2">
              <UserCheck size={32} className="mx-auto" />
              <h3 className="text-xl font-black uppercase">IT'S YOUR TURN!</h3>
              <p className="text-sm font-bold opacity-90 uppercase">Proceed to Counter {counter?.counterNumber || '...'}</p>
            </div>
          )}
          
          <div className="pt-4">
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-bold text-muted-foreground gap-2">
                <Home size={18} /> BACK TO HOME
              </Button>
            </Link>
          </div>
        </Card>
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
