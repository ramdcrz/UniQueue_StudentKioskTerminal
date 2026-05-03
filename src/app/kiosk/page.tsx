"use client";

import { useState, useEffect } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Receipt, Building2, UserRound, BadgeInfo } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Ticket } from '@/lib/types';
import { QueueValidationError } from '@/firebase/errors';

const PURPOSE_OPTIONS = [
  'Enrollment',
  'Past Due',
  'Completion Form Fee',
] as const;

function KioskContent() {
  const { currentDepartment, createTicket, departments, setCurrentDepartment } = useQueue();
  const [step, setStep] = useState<'welcome' | 'service' | 'details' | 'success'>('welcome');
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);
  const [selectedService, setSelectedService] = useState<'CASHIER' | 'ACCOUNTING'>('CASHIER');
  const [studentName, setStudentName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [formError, setFormError] = useState('');
  const [countdown, setCountdown] = useState(15);
  const [limitExceededOpen, setLimitExceededOpen] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'success') {
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

  const resetToWelcome = () => {
    setStep('welcome');
    setSelectedService('CASHIER');
    setStudentName('');
    setPurpose('');
    setFormError('');
  };

  const handleGetQueue = async (service: 'CASHIER' | 'ACCOUNTING' = 'CASHIER') => {
    try {
      setCountdown(15);
      const ticket = await createTicket({ serviceType: service, studentName: studentName.trim(), purpose });
      setLastTicket(ticket);
      setStep('success');
      setStudentName('');
      setPurpose('');
      setFormError('');
    } catch (error) {
      if (error instanceof QueueValidationError) {
        setFormError('');
        setLimitExceededOpen(true);
        return;
      }

      setFormError('Unable to print ticket. Please try again.');
      console.error("Failed to create ticket", error);
    }
  };

  const handleStart = () => {
    setFormError('');
    setSelectedService('CASHIER');
    if (currentDepartment?.hasAccounting) {
      setStep('service');
    } else {
      setStep('details');
    }
  };

  const handleServiceSelect = (service: 'CASHIER' | 'ACCOUNTING') => {
    setSelectedService(service);
    setStep('details');
    setFormError('');
  };

  const handleSubmitDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = studentName.trim();

    if (!trimmedName || !purpose) {
      setFormError('Please enter your name and choose a purpose.');
      return;
    }

    setFormError('');
    await handleGetQueue(selectedService);
  };

  const statusUrl = typeof window !== 'undefined' && lastTicket?.id
    ? `${window.location.origin}/status/${lastTicket.departmentId}/${lastTicket.id}` 
    : '';

  return (
    <>
      <Dialog
        open={limitExceededOpen}
        onOpenChange={(open) => {
          setLimitExceededOpen(open);
          if (!open) {
            resetToWelcome();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[2rem] border-none p-8">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-2xl font-black text-secondary">Limit Exceeded: Please try again tomorrow</DialogTitle>
            <DialogDescription className="text-sm font-medium text-muted-foreground">
              You have reached the 3-strike anti-spam limit for today.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setLimitExceededOpen(false);
                resetToWelcome();
              }}
              className="h-12 rounded-2xl bg-secondary font-bold text-white"
            >
              Back to Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <Button onClick={() => handleServiceSelect('CASHIER')} variant="outline" className="h-24 text-xl font-bold border-2 rounded-2xl justify-start px-8 gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl"><CreditCard /></div>
                      <span>Cashier</span>
                    </Button>
                    <Button onClick={() => handleServiceSelect('ACCOUNTING')} variant="outline" className="h-24 text-xl font-bold border-2 rounded-2xl justify-start px-8 gap-4">
                      <div className="p-3 bg-accent/10 text-accent rounded-xl"><Receipt /></div>
                      <span>Accounting</span>
                    </Button>
                    <Button variant="ghost" onClick={() => setStep('welcome')} className="font-bold">BACK</Button>
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.form key="details" onSubmit={handleSubmitDetails} className="w-full space-y-5 text-left">
                    <div className="rounded-[2rem] border border-white/60 bg-white/60 p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Selected Service</p>
                      <div className="flex items-center gap-3 text-secondary font-black text-lg uppercase">
                        {selectedService === 'ACCOUNTING' ? <Receipt className="h-5 w-5 text-accent" /> : <CreditCard className="h-5 w-5 text-primary" />}
                        <span>{selectedService}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground" htmlFor="student-name">
                        Student Name
                      </label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="student-name"
                          value={studentName}
                          onChange={(event) => setStudentName(event.target.value)}
                          placeholder="Enter your full name"
                          className="h-16 rounded-[1.5rem] border-2 pl-12 text-lg font-medium"
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground" htmlFor="purpose">
                        Purpose
                      </label>
                      <div className="relative">
                        <BadgeInfo className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Select value={purpose} onValueChange={setPurpose}>
                          <SelectTrigger id="purpose" className="h-16 rounded-[1.5rem] border-2 pl-12 text-lg font-medium">
                            <SelectValue placeholder="Select a purpose" />
                          </SelectTrigger>
                          <SelectContent>
                            {PURPOSE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formError && <p className="text-sm font-semibold text-destructive">{formError}</p>}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormError('');
                          if (currentDepartment?.hasAccounting) {
                            setStep('service');
                          } else {
                            setStep('welcome');
                          }
                        }}
                        className="h-14 rounded-2xl font-bold"
                      >
                        BACK
                      </Button>
                      <Button type="submit" className="h-14 rounded-2xl bg-primary font-black">
                        PRINT TICKET
                      </Button>
                    </div>
                  </motion.form>
                )}

                {step === 'success' && (
                  <motion.div key="success" className="w-full flex flex-col items-center space-y-8">
                    <div className="text-center space-y-2">
                      <p className="text-sm font-black text-primary uppercase tracking-widest">Your Number</p>
                      <div className="text-8xl font-black jet-mono text-secondary whitespace-nowrap">{lastTicket?.queueNumber}</div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        {lastTicket?.studentName} · {lastTicket?.purpose}
                      </p>
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
    </>
  );
}

export default function KioskPage() {
  return (
    <QueueProvider>
      <KioskContent />
    </QueueProvider>
  );
}
