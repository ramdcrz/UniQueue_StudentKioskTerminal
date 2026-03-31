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
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F4F4F7]">
      <div className="max-w-4xl w-full space-y-8">
        {/* Student Section (Always Visible) */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 bg-white rounded-[3rem] shadow-xl glass border-white/40"
          >
            <div className="text-primary mb-2 flex justify-center">
              <Smartphone size={64} />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-secondary uppercase">UniQueue</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest mt-2">Student Kiosk Terminal</p>
          </motion.div>
          
          <Link href="/kiosk" className="w-full max-w-sm">
            <Button className="w-full h-20 text-2xl font-black bg-primary rounded-3xl shadow-2xl hover:scale-105 transition-transform">
              OPEN STUDENT KIOSK
            </Button>
          </Link>
        </div>

        {/* Staff/Admin Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Management Console</h2>
            {!isUserLoading && (
              authenticated ? (
                <Button variant="ghost" onClick={logout} className="text-xs font-bold text-destructive hover:bg-destructive/10">
                  <LogOut size={14} className="mr-2" /> Logout {authenticated && "(Staff/Admin)"}
                </Button>
              ) : (
                <Button variant="outline" onClick={loginWithGoogle} className="rounded-xl border-2 font-bold text-xs gap-2 glass">
                  <LogIn size={14} /> Admin/Faculty Login
                </Button>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {managementViews.map((view) => (
              <div key={view.href} className="relative group">
                {!authenticated && (
                  <div className="absolute inset-0 z-10 bg-[#F4F4F7]/60 backdrop-blur-[2px] rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white p-3 rounded-full shadow-lg">
                      <Lock size={20} className="text-muted-foreground" />
                    </div>
                  </div>
                )}
                <Link href={authenticated ? view.href : "#"} className={!authenticated ? "cursor-not-allowed" : ""}>
                  <Card className={`h-full border-none glass rounded-[2rem] transition-all duration-300 ${authenticated ? 'hover:shadow-xl hover:translate-y-[-4px]' : 'opacity-40'}`}>
                    <CardHeader className="p-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 ${view.color} shadow-lg`}>
                        <view.icon size={24} />
                      </div>
                      <CardTitle className="text-lg font-black uppercase tracking-tight">{view.title}</CardTitle>
                      <CardDescription className="text-xs font-medium leading-relaxed">{view.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-12 text-[10px] text-muted-foreground opacity-30 font-black uppercase tracking-[0.5em]">
          University Queue Management System v2.0
        </div>
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
