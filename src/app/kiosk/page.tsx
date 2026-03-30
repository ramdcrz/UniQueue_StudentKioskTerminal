"use client";

import { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Receipt, Building2, Camera } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Kiosk view for student ticket dispensing.
 * Features a virtual ticket with QR code for mobile tracking.
 */
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

  // QR Code URL includes departmentId and ticketId for direct lookup
  const statusUrl = typeof window !== 'undefined' && lastTicket
    ? `${window.location.origin}/status/${lastTicket.departmentId}/${lastTicket.id}` 
    : '';

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <Card className="liquid-glass p-8 rounded-[2.5rem] border-white/40 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex items-center space-x-3 text-primary">
              <Building2 size={32} />
              <h1 className="text-2xl font-extrabold tracking-tighter">UniQueue</h1>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-secondary">
                {currentDepartment?.name}
              </h2>
              <p className="text-muted-foreground font-medium">Please follow the instructions on the screen</p>
            </div>

            <AnimatePresence mode="wait">
              {step === 'welcome' && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="w-full space-y-6"
                >
                  <Button 
                    onClick={handleStart}
                    className="w-full h-32 text-3xl font-black bg-primary hover:bg-primary/90 rounded-[2rem] shadow-xl hover:scale-[1.02] transition-all uppercase tracking-tight"
                  >
                    Get Ticket
                  </Button>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Tap to start</p>
                </motion.div>
              )}

              {step === 'service' && (
                <motion.div
                  key="service"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full grid grid-cols-1 gap-4"
                >
                  <Button 
                    onClick={() => handleGetQueue('CASHIER')}
                    variant="outline"
                    className="h-24 text-xl font-bold border-2 border-primary/20 hover:border-primary hover:bg-primary/5 rounded-2xl flex items-center justify-start px-8 space-x-4"
                  >
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      <CreditCard />
                    </div>
                    <span>Cashier Services</span>
                  </Button>
                  <Button 
                    onClick={() => handleGetQueue('ACCOUNTING')}
                    variant="outline"
                    className="h-24 text-xl font-bold border-2 border-accent/20 hover:border-accent hover:bg-accent/5 rounded-2xl flex items-center justify-start px-8 space-x-4"
                  >
                    <div className="p-3 bg-accent/10 text-accent rounded-xl">
                      <Receipt />
                    </div>
                    <span>Accounting Office</span>
                  </Button>
                  <Button variant="ghost" onClick={() => setStep('welcome')} className="font-bold text-muted-foreground">GO BACK</Button>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center space-y-8"
                >
                  <div className="text-center space-y-2">
                    <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">Your Queue Number</p>
                    <div className="text-8xl font-black jet-mono text-secondary py-2">
                      {lastTicket?.queueNumber}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] shadow-inner border border-border/50">
                    {statusUrl && (
                      <QRCodeSVG 
                        value={statusUrl} 
                        size={180} 
                        level="H"
                        includeMargin={false}
                      />
                    )}
                  </div>

                  <div className="space-y-4 px-4">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground font-semibold">
                      <Camera size={18} />
                      <p className="text-sm">Scan QR to track your turn or take a photo</p>
                    </div>
                    
                    <Button 
                      onClick={() => setStep('welcome')}
                      className="w-full h-14 bg-secondary text-white font-bold rounded-2xl hover:bg-secondary/90 transition-all"
                    >
                      DONE ({countdown}s)
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Dept Switcher for Demo */}
        <div className="mt-8 flex justify-center space-x-2">
          {departments.map(d => (
            <button 
              key={d.id}
              onClick={() => { setCurrentDepartment(d.id); setStep('welcome'); }}
              className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all uppercase tracking-tighter ${currentDepartment?.id === d.id ? 'bg-secondary text-white border-secondary' : 'bg-white text-muted-foreground border-border hover:bg-gray-50'}`}
            >
              {d.name.split(' ')[0]}
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
