
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Department, Ticket, Counter, ServiceType, TicketStatus } from '@/lib/types';
import { announceTicket } from '@/ai/flows/public-monitor-tts-announcements';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc,
  query, 
  orderBy,
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
  currentDepartment: Department | null;
  setCurrentDepartment: (deptId: string) => void;
  createTicket: (serviceType: ServiceType) => Promise<Ticket>;
  callNextTicket: (counterId: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus, departmentId?: string) => void;
  staffCounter: Counter | null;
  setStaffCounter: (counterId: string | null) => void;
  staffAssignment: { deptId: string | null; serviceType: ServiceType | null };
  setStaffAssignment: (deptId: string | null, serviceType: ServiceType | null) => void;
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
  const [currentDeptId, setCurrentDeptId] = useState<string>('main');
  const [staffCounterId, setStaffCounterId] = useState<string | null>(null);
  
  // Staff assignment tracking
  const [staffAssignment, setAssignment] = useState<{ deptId: string | null; serviceType: ServiceType | null }>({
    deptId: null,
    serviceType: null
  });

  const currentDepartment = departments.find(d => d.id === currentDeptId) || null;
  const staffCounter = counters.find(c => c.id === staffCounterId) || null;
  
  const isAdmin = !!user && !!user.email && ADMIN_EMAILS.includes(user.email);
  const isStaff = !!user && !!user.email && (STAFF_EMAILS.includes(user.email) || ADMIN_EMAILS.includes(user.email));

  useEffect(() => {
    if (auth && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth).catch(() => {});
    }
  }, [auth, user, isUserLoading]);

  useEffect(() => {
    if (!db || isUserLoading || !user) return;

    const unsubscribes = departments.map(dept => {
      const ticketsRef = collection(db, 'departments', dept.id, 'tickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const deptTickets = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Ticket));
        setTickets(prev => {
          const otherDeptsTickets = prev.filter(t => t.departmentId !== dept.id);
          return [...otherDeptsTickets, ...deptTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });
      }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `departments/${dept.id}/tickets`, operation: 'list' }));
      });
    });

    const counterUnsubscribes = departments.map(dept => {
      const countersRef = collection(db, 'departments', dept.id, 'counters');
      return onSnapshot(countersRef, (snapshot) => {
        const deptCounters = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Counter));
        setCounters(prev => {
          const otherDeptsCounters = prev.filter(c => c.departmentId !== dept.id);
          return [...otherDeptsCounters, ...deptCounters];
        });
      }, (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `departments/${dept.id}/counters`, operation: 'list' }));
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      counterUnsubscribes.forEach(unsub => unsub());
    };
  }, [db, departments, isUserLoading, user]);

  const createTicket = async (serviceType: ServiceType) => {
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
    const deptId = departmentId || currentDeptId;
    const ticketRef = doc(db, 'departments', deptId, 'tickets', ticketId);
    const updates: any = { status, updatedAt: new Date().toISOString() };
    if (status === 'CALLED') updates.calledAt = new Date().toISOString();
    if (status === 'COMPLETED' || status === 'NOSHOW') updates.completedAt = new Date().toISOString();

    updateDoc(ticketRef, updates).catch(() => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ticketRef.path, operation: 'update', requestResourceData: updates }));
    });

    if (status === 'COMPLETED' || status === 'NOSHOW') {
      const counter = counters.find(c => c.currentTicketId === ticketId);
      if (counter) {
        const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
        const counterUpdates = { status: 'VACANT', currentTicketId: null };
        updateDoc(counterRef, counterUpdates);
      }
    }
  };

  const callNextTicket = async (counterId: string) => {
    if (!db) return;
    const counter = counters.find(c => c.id === counterId);
    if (!counter) return;
    
    const nextTicket = tickets.find(t => 
      t.departmentId === counter.departmentId && 
      t.serviceType === counter.serviceType && 
      t.status === 'WAITING'
    );

    if (nextTicket) {
      const ticketRef = doc(db, 'departments', counter.departmentId, 'tickets', nextTicket.id);
      const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
      
      const ticketUpdates = { status: 'CALLED', counterId: counter.id, calledAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const counterUpdates = { status: 'SERVING', currentTicketId: nextTicket.id };

      updateDoc(ticketRef, ticketUpdates);
      updateDoc(counterRef, counterUpdates);

      announceTicket({
        ticketNumber: nextTicket.queueNumber,
        departmentName: INITIAL_DEPARTMENTS.find(d => d.id === counter.departmentId)?.name || "University",
        serviceType: nextTicket.serviceType,
        counterNumber: counter.counterNumber,
      }).then(result => {
        if (result.media) {
          const audio = new Audio(result.media);
          audio.play().catch(() => {});
        }
      });
    }
  };

  const setStaffAssignment = (deptId: string | null, serviceType: ServiceType | null) => {
    setAssignment({ deptId, serviceType });
    // When assignment changes, reset the specific counter ID to let the staff page re-select or prompt
    setStaffCounterId(null);
  };

  const loginWithGoogle = () => {
    if (auth) {
      initiateGoogleSignIn(auth).catch((err) => {
        if (err.code === 'auth/operation-not-allowed') {
          console.error("Firebase Auth: Google provider not enabled.");
        }
      });
    }
  };
  
  const logout = () => auth && signOut(auth);

  return (
    <QueueContext.Provider value={{ 
      departments, counters, tickets, currentDepartment, 
      setCurrentDepartment: setCurrentDeptId, createTicket, callNextTicket, updateTicketStatus,
      staffCounter, setStaffCounter: setStaffCounterId, staffAssignment, setStaffAssignment,
      isUserLoading, loginWithGoogle, logout, isAdmin, isStaff
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
