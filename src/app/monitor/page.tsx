"use client";

import { useEffect, useState } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Volume2 } from 'lucide-react';

function MonitorContent() {
  const { tickets, counters, currentDepartment } = useQueue();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentlyServing = tickets
    .filter(t => t.status === 'CALLED' || t.status === 'SERVING')
    .slice(0, 4);
  
  const history = tickets
    .filter(t => t.status === 'COMPLETED' || t.status === 'NOSHOW')
    .sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime())
    .slice(0, 5);

  return (
    <div className="h-screen bg-[#F4F4F7] p-8 overflow-hidden flex flex-col space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary text-white rounded-2xl shadow-lg">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary uppercase tracking-tight">
              {currentDepartment?.name}
            </h1>
            <p className="text-muted-foreground font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              LIVE WAITING AREA MONITOR
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold jet-mono text-secondary">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm font-bold text-muted-foreground uppercase">
            {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-10 gap-8 min-h-0">
        {/* Left: Now Serving (70%) */}
        <div className="col-span-7 space-y-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            <AnimatePresence>
              {currentlyServing.length > 0 ? (
                currentlyServing.map((ticket, idx) => {
                  const counter = counters.find(c => c.id === ticket.counterId);
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                      className="liquid-glass rounded-[2rem] p-8 flex flex-col items-center justify-center space-y-4 border-2 border-primary/20"
                    >
                      <div className="text-sm font-bold text-primary bg-primary/10 px-6 py-2 rounded-full uppercase tracking-widest">
                        {ticket.serviceType}
                      </div>
                      <div className="text-9xl font-black jet-mono text-secondary">
                        {ticket.queueNumber}
                      </div>
                      <div className="w-full h-[2px] bg-border/50 my-4" />
                      <div className="text-4xl font-extrabold text-success uppercase">
                        Counter {counter?.counterNumber || idx + 1}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-2 liquid-glass rounded-[2rem] flex items-center justify-center">
                  <p className="text-4xl font-bold text-muted-foreground opacity-30 uppercase tracking-widest">
                    Waiting for next ticket
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: History (30%) */}
        <div className="col-span-3 liquid-glass rounded-[2rem] p-8 flex flex-col">
          <h2 className="text-xl font-black text-secondary mb-6 flex items-center gap-3">
            <Volume2 className="text-primary" />
            RECENTLY CALLED
          </h2>
          <div className="flex-1 space-y-4 overflow-hidden">
            <AnimatePresence>
              {history.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/50 p-4 rounded-2xl flex justify-between items-center border border-white/40 shadow-sm"
                >
                  <div className="text-3xl font-bold jet-mono text-secondary">
                    {t.queueNumber}
                  </div>
                  <div className="text-sm font-black text-muted-foreground bg-muted px-3 py-1 rounded-lg uppercase">
                    COMPLETED
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
              Please listen for voice announcements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <QueueProvider>
      <MonitorContent />
    </QueueProvider>
  );
}
