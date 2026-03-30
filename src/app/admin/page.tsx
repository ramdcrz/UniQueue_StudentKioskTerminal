
"use client";

import { useMemo } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, CheckCircle2, AlertTriangle, TrendingUp, Building, ShieldAlert, UsersRound, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function AdminContent() {
  const { tickets, departments, isAdmin, isUserLoading } = useQueue();

  const analytics = useMemo(() => {
    const total = tickets.length;
    const completed = tickets.filter(t => t.status === 'COMPLETED').length;
    const waiting = tickets.filter(t => t.status === 'WAITING').length;
    const noShow = tickets.filter(t => t.status === 'NOSHOW').length;

    const servedTickets = tickets.filter(t => t.status === 'SERVING' || t.status === 'COMPLETED');
    const totalWaitMs = servedTickets.reduce((acc, t) => {
      if (t.calledAt) {
        return acc + (new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime());
      }
      return acc;
    }, 0);
    const avgWaitMins = servedTickets.length > 0 ? (totalWaitMs / servedTickets.length / 60000).toFixed(1) : '0';

    const hourlyData: Record<string, number> = {};
    tickets.forEach(t => {
      const date = new Date(t.createdAt);
      const hour = date.getHours();
      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
      hourlyData[hourStr] = (hourlyData[hourStr] || 0) + 1;
    });

    const chartData = Object.entries(hourlyData)
      .map(([hour, volume]) => ({ hour, volume }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return { total, completed, waiting, noShow, avgWaitMins, chartData };
  }, [tickets]);

  if (isUserLoading) {
    return <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8 font-bold">Loading system analytics...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-12 text-center space-y-6 rounded-[3rem] border-none shadow-2xl glass">
          <div className="w-24 h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-secondary uppercase tracking-tight">Access Denied</h1>
            <p className="text-muted-foreground font-medium">This dashboard is restricted to system administrators.</p>
          </div>
          <div className="pb-16 pt-6">
            <Link href="/">
              <Button className="w-full rounded-2xl h-14 bg-secondary font-bold">Back to Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'Total Tickets', value: analytics.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Wait Time (Avg)', value: `${analytics.avgWaitMins}m`, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Served', value: analytics.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Abandonment', value: analytics.noShow, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-secondary uppercase tracking-tight">University Analytics</h1>
            <p className="text-muted-foreground font-semibold flex items-center gap-2">
              <Building size={16} /> Live Real-time Enrollment Overview
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/admin/assignments">
              <Button variant="outline" className="rounded-xl border-2 font-bold gap-2">
                <UsersRound size={18} />
                Manage Staff Assignments
              </Button>
            </Link>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              Live Sync Active
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none glass rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <TrendingUp size={20} className="text-muted-foreground opacity-20" />
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">{stat.label}</h3>
                  <p className="text-3xl font-black jet-mono text-secondary">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-8">
          <Card className="col-span-8 border-none liquid-glass rounded-[2.5rem] shadow-lg p-8">
            <CardHeader className="p-0 mb-8">
              <CardTitle className="text-xl font-black text-secondary uppercase">Hourly Distribution</CardTitle>
              <p className="text-sm text-muted-foreground font-medium">Historical traffic trends for today</p>
            </CardHeader>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(24, 86, 255, 0.05)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }}
                  />
                  <Bar dataKey="volume" fill="#1856FF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="col-span-4 space-y-6">
            <Card className="border-none glass rounded-[2.5rem] shadow-sm p-8">
              <h3 className="text-lg font-black text-secondary uppercase mb-6">By Building</h3>
              <div className="space-y-6">
                {departments.map((dept) => {
                  const deptTickets = tickets.filter(t => t.departmentId === dept.id).length;
                  const percentage = analytics.total > 0 ? (deptTickets / analytics.total) * 100 : 0;
                  return (
                    <div key={dept.id} className="space-y-2">
                      <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <span>{dept.acronym}</span>
                        <span className="text-primary">{Math.round(percentage)}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="border-none bg-secondary rounded-[2.5rem] shadow-xl p-8 text-white">
              <h3 className="text-lg font-black uppercase mb-2">System Status</h3>
              <p className="text-sm font-medium text-white/70">Database connectivity is operational. All departments are syncing correctly.</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <QueueProvider>
      <AdminContent />
    </QueueProvider>
  );
}
