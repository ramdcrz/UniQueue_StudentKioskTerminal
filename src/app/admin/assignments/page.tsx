
"use client";

import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, User, Building2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ServiceType } from '@/lib/types';

function AssignmentsContent() {
  const { allUsers, departments, updateUserAssignment, isAdmin, isUserLoading } = useQueue();
  const [localAssignments, setLocalAssignments] = useState<Record<string, { deptId: string | null, serviceType: ServiceType | null }>>({});

  if (isUserLoading) {
    return <div className="min-h-screen bg-[#F4F4F7] flex items-center justify-center p-8 font-bold">Loading users...</div>;
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
            <p className="text-muted-foreground font-medium">This page is restricted to system administrators.</p>
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

  const staffUsers = allUsers.filter(u => u.role === 'STAFF');

  const handleUpdate = (userId: string) => {
    const assignment = localAssignments[userId];
    if (assignment) {
      updateUserAssignment(userId, assignment.deptId, assignment.serviceType);
      alert("Assignment updated successfully!");
    }
  };

  const getLocal = (userId: string, user: any) => {
    return localAssignments[userId] || { deptId: user.departmentId || null, serviceType: user.serviceType || null };
  };

  return (
    <div className="min-h-screen bg-[#F4F4F7] p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <Link href="/admin" className="text-primary font-bold flex items-center gap-2 mb-2 hover:underline">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-black text-secondary uppercase tracking-tight">Staff Terminal Control</h1>
            <p className="text-muted-foreground font-semibold">Manage building and office assignments for all staff members</p>
          </div>
        </div>

        <div className="grid gap-4">
          {staffUsers.length === 0 ? (
            <Card className="p-12 text-center glass rounded-3xl">
              <p className="text-muted-foreground font-bold italic">No authorized staff found in the system.</p>
            </Card>
          ) : (
            staffUsers.map((u) => {
              const current = getLocal(u.id, u);
              const dept = departments.find(d => d.id === current.deptId);

              return (
                <Card key={u.id} className="p-6 glass rounded-3xl border-none shadow-sm flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-md">
                      <User size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-secondary uppercase leading-none">{u.name}</h3>
                      <p className="text-xs font-bold text-muted-foreground mt-1">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Building</label>
                      <select 
                        className="bg-white border rounded-lg px-3 py-2 text-sm font-bold outline-none"
                        value={current.deptId || ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          const newService = val && val !== 'main' ? 'CASHIER' : (current.serviceType || 'CASHIER');
                          setLocalAssignments({ ...localAssignments, [u.id]: { deptId: val, serviceType: newService as ServiceType } });
                        }}
                      >
                        <option value="">Unassigned</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>

                    {current.deptId === 'main' && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-muted-foreground">Office</label>
                        <select 
                          className="bg-white border rounded-lg px-3 py-2 text-sm font-bold outline-none"
                          value={current.serviceType || ''}
                          onChange={(e) => setLocalAssignments({ ...localAssignments, [u.id]: { ...current, serviceType: e.target.value as ServiceType } })}
                        >
                          <option value="CASHIER">Cashier</option>
                          <option value="ACCOUNTING">Accounting</option>
                        </select>
                      </div>
                    )}

                    <Button 
                      onClick={() => handleUpdate(u.id)}
                      className="mt-4 rounded-xl bg-primary font-bold gap-2"
                      size="sm"
                    >
                      <Save size={14} />
                      Save
                    </Button>
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
