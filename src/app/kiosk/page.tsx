"use client";

import { useState } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Receipt, CheckCircle2, Building2 } from 'lucide-react';

function KioskContent() {
  const { currentDepartment, createTicket, departments, setCurrentDepartment } = useQueue();
  const [step, setStep] = useState<'welcome' | 'service' | 'success'>('welcome');
  const [lastTicket, setLastTicket] = useState<any>(null);

  const handleGetQueue = (service: 'CASHIER' | 'ACCOUNTING' = 'CASHIER') => {
    const ticket = createTicket(service);
    setLastTicket(ticket);
    setStep('success');
    setTimeout(() => {
      setStep('welcome');
    }, 5000);
  };

  const handleStart = () => {
    if (currentDepartment?.hasAccounting) {
      setStep('service');
    } else {
      handleGetQueue('CASHIER');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <Card className="liquid-glass p-8 rounded-[2rem] border-white/40 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex items-center space-x-3 text-primary">
              <Building2 size={32} />
              <h1 className="text-2xl font-extrabold tracking-tighter">UniQueue</h1>
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-secondary">
                {currentDepartment?.name}
              </h2>
              <p className="text-muted-foreground">Please follow the instructions on the screen</p>
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
                    className="w-full h-24 text-2xl font-bold bg-primary hover:bg-primary/90 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    Get Queue Number
                  </Button>
                  <p className="text-sm font-medium text-muted-foreground">Tap to print your ticket</p>
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
                  <Button variant="ghost" onClick={() => setStep('welcome')}>Go Back</Button>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center space-y-6"
                >
                  <div className="p-4 bg-success/10 text-success rounded-full">
                    <CheckCircle2 size={64} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">Ticket Generated!</h3>
                    <p className="text-muted-foreground">Your queue number is:</p>
                    <div className="text-6xl font-black jet-mono text-primary py-4">
                      {lastTicket?.queueNumber}
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Printing ticket...</p>
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
              className={`px-3 py-1 text-xs rounded-full border transition-all ${currentDepartment?.id === d.id ? 'bg-secondary text-white border-secondary' : 'bg-white text-muted-foreground border-border hover:bg-gray-50'}`}
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
