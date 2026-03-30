"use client";

import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Clock, CheckCircle2, AlertTriangle, TrendingUp, Building } from 'lucide-react';

const mockChartData = [
  { hour: '08:00', volume: 45 },
  { hour: '10:00', volume: 120 },
  { hour: '12:00', volume: 180 },
  { hour: '14:00', volume: 150 },
  { hour: '16:00', volume: 90 },
  { hour: '18:00', volume: 30 },
];

function AdminContent() {
  const { tickets, departments } = useQueue();

  const totalTickets = tickets.length;
  const completed = tickets.filter(t => t.status === 'COMPLETED').length;
  const waiting = tickets.filter(t => t.status === 'WAITING').length;
  const noShow = tickets.filter(t => t.status === 'NOSHOW').length;

  const stats = [
    { label: 'Total Tickets', value: totalTickets, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Wait Time (Avg)', value: '14.2m', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Served', value: completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Abandonment', value: noShow, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Admin Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-secondary uppercase tracking-tight">University Dashboard</h1>
            <p className="text-muted-foreground font-semibold flex items-center gap-2">
              <Building size={16} /> Global Enrollment System Overview
            </p>
          </div>
          <div className="flex gap-2">
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full" />
              Real-time Feed Active
            </div>
          </div>
        </div>

        {/* Bento Stats */}
        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none glass rounded-[2rem] shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} transition-colors`}>
                    <stat.icon size={24} />
                  </div>
                  <TrendingUp size={20} className="text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">{stat.label}</h3>
                  <p className="text-3xl font-black jet-mono text-secondary">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Chart Area */}
          <Card className="col-span-8 border-none liquid-glass rounded-[2.5rem] shadow-lg p-8">
            <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-secondary uppercase">Peak Hourly Volume</CardTitle>
                <p className="text-sm text-muted-foreground font-medium">Daily student traffic distribution</p>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
                <button className="px-3 py-1 text-[10px] font-black bg-white rounded-md shadow-sm uppercase">Today</button>
                <button className="px-3 py-1 text-[10px] font-black text-muted-foreground uppercase">Week</button>
              </div>
            </CardHeader>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1856FF" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#1856FF" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748B' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(24, 86, 255, 0.05)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }}
                  />
                  <Bar dataKey="volume" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Side Info */}
          <div className="col-span-4 space-y-6">
            <Card className="border-none glass rounded-[2.5rem] shadow-sm p-8">
              <h3 className="text-lg font-black text-secondary uppercase mb-6">Staff Efficiency</h3>
              <div className="space-y-6">
                {['Counter 01', 'Counter 02', 'Counter 03'].map((counter, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                      <span>{counter}</span>
                      <span className="text-primary">{90 - i * 5}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${90 - i * 5}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-none bg-primary rounded-[2.5rem] shadow-xl p-8 text-white">
              <h3 className="text-lg font-black uppercase mb-2">System Health</h3>
              <p className="text-sm font-medium text-white/70 mb-6">WebSocket performance and data sync latency</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-1 bg-white/20 rounded-full">
                  <div className="h-full bg-white w-[98%] rounded-full" />
                </div>
                <span className="text-xs font-black">98.2ms</span>
              </div>
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
