"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { CreditCard, Receipt, Building2, UserRound, BadgeInfo, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import type { Ticket } from '@/lib/types';
import { formatEstimatedWait, getWaitTimeEstimate } from '@/lib/wait-time';
import { QueueValidationError } from '@/firebase/errors';

const PURPOSE_OPTIONS = [
  'Enrollment',
  'Documents',
  'Examination Fees',
  'Clearance & Balances',
  'Disbursement',
  'Others'
] as const;

const COLLEGE_OPTIONS = [
  'College of Arts and Sciences (CAS)',
  'College of Business Administration (CBA)',
  'College of Criminology (CRIM)',
  'College of Engineering & Architecture (CEA)',
  'College of Education (COE)',
  'College of Informatics & Computing Studies (CICS)',
  'College of Midwifery (COM)',
  'College of Physical Therapy (CPT)',
  'College of Respiratory Therapy (CRT)',
  'College of Accountancy (COA)',
  'College of Communication (COC)',
  'College of Law (COL)',
  'College of Music (Music)',
  'College of Nursing (CON)',
  'College of Medical Technology (CMT)',
  'School of International Relations (SOIR)',
  'Integrated School (IS)'
] as const;

function KioskContent() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { currentDepartment, createTicket, departments, setCurrentDepartment, tickets } = useQueue();
  const { toast } = useToast();
  const [step, setStep] = useState<'welcome' | 'service' | 'details' | 'success'>('welcome');
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);
  const [selectedService, setSelectedService] = useState<'CASHIER' | 'ACCOUNTING'>('CASHIER');
  const [studentName, setStudentName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [college, setCollege] = useState('');
  const [formError, setFormError] = useState('');
  const [countdown, setCountdown] = useState(15);
  const [limitExceededOpen, setLimitExceededOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (isMobile && step === 'welcome' && currentDepartment) {
      handleStart();
    }
  }, [isMobile, step, currentDepartment]);

  const resetToWelcome = () => {
    setStep('welcome');
    setSelectedService('CASHIER');
    setStudentName('');
    setPurpose('');
    setFormError('');
    setIsSubmitting(false);
  };

  const handleGetQueue = async (service: 'CASHIER' | 'ACCOUNTING' = 'CASHIER') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      setCountdown(15);
      const ticket = await createTicket({ serviceType: service, studentName: studentName.trim(), purpose, college });
      setLastTicket(ticket);

      // Mobile: redirect straight to the live status page
      if (isMobile) {
        router.push(`/status/${ticket.departmentId}/${ticket.id}`);
        return;
      }

      setStep('success');
      setStudentName('');
      setPurpose('');
      setCollege('');
      setFormError('');
      toast({
        title: `Ticket ${ticket.queueNumber} Created`,
        description: 'Your queue number has been issued successfully.',
        variant: 'success' as any,
      });
    } catch (error) {
      if (error instanceof QueueValidationError) {
        setFormError('');
        setLimitExceededOpen(true);
        return;
      }

      setFormError('Unable to print ticket. Please try again.');
      toast({
        title: 'Ticket Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
      console.error("Failed to create ticket", error);
    } finally {
      setIsSubmitting(false);
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
    if (isSubmitting) return;

    const trimmedName = studentName.trim();

    if (!trimmedName || !purpose || !college) {
      setFormError('Please enter your name, choose a college, and a purpose.');
      return;
    }

    setFormError('');
    await handleGetQueue(selectedService);
  };

  const statusUrl = typeof window !== 'undefined' && lastTicket?.id
    ? `${window.location.origin}/status/${lastTicket.departmentId}/${lastTicket.id}`
    : '';
  const waitEstimate = lastTicket ? getWaitTimeEstimate(tickets, lastTicket) : null;

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
        <DialogContent className="max-w-md rounded-[2rem] border-none p-6 sm:p-8">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-black text-secondary">Limit Exceeded: Please try again tomorrow</DialogTitle>
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
              aria-label="Return to start screen"
            >
              Back to Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg z-10">
          <Card className="liquid-glass p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-5 sm:space-y-8">
              <div className="flex items-center space-x-3 text-primary">
                <Building2 size={28} className="sm:w-8 sm:h-8" />
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter">UniQueue</h1>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-secondary" role="status">{currentDepartment?.name ?? 'Loading…'}</h2>
              </div>

              <AnimatePresence mode="wait">
                {step === 'welcome' && (
                  <motion.div key="welcome" className="w-full space-y-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <Button
                      onClick={handleStart}
                      className="w-full h-24 sm:h-32 text-2xl sm:text-3xl font-black bg-primary rounded-[1.5rem] sm:rounded-[2rem] shadow-xl"
                      aria-label="Get a queue ticket"
                    >
                      GET TICKET
                    </Button>
                  </motion.div>
                )}

                {step === 'service' && (
                  <motion.div key="service" className="w-full grid grid-cols-1 gap-3 sm:gap-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <Button
                      onClick={() => handleServiceSelect('CASHIER')}
                      variant="outline"
                      className="h-20 sm:h-24 text-lg sm:text-xl font-bold border border-neutral-200 bg-white text-neutral-900 rounded-2xl justify-start px-6 sm:px-8 gap-3 sm:gap-4 transition-all duration-300 ease-in-out hover:bg-[#2563EB] hover:border-[#2563EB] hover:shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] group"
                      aria-label="Select Cashier service"
                    >
                      <div className="p-2.5 sm:p-3 bg-blue-50 text-[#2563EB] rounded-xl transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">
                        <CreditCard />
                      </div>
                      <span className="transition-colors duration-300 group-hover:text-white">Cashier</span>
                    </Button>
                    <Button
                      onClick={() => handleServiceSelect('ACCOUNTING')}
                      variant="outline"
                      className="h-20 sm:h-24 text-lg sm:text-xl font-bold border border-neutral-200 bg-white text-neutral-900 rounded-2xl justify-start px-6 sm:px-8 gap-3 sm:gap-4 transition-all duration-300 ease-in-out hover:bg-[#2563EB] hover:border-[#2563EB] hover:shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] group"
                      aria-label="Select Accounting service"
                    >
                      <div className="p-2.5 sm:p-3 bg-blue-50 text-[#2563EB] rounded-xl transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">
                        <Receipt />
                      </div>
                      <span className="transition-colors duration-300 group-hover:text-white">Accounting</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setStep('welcome')}
                      className="h-12 sm:h-14 rounded-2xl font-bold border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors shadow-sm"
                      aria-label="Go back to welcome screen"
                    >
                      BACK
                    </Button>
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.form key="details" onSubmit={handleSubmitDetails} className="w-full space-y-4 sm:space-y-5 text-left" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-white/60 bg-white/60 p-4 sm:p-5 shadow-sm space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Selected Service</p>
                      <div className="flex items-center gap-3 text-secondary font-black text-base sm:text-lg uppercase">
                        {selectedService === 'ACCOUNTING' ? <Receipt className="h-5 w-5 text-primary" /> : <CreditCard className="h-5 w-5 text-primary" />}
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
                          // Notice the addition of md:text-xl lg:text-xl below to override Shadcn's defaults
                          autoFocus
                          className="h-14 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] border-2 pl-12 text-lg sm:text-lg md:text-lg lg:text-lg font-bold placeholder:font-medium placeholder:text-muted-foreground/50"
                          autoComplete="name"
                          aria-required="true"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground" htmlFor="college">
                        College
                      </label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Select value={college} onValueChange={setCollege}>
                          <SelectTrigger id="college" className="h-14 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] border-2 pl-12 text-lg sm:text-lg md:text-lg lg:text-lg font-bold flex items-center justify-between" aria-required="true" aria-label="Select your college">
                            <div className="truncate text-left pr-4">
                              <SelectValue placeholder="Select a college" />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {COLLEGE_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground" htmlFor="purpose">
                        Purpose
                      </label>
                      <div className="relative">
                        <BadgeInfo className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Select value={purpose} onValueChange={setPurpose}>
                          <SelectTrigger id="purpose" className="h-14 sm:h-16 rounded-[1.25rem] sm:rounded-[1.5rem] border-2 pl-12 text-lg sm:text-lg md:text-lg lg:text-lg font-bold" aria-required="true" aria-label="Select your purpose">
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

                    {formError && <p className="text-sm font-semibold text-destructive" role="alert">{formError}</p>}

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
                        className="h-12 sm:h-14 rounded-2xl font-bold border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors shadow-sm"
                        disabled={isSubmitting}
                        aria-label="Go back"
                      >
                        BACK
                      </Button>
                      <Button type="submit" className="h-12 sm:h-14 rounded-2xl bg-primary font-black" disabled={isSubmitting} aria-label="Print queue ticket">
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <LoadingSpinner size="sm" className="[&_.uq-spinner]:border-white/40 [&_.uq-spinner]:border-t-white" />
                            GENERATING…
                          </span>
                        ) : (
                          'PRINT TICKET'
                        )}
                      </Button>
                    </div>
                  </motion.form>
                )}

                {step === 'success' && lastTicket && (
                  <motion.div key="success" className="w-full flex flex-col items-center space-y-6 sm:space-y-8" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <div className="text-center space-y-2">
                      <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-widest">Your Number</p>
                      <div className="text-6xl sm:text-8xl font-black jet-mono text-secondary whitespace-nowrap" role="status" aria-live="polite">{lastTicket.queueNumber}</div>
                      <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                        {lastTicket.studentName} · {lastTicket.purpose}
                      </p>
                    </div>
                    {waitEstimate && (
                      <div className="w-full rounded-[1.5rem] border border-primary/10 bg-primary/5 px-4 py-4 text-center shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">Estimated Wait</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-secondary">{formatEstimatedWait(waitEstimate.estimatedWaitMinutes)}</p>
                      </div>
                    )}
                    <div className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border">
                      {statusUrl && <QRCodeSVG value={statusUrl} size={160} level="H" />}
                    </div>
                    <Button onClick={() => setStep('welcome')} className="w-full h-12 sm:h-14 bg-secondary text-white font-bold rounded-2xl" aria-label={`Done, returning in ${countdown} seconds`}>
                      DONE ({countdown}s)
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <div className="mt-6 sm:mt-8 flex justify-center gap-2 flex-wrap">
            {departments.map(d => (
              <button key={d.id} onClick={() => { setCurrentDepartment(d.id); setStep('welcome'); }} className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] font-bold rounded-full border shadow-sm transition-all duration-200 ${currentDepartment?.id === d.id ? 'bg-secondary text-white' : 'bg-white hover:bg-muted/50'}`} aria-label={`Switch to ${d.name}`}>
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
