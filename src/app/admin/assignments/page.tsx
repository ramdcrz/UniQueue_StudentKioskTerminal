
"use client";

import { QueueProvider, useQueue } from '@/context/QueueContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, User, ArrowLeft, Save, Crown, Loader2, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ServiceType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

function AssignmentsContent() {
  const { allUsers, departments, updateUserAssignment, isAdmin, isUserLoading, isStaff, currentUserProfile } = useQueue();
  const { toast } = useToast();
  const db = useFirestore();
  const [localAssignments, setLocalAssignments] = useState<Record<string, { deptId: string | null, serviceType: ServiceType | null }>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [upgradingUserId, setUpgradingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STAFF' | 'ADMIN' | 'SUPERADMIN'>('ALL');
  const [pendingDemotion, setPendingDemotion] = useState<{ userId: string; name: string; newRole: 'STAFF' | 'ADMIN' | 'SUPERADMIN' } | null>(null);

  const isSuperadmin = isAdmin && isStaff;

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

  const staffUsers = allUsers.filter(u => u.role === 'STAFF' || u.role === 'ADMIN' || u.role === 'SUPERADMIN');
  
  const filteredUsers = staffUsers.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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

  const handleChangeRole = async (userId: string, newRole: 'STAFF' | 'ADMIN' | 'SUPERADMIN', isDemotion: boolean = false) => {
    if (!db || !isSuperadmin) return;

    // Prevent self-demotion
    if (isDemotion && userId === currentUserProfile?.id) {
      toast({
        title: 'Cannot Self-Demote',
        description: 'You cannot demote yourself. Another Superadmin must do it.',
        variant: 'destructive',
      });
      return;
    }

    // For demotions, show confirmation modal
    if (isDemotion) {
      const user = allUsers.find(u => u.id === userId);
      setPendingDemotion({ userId, name: user?.name || 'User', newRole });
      return;
    }

    // For promotions, execute immediately
    setUpgradingUserId(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      const roleLabels = { STAFF: 'Staff', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' };
      toast({ title: 'Role Changed', description: `User promoted to ${roleLabels[newRole]}.`, variant: 'success' as any });
    } catch (error) {
      toast({ title: 'Role Change Failed', description: 'Could not change role. Please try again.', variant: 'destructive' });
      console.error('Role change failed', error);
    } finally {
      setUpgradingUserId(null);
    }
  };

  const confirmDemotion = async () => {
    if (!pendingDemotion || !db) return;
    setUpgradingUserId(pendingDemotion.userId);
    try {
      const userRef = doc(db, 'users', pendingDemotion.userId);
      await updateDoc(userRef, { role: pendingDemotion.newRole });
      const roleLabels = { STAFF: 'Staff', ADMIN: 'Admin', SUPERADMIN: 'Superadmin' };
      toast({
        title: 'Role Changed',
        description: `${pendingDemotion.name} demoted to ${roleLabels[pendingDemotion.newRole]}.`,
        variant: 'success' as any,
      });
    } catch (error) {
      toast({ title: 'Demotion Failed', description: 'Could not change role. Please try again.', variant: 'destructive' });
      console.error('Demotion failed', error);
    } finally {
      setUpgradingUserId(null);
      setPendingDemotion(null);
    }
  };

  const getAvailableRoles = (currentRole: string) => {
    switch (currentRole) {
      case 'STAFF':
        return [{ role: 'ADMIN', isDemotion: false }];
      case 'ADMIN':
        return [
          { role: 'STAFF', isDemotion: true },
          { role: 'SUPERADMIN', isDemotion: false },
        ];
      case 'SUPERADMIN':
        return [{ role: 'ADMIN', isDemotion: true }];
      default:
        return [];
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const availableRoles = getAvailableRoles(user.role);
    const selectedRole = availableRoles.find(r => r.role === newRole);
    
    if (selectedRole) {
      handleChangeRole(userId, newRole as 'STAFF' | 'ADMIN' | 'SUPERADMIN', selectedRole.isDemotion);
    }
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

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60" size={18} />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl border-none bg-white/50 hover:bg-white/80 focus:bg-white transition-colors h-11 sm:h-12 font-bold shadow-sm"
              aria-label="Search staff members"
            />
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <Filter size={18} className="text-muted-foreground/60 hidden sm:inline" />
            <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
              <SelectTrigger className="w-full sm:w-48 rounded-2xl border-none bg-white/50 hover:bg-white/80 focus:bg-white transition-colors h-11 sm:h-12 font-bold shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="STAFF">STAFF</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="SUPERADMIN">SUPERADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs font-bold text-muted-foreground/60 pl-1 uppercase tracking-wider">
          {filteredUsers.length} of {staffUsers.length} user{staffUsers.length !== 1 ? 's' : ''}
        </div>

        <div className="grid gap-3 sm:gap-4">
          {filteredUsers.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center glass rounded-2xl sm:rounded-3xl">
              <p className="text-muted-foreground font-bold italic">No staff found matching your search.</p>
            </Card>
          ) : (
            filteredUsers.map((u) => {
              const current = getLocal(u.id, u);
              const isSaving = savingUserId === u.id;
              const hasUnsavedChanges = localAssignments[u.id] !== undefined;
              
              return (
                <Card key={u.id} className="p-4 sm:p-5 glass rounded-2xl sm:rounded-[2rem] border-none shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* User info */}
                    <div className="flex items-center gap-4 lg:w-[280px] shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-white shadow-sm shrink-0">
                        <User size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-secondary uppercase leading-none text-sm sm:text-base truncate mb-1">{u.name}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-muted-foreground/70 truncate">{u.email}</p>
                          <span className="px-2 py-0.5 bg-white shadow-sm border-secondary/5 border rounded-full text-[9px] font-black tracking-wider text-secondary/80">
                            {u.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assignment controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
                      <div className="grid grid-cols-2 gap-3 flex-1 lg:max-w-md">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider pl-1" htmlFor={`building-${u.id}`}>Building</label>
                          <select 
                            id={`building-${u.id}`}
                            className="bg-white/60 hover:bg-white border-none shadow-sm rounded-xl px-3 py-2.5 text-sm font-bold text-secondary outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none"
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

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider pl-1" htmlFor={`office-${u.id}`}>Office</label>
                          <select 
                            id={`office-${u.id}`}
                            disabled={!current.deptId}
                            className="bg-white/60 hover:bg-white border-none shadow-sm rounded-xl px-3 py-2.5 text-sm font-bold text-secondary outline-none disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none"
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

                      <div className="flex items-center gap-2 mt-4 sm:mt-0 sm:pt-5 lg:w-[220px] justify-end">
                        {isSuperadmin && getAvailableRoles(u.role).length > 0 && (
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                            disabled={upgradingUserId === u.id || (u.id === currentUserProfile?.id && getAvailableRoles(u.role).some(r => r.isDemotion))}
                          >
                            <SelectTrigger className="w-[120px] h-10 rounded-xl border-none bg-white/60 hover:bg-white shadow-sm font-bold transition-all focus:ring-2 focus:ring-primary/20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-xl">
                              <SelectItem value={u.role} disabled>
                                <span className="font-black text-secondary">{u.role}</span> (current)
                              </SelectItem>
                              {getAvailableRoles(u.role).map((option) => {
                                const isDisabled = option.isDemotion && u.id === currentUserProfile?.id;
                                return (
                                  <SelectItem key={option.role} value={option.role} disabled={isDisabled}>
                                    <span className={option.isDemotion ? 'text-destructive font-bold' : 'text-success font-bold'}>
                                      {option.isDemotion ? '↓' : '↑'} {option.role}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                        <Button 
                          onClick={() => {
                            handleUpdate(u.id);
                            // Clear local assignment after save to remove unsaved state
                            const newLocal = { ...localAssignments };
                            delete newLocal[u.id];
                            setLocalAssignments(newLocal);
                          }}
                          disabled={savingUserId === u.id || !hasUnsavedChanges}
                          className={`rounded-xl font-bold h-10 transition-all ${
                            hasUnsavedChanges 
                              ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg w-[80px]' 
                              : 'bg-muted text-muted-foreground/50 w-[40px] px-0'
                          }`}
                          size="sm"
                          aria-label={`Save assignment for ${u.name}`}
                          title={hasUnsavedChanges ? "Save changes" : "No changes to save"}
                        >
                          {savingUserId === u.id ? (
                            <LoadingSpinner size="sm" className="[&_.uq-spinner]:border-white/40 [&_.uq-spinner]:border-t-white" />
                          ) : (
                            hasUnsavedChanges ? 'Save' : <Save size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingDemotion} onOpenChange={(open) => !open && setPendingDemotion(null)}>
        <AlertDialogContent className="sm:max-w-sm rounded-[2rem] border-white/50 bg-white/90 backdrop-blur-xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-secondary uppercase tracking-tight">
              Confirm Demotion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground font-medium mt-2">
              Are you sure you want to demote <span className="font-black text-secondary">{pendingDemotion?.name}</span>? They will lose access to administrative features and the analytics dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 mt-2">
            <AlertDialogCancel className="rounded-2xl border-2 border-muted-foreground/20 font-black text-secondary bg-white/70 hover:bg-muted h-12 px-6">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDemotion}
              disabled={upgradingUserId === pendingDemotion?.userId}
              className="rounded-2xl bg-destructive hover:bg-destructive/90 font-black text-white gap-2 flex items-center h-12 px-6 shadow-md"
            >
              {upgradingUserId === pendingDemotion?.userId ? (
                <><Loader2 size={18} className="animate-spin" /> Demoting...</>
              ) : (
                <>Confirm Demotion</>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
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
