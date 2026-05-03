
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Department, Ticket, Counter, ServiceType, TicketStatus, User as AppUser } from '@/lib/types';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc,
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { initiateAnonymousSignIn, initiateGoogleSignIn } from '@/firebase/non-blocking-login';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface QueueContextType {
  departments: Department[];
  counters: Counter[];
  tickets: Ticket[];
  allUsers: AppUser[];
  currentDepartment: Department | null;
  setCurrentDepartment: (deptId: string) => void;
  createTicket: (ticketData: { serviceType: ServiceType; studentName: string; purpose: string }) => Promise<Ticket>;
  callNextTicket: (counterId: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus, departmentId?: string) => void;
  staffCounter: Counter | null;
  setStaffCounter: (counterId: string | null) => void;
  staffAssignment: { deptId: string | null; serviceType: ServiceType | null };
  setStaffAssignment: (deptId: string | null, serviceType: ServiceType | null, counterNumber?: number) => void;
  updateUserAssignment: (userId: string, deptId: string | null, serviceType: ServiceType | null) => void;
  isUserLoading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'main', name: 'Main Building', acronym: 'Main', code: 'M', hasAccounting: true },
  { id: 'is', name: 'Integrated School', acronym: 'IS', code: 'I', hasAccounting: false },
  { id: 'som', name: 'School of Management', acronym: 'SOM', code: 'S', hasAccounting: false },
  { id: 'psb', name: 'Professional Schools Building', acronym: 'PSB', code: 'P', hasAccounting: false },
];

const ADMIN_EMAILS = [
  'ramiljr.deocariza@neu.edu.ph',
  'djemandreif.reyes@neu.edu.ph',
  'johnmarc.sanchez@neu.edu.ph',
  'jermainecarl.miranda@neu.edu.ph',
  'ramildeocariza009@gmail.com'
];

