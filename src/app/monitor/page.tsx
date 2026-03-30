
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Volume2 } from 'lucide-react';

function MonitorContent() {
  const { tickets, counters, currentDepartment, departments, setCurrentDepartment } = useQueue();
  const [time, setTime] = useState<Date | null>(null);
  const lastAnnouncedId = useRef<string | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentlyServing = useMemo(() => {
    return tickets
      .filter(t => t.departmentId === currentDepartment?.id && (t.status === 'CALLED' || t.status === 'SERVING'))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [tickets, currentDepartment]);

  // Browser Native TTS Announcement Logic
  useEffect(() => {
    const speak = (text: string) => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Cancel any pending speech to avoid backlog
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1.0;
        
        // Find a suitable voice (optional, defaults to system)
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
      }
    };

    const latestCalled = currentlyServing[0];
    if (latestCalled && latestCalled.status === 'CALLED' && latestCalled.id !== lastAnnouncedId.current) {
      const counter = counters.find(c => c.id === latestCalled.counterId || c.currentTicketId === latestCalled.id);
      if (counter) {
        // Break number into digits for clearer announcement (e.g. M-0-0-1)
        const digits = latestCalled.queueNumber.split('').join(' ');
        speak(`Ticket number ${digits}. Please proceed to counter ${counter.counterNumber}.`);
        lastAnnouncedId.current = latestCalled.id;
      }
    }
  }, [currentlyServing, counters]);
  
  const history = useMemo(() => {
    return tickets
      .filter(t => t.departmentId === currentDepartment?.id && (t.status === 'COMPLETED' || t.status === 'NOSHOW'))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tickets, currentDepartment]);

  return (
    <div className="h-screen bg-[#F4F4F7] p-8 overflow-hidden flex flex-col space-y-6">
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
              LIVE MONITOR
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold jet-mono text-secondary">
            {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </div>
          <div className="text-sm font-bold text-muted-foreground uppercase">
            {time ? time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'Loading...'}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-10 gap-8 min-h-0">
        <div className="col-span-7 space-y-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            <AnimatePresence mode="popLayout">
              {currentlyServing.length > 0 ? (
                currentlyServing.map((ticket) => {
                  const counter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticket.id);
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
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
                        Counter {counter?.counterNumber || '??'}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-2 liquid-glass rounded-[2rem] flex items-center justify-center">
                  <p className="text-4xl font-bold text-muted-foreground opacity-30 uppercase tracking-widest">
                    Ready for next ticket
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="col-span-3 liquid-glass rounded-[2rem] p-8 flex flex-col">
          <h2 className="text-xl font-black text-secondary mb-6 flex items-center gap-3">
            <Volume2 className="text-primary" />
            RECENT CALLS
          </h2>
          <div className="flex-1 space-y-4 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {history.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/50 p-4 rounded-2xl flex justify-between items-center border border-white/40"
                >
                  <div className="text-3xl font-bold jet-mono text-secondary">{t.queueNumber}</div>
                  <div className={`text-[10px] font-black px-2 py-1 rounded uppercase ${t.status === 'NOSHOW' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                    {t.status}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-6 pt-6 border-t flex flex-wrap gap-2">
            {departments.map(d => (
              <button 
                key={d.id}
                onClick={() => setCurrentDepartment(d.id)}
                className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all uppercase ${currentDepartment?.id === d.id ? 'bg-secondary text-white border-secondary' : 'bg-white text-muted-foreground'}`}
              >
                {d.acronym}
              </button>
            ))}
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
