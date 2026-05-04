
"use client";

import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, User, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ServiceType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function AssignmentsContent() {
  const { allUsers, departments, updateUserAssignment, isAdmin, isUserLoading } = useQueue();
  const { toast } = useToast();
  const [localAssignments, setLocalAssignments] = useState<Record<string, { deptId: string | null, serviceType: ServiceType | null }>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#F4F4F7] p-4 sm:p-6 lg:p-8" aria-busy="true">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
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
            <p className="text-sm sm:text-base text-muted-foreground font-medium">This page is restricted to system administrators.</p>
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

  const staffUsers = allUsers.filter(u => u.role === 'STAFF' || u.role === 'SUPERADMIN');

  const handleUpdate = async (userId: string) => {
    const assignment = localAssignments[userId];
    if (!assignment) return;
    setSavingUserId(userId);
    try {
      updateUserAssignment(userId, assignment.deptId, assignment.serviceType);
      toast({ title: 'Assignment Updated', description: 'Staff terminal assignment saved successfully.', variant: 'success' as any });
    } catch (error) {
      toast({ title: 'Update Failed', description: 'Could not save assignment. Please try again.', variant: 'destructive' });
      console.error('Assignment update failed', error);
    } finally {
      setTimeout(() => setSavingUserId(null), 500);
    }
  };

  const getLocal = (userId: string, user: any) => {
    return localAssignments[userId] || { deptId: user.departmentId || null, serviceType: user.serviceType || null };
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <Link href="/admin" className="text-primary font-bold flex items-center gap-2 mb-2 hover:underline text-sm" aria-label="Go back to admin dashboard">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-secondary uppercase tracking-tight">Staff Terminal Control</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-semibold">Manage building and office assignments for all terminal users</p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4">
          {staffUsers.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center glass rounded-2xl sm:rounded-3xl">
              <p className="text-muted-foreground font-bold italic">No authorized staff found in the system.</p>
            </Card>
          ) : (
            staffUsers.map((u) => {
              const current = getLocal(u.id, u);
              const isSaving = savingUserId === u.id;
              
              return (
                <Card key={u.id} className="p-4 sm:p-6 glass rounded-2xl sm:rounded-3xl border-none shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* User info */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-secondary flex items-center justify-center text-white shadow-md shrink-0">
                        <User size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-secondary uppercase leading-none text-sm sm:text-base truncate">{u.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground mt-1 truncate">
                          {u.email} <span className="ml-1 sm:ml-2 px-2 py-0.5 bg-muted rounded-full text-[8px]">{u.role}</span>
                        </p>
                      </div>
                    </div>

                    {/* Assignment controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
                      <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-muted-foreground" htmlFor={`building-${u.id}`}>Building</label>
                          <select 
                            id={`building-${u.id}`}
                            className="bg-white border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                            value={current.deptId || ''}
                            onChange={(e) => {
                              const val = e.target.value || null;
                              const dept = departments.find(d => d.id === val);
                              const newService = dept?.hasAccounting ? (current.serviceType || 'CASHIER') : 'CASHIER';
                              setLocalAssignments({ ...localAssignments, [u.id]: { deptId: val, serviceType: newService as ServiceType } });
                            }}
                            aria-label={`Building assignment for ${u.name}`}
                          >
                            <option value="">Unassigned</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-muted-foreground" htmlFor={`office-${u.id}`}>Office</label>
                          <select 
                            id={`office-${u.id}`}
                            disabled={!current.deptId}
                            className="bg-white border rounded-lg px-3 py-2 text-sm font-bold outline-none disabled:opacity-50 focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
                            value={current.serviceType || ''}
                            onChange={(e) => setLocalAssignments({ ...localAssignments, [u.id]: { ...current, serviceType: e.target.value as ServiceType } })}
                            aria-label={`Office assignment for ${u.name}`}
                          >
                            <option value="CASHIER">Cashier</option>
                            {departments.find(d => d.id === current.deptId)?.hasAccounting && (
                              <option value="ACCOUNTING">Accounting</option>
                            )}
                          </select>
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleUpdate(u.id)}
                        disabled={isSaving}
                        className="sm:mt-4 rounded-xl bg-primary font-bold gap-2"
                        size="sm"
                        aria-label={`Save assignment for ${u.name}`}
                      >
                        {isSaving ? (
                          <LoadingSpinner size="sm" className="[&_.uq-spinner]:border-white/40 [&_.uq-spinner]:border-t-white" />
                        ) : (
                          <Save size={14} />
                        )}
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAssignmentsPage() {
  return (
    <QueueProvider>
      <AssignmentsContent />
    </QueueProvider>
  );
}
