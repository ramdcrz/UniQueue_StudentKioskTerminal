"use client";

import Link from 'next/link';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, UserCog, ShieldCheck, LogIn, LogOut, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

function HomeContent() {
  const { loginWithGoogle, logout, isAdmin, isStaff, isUserLoading } = useQueue();

  const authenticated = isAdmin || isStaff;

  const managementViews = [
    { title: 'Public Monitor', href: '/monitor', icon: Monitor, description: 'Live display for waiting areas.', color: 'bg-accent' },
    { title: 'Staff Terminal', href: '/staff', icon: UserCog, description: 'Teller interface for counter management.', color: 'bg-success' },
    { title: 'Admin Analytics', href: '/admin', icon: ShieldCheck, description: 'Management dashboard and analytics.', color: 'bg-secondary' },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[#F4F4F7]">
      <div className="max-w-4xl w-full space-y-6 sm:space-y-8">
        {/* Student Section (Always Visible) */}
        <div className="flex flex-col items-center text-center space-y-4 sm:space-y-6 mb-8 sm:mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm p-4 sm:p-6 bg-white rounded-[2rem] sm:rounded-[3rem] shadow-xl glass border-white/40"
          >
            <div className="text-primary mb-2 flex justify-center">
              <Smartphone size={48} className="sm:w-16 sm:h-16" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-secondary uppercase">UniQueue</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-bold uppercase tracking-widest mt-2">Student Kiosk Terminal</p>
          </motion.div>

          <div className="w-full max-w-sm space-y-4">
            <Link href="/kiosk" className="block">
              <Button className="w-full h-16 sm:h-20 text-xl sm:text-2xl font-black bg-primary rounded-2xl sm:rounded-3xl shadow-2xl hover:scale-105 transition-transform" aria-label="Open the student kiosk terminal">
                OPEN STUDENT KIOSK
              </Button>
            </Link>

            {!isUserLoading && (
              authenticated ? (
                <Button
                  variant="link"
                  onClick={logout}
                  className="w-full text-[10px] sm:text-xs font-black text-destructive uppercase tracking-[0.2em] hover:bg-destructive/5 hover:no-underline gap-2"
                >
                  <LogOut size={14} /> Sign Out (Faculty/Staff)
                </Button>
              ) : (
                <Button
                  variant="link"
                  onClick={loginWithGoogle}
                  className="w-full text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-primary hover:no-underline gap-2"
                >
                  <LogIn size={14} /> Admin/Faculty Login
                </Button>
              )
            )}
          </div>
        </div>

        {/* Staff/Admin Section (Gated) */}
        {authenticated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] px-2 sm:px-4">Management Console</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {managementViews.map((view) => (
                <Link
                  key={view.href}
                  href={view.href}
                  aria-label={`Open ${view.title}`}
                >
                  <Card className="h-full border-none glass rounded-[1.5rem] sm:rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:translate-y-[-4px]">
                    <CardHeader className="p-4 sm:p-6">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-white mb-3 sm:mb-4 ${view.color} shadow-lg`}>
                        <view.icon size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight">{view.title}</CardTitle>
                      <CardDescription className="text-xs font-medium leading-relaxed">{view.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </motion.div>
        )}


      </div>
    </main>
  );
}

export default function Home() {
  return (
    <QueueProvider>
      <HomeContent />
    </QueueProvider>
  );
}
