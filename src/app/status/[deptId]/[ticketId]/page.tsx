"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, UserCheck, Home, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatEstimatedWait, getWaitTimeEstimate } from '@/lib/wait-time';

function StatusContent() {
  const { deptId, ticketId } = useParams();
  const { tickets, counters, departments, isUserLoading, updateTicketStatus } = useQueue();
  const { toast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);
  
  const ticket = tickets.find(t => t.id === ticketId);
  
  // Skeleton loading state — shown while auth is loading and ticket not yet found
  if (!ticket && isUserLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex flex-col items-center justify-center p-4 sm:p-6" aria-busy="true">
        <div className="w-full max-w-md">
          <Card className="rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 space-y-6 sm:space-y-8 shadow-2xl glass">
            {/* Header skeleton */}
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded-lg" />
                <Skeleton className="h-6 w-36 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            {/* Queue number skeleton */}
            <div className="text-center py-8 sm:py-12 bg-white/40 rounded-[2rem] sm:rounded-[3rem] border border-white/60">
              <Skeleton className="h-3 w-24 rounded-lg mx-auto mb-3" />
              <Skeleton className="h-20 w-48 rounded-2xl mx-auto" />
            </div>
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Skeleton className="h-24 rounded-2xl sm:rounded-3xl" />
              <Skeleton className="h-24 rounded-2xl sm:rounded-3xl" />
            </div>
            {/* Button skeleton */}
            <Skeleton className="h-14 sm:h-16 rounded-2xl sm:rounded-3xl" />
          </Card>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-4 sm:p-6">
        <Card className="glass p-8 sm:p-10 text-center space-y-6 rounded-[2.5rem] sm:rounded-[3rem] max-w-sm border-white/40">
          <Clock size={48} className="mx-auto text-destructive/20 sm:w-16 sm:h-16" />
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-secondary uppercase tracking-tight">Ticket Missing</h1>
            <p className="text-muted-foreground font-medium text-sm">This ticket may have been removed or the link has expired.</p>
          </div>
          <Link href="/" className="block">
            <Button className="w-full rounded-2xl h-12 sm:h-14 bg-secondary font-bold" aria-label="Return to main page">Return to Main</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const department = departments.find(d => d.id === ticket.departmentId);
  const counter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticket.id);
  const windowNumber = counter?.windowNumber ?? counter?.counterNumber ?? '...';
  const waitEstimate = getWaitTimeEstimate(tickets, ticket);

  const getStatusConfig = () => {
    if (!ticket?.status) return { color: 'bg-muted text-muted-foreground', icon: Clock, label: 'Unknown' };

    switch (ticket.status) {
      case 'WAITING': return { color: 'bg-warning/10 text-warning border-warning/20', icon: Clock, label: 'In Queue' };
      case 'CALLED':
      case 'SERVING': return { color: 'bg-success/10 text-success border-success/20 animate-pulse', icon: UserCheck, label: 'Currently Called' };
      case 'COMPLETED':
      case 'Finish': return { color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2, label: 'Success' };
      case 'NOSHOW': return { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle, label: 'Missed' };
      case 'CANCELLED': return { color: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertCircle, label: 'Cancelled' };
      default: return { color: 'bg-muted text-muted-foreground', icon: Clock, label: ticket.status };
    }
  };

  const config = getStatusConfig();

  const handleCancel = async () => {
    if (isCancelling || !ticket || !deptId) return;
    setIsCancelling(true);
    try {
      updateTicketStatus(ticket.id, 'CANCELLED', typeof deptId === 'string' ? deptId : undefined);
      toast({ title: 'Ticket Cancelled', description: `Ticket ${ticket.queueNumber} has been cancelled.`, variant: 'destructive' });
    } catch (error) {
      toast({ title: 'Cancellation Failed', description: 'Unable to cancel ticket. Please try again.', variant: 'destructive' });
      console.error('Cancel failed', error);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-4 sm:p-6 flex flex-col items-center justify-center space-y-6">
      <motion.div layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="liquid-glass rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 space-y-6 sm:space-y-8 shadow-2xl relative overflow-hidden border-white/50">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 truncate">{department?.name ?? 'Loading…'}</p>
              <h2 className="text-lg sm:text-xl font-black text-secondary uppercase tracking-tighter">{ticket.serviceType} OFFICE</h2>
            </div>
            <Badge variant="outline" className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest text-[9px] sm:text-[10px] shrink-0 ${config.color}`}>
              {config.label}
            </Badge>
          </div>

          <div className="text-center py-8 sm:py-12 bg-white/40 rounded-[2rem] sm:rounded-[3rem] border border-white/60 shadow-inner">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2">Ticket Number</p>
            <div className="text-5xl sm:text-[6rem] font-black jet-mono text-secondary leading-none whitespace-nowrap" role="status" aria-live="polite">{ticket.queueNumber}</div>
          </div>

          <AnimatePresence mode="wait">
            {ticket.status === 'WAITING' && (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/60 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Ahead of You</p>
                    <div className="flex items-baseline gap-1">
                      <motion.span 
                          key={waitEstimate.waitingAhead}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl sm:text-3xl font-black text-secondary"
                      >
                          {waitEstimate.waitingAhead}
                      </motion.span>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Students</span>
                    </div>
                  </div>
                  <div className="bg-white/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/60 shadow-sm">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Est. Wait</p>
                    <div className="flex items-baseline gap-1">
                      <motion.span 
                          key={Math.round(waitEstimate.estimatedWaitMinutes)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl sm:text-3xl font-black text-secondary"
                      >
                          {formatEstimatedWait(waitEstimate.estimatedWaitMinutes)}
                      </motion.span>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mins</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="w-full h-12 sm:h-14 rounded-2xl sm:rounded-3xl border-2 border-destructive/20 font-black text-destructive gap-2 shadow-sm hover:bg-destructive/5"
                  aria-label="Cancel your queue ticket"
                >
                  {isCancelling ? (
                    <LoadingSpinner size="sm" className="[&_.uq-spinner]:border-destructive/30 [&_.uq-spinner]:border-t-destructive" />
                  ) : (
                    <XCircle size={18} />
                  )}
                  {isCancelling ? 'CANCELLING…' : 'CANCEL TICKET'}
                </Button>
              </motion.div>
            )}

            {(ticket.status === 'CALLED' || ticket.status === 'SERVING') && (
              <motion.div key="called" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="bg-success p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-white text-center shadow-xl space-y-3">
                <UserCheck size={40} className="mx-auto sm:w-12 sm:h-12" />
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">IT IS YOUR TURN!</h3>
                <p className="text-xs sm:text-sm font-bold opacity-90 uppercase tracking-widest">Please proceed to Counter {windowNumber}</p>
              </motion.div>
            )}

            {ticket.status === 'COMPLETED' && (
              <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-primary/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-center border-2 border-primary/20 space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-primary sm:w-12 sm:h-12" />
                <h3 className="text-lg sm:text-xl font-black text-secondary uppercase">Success!</h3>
                <p className="text-xs sm:text-sm font-bold text-muted-foreground leading-relaxed">Thank you! See you on your next transaction.</p>
              </motion.div>
            )}

            {(ticket.status === 'NOSHOW' || ticket.status === 'CANCELLED') && (
              <motion.div key="noshow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-destructive/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] text-center border-2 border-destructive/20 space-y-3">
                <AlertCircle size={40} className="mx-auto text-destructive sm:w-12 sm:h-12" />
                <h3 className="text-lg sm:text-xl font-black text-destructive uppercase tracking-tight">
                  {ticket.status === 'NOSHOW' ? 'Ticket Expired' : 'Ticket Cancelled'}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-muted-foreground leading-relaxed">
                  {ticket.status === 'NOSHOW' ? 'Sorry, please get a new queue number.' : 'Please get a new queue number if you still need assistance.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="pt-4 sm:pt-6">
            <Link href="/" className="block">
              <Button variant="outline" className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl border-2 border-neutral-200 font-black text-muted-foreground gap-3 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-white transition-all" aria-label="Return to home page">
                <Home size={18} className="sm:w-5 sm:h-5" /> BACK TO HOME
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
