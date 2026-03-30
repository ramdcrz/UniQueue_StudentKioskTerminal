
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
  Firestore,
} from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
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
  setStaffCounter: (counterId: string) => void;
  isUserLoading: boolean;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'main', name: 'Main Building', hasAccounting: true },
  { id: 'is', name: 'Information Systems', hasAccounting: false },
  { id: 'som', name: 'School of Management', hasAccounting: false },
  { id: 'psb', name: 'Professional Schools Building', hasAccounting: false },
];

const INITIAL_COUNTERS: Counter[] = [
  { id: 'c1', departmentId: 'main', counterNumber: 1, serviceType: 'CASHIER', status: 'VACANT' },
  { id: 'c2', departmentId: 'main', counterNumber: 2, serviceType: 'CASHIER', status: 'VACANT' },
  { id: 'c3', departmentId: 'main', counterNumber: 3, serviceType: 'ACCOUNTING', status: 'VACANT' },
  { id: 'c4', departmentId: 'is', counterNumber: 1, serviceType: 'CASHIER', status: 'VACANT' },
];

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [counters, setCounters] = useState<Counter[]>(INITIAL_COUNTERS);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentDeptId, setCurrentDeptId] = useState<string>('main');
  const [staffCounterId, setStaffCounterId] = useState<string | null>(null);

  const currentDepartment = departments.find(d => d.id === currentDeptId) || null;
  const staffCounter = counters.find(c => c.id === staffCounterId) || null;

  useEffect(() => {
    if (auth && !user && !isUserLoading) {
      signInAnonymously(auth).catch(() => {});
    }
  }, [auth, user, isUserLoading]);

  // Sync Tickets from Firestore
  useEffect(() => {
    if (!db || isUserLoading || !user) return;

    const unsubscribes = departments.map(dept => {
      const ticketsRef = collection(db, 'departments', dept.id, 'tickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(
        q, 
        (snapshot) => {
          const deptTickets = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
          } as Ticket));
          
          setTickets(prev => {
            const otherDeptsTickets = prev.filter(t => t.departmentId !== dept.id);
            const combined = [...otherDeptsTickets, ...deptTickets];
            return combined.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        },
        async (error) => {
          const permissionError = new FirestorePermissionError({
            path: `departments/${dept.id}/tickets`,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      );
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, departments, isUserLoading, user]);

  // Sync Counters from Firestore
  useEffect(() => {
    if (!db || isUserLoading || !user) return;

    const unsubscribes = departments.map(dept => {
      const countersRef = collection(db, 'departments', dept.id, 'counters');
      
      return onSnapshot(
        countersRef, 
        (snapshot) => {
          const deptCounters = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
          } as Counter));
          
          if (deptCounters.length > 0) {
            setCounters(prev => {
              const otherDeptsCounters = prev.filter(c => c.departmentId !== dept.id);
              return [...otherDeptsCounters, ...deptCounters];
            });
          }
        },
        async (error) => {
          const permissionError = new FirestorePermissionError({
            path: `departments/${dept.id}/counters`,
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      );
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, departments, isUserLoading, user]);

  // Seed counters if they don't exist (Prototype Helper)
  useEffect(() => {
    if (!db || isUserLoading || !user) return;
    
    INITIAL_COUNTERS.forEach(counter => {
      const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
      setDoc(counterRef, counter, { merge: true }).catch(() => {});
    });
  }, [db, isUserLoading, user]);

  const createTicket = async (serviceType: ServiceType) => {
    if (!db || !currentDeptId) throw new Error("Database or Department not ready");

    const deptTickets = tickets.filter(t => t.departmentId === currentDeptId && t.serviceType === serviceType);
    const prefix = serviceType === 'CASHIER' ? 'C' : 'A';
    const num = (deptTickets.length + 1).toString().padStart(3, '0');
    
    const ticketsRef = collection(db, 'departments', currentDeptId, 'tickets');
    const newDocRef = doc(ticketsRef);
    
    const ticketData = {
      queueNumber: `${prefix}-${num}`,
      serviceType,
      status: 'WAITING' as TicketStatus,
      departmentId: currentDeptId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDoc(newDocRef, ticketData).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: newDocRef.path,
        operation: 'create',
        requestResourceData: ticketData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    return { ...ticketData, id: newDocRef.id };
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus, departmentId?: string) => {
    if (!db) return;
    const deptId = departmentId || currentDeptId;
    const ticketRef = doc(db, 'departments', deptId, 'tickets', ticketId);
    
    const updates: any = { 
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (status === 'CALLED') updates.calledAt = new Date().toISOString();
    if (status === 'COMPLETED' || status === 'NOSHOW') {
      updates.completedAt = new Date().toISOString();
    }

    updateDoc(ticketRef, updates).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: ticketRef.path,
        operation: 'update',
        requestResourceData: updates,
      });
      errorEmitter.emit('permission-error', permissionError);
    });

    // Also clear counter if ticket is finished
    if (status === 'COMPLETED' || status === 'NOSHOW') {
      const counter = counters.find(c => c.currentTicketId === ticketId);
      if (counter) {
        const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
        const counterUpdates = {
          status: 'VACANT',
          currentTicketId: null
        };
        updateDoc(counterRef, counterUpdates).catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: counterRef.path,
            operation: 'update',
            requestResourceData: counterUpdates,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
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
      
      const ticketUpdates = { 
        status: 'CALLED' as TicketStatus, 
        counterId: counter.id,
        calledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const counterUpdates = {
        status: 'SERVING',
        currentTicketId: nextTicket.id
      };

      // Update Ticket
      updateDoc(ticketRef, ticketUpdates).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: ticketRef.path,
          operation: 'update',
          requestResourceData: ticketUpdates,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
      
      // Update Counter
      updateDoc(counterRef, counterUpdates).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: counterRef.path,
          operation: 'update',
          requestResourceData: counterUpdates,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

      // Voice announcement (Non-blocking playback)
      const dept = departments.find(d => d.id === counter.departmentId);
      announceTicket({
        ticketNumber: nextTicket.queueNumber,
        departmentName: dept?.name || "University",
        serviceType: nextTicket.serviceType,
        counterNumber: counter.counterNumber,
      }).then(result => {
        if (result.media) {
          const audio = new Audio(result.media);
          audio.play().catch(() => {});
        }
      }).catch(() => {});
    }
  };

  return (
    <QueueContext.Provider value={{ 
      departments, 
      counters, 
      tickets, 
      currentDepartment, 
      setCurrentDepartment: setCurrentDeptId,
      createTicket,
      callNextTicket,
      updateTicketStatus,
      staffCounter,
      setStaffCounter: setStaffCounterId,
      isUserLoading
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
