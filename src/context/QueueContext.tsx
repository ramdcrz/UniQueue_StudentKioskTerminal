"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Department, Ticket, Counter, ServiceType, TicketStatus } from '@/lib/types';
import { announceTicket } from '@/ai/flows/public-monitor-tts-announcements';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where,
  orderBy,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

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
  const { auth } = useAuth() ? { auth: useAuth() } : { auth: null };
  const { user } = useUser();
  
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [counters, setCounters] = useState<Counter[]>(INITIAL_COUNTERS);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentDeptId, setCurrentDeptId] = useState<string>('main');
  const [staffCounterId, setStaffCounterId] = useState<string | null>(null);

  const currentDepartment = departments.find(d => d.id === currentDeptId) || null;
  const staffCounter = counters.find(c => c.id === staffCounterId) || null;

  // Sign in anonymously if not already signed in
  useEffect(() => {
    if (auth && !user) {
      signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed", err));
    }
  }, [auth, user]);

  // Listen to tickets globally for simplicity in prototype, though nested in backend.json
  // In a production app, we would listen per department.
  useEffect(() => {
    if (!db) return;

    const allTickets: Ticket[] = [];
    const unsubscribes = departments.map(dept => {
      const ticketsRef = collection(db, 'departments', dept.id, 'tickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const deptTickets = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as Ticket));
        
        setTickets(prev => {
          const otherDeptsTickets = prev.filter(t => t.departmentId !== dept.id);
          return [...otherDeptsTickets, ...deptTickets].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, departments]);

  const createTicket = async (serviceType: ServiceType) => {
    if (!db || !currentDeptId) throw new Error("Database or Department not ready");

    const deptTickets = tickets.filter(t => t.departmentId === currentDeptId && t.serviceType === serviceType);
    const prefix = serviceType === 'CASHIER' ? 'C' : 'A';
    const num = (deptTickets.length + 1).toString().padStart(3, '0');
    
    const ticketData = {
      queueNumber: `${prefix}-${num}`,
      serviceType,
      status: 'WAITING' as TicketStatus,
      departmentId: currentDeptId,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'departments', currentDeptId, 'tickets'), ticketData);
    return { ...ticketData, id: docRef.id };
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus, departmentId?: string) => {
    if (!db) return;
    const deptId = departmentId || currentDeptId;
    const ticketRef = doc(db, 'departments', deptId, 'tickets', ticketId);
    
    const updates: any = { status };
    if (status === 'CALLED') updates.calledAt = new Date().toISOString();
    if (status === 'COMPLETED') updates.completedAt = new Date().toISOString();

    updateDoc(ticketRef, updates);
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
      
      updateDoc(ticketRef, { 
        status: 'CALLED', 
        counterId: counter.id,
        calledAt: new Date().toISOString() 
      });
      
      setCounters(prev => prev.map(c => c.id === counter.id ? { 
        ...c, 
        status: 'SERVING',
        currentTicketId: nextTicket.id 
      } : c));

      try {
        const dept = departments.find(d => d.id === counter.departmentId);
        const result = await announceTicket({
          ticketNumber: nextTicket.queueNumber,
          departmentName: dept?.name || "University",
          serviceType: nextTicket.serviceType,
          counterNumber: counter.counterNumber,
        });
        const audio = new Audio(result.media);
        audio.play();
      } catch (e) {
        console.error("TTS Failed", e);
      }
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
      setStaffCounter: setStaffCounterId
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
