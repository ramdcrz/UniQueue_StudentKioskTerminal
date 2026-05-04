
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Volume2, Play, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function MonitorContent() {
  const { tickets, counters, currentDepartment, departments, setCurrentDepartment } = useQueue();
  const { toast } = useToast();
  const [time, setTime] = useState<Date | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const lastAnnouncedId = useRef<string | null>(null);
  const prevHistoryCount = useRef(0);
  const [isDataReady, setIsDataReady] = useState(false);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mark data as ready once we have a department loaded
  useEffect(() => {
    if (currentDepartment && !isDataReady) {
      setIsDataReady(true);
    }
  }, [currentDepartment, isDataReady]);

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
      .slice(0, 12);
  }, [tickets, currentDepartment]);

  // Recent History for Toast logic
  const history = useMemo(() => {
    return tickets
      .filter(t => t.departmentId === currentDepartment?.id && (t.status === 'COMPLETED' || t.status === 'NOSHOW' || t.status === 'CANCELLED'))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tickets, currentDepartment]);

  // Handle Recent Activity Toasts
  useEffect(() => {
    if (history.length > prevHistoryCount.current) {
      const latest = history[0];
      if (latest) {
        toast({
          title: `Ticket ${latest.queueNumber}`,
          description: (
            <div className="flex items-center gap-2 font-bold whitespace-nowrap">
              {latest.status === 'COMPLETED' ? (
                <>
                  <CheckCircle2 className="text-success" size={16} />
                  <span>Transaction Completed</span>
                </>
              ) : latest.status === 'NOSHOW' ? (
                <>
                  <AlertCircle className="text-destructive" size={16} />
                  <span>Marked as No-Show</span>
                </>
              ) : (
                <>
                  <AlertCircle className="text-destructive" size={16} />
                  <span>Marked as Cancelled</span>
                </>
              )}
            </div>
          ),
          duration: 10000,
        });
      }
    }
    prevHistoryCount.current = history.length;
  }, [history, toast]);

  // Browser Native TTS Announcement Logic
  useEffect(() => {
    if (!isAudioEnabled) return;

    const speak = (text: string) => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9; // Slightly slower for better clarity
        utterance.pitch = 1.0;

        const announce = () => {
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
          if (preferredVoice) utterance.voice = preferredVoice;

          // Small safety delay to ensure previous speech is fully cleared
          window.speechSynthesis.cancel();
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
          }, 50);
        };

        // Handle case where voices might not be loaded yet
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = announce;
        } else {
          announce();
        }
      }
    };

    const latestCalled = currentlyServing.find(t => t.status === 'CALLED');
    if (latestCalled && latestCalled.id !== lastAnnouncedId.current) {
      const counter = counters.find(c => c.id === latestCalled.counterId || c.currentTicketId === latestCalled.id);
      if (counter) {
        const windowNumber = counter.windowNumber ?? counter.counterNumber ?? '??';
        // Prepare the queue number for natural speech (e.g. M-001 -> "M 0 0 1")
        const spokenNumber = latestCalled.queueNumber.replace('-', ' ').split('').join(' ');
        speak(`Ticket number ${spokenNumber}, please proceed to counter ${windowNumber}`);
        lastAnnouncedId.current = latestCalled.id;
      }
    }
  }, [currentlyServing, counters, isAudioEnabled]);

  return (
    <div className="h-screen bg-[#F4F4F7] p-4 sm:p-6 lg:p-8 overflow-hidden flex flex-col space-y-4 sm:space-y-6 relative">
      <AnimatePresence>
        {!isAudioEnabled && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 glass flex items-center justify-center p-6 sm:p-8 text-center"
          >
            <div className="max-w-md space-y-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary text-white rounded-full flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                <Volume2 size={40} className="sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-secondary uppercase">Sync Audio</h2>
                <p className="text-sm sm:text-base text-muted-foreground font-medium">Click to enable real-time voice announcements.</p>
              </div>
              <Button onClick={() => setIsAudioEnabled(true)} className="w-full h-14 sm:h-16 rounded-2xl bg-secondary text-lg sm:text-xl font-bold gap-3 shadow-xl" aria-label="Start monitor with audio announcements">
                <Play size={24} /> START MONITOR
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 px-2 sm:px-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3 bg-primary text-white rounded-xl sm:rounded-2xl shadow-lg">
            <Building2 size={24} className="sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-secondary uppercase tracking-tight">{currentDepartment?.name ?? 'Loading…'}</h1>
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-success uq-pulse-dot' : 'bg-destructive'}`} />
              {isAudioEnabled ? 'LIVE BROADCAST ACTIVE' : 'AUDIO MUTED'}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-black jet-mono text-secondary">
            {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {time ? time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : 'Loading...'}
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 min-h-0">
        {/* Column 1: Now Serving */}
        <div className="lg:col-span-8 flex flex-col space-y-3 sm:space-y-6 min-h-0">
          <h2 className="text-xs sm:text-sm font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 px-2" role="heading" aria-level={2}>
            <Volume2 size={16} /> Now Serving
          </h2>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 min-h-0 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {!isDataReady ? (
                /* Skeleton loaders while data is loading */
                <div className="w-full flex flex-col sm:grid sm:grid-cols-2 gap-4">
                  <Skeleton className="rounded-[2rem] sm:rounded-[3rem] min-h-[200px] sm:min-h-[250px]" />
                  <Skeleton className="rounded-[2rem] sm:rounded-[3rem] min-h-[200px] sm:min-h-[250px] hidden sm:block" />
                </div>
              ) : currentlyServing.length > 0 ? (
                currentlyServing.map((ticket) => {
                  const counter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticket.id);
                  const windowNumber = counter?.windowNumber ?? counter?.counterNumber ?? '??';
                  return (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="liquid-glass rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 border-2 border-primary/20 shadow-xl"
                    >
                      <span className="px-4 sm:px-6 py-1.5 sm:py-2 bg-primary/10 text-primary text-[10px] sm:text-xs font-black rounded-full uppercase tracking-widest">
                        {ticket.serviceType}
                      </span>
                      <div className="text-5xl sm:text-6xl lg:text-[8rem] leading-none font-black jet-mono text-secondary whitespace-nowrap" role="status" aria-live="polite">
                        {ticket.queueNumber}
                      </div>
                      <div className="text-xl sm:text-2xl lg:text-4xl font-black text-success uppercase mt-2 sm:mt-4">
                        Counter {windowNumber}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-2 liquid-glass rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center text-center p-8 sm:p-12">
                  <p className="text-lg sm:text-2xl font-bold text-muted-foreground opacity-30 uppercase tracking-widest leading-relaxed">
                    Awaiting next <br /> student call
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Column 2: Upcoming Queue */}
        <div className="lg:col-span-4 flex flex-col space-y-3 sm:space-y-6 min-h-0">
          <h2 className="text-xs sm:text-sm font-black text-secondary uppercase tracking-[0.3em] flex items-center gap-2 px-2" role="heading" aria-level={2}>
            <Users size={16} /> Upcoming Queue
          </h2>
          <div className="flex-1 bg-white/50 rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-6 space-y-2 sm:space-y-3 overflow-hidden border border-white/40">
            {!isDataReady ? (
              /* Skeleton loaders */
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-14 sm:h-16 rounded-2xl sm:rounded-3xl" />
                ))}
              </div>
            ) : upcomingQueue.length > 0 ? (
              upcomingQueue.map((t, i) => (
                <motion.div
                  key={t.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl flex justify-between items-center shadow-sm border border-border/50"
                >
                  <div className="text-xl sm:text-2xl lg:text-3xl font-black jet-mono text-secondary whitespace-nowrap">{t.queueNumber}</div>
                  <div className="text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 sm:py-1.5 bg-muted rounded-lg sm:rounded-xl text-muted-foreground uppercase tracking-widest">
                    {t.serviceType}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground font-bold italic opacity-30">
                Queue Empty
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 sm:pt-6 border-t flex flex-wrap gap-2">
            {departments.map(d => (
              <button key={d.id} onClick={() => setCurrentDepartment(d.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] font-black rounded-full border transition-all duration-200 uppercase tracking-widest ${currentDepartment?.id === d.id ? 'bg-secondary text-white border-secondary' : 'bg-white text-muted-foreground hover:bg-muted/50'}`}
                aria-label={`Switch to ${d.name}`}
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

