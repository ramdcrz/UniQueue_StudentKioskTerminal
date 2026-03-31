
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Volume2, Play, Users, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

function MonitorContent() {
  const { tickets, counters, currentDepartment, departments, setCurrentDepartment } = useQueue();
  const [time, setTime] = useState<Date | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const lastAnnouncedId = useRef<string | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Column 1: Now Serving (Active calls or serving)
  const currentlyServing = useMemo(() => {
    return tickets
      .filter(t => t.departmentId === currentDepartment?.id && (t.status === 'CALLED' || t.status === 'SERVING'))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 4);
  }, [tickets, currentDepartment]);

  // Column 2: Queue (Upcoming students)
  const upcomingQueue = useMemo(() => {
    return tickets
      .filter(t => t.departmentId === currentDepartment?.id && t.status === 'WAITING')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 8);
  }, [tickets, currentDepartment]);

  // Column 3: Recent Calls (History)
  const history = useMemo(() => {
    return tickets
      .filter(t => t.departmentId === currentDepartment?.id && (t.status === 'COMPLETED' || t.status === 'NOSHOW'))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }, [tickets, currentDepartment]);

  // Browser Native TTS Announcement Logic
  useEffect(() => {
    if (!isAudioEnabled) return;

    const speak = (text: string) => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; 
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      }
    };

    const latestCalled = currentlyServing.find(t => t.status === 'CALLED');
    if (latestCalled && latestCalled.id !== lastAnnouncedId.current) {
      const counter = counters.find(c => c.id === latestCalled.counterId || c.currentTicketId === latestCalled.id);
      if (counter) {
        const digits = latestCalled.queueNumber.split('').join(' ');
        speak(`Number ${digits}, Counter ${counter.counterNumber}.`);
        lastAnnouncedId.current = latestCalled.id;
      }
    }
  }, [currentlyServing, counters, isAudioEnabled]);

  return (
    <div className="h-screen bg-[#F4F4F7] p-8 overflow-hidden flex flex-col space-y-6 relative">
      <AnimatePresence>
        {!isAudioEnabled && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 glass flex items-center justify-center p-8 text-center"
          >
            <div className="max-w-md space-y-6">
              <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                <Volume2 size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-secondary uppercase">Sync Audio</h2>
                <p className="text-muted-foreground font-medium">Click to enable real-time voice announcements.</p>
              </div>
              <Button onClick={() => setIsAudioEnabled(true)} className="w-full h-16 rounded-2xl bg-secondary text-xl font-bold gap-3 shadow-xl">
                <Play size={24} /> START MONITOR
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center px-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary text-white rounded-2xl shadow-lg">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary uppercase tracking-tight">{currentDepartment?.name}</h1>
            <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
              {isAudioEnabled ? 'LIVE BROADCAST ACTIVE' : 'AUDIO MUTED'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black jet-mono text-secondary">
            {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {time ? time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'Loading...'}
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-8 min-h-0">
        {/* Column 1: Now Serving */}
        <div className="col-span-5 flex flex-col space-y-6">
          <h2 className="text-sm font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <Volume2 size={16} /> Now Serving
          </h2>
          <div className="flex-1 grid grid-rows-2 gap-6">
            <AnimatePresence mode="popLayout">
              {currentlyServing.length > 0 ? (
                currentlyServing.slice(0, 2).map((ticket) => {
                  const counter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticket.id);
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="liquid-glass rounded-[3rem] p-10 flex flex-col items-center justify-center text-center space-y-4 border-2 border-primary/20 shadow-xl"
                    >
                      <span className="px-6 py-2 bg-primary/10 text-primary text-xs font-black rounded-full uppercase tracking-widest">
                        {ticket.serviceType}
                      </span>
                      <div className="text-[9rem] leading-none font-black jet-mono text-secondary">
                        {ticket.queueNumber}
                      </div>
                      <div className="text-4xl font-black text-success uppercase mt-4">
                        Counter {counter?.counterNumber || '??'}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="row-span-2 liquid-glass rounded-[3rem] flex items-center justify-center text-center p-12">
                  <p className="text-2xl font-bold text-muted-foreground opacity-30 uppercase tracking-widest leading-relaxed">
                    Awaiting next <br/> student call
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Queue */}
        <div className="col-span-4 flex flex-col space-y-6">
          <h2 className="text-sm font-black text-secondary uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <Users size={16} /> Upcoming Queue
          </h2>
          <div className="flex-1 bg-white/50 rounded-[3rem] p-6 space-y-3 overflow-hidden border border-white/40">
            {upcomingQueue.map((t, i) => (
              <motion.div 
                key={t.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white p-5 rounded-3xl flex justify-between items-center shadow-sm border border-border/50"
              >
                <div className="text-3xl font-black jet-mono text-secondary">{t.queueNumber}</div>
                <div className="text-[10px] font-black px-3 py-1.5 bg-muted rounded-xl text-muted-foreground uppercase tracking-widest">
                  {t.serviceType}
                </div>
              </motion.div>
            ))}
            {upcomingQueue.length === 0 && (
              <div className="h-full flex items-center justify-center text-muted-foreground font-bold italic opacity-30">
                Queue Empty
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Recent Calls */}
        <div className="col-span-3 flex flex-col space-y-6">
          <h2 className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2 px-2">
            <History size={16} /> Recent Activity
          </h2>
          <div className="flex-1 flex flex-col space-y-3">
            {history.map((t) => (
              <div key={t.id} className="bg-white/40 p-4 rounded-2xl flex justify-between items-center border border-white/40">
                <div className="text-xl font-bold jet-mono text-secondary/60">{t.queueNumber}</div>
                <div className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${t.status === 'NOSHOW' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                  {t.status}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-6 border-t flex flex-wrap gap-2">
            {departments.map(d => (
              <button key={d.id} onClick={() => setCurrentDepartment(d.id)}
                className={`px-3 py-1.5 text-[10px] font-black rounded-full border transition-all uppercase tracking-widest ${currentDepartment?.id === d.id ? 'bg-secondary text-white border-secondary' : 'bg-white text-muted-foreground'}`}>
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
