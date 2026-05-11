"use client";

import { useMemo, useState } from 'react';
import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, CheckCircle2, AlertTriangle, TrendingUp, Building, ShieldAlert, UsersRound, Zap, Activity, Percent, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QueueOrchestratorChat } from '@/components/admin/queue-orchestrator-chat';
import { BentoBox } from '@/components/analytics/BentoBox';
import { MetricCard } from '@/components/analytics/MetricCard';
import { StaffComparisonGrid } from '@/components/analytics/StaffComparisonGrid';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatDuration } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

function AdminContent() {
  const { tickets, departments, isAdmin, isUserLoading } = useQueue();
  const [selectedRange, setSelectedRange] = useState<'today' | 7 | 30>('today');

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

  // Use analytics hook for real data
  const daysBack = selectedRange === 'today' ? 1 : (selectedRange as any);
  const firstDepartmentId = departments.length > 0 ? departments[0].id : '';
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useAnalytics(
    firstDepartmentId,
    daysBack,
  );

  const handleExportCSV = () => {
    const now = new Date();
    const filterDate = new Date();
    if (selectedRange === 'today') {
      filterDate.setHours(0, 0, 0, 0);
    } else {
      filterDate.setDate(filterDate.getDate() - selectedRange);
    }

    const filteredTickets = tickets.filter(t => new Date(t.createdAt) >= filterDate);

    // If we have no tickets, we generate mock tickets for testing the export structure
    const ticketsToExport = filteredTickets.length > 0 ? filteredTickets : [
      { queueNumber: 'M-001', studentName: 'John Doe', departmentId: 'main', status: 'COMPLETED', createdAt: now.toISOString(), calledAt: new Date(now.getTime() - 10 * 60000).toISOString(), completedAt: now.toISOString() },
      { queueNumber: 'M-002', studentName: 'Jane Smith', departmentId: 'is', status: 'WAITING', createdAt: now.toISOString() },
      { queueNumber: 'M-003', studentName: '', departmentId: 'som', status: 'SERVING', createdAt: now.toISOString(), calledAt: now.toISOString() },
      { queueNumber: 'M-004', studentName: 'Alice', departmentId: 'psb', status: 'NOSHOW', createdAt: now.toISOString(), calledAt: new Date(now.getTime() - 5 * 60000).toISOString(), completedAt: now.toISOString() },
      { queueNumber: 'M-005', studentName: 'Bob "The Builder"', departmentId: 'main', status: 'COMPLETED', createdAt: now.toISOString(), calledAt: new Date(now.getTime() - 15 * 60000).toISOString(), completedAt: now.toISOString() }
    ] as any[];

    const headers = ['Ticket Number', 'Student Name', 'Department', 'Status', 'Wait Time (Mins)', 'Service Time (Mins)'];
    
    const rows = ticketsToExport.map(t => {
      const waitTime = t.calledAt && t.createdAt 
        ? ((new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime()) / 60000).toFixed(1)
        : '';
        
      let serviceTimeStr = '';
      if (t.completedAt && t.calledAt) {
        serviceTimeStr = ((new Date(t.completedAt).getTime() - new Date(t.calledAt).getTime()) / 60000).toFixed(1);
      }
      
      const deptName = departments.find(d => d.id === t.departmentId)?.name || t.departmentId;
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      
      return [
        escape(t.queueNumber),
        escape(t.studentName),
        escape(deptName),
        escape(t.status),
        escape(waitTime),
        escape(serviceTimeStr)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = now.toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `uniqueue-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] p-4 sm:p-6 lg:p-8" aria-busy="true">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-36 rounded-[2rem]" />
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            <Skeleton className="lg:col-span-8 h-[350px] sm:h-[450px] rounded-[2.5rem]" />
            <div className="lg:col-span-4 space-y-6">
              <Skeleton className="h-60 rounded-[2.5rem]" />
              <Skeleton className="h-32 rounded-[2.5rem]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-4 sm:p-8">
        <Card className="max-w-md w-full p-8 sm:p-12 text-center space-y-6 rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl glass">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert size={40} className="sm:w-12 sm:h-12" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-secondary uppercase tracking-tight">Access Denied</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">This dashboard is restricted to system administrators.</p>
          </div>
          <div className="pb-10 sm:pb-16 pt-4 sm:pt-6">
            <Link href="/">
              <Button className="w-full rounded-2xl h-12 sm:h-14 bg-secondary font-bold" aria-label="Go back to home page">Back to Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const stats = [
    { label: 'Total Tickets', value: analytics.total, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Wait Time (Avg)', value: formatDuration(Number(analytics.avgWaitMins)), icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Served', value: analytics.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Abandonment', value: analytics.noShow, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-secondary uppercase tracking-tight">University Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-semibold flex items-center gap-2">
              <Building size={16} /> Live Real-time Enrollment Overview
            </p>
          </div>
          <div className="flex gap-3 sm:gap-4 flex-wrap">
            <Button onClick={handleExportCSV} variant="default" className="rounded-xl font-bold gap-2 text-xs sm:text-sm shadow-md hover:shadow-lg transition-all" aria-label="Export Analytics to CSV">
              <Download size={18} />
              <span className="hidden sm:inline">Export to CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Link href="/admin/assignments">
              <Button variant="outline" className="rounded-xl border-2 border-neutral-200 font-bold gap-2 text-xs sm:text-sm hover:border-[#2563EB] hover:text-[#2563EB] transition-all" aria-label="Manage staff assignments">
                <UsersRound size={18} />
                <span className="hidden sm:inline">Manage Staff Assignments</span>
                <span className="sm:hidden">Staff</span>
              </Button>
            </Link>
            <div className="bg-white px-3 sm:px-4 py-2 rounded-xl shadow-sm border text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full uq-pulse-dot" />
              <span className="hidden sm:inline">Live Sync Active</span>
              <span className="sm:hidden">Live</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none glass rounded-[1.5rem] sm:rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <TrendingUp size={16} className="text-muted-foreground opacity-20 sm:w-5 sm:h-5" />
                </div>
                <div className="mt-3 sm:mt-4">
                  <h3 className="text-[10px] sm:text-sm font-black text-muted-foreground uppercase tracking-widest">{stat.label}</h3>
                  <p className="text-2xl sm:text-3xl font-black jet-mono text-secondary">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['today', 7, 30] as const).map(range => (
            <Button
              key={range}
              variant={selectedRange === range ? 'default' : 'outline'}
              onClick={() => setSelectedRange(range)}
              className="rounded-xl font-bold text-xs sm:text-sm"
              aria-label={`Show data for ${range === 'today' ? 'today' : `${range} days`}`}
            >
              {range === 'today' ? 'Today' : `${range} Days`}
            </Button>
          ))}
        </div>

        {/* Advanced Analytics Section */}
        {isLoadingAnalytics ? (
          <div className="space-y-4">
            <Skeleton className="h-60 sm:h-80 rounded-[2rem] sm:rounded-[2.5rem]" />
          </div>
        ) : analyticsData ? (
          <>
            {/* Transaction Time Analytics */}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-secondary uppercase mb-4 flex items-center gap-2">
                <Zap size={18} className="sm:w-5 sm:h-5" /> Transaction Time Analytics
              </h2>
              <BentoBox
                items={[
                  {
                    id: 'avg-time-dept',
                    span: 'md',
                    children: (
                      <Card className="border-none glass rounded-[2rem] sm:rounded-[2.5rem] h-full">
                        <CardHeader>
                          <CardTitle className="text-sm">By Department</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {analyticsData.avgTransactionTime.byDept.map((dept: any) => (
                            <div key={dept.departmentId} className="flex justify-between items-center pb-3 border-b last:border-0">
                              <div>
                                <p className="font-semibold text-sm">{dept.deptName}</p>
                                <p className="text-xs text-muted-foreground">{dept.sampleCount} tickets</p>
                              </div>
                              <p className="font-bold text-primary">{formatDuration(dept.avgTimeMinutes)}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ),
                  },
                  {
                    id: 'avg-time-staff',
                    span: 'md',
                    children: (
                      <Card className="border-none glass rounded-[2rem] sm:rounded-[2.5rem] h-full">
                        <CardHeader>
                          <CardTitle className="text-sm">By Staff Member</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {analyticsData.avgTransactionTime.byStaff.map((staff: any) => (
                            <div key={staff.staffId} className="flex justify-between items-center pb-3 border-b last:border-0">
                              <div>
                                <p className="font-semibold text-sm">{staff.staffName}</p>
                                <p className="text-xs text-muted-foreground">{staff.completedTickets} tickets</p>
                              </div>
                              <p className="font-bold text-primary">{formatDuration(staff.avgTimeMinutes)}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ),
                  },
                ]}
              />
            </div>

            {/* Staff Efficiency Rating */}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-secondary uppercase mb-4 flex items-center gap-2">
                <Activity size={18} className="sm:w-5 sm:h-5" /> Staff Efficiency Rating
              </h2>
              <StaffComparisonGrid
                staffMetrics={analyticsData.efficiency}
                showMetrics={['efficiency', 'avgTime', 'csat', 'tickets']}
                maxRows={10}
              />
            </div>

            {/* Cross-Validation Metric */}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-secondary uppercase mb-4 flex items-center gap-2">
                <Percent size={18} className="sm:w-5 sm:h-5" /> Cross-Validation Metric
              </h2>
              <Card className="border-none glass rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                  <MetricCard
                    title="Registrar Completions"
                    value={analyticsData.crossValidation.registrarCompletedCount}
                    unit="tickets"
                    icon={<CheckCircle2 size={24} />}
                  />
                  <MetricCard
                    title="Successful Conversions"
                    value={analyticsData.crossValidation.successfulConversions}
                    unit="tickets"
                    icon={<TrendingUp size={24} />}
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={analyticsData.crossValidation.conversionRate}
                    unit="%"
                    icon={<Percent size={24} />}
                    isHighlighted
                  />
                </div>
              </Card>
            </div>
          </>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          <Card className="lg:col-span-8 border-none liquid-glass rounded-[2rem] sm:rounded-[2.5rem] shadow-lg p-5 sm:p-8">
            <CardHeader className="p-0 mb-6 sm:mb-8">
              <CardTitle className="text-lg sm:text-xl font-black text-secondary uppercase">Hourly Distribution</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Historical traffic trends for today</p>
            </CardHeader>
            <div className="h-[250px] sm:h-[350px] lg:h-[400px]">
              {analytics.total > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748B' }} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800 }}
                    />
                    <Bar dataKey="volume" fill="#2563EB" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon="check"
                  title="No traffic yet"
                  description="Hourly distribution will appear here as students generate tickets today."
                  className="h-full bg-transparent border-none shadow-none"
                />
              )}
            </div>
          </Card>

          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <Card className="border-none glass rounded-[2rem] sm:rounded-[2.5rem] shadow-sm p-5 sm:p-8">
              <h3 className="text-base sm:text-lg font-black text-secondary uppercase mb-4 sm:mb-6">By Building</h3>
              <div className="space-y-4 sm:space-y-6">
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
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="border-none bg-secondary rounded-[2rem] sm:rounded-[2.5rem] shadow-xl p-5 sm:p-8 text-white">
              <h3 className="text-base sm:text-lg font-black uppercase mb-2">System Status</h3>
              <p className="text-xs sm:text-sm font-medium text-white/70">Database connectivity is operational. All departments are syncing correctly.</p>
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
      <QueueOrchestratorChat />
    </QueueProvider>
  );
}
