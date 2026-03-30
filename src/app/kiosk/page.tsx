
"use client";

import { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Receipt, Building2, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

function KioskContent() {
  const { currentDepartment, createTicket, departments, setCurrentDepartment } = useQueue();
  const [step, setStep] = useState<'welcome' | 'service' | 'success'>('welcome');
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'success') {
      setCountdown(15);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setStep('welcome');
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step]);

  const handleGetQueue = async (service: 'CASHIER' | 'ACCOUNTING' = 'CASHIER') => {
    try {
      const ticket = await createTicket(service);
      setLastTicket(ticket);
      setStep('success');
    } catch (error) {
      console.error("Failed to create ticket", error);
    }
  };

  const handleStart = () => {
    if (currentDepartment?.hasAccounting) {
      setStep('service');
    } else {
      handleGetQueue('CASHIER');
    }
  };

  const statusUrl = typeof window !== 'undefined' && lastTicket?.id
    ? `${window.location.origin}/track/${lastTicket.id}` 
    : '';

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg z-10">
        <Card className="liquid-glass p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex items-center space-x-3 text-primary">
              <Building2 size={32} />
              <h1 className="text-2xl font-extrabold tracking-tighter">UniQueue</h1>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-secondary">{currentDepartment?.name}</h2>
              <p className="text-muted-foreground font-medium">Please follow instructions</p>
            </div>

            <AnimatePresence mode="wait">
              {step === 'welcome' && (
                <motion.div key="welcome" className="w-full space-y-6">
                  <Button onClick={handleStart} className="w-full h-32 text-3xl font-black bg-primary rounded-[2rem] shadow-xl">
                    GET TICKET
                  </Button>
                </motion.div>
              )}

              {step === 'service' && (
                <motion.div key="service" className="w-full grid grid-cols-1 gap-4">
                  <Button onClick={() => handleGetQueue('CASHIER')} variant="outline" className="h-24 text-xl font-bold border-2 rounded-2xl justify-start px-8 gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl"><CreditCard /></div>
                    <span>Cashier</span>
                  </Button>
                  <Button onClick={() => handleGetQueue('ACCOUNTING')} variant="outline" className="h-24 text-xl font-bold border-2 rounded-2xl justify-start px-8 gap-4">
                    <div className="p-3 bg-accent/10 text-accent rounded-xl"><Receipt /></div>
                    <span>Accounting</span>
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('welcome')} className="font-bold">BACK</Button>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div key="success" className="w-full flex flex-col items-center space-y-8">
                  <div className="text-center space-y-2">
                    <p className="text-sm font-black text-primary uppercase tracking-widest">Your Number</p>
                    <div className="text-8xl font-black jet-mono text-secondary">{lastTicket?.queueNumber}</div>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border">
                    {statusUrl && <QRCodeSVG value={statusUrl} size={180} level="H" />}
                  </div>
                  <Button onClick={() => setStep('welcome')} className="w-full h-14 bg-secondary text-white font-bold rounded-2xl">
                    DONE ({countdown}s)
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <div className="mt-8 flex justify-center gap-2">
          {departments.map(d => (
            <button key={d.id} onClick={() => { setCurrentDepartment(d.id); setStep('welcome'); }} className={`px-4 py-2 text-[10px] font-bold rounded-full border shadow-sm ${currentDepartment?.id === d.id ? 'bg-secondary text-white' : 'bg-white'}`}>
              {d.acronym}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function KioskPage() {
  return (
    <QueueProvider>
      <KioskContent />
    </QueueProvider>
  );
}
