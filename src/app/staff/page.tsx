"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { motion } from 'framer-motion';
import { LogOut, SkipForward, CheckCircle, AlertCircle, RefreshCw, ShieldAlert, Building2, Settings, Hash, Coffee, ArrowRightLeft, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ServiceType } from '@/lib/types';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { canWindowServeTicket } from '@/context/QueueContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { AnimatePresence } from 'framer-motion';

function StaffSetup() {
  const { departments, setStaffAssignment, staffAssignment } = useQueue();
  const [selectedDept, setSelectedDept] = useState<string | null>(staffAssignment.deptId);
  const [selectedService, setSelectedService] = useState<'CASHIER' | 'ACCOUNTING' | null>(staffAssignment.serviceType);
  const [selectedWindow, setSelectedWindow] = useState<number>(staffAssignment.windowNumber || 1);

  const dept = departments.find(d => d.id === selectedDept);

  useEffect(() => {
    setSelectedService(selectedWindow <= 8 ? 'CASHIER' : 'ACCOUNTING');
  }, [selectedWindow]);

  useEffect(() => {
    if (staffAssignment.windowNumber) {
      setSelectedWindow(staffAssignment.windowNumber);
    }
  }, [staffAssignment.windowNumber]);

  const handleConfirm = () => {
    if (selectedDept && selectedService) {
      setStaffAssignment(selectedDept, selectedService, selectedWindow);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-xl w-full p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl space-y-6 sm:space-y-8 glass">
        <div className="text-center space-y-2">
          <Building2 size={40} className="mx-auto text-primary sm:w-12 sm:h-12" />
          <h1 className="text-xl sm:text-2xl font-black text-secondary uppercase tracking-tighter">Terminal Config</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Assign this terminal to a physical counter</p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Building</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {departments.map(d => (
                <Button 
                  key={d.id} variant={selectedDept === d.id ? 'default' : 'outline'}
                  onClick={() => { setSelectedDept(d.id); if (!d.hasAccounting) setSelectedService('CASHIER'); }}
                  className="h-12 sm:h-14 rounded-2xl font-bold uppercase tracking-widest text-sm"
                  aria-label={`Select building ${d.name}`}
                >
                  {d.acronym}
                </Button>
              ))}
            </div>
          </div>

          {dept && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-3">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Office</label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Button 
                    variant={selectedService === 'CASHIER' ? 'default' : 'outline'}
                    onClick={() => setSelectedService('CASHIER')}
                    disabled={selectedWindow > 8}
                    className="h-12 sm:h-14 rounded-2xl font-bold"
                    aria-label="Select Cashier office"
                  >
                    Cashier
                  </Button>
                  {dept.hasAccounting && (
                    <Button 
                      variant={selectedService === 'ACCOUNTING' ? 'default' : 'outline'}
                      onClick={() => setSelectedService('ACCOUNTING')}
                      disabled={selectedWindow <= 8}
                      className="h-12 sm:h-14 rounded-2xl font-bold"
                      aria-label="Select Accounting office"
                    >
                      Accounting
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Physical Window</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                    <Button 
                      key={num} variant={selectedWindow === num ? 'secondary' : 'outline'}
                      onClick={() => setSelectedWindow(num)}
                      className="h-10 sm:h-12 rounded-xl font-black shadow-sm"
                      aria-label={`Window ${num}`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {selectedWindow <= 8 ? 'Cashier Route' : 'Accounting Route'}
                </p>
              </div>
            </div>
          )}

          <Button 
            disabled={!selectedDept || !selectedService}
            onClick={handleConfirm}
            className="w-full h-14 sm:h-16 rounded-2xl bg-secondary font-black text-base sm:text-lg uppercase tracking-widest shadow-xl"
            aria-label="Start serving customers"
          >
            Start Serving
          </Button>
        </div>
      </Card>
    </div>
  );
}

function StaffContent() {
  const { 
    staffCounter, 
    counters, 
    setStaffCounter, 
    callNextTicket, 
    tickets, 
    updateTicketStatus, 
    transferTicket,
    transferTicketToWindow,
    toggleStaffPause,
    isStaff, 
    isAdmin,
    isUserLoading,
    staffAssignment,
    setStaffAssignment,
    currentDepartment,
    currentUserProfile,
  } = useQueue();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const actionLockRef = useRef(false);
  const lastNextCallAtRef = useRef(0);

  const NEXT_CALL_COOLDOWN_MS = 500;

  useEffect(() => {
    if (staffAssignment.deptId && staffAssignment.serviceType && !staffCounter) {
      const existing = counters.find(c => 
        c.departmentId === staffAssignment.deptId && 
        c.serviceType === staffAssignment.serviceType &&
        (c.windowNumber ?? c.counterNumber) === staffAssignment.windowNumber &&
        c.assignedStaffId === user?.uid
      );
      if (existing) {
        setStaffCounter(existing.id);
      }
    }
  }, [counters, staffCounter, setStaffCounter, staffAssignment, user?.uid]);

  const currentTicket = staffCounter ? tickets.find(t => t.id === staffCounter.currentTicketId) : null;

  const isServingTicket = !!currentTicket && (currentTicket.status === 'CALLED' || currentTicket.status === 'SERVING');
  const canTransferCurrent = !!currentTicket && isServingTicket;
  
  const departmentTransferTargets = canTransferCurrent
    ? Array.from(new Set(tickets.map(t => t.serviceType)))
        .filter(service => service !== currentTicket?.serviceType)
    : [];
  
  const windowTransferTargets = (() => {
    if (!canTransferCurrent || !staffAssignment.deptId) return [] as { id: string; label: string }[];

    const seen = new Set<string | number>();
    const targets: { id: string; label: string }[] = [];

    for (const c of counters) {
      if (c.departmentId !== staffAssignment.deptId) continue;
      if (c.id === staffCounter?.id) continue;
      if (c.status === 'OFFLINE') continue;
      // Only include counters that can serve the ticket's service type
      if (currentTicket && c.serviceType !== currentTicket.serviceType) continue;

      const wn = c.windowNumber ?? c.counterNumber ?? null;
      if (wn == null) continue; // skip unlabeled counters to avoid duplicates like "?"
      if (seen.has(wn)) continue; // dedupe by window number within the same department
      seen.add(wn);

      targets.push({ id: c.id, label: `${c.serviceType} Window ${wn}` });
    }

    return targets;
  })();

  const queueCount = tickets.filter(t => 
    t.status === 'WAITING' && 
    t.departmentId === staffAssignment.deptId && 
    t.serviceType === staffAssignment.serviceType &&
    canWindowServeTicket(staffAssignment.windowNumber, t.college)
  ).length;

  const canCallNext = !!staffCounter && !staffCounter.isPaused && !loading && !isServingTicket && queueCount > 0;
  const canFinishCurrent = !!staffCounter && !loading && isServingTicket;
  const canNoShowCurrent = !!staffCounter && !loading && isServingTicket;

  const handleTransfer = useCallback(async (destinationServiceType: string) => {
    if (!currentTicket || !canTransferCurrent || isTransferring) return;

    setIsTransferring(true);
    try {
      await transferTicket(currentTicket.id, destinationServiceType as ServiceType);
      setIsTransferOpen(false);
      toast({
        title: 'Ticket Transferred',
        description: `Ticket ${currentTicket.queueNumber} moved to ${destinationServiceType}.`,
      });
    } catch (error) {
      toast({
        title: 'Transfer Failed',
        description: 'Unable to move the ticket. Please try again.',
        variant: 'destructive',
      });
      console.error('Transfer failed', error);
    } finally {
      setIsTransferring(false);
    }
  }, [canTransferCurrent, currentTicket, isTransferring, toast, transferTicket]);

  const handleWindowTransfer = useCallback(async (targetCounterId: string) => {
    if (!currentTicket || !canTransferCurrent || isTransferring) return;

    setIsTransferring(true);
    try {
      await transferTicketToWindow(currentTicket.id, targetCounterId);
      setIsTransferOpen(false);
      const targetCounter = counters.find(c => c.id === targetCounterId);
      const windowLabel = `${targetCounter?.serviceType} Window ${targetCounter?.windowNumber ?? targetCounter?.counterNumber ?? '?'}`;
      toast({
        title: 'Ticket Transferred',
        description: `Ticket ${currentTicket.queueNumber} assigned to ${windowLabel}.`,
      });
    } catch (error) {
      toast({
        title: 'Transfer Failed',
        description: 'Unable to move the ticket. Please try again.',
        variant: 'destructive',
      });
      console.error('Window transfer failed', error);
    } finally {
      setIsTransferring(false);
    }
  }, [canTransferCurrent, currentTicket, counters, isTransferring, toast, transferTicketToWindow]);

  const handleAction = useCallback(async (action: 'next' | 'complete' | 'noshow') => {
    if (!staffCounter || loading || actionLockRef.current) return;

    if (action === 'next') {
      if (!canCallNext) return;
      const now = Date.now();
      if (now - lastNextCallAtRef.current < NEXT_CALL_COOLDOWN_MS) return;
      lastNextCallAtRef.current = now;
    } else if (action === 'complete' && !canFinishCurrent) {
      return;
    } else if (action === 'noshow' && !canNoShowCurrent) {
      return;
    }

    actionLockRef.current = true;
    setLoading(true);
    try {
      if (action === 'next') {
        await callNextTicket(staffCounter.id);
        toast({ title: 'Next Student Called', description: 'A new student has been called to your window.' });
      } else if (action === 'complete' && currentTicket) {
        updateTicketStatus(currentTicket.id, 'COMPLETED');
        toast({ title: 'Transaction Complete', description: `Ticket ${currentTicket.queueNumber} marked as completed.`, variant: 'success' as any });
      } else if (action === 'noshow' && currentTicket) {
        updateTicketStatus(currentTicket.id, 'NOSHOW');
        toast({ title: 'No Show', description: `Ticket ${currentTicket.queueNumber} marked as no-show.`, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Action Failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      console.error('Staff action failed', error);
    } finally {
      setTimeout(() => {
        setLoading(false);
        actionLockRef.current = false;
      }, 500);
    }
  }, [
    canCallNext,
    canFinishCurrent,
    canNoShowCurrent,
    callNextTicket,
    currentTicket,
    loading,
    staffCounter,
    toast,
    updateTicketStatus,
    handleWindowTransfer
  ]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        void handleAction('next');
        return;
      }

      if (event.key === 'Enter') {
        void handleAction('complete');
        return;
      }

      if (event.key === 'Escape') {
        void handleAction('noshow');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAction]);

  if (isUserLoading) return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6 sm:p-8" aria-busy="true">
      <div className="w-full max-w-6xl space-y-8">
        {/* Header skeleton */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-white/40 glass flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <Skeleton className="h-3 w-64 rounded-lg" />
          </div>
        </div>
        {/* Main skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <Skeleton className="lg:col-span-8 h-[400px] sm:h-[500px] rounded-[3rem] sm:rounded-[4rem]" />
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-60 rounded-[2.5rem] sm:rounded-[3rem]" />
            <Skeleton className="h-32 rounded-[2.5rem] sm:rounded-[3rem]" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6 sm:p-8">
        <Card className="max-w-md w-full p-8 sm:p-12 text-center space-y-6 rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl glass">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto"><ShieldAlert size={40} className="sm:w-12 sm:h-12" /></div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-secondary uppercase tracking-tight">Access Restricted</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed">Please authenticate with an authorized faculty or staff account to access the terminal control.</p>
          </div>
          <div className="pb-8 sm:pb-12 pt-4 sm:pt-6">
            <Link href="/"><Button className="w-full rounded-2xl h-12 sm:h-14 bg-secondary font-bold" aria-label="Go back to home page">Back to Home</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!staffAssignment.deptId || !staffAssignment.serviceType) return <StaffSetup />;

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-white/40 glass">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl shadow-lg">
              <AvatarImage src={currentUserProfile?.photoURL || user?.photoURL || ''} alt={user?.displayName || 'Staff'} className="object-cover" />
              <AvatarFallback className="rounded-xl sm:rounded-2xl bg-primary text-white font-black text-sm">{(user?.displayName || 'S').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-black text-secondary uppercase text-sm sm:text-base">{user?.displayName || "Faculty Member"}</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full uq-pulse-dot" />
                {staffAssignment.deptId?.toUpperCase()} • {staffAssignment.serviceType} Terminal • Window {staffAssignment.windowNumber || 1}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {staffCounter && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest hidden sm:inline-block">Accepting Tickets</span>
                <Switch 
                  checked={!staffCounter.isPaused} 
                  onCheckedChange={(checked) => toggleStaffPause(!checked)} 
                  aria-label="Toggle accepting tickets"
                />
              </div>
            )}
            {isAdmin && (
              <Button variant="outline" onClick={() => setStaffAssignment(null, null)} className="rounded-xl border-2 font-bold gap-2 text-xs" aria-label="Re-configure terminal assignment">
                <Settings size={14} /> Re-configure
              </Button>
            )}
            <Badge variant="outline" className="px-3 sm:px-4 py-1.5 rounded-full border-2 border-primary/20 text-primary font-black uppercase text-xs">
              {staffCounter?.status || 'VACANT'}
            </Badge>
            <Link href="/"><Button variant="ghost" size="icon" className="rounded-2xl text-destructive hover:bg-destructive/10" aria-label="Logout and return to home"><LogOut size={20} /></Button></Link>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            <motion.div layout className="relative liquid-glass rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-10 min-h-[350px] sm:min-h-[500px] overflow-hidden">
              {staffCounter?.isPaused && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-10 flex flex-col items-center justify-center space-y-4">
                  <Coffee size={48} className="text-muted-foreground/60" />
                  <h2 className="text-2xl font-black text-secondary uppercase tracking-widest">Currently Paused</h2>
                  <p className="text-sm font-medium text-muted-foreground">Toggle "Accepting Tickets" to resume.</p>
                </div>
              )}
              <AnimatePresence mode="wait">
                {currentTicket && (currentTicket.status === 'CALLED' || currentTicket.status === 'SERVING') ? (
                  <motion.div
                    key="serving"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full space-y-6 sm:space-y-10"
                  >
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-[0.3em]">Currently Serving</p>
                      <h2 className="text-6xl sm:text-[7rem] lg:text-[8rem] font-black jet-mono text-secondary leading-none whitespace-nowrap" role="status" aria-live="polite">{currentTicket.queueNumber}</h2>
                    </div>
                    <div className={`w-full max-w-md grid ${canTransferCurrent ? 'grid-cols-3' : 'grid-cols-2'} gap-3 sm:gap-4 mx-auto`}>
                      <Button onClick={() => handleAction('complete')} disabled={!canFinishCurrent} className="h-16 sm:h-24 text-base sm:text-lg font-black bg-success hover:bg-success/90 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl flex flex-col pt-3 sm:pt-4" aria-label="Mark ticket as complete. Shortcut Enter.">
                        {loading ? <LoadingSpinner size="sm" className="mb-1 [&_.uq-spinner]:border-white/40 [&_.uq-spinner]:border-t-white" /> : <CheckCircle size={28} className="mb-1 sm:w-8 sm:h-8" />} Finish
                        <span className="text-[10px] sm:text-xs font-semibold opacity-80"></span>
                      </Button>
                      <Button onClick={() => handleAction('noshow')} disabled={!canNoShowCurrent} variant="destructive" className="h-16 sm:h-24 text-base sm:text-lg font-black rounded-[1.5rem] sm:rounded-[2rem] shadow-xl flex flex-col pt-3 sm:pt-4" aria-label="Mark ticket as no show. Shortcut Escape.">
                        {loading ? <LoadingSpinner size="sm" className="mb-1 [&_.uq-spinner]:border-white/40 [&_.uq-spinner]:border-t-white" /> : <AlertCircle size={28} className="mb-1 sm:w-8 sm:h-8" />} No Show
                        <span className="text-[10px] sm:text-xs font-semibold opacity-80"></span>
                      </Button>
                      {canTransferCurrent && (
                        <Button
                          onClick={() => setIsTransferOpen(true)}
                          variant="outline"
                          className="h-16 sm:h-24 text-base sm:text-lg font-black rounded-[1.5rem] sm:rounded-[2rem] shadow-xl flex flex-col pt-3 sm:pt-4 border-white/60 bg-white/35 text-secondary hover:bg-secondary hover:text-white transition-all duration-300"
                          aria-label="Transfer current ticket to another service"
                        >
                          <ArrowRightLeft size={28} className="mb-1 sm:w-8 sm:h-8" /> Transfer
                          <span className="text-[10px] sm:text-xs font-semibold opacity-80"></span>
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ) : queueCount === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <EmptyState 
                      icon="coffee"
                      title="You're all caught up!"
                      description="No students currently in queue for your route. Take a quick break or wait for new arrivals."
                      className="bg-transparent border-none shadow-none p-0"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 sm:space-y-8 w-full"
                  >
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                      <RefreshCw className={`text-primary/40 ${loading ? 'animate-spin' : ''}`} size={36} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl sm:text-3xl font-black text-secondary uppercase">Terminal Waiting</h2>
                      <p className="text-sm sm:text-base text-muted-foreground font-medium">Click below to pull the next student</p>
                    </div>
                    <Button 
                      disabled={!canCallNext}
                      onClick={() => handleAction('next')}
                      className="px-10 sm:px-16 h-16 sm:h-24 text-xl sm:text-2xl font-black bg-success hover:bg-success/90 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex items-center gap-4 sm:gap-6 hover:scale-105 transition-all mx-auto"
                      aria-label={`Call next student. ${queueCount} students waiting. Shortcut Space.`}
                    >
                      {loading ? <LoadingSpinner size="md" className="[&_.uq-spinner]:border-white/40 [&_.uq-spinner]:border-t-white" /> : <SkipForward size={32} className="sm:w-10 sm:h-10" />} CALL NEXT
                      <span className="text-xs sm:text-sm font-semibold opacity-80"></span>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <Card className="glass p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-white/40 shadow-sm">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 sm:mb-6">Traffic Statistics</h3>
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs sm:text-sm font-black text-secondary uppercase tracking-tighter">Waiting List</span>
                    <span className="text-4xl sm:text-5xl font-black jet-mono text-primary" role="status" aria-live="polite" aria-label={`${queueCount} students waiting`}>{queueCount}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(queueCount * 10, 100)}%` }} className="h-full bg-primary" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Served Session</p>
                      <p className="text-2xl sm:text-3xl font-black jet-mono text-secondary">
                        {tickets.filter(t => t.status === 'COMPLETED' && t.departmentId === staffAssignment.deptId && t.serviceType === staffAssignment.serviceType).length}
                      </p>
                    </div>
                    <CheckCircle className="text-success/20" size={32} />
                  </div>
                  <div className="bg-white/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Missed/No Show</p>
                      <p className="text-2xl sm:text-3xl font-black jet-mono text-secondary">
                        {tickets.filter(t => t.status === 'NOSHOW' && t.departmentId === staffAssignment.deptId && t.serviceType === staffAssignment.serviceType).length}
                      </p>
                    </div>
                    <AlertCircle className="text-destructive/20" size={32} />
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-secondary p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] text-white shadow-xl flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl"><Hash size={20} className="sm:w-6 sm:h-6" /></div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-1">Terminal ID</h3>
                <p className="text-xs sm:text-sm font-bold opacity-70">
                  BUILDING: {staffAssignment.deptId?.toUpperCase()}<br/>
                  OFFICE: {staffAssignment.serviceType}<br/>
                    WINDOW: {staffAssignment.windowNumber || 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

        <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DialogContent className="sm:max-w-sm rounded-[2rem] border-white/50 bg-white/90 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-secondary uppercase tracking-tight">Transfer Ticket</DialogTitle>
              <DialogDescription className="text-sm font-medium text-muted-foreground">
                Move {currentTicket?.queueNumber} to a different service queue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {departmentTransferTargets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Transfer to Department</p>
                  {departmentTransferTargets.map((serviceType) => (
                    <Button
                      key={`dept-${serviceType}`}
                      variant="outline"
                      disabled={isTransferring}
                      onClick={() => void handleTransfer(serviceType)}
                      className="w-full justify-between rounded-2xl border-2 border-primary/15 bg-white/70 px-4 py-4 text-sm font-black text-secondary hover:bg-primary hover:text-white transition-all duration-300"
                    >
                      <span className="flex items-center gap-3">
                        <Building2 size={16} /> {serviceType}
                      </span>
                      {isTransferring ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                    </Button>
                  ))}
                </div>
              )}

              {windowTransferTargets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Transfer to Window (Same Dept)</p>
                  {windowTransferTargets.map((window) => (
                    <Button
                      key={`window-${window.id}`}
                      variant="outline"
                      disabled={isTransferring}
                      onClick={() => void handleWindowTransfer(window.id)}
                      className="w-full justify-between rounded-2xl border-2 border-success/15 bg-white/70 px-4 py-4 text-sm font-black text-secondary hover:bg-success hover:text-white transition-all duration-300"
                    >
                      <span className="flex items-center gap-3">
                        <ArrowRightLeft size={16} /> {window.label}
                      </span>
                      {isTransferring ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                    </Button>
                  ))}
                </div>
              )}

              {departmentTransferTargets.length === 0 && windowTransferTargets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-sm font-medium text-muted-foreground">
                  No transfer options available for this ticket.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}

export default function StaffPage() {
  return (
    <QueueProvider>
      <StaffContent />
    </QueueProvider>
  );
}