const STAFF_EMAILS = [
  'nemostyles009@gmail.com'
];

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [currentDeptId, setCurrentDeptId] = useState<string>('main');
  const [staffCounterId, setStaffCounterId] = useState<string | null>(null);
  
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);

  const isAdmin = !!user && !!user.email && ADMIN_EMAILS.includes(user.email);
  const isStaff = !!user && !!user.email && (STAFF_EMAILS.includes(user.email) || ADMIN_EMAILS.includes(user.email));

  const staffAssignment = useMemo(() => ({
    deptId: currentUserProfile?.departmentId || null,
    serviceType: currentUserProfile?.serviceType || null,
    counterNumber: (currentUserProfile as any)?.counterNumber || null
  }), [currentUserProfile]);

  const visibleUsers = isAdmin ? allUsers : [];

  const currentDepartment = departments.find(d => d.id === currentDeptId) || null;
  const staffCounter = counters.find(c => c.id === staffCounterId) || null;

  useEffect(() => {
    if (auth && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth).catch(() => {});
    }
  }, [auth, user, isUserLoading]);

  useEffect(() => {
    if (!db || !user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    return onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentUserProfile({ ...snapshot.data(), id: snapshot.id } as AppUser);
      } else {
        const initialData = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Faculty Member',
          role: isAdmin ? 'SUPERADMIN' : (isStaff ? 'STAFF' : 'KIOSK'),
          email: user.email || ''
        };
        setDoc(userRef, initialData);
      }
    });
  }, [db, user, isAdmin, isStaff]);

  // Public data subscriptions (independent of auth state for kiosk/status visibility)
  useEffect(() => {
    if (!db) return;

    const ticketUnsubs = departments.map(dept => {
      const ticketsRef = collection(db, 'departments', dept.id, 'tickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const deptTickets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ticket));
        setTickets(prev => {
          const others = prev.filter(t => t.departmentId !== dept.id);
          return [...others, ...deptTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      });
    });

    const counterUnsubs = departments.map(dept => {
      const countersRef = collection(db, 'departments', dept.id, 'counters');
      return onSnapshot(countersRef, (snapshot) => {
        const deptCounters = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Counter));
        setCounters(prev => {
          const others = prev.filter(c => c.departmentId !== dept.id);
          return [...others, ...deptCounters];
        });
      });
    });

    return () => {
      ticketUnsubs.forEach(u => u());
      counterUnsubs.forEach(u => u());
    };
  }, [db, departments]);

  // Private data subscription (Admin only)
  useEffect(() => {
    if (!db || !isAdmin) {
      return;
    }

    const usersRef = collection(db, 'users');
    return onSnapshot(usersRef, (snapshot) => {
      setAllUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AppUser)));
    });
  }, [db, isAdmin]);

  const createTicket = async ({ serviceType, studentName, purpose }: { serviceType: ServiceType; studentName: string; purpose: string }) => {
    if (!db || !currentDepartment) throw new Error("Database not ready");
    const ticketsRef = collection(db, 'departments', currentDeptId, 'tickets');
    const newDocRef = doc(ticketsRef);
    
    const buildingTickets = tickets.filter(t => t.departmentId === currentDeptId);
    const num = (buildingTickets.length + 1).toString().padStart(3, '0');
    
    const ticketData = {
      queueNumber: `${currentDepartment.code}-${num}`,
      serviceType,
      status: 'WAITING' as TicketStatus,
      departmentId: currentDeptId,
      studentName,
      purpose,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setDoc(newDocRef, ticketData).catch(() => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: newDocRef.path, operation: 'create', requestResourceData: ticketData }));
    });
    
    return { ...ticketData, id: newDocRef.id };
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus, departmentId?: string) => {
    if (!db) return;
    
    const ticket = tickets.find(t => t.id === ticketId);
    const deptId = departmentId || ticket?.departmentId || currentDeptId;
    
    const ticketRef = doc(db, 'departments', deptId, 'tickets', ticketId);
    const updates: any = { status, updatedAt: new Date().toISOString() };
    if (status === 'CALLED') updates.calledAt = new Date().toISOString();
    if (status === 'COMPLETED' || status === 'NOSHOW') updates.completedAt = new Date().toISOString();

    updateDoc(ticketRef, updates).catch((err) => {
      console.error("Failed to update ticket", err);
    });

    if (status === 'COMPLETED' || status === 'NOSHOW') {
      const counter = counters.find(c => c.currentTicketId === ticketId);
      if (counter) {
        const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
        updateDoc(counterRef, { status: 'VACANT', currentTicketId: null });
      }
    }
  };

  const callNextTicket = async (counterId: string) => {
    if (!db) return;
    const counter = counters.find(c => c.id === counterId);
    if (!counter) return;
    
    const nextTicket = tickets.find(t => 
      t.status === 'WAITING' && 
      t.departmentId === counter.departmentId && 
      t.serviceType === counter.serviceType
    );

    if (nextTicket) {
      const ticketRef = doc(db, 'departments', counter.departmentId, 'tickets', nextTicket.id);
      const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
      
      updateDoc(ticketRef, { status: 'CALLED', counterId: counter.id, calledAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      updateDoc(counterRef, { status: 'SERVING', currentTicketId: nextTicket.id });
    }
  };

  const setStaffAssignment = async (deptId: string | null, serviceType: ServiceType | null, counterNumber?: number) => {
    if (!db || !user?.uid) return;
    const userRef = doc(db, 'users', user.uid);
    const updates: any = { 
      departmentId: deptId || null, 
      serviceType: serviceType || null,
      counterNumber: counterNumber || null
    };
    
    await updateDoc(userRef, updates);
    setStaffCounterId(null);

    if (deptId && serviceType && counterNumber) {
      const counterId = `${serviceType.toLowerCase()}-${counterNumber}`;
      const counterRef = doc(db, 'departments', deptId, 'counters', counterId);
      
      const counterSnap = await getDoc(counterRef);
      if (!counterSnap.exists()) {
        await setDoc(counterRef, {
          id: counterId,
          departmentId: deptId,
          serviceType: serviceType,
          counterNumber: counterNumber,
          status: 'VACANT'
        });
      }
    }
  };

  const updateUserAssignment = (userId: string, deptId: string | null, serviceType: ServiceType | null) => {
    if (!db || !isAdmin) return;
    const userRef = doc(db, 'users', userId);
    updateDoc(userRef, { 
      departmentId: deptId || null, 
      serviceType: serviceType || null 
    });
  };

  const loginWithGoogle = () => {
    if (auth) {
      initiateGoogleSignIn(auth).catch(() => {});
    }
  };
  
  const logout = () => {
    if (auth) signOut(auth);
    window.location.href = '/';
  };

  return (
    <QueueContext.Provider value={{ 
      departments, counters, tickets, allUsers: visibleUsers, currentDepartment, 
      setCurrentDepartment: setCurrentDeptId, createTicket, callNextTicket, updateTicketStatus,
      staffCounter, setStaffCounter: setStaffCounterId, staffAssignment, setStaffAssignment,
      updateUserAssignment, isUserLoading, loginWithGoogle, logout, isAdmin, isStaff
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within QueueProvider');
  return context;
};
