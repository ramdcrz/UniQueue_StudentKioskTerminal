"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, UserCheck, RefreshCw, Home, CheckCircle2, AlertCircle } from 'lucide-react';

function StatusContent() {
  const { deptId, ticketId } = useParams();
  const { tickets, counters, departments, isUserLoading } = useQueue();
  
  const ticket = tickets.find(t => t.id === ticketId);
  
  // Only show loading if we don't have the ticket yet AND auth is still loading
  if (!ticket && isUserLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Syncing with server...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6">
        <Card className="glass p-10 text-center space-y-6 rounded-[3rem] max-w-sm border-white/40">
          <Clock size={64} className="mx-auto text-destructive/20" />
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-secondary uppercase tracking-tight">Ticket Missing</h1>
            <p className="text-muted-foreground font-medium text-sm">This ticket may have been removed or the link has expired.</p>
          </div>
          <Link href="/" className="block">
            <Button className="w-full rounded-2xl h-14 bg-secondary font-bold">Return to Main</Button>
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

  const getStatusConfig = () => {
    switch (ticket.status) {
      case 'WAITING': return { color: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'In Queue' };
      case 'CALLED':
      case 'SERVING': return { color: 'bg-success/10 text-success border-success/20 animate-pulse', icon: UserCheck, label: 'Currently Called' };
      case 'COMPLETED': return { color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2, label: 'Success' };
      case 'NOSHOW': return { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle, label: 'Missed' };
      case 'CANCELLED': return { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle, label: 'Cancelled' };
      default: return { color: 'bg-muted text-muted-foreground', icon: Clock, label: ticket.status };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-6 flex flex-col items-center justify-center space-y-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="liquid-glass rounded-[3.5rem] p-10 space-y-8 shadow-2xl relative overflow-hidden border-white/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{department?.name}</p>
              <h2 className="text-xl font-black text-secondary uppercase tracking-tighter">{ticket.serviceType} OFFICE</h2>
            </div>
            <Badge variant="outline" className={`px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] ${config.color}`}>
              {config.label}
            </Badge>
          </div>

          <div className="text-center py-12 bg-white/40 rounded-[3rem] border border-white/60 shadow-inner">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Ticket Number</p>
            <div className="text-[6rem] font-black jet-mono text-secondary leading-none whitespace-nowrap">{ticket.queueNumber}</div>
          </div>

          <AnimatePresence mode="wait">
            {ticket.status === 'WAITING' && (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 p-6 rounded-3xl border border-white/60 shadow-sm">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Ahead of You</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-secondary">{waitingAhead}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stus</span>
                  </div>
                </div>
                <div className="bg-white/50 p-6 rounded-3xl border border-white/60 shadow-sm">
                  <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Est. Wait</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-secondary">~{waitingAhead * 5}</span>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mins</span>
                  </div>
                </div>
              </motion.div>
            )}

            {(ticket.status === 'CALLED' || ticket.status === 'SERVING') && (
              <motion.div key="called" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-success p-8 rounded-[2.5rem] text-white text-center shadow-xl space-y-3">
                <UserCheck size={48} className="mx-auto" />
                <h3 className="text-2xl font-black uppercase tracking-tight">IT'S YOUR TURN!</h3>
                <p className="text-sm font-bold opacity-90 uppercase tracking-widest">Please proceed to Counter {counter?.counterNumber || '...'}</p>
              </motion.div>
            )}

            {ticket.status === 'COMPLETED' && (
              <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-primary/5 p-8 rounded-[2.5rem] text-center border-2 border-primary/20 space-y-3">
                <CheckCircle2 size={48} className="mx-auto text-primary" />
                <h3 className="text-xl font-black text-secondary uppercase">Success!</h3>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed">Thank you! See you on your next transaction.</p>
              </motion.div>
            )}

            {(ticket.status === 'NOSHOW' || ticket.status === 'CANCELLED') && (
              <motion.div key="noshow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/5 p-8 rounded-[2.5rem] text-center border-2 border-destructive/20 space-y-3">
                <AlertCircle size={48} className="mx-auto text-destructive" />
                <h3 className="text-xl font-black text-destructive uppercase tracking-tight">
                  {ticket.status === 'NOSHOW' ? 'Ticket Expired' : 'Ticket Cancelled'}
                </h3>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                  {ticket.status === 'NOSHOW' ? 'Sorry, please get a new queue number.' : 'Please get a new queue number if you still need assistance.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="pt-6">
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-16 rounded-3xl border-2 font-black text-muted-foreground gap-3 shadow-sm hover:bg-white">
                <Home size={20} /> BACK TO HOME
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
