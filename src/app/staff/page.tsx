
"use client";

import { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { User, LogOut, SkipForward, CheckCircle, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/firebase';

function StaffContent() {
  const { staffCounter, counters, setStaffCounter, callNextTicket, tickets, updateTicketStatus, isStaff, isUserLoading } = useQueue();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!staffCounter && counters.length > 0) setStaffCounter(counters[0].id);
  }, [counters, staffCounter, setStaffCounter]);

  if (isUserLoading) {
    return <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">Loading...</div>;
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-12 text-center space-y-6 rounded-[3rem] border-none shadow-2xl glass">
          <div className="w-24 h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-secondary uppercase tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground font-medium">This terminal is restricted to authorized staff members.</p>
          </div>
          <Link href="/">
            <Button className="w-full rounded-2xl h-14 bg-secondary font-bold">Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const currentTicket = tickets.find(t => t.id === staffCounter?.currentTicketId);

  const handleAction = async (action: 'next' | 'complete' | 'noshow') => {
    if (!staffCounter) return;
    setLoading(true);
    
    if (action === 'next') {
      await callNextTicket(staffCounter.id);
    } else if (action === 'complete' && currentTicket) {
      updateTicketStatus(currentTicket.id, 'COMPLETED');
    } else if (action === 'noshow' && currentTicket) {
      updateTicketStatus(currentTicket.id, 'NOSHOW');
    }

    setTimeout(() => setLoading(false), 500);
  };

  const queueCount = tickets.filter(t => 
    t.status === 'WAITING' && 
    t.departmentId === staffCounter?.departmentId && 
    t.serviceType === staffCounter?.serviceType
  ).length;

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-white/40 glass">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg">
              <User size={24} />
            </div>
            <div>
              <h1 className="font-black text-secondary uppercase">
                STAFF: {user?.displayName || user?.email?.split('@')[0] || "Unknown"}
              </h1>
              <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                {staffCounter?.serviceType} COUNTER {staffCounter?.counterNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-2 border-primary/20 text-primary font-bold">
              {staffCounter?.status}
            </Badge>
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-2xl text-destructive hover:bg-destructive/10">
                <LogOut size={20} />
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-8 space-y-8">
            <motion.div 
              layout
              className="liquid-glass rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-8 min-h-[500px]"
            >
              {currentTicket && (currentTicket.status === 'CALLED' || currentTicket.status === 'SERVING') ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-primary uppercase tracking-widest">Currently Serving</p>
                    <h2 className="text-9xl font-black jet-mono text-secondary">
                      {currentTicket.queueNumber}
                    </h2>
                  </div>
                  
                  <div className="w-full max-w-md grid grid-cols-2 gap-4">
                    <Button 
                      onClick={() => handleAction('complete')}
                      className="h-20 text-lg font-bold bg-success hover:bg-success/90 rounded-2xl shadow-xl flex flex-col"
                    >
                      <CheckCircle size={24} className="mb-1" />
                      Complete
                    </Button>
                    <Button 
                      onClick={() => handleAction('noshow')}
                      variant="destructive"
                      className="h-20 text-lg font-bold rounded-2xl shadow-xl flex flex-col"
                    >
                      <AlertCircle size={24} className="mb-1" />
                      No Show
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                   <div className="w-32 h-32 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className={`text-primary/40 ${loading ? 'animate-spin' : ''}`} size={48} />
                   </div>
                   <div className="space-y-2">
                    <h2 className="text-3xl font-black text-secondary uppercase">Counter Vacant</h2>
                    <p className="text-muted-foreground font-medium">Ready to serve the next student in line</p>
                   </div>
                   <Button 
                    disabled={queueCount === 0 || loading}
                    onClick={() => handleAction('next')}
                    className="px-12 h-20 text-2xl font-black bg-success hover:bg-success/90 rounded-3xl shadow-2xl flex items-center gap-4 hover:scale-105 transition-all"
                   >
                    <SkipForward size={32} />
                    Call Next Ticket
                   </Button>
                </div>
              )}
            </motion.div>
          </div>

          <div className="col-span-4 space-y-6">
            <Card className="glass p-6 rounded-[2rem] border-white/40 shadow-sm">
              <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Live Queue Stats</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm font-bold text-secondary">In Queue</span>
                    <span className="text-4xl font-black jet-mono text-primary">{queueCount}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(queueCount * 10, 100)}%` }} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Served Today</p>
                    <p className="text-2xl font-black jet-mono text-secondary">
                      {tickets.filter(t => t.status === 'COMPLETED').length}
                    </p>
                  </div>
                  <div className="bg-white/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Abandonment</p>
                    <p className="text-2xl font-black jet-mono text-secondary">
                      {tickets.filter(t => t.status === 'NOSHOW').length}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-secondary p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xs font-black text-white/50 uppercase tracking-widest mb-4">Department Notice</h3>
                <p className="text-sm font-medium leading-relaxed">
                  Peak enrollment season is active. Please ensure timely transaction completion to maintain queue efficiency.
                </p>
              </div>
              <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            </Card>
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
