
"use client";

import { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { User, LogOut, SkipForward, CheckCircle, AlertCircle, RefreshCw, ShieldAlert, Building2, Settings, Hash } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';

function StaffSetup() {
  const { departments, setStaffAssignment, staffAssignment } = useQueue();
  const [selectedDept, setSelectedDept] = useState<string | null>(staffAssignment.deptId);
  const [selectedService, setSelectedService] = useState<'CASHIER' | 'ACCOUNTING' | null>(staffAssignment.serviceType);
  const [selectedCounter, setSelectedCounter] = useState<number>(1);

  const dept = departments.find(d => d.id === selectedDept);

  const handleConfirm = () => {
    if (selectedDept && selectedService) {
      setStaffAssignment(selectedDept, selectedService, selectedCounter);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-6">
      <Card className="max-w-xl w-full p-10 rounded-[2.5rem] shadow-2xl space-y-8 glass">
        <div className="text-center space-y-2">
          <Building2 size={48} className="mx-auto text-primary" />
          <h1 className="text-2xl font-black text-secondary uppercase tracking-tight">Terminal Config</h1>
          <p className="text-muted-foreground font-medium">Assign this terminal to a physical counter</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Building</label>
            <div className="grid grid-cols-2 gap-3">
              {departments.map(d => (
                <Button 
                  key={d.id} variant={selectedDept === d.id ? 'default' : 'outline'}
                  onClick={() => { setSelectedDept(d.id); if (!d.hasAccounting) setSelectedService('CASHIER'); }}
                  className="h-14 rounded-2xl font-bold uppercase tracking-widest"
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
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={selectedService === 'CASHIER' ? 'default' : 'outline'}
                    onClick={() => setSelectedService('CASHIER')}
                    className="h-14 rounded-2xl font-bold"
                  >
                    Cashier
                  </Button>
                  {dept.hasAccounting && (
                    <Button 
                      variant={selectedService === 'ACCOUNTING' ? 'default' : 'outline'}
                      onClick={() => setSelectedService('ACCOUNTING')}
                      className="h-14 rounded-2xl font-bold"
                    >
                      Accounting
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Counter Number</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(num => (
                    <Button 
                      key={num} variant={selectedCounter === num ? 'secondary' : 'outline'}
                      onClick={() => setSelectedCounter(num)}
                      className="h-12 rounded-xl font-black shadow-sm"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button 
            disabled={!selectedDept || !selectedService}
            onClick={handleConfirm}
            className="w-full h-16 rounded-2xl bg-secondary font-black text-lg uppercase tracking-widest shadow-xl"
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
    isStaff, 
    isAdmin,
    isUserLoading,
    staffAssignment,
    setStaffAssignment
  } = useQueue();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staffAssignment.deptId && staffAssignment.serviceType && !staffCounter) {
      const existing = counters.find(c => 
        c.departmentId === staffAssignment.deptId && 
        c.serviceType === staffAssignment.serviceType &&
        c.counterNumber === (staffAssignment as any).counterNumber
      );
      if (existing) {
        setStaffCounter(existing.id);
      }
    }
  }, [counters, staffCounter, setStaffCounter, staffAssignment]);

  if (isUserLoading) return <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8 font-bold">Initializing terminal...</div>;

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-12 text-center space-y-6 rounded-[3rem] border-none shadow-2xl glass">
          <div className="w-24 h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto"><ShieldAlert size={48} /></div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-secondary uppercase tracking-tight">Access Restricted</h1>
            <p className="text-muted-foreground font-medium leading-relaxed">Please authenticate with an authorized faculty or staff account to access the terminal control.</p>
          </div>
          <div className="pb-12 pt-6">
            <Link href="/"><Button className="w-full rounded-2xl h-14 bg-secondary font-bold">Back to Home</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!staffAssignment.deptId || !staffAssignment.serviceType) return <StaffSetup />;

  const currentTicket = tickets.find(t => t.id === staffCounter?.currentTicketId);

  const handleAction = async (action: 'next' | 'complete' | 'noshow') => {
    if (!staffCounter) return;
    setLoading(true);
    if (action === 'next') await callNextTicket(staffCounter.id);
    else if (action === 'complete' && currentTicket) updateTicketStatus(currentTicket.id, 'COMPLETED');
    else if (action === 'noshow' && currentTicket) updateTicketStatus(currentTicket.id, 'NOSHOW');
    setTimeout(() => setLoading(false), 500);
  };

  const queueCount = tickets.filter(t => 
    t.status === 'WAITING' && t.departmentId === staffAssignment.deptId && t.serviceType === staffAssignment.serviceType
  ).length;

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-white/40 glass">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg"><User size={24} /></div>
            <div>
              <h1 className="font-black text-secondary uppercase">{user?.displayName || "Faculty Member"}</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                {staffAssignment.deptId?.toUpperCase()} • {staffAssignment.serviceType} Terminal • Counter {(staffAssignment as any).counterNumber || 1}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => setStaffAssignment(null, null)} className="rounded-xl border-2 font-bold gap-2 text-xs">
                <Settings size={14} /> Re-configure
              </Button>
            )}
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-2 border-primary/20 text-primary font-black uppercase">
              {staffCounter?.status || 'VACANT'}
            </Badge>
            <Link href="/"><Button variant="ghost" size="icon" className="rounded-2xl text-destructive hover:bg-destructive/10"><LogOut size={20} /></Button></Link>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 space-y-8">
            <motion.div layout className="liquid-glass rounded-[4rem] p-12 flex flex-col items-center justify-center text-center space-y-10 min-h-[500px]">
              {currentTicket && (currentTicket.status === 'CALLED' || currentTicket.status === 'SERVING') ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-primary uppercase tracking-[0.3em]">Currently Serving</p>
                    <h2 className="text-[10rem] font-black jet-mono text-secondary leading-none">{currentTicket.queueNumber}</h2>
                  </div>
                  <div className="w-full max-w-md grid grid-cols-2 gap-4">
                    <Button onClick={() => handleAction('complete')} className="h-24 text-lg font-black bg-success hover:bg-success/90 rounded-[2rem] shadow-xl flex flex-col pt-4">
                      <CheckCircle size={32} className="mb-1" /> Finish
                    </Button>
                    <Button onClick={() => handleAction('noshow')} variant="destructive" className="h-24 text-lg font-black rounded-[2rem] shadow-xl flex flex-col pt-4">
                      <AlertCircle size={32} className="mb-1" /> No Show
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                   <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className={`text-primary/40 ${loading ? 'animate-spin' : ''}`} size={48} />
                   </div>
                   <div className="space-y-2">
                    <h2 className="text-3xl font-black text-secondary uppercase">Terminal Waiting</h2>
                    <p className="text-muted-foreground font-medium">Click below to pull the next student</p>
                   </div>
                   <Button 
                    disabled={queueCount === 0 || loading || !staffCounter}
                    onClick={() => handleAction('next')}
                    className="px-16 h-24 text-2xl font-black bg-success hover:bg-success/90 rounded-[2.5rem] shadow-2xl flex items-center gap-6 hover:scale-105 transition-all"
                   >
                    <SkipForward size={40} /> CALL NEXT
                   </Button>
                </div>
              )}
            </motion.div>
          </div>

          <div className="col-span-4 space-y-6">
            <Card className="glass p-8 rounded-[3rem] border-white/40 shadow-sm">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6">Traffic Statistics</h3>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-black text-secondary uppercase tracking-tighter">Waiting List</span>
                    <span className="text-5xl font-black jet-mono text-primary">{queueCount}</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(queueCount * 10, 100)}%` }} className="h-full bg-primary" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white/50 p-6 rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Served Session</p>
                      <p className="text-3xl font-black jet-mono text-secondary">
                        {tickets.filter(t => t.status === 'COMPLETED' && t.departmentId === staffAssignment.deptId && t.serviceType === staffAssignment.serviceType).length}
                      </p>
                    </div>
                    <CheckCircle className="text-success/20" size={40} />
                  </div>
                  <div className="bg-white/50 p-6 rounded-3xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Missed/No Show</p>
                      <p className="text-3xl font-black jet-mono text-secondary">
                        {tickets.filter(t => t.status === 'NOSHOW' && t.departmentId === staffAssignment.deptId && t.serviceType === staffAssignment.serviceType).length}
                      </p>
                    </div>
                    <AlertCircle className="text-destructive/20" size={40} />
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-secondary p-8 rounded-[3rem] text-white shadow-xl flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-2xl"><Hash size={24} /></div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest mb-1">Terminal ID</h3>
                <p className="text-sm font-bold opacity-70">
                  BUILDING: {staffAssignment.deptId?.toUpperCase()}<br/>
                  OFFICE: {staffAssignment.serviceType}<br/>
                  COUNTER: {(staffAssignment as any).counterNumber || 1}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
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
