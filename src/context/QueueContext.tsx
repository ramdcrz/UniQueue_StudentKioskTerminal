
"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Department, Ticket, Counter, ServiceType, TicketStatus, User as AppUser, RoutingDepartment, CSATScore } from '@/lib/types';
import { endOfDay, startOfDay } from 'date-fns';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  updateDoc,
  writeBatch,
  query, 
  orderBy,
  getDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { initiateAnonymousSignIn, initiateGoogleSignIn } from '@/firebase/non-blocking-login';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, QueueValidationError } from '@/firebase/errors';

interface QueueContextType {
  departments: Department[];
  counters: Counter[];
  tickets: Ticket[];
  allUsers: AppUser[];
  currentDepartment: Department | null;
  currentUserProfile: AppUser | null;
  setCurrentDepartment: (deptId: string) => void;
  createTicket: (ticketData: { serviceType: ServiceType; studentName: string; purpose: string; college?: string }) => Promise<Ticket>;
  callNextTicket: (counterId: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus, departmentId?: string) => void;
  transferTicket: (ticketId: string, destinationServiceType: ServiceType) => Promise<void>;
  transferTicketToWindow: (ticketId: string, targetCounterId: string) => Promise<void>;
  submitCsat: (ticketId: string, score: CSATScore, departmentId?: string) => void;
  staffCounter: Counter | null;
  setStaffCounter: (counterId: string | null) => void;
  staffAssignment: { deptId: string | null; serviceType: ServiceType | null; windowNumber: number | null; routingDepartment: RoutingDepartment | null };
  setStaffAssignment: (deptId: string | null, serviceType: ServiceType | null, windowNumber?: number) => void;
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

const ROUTING_BY_SERVICE: Record<ServiceType, RoutingDepartment> = {
  CASHIER: 'CASHIER',
  ACCOUNTING: 'ACCOUNTING',
};

const SERVICE_BY_ROUTING: Record<RoutingDepartment, ServiceType> = {
  REGISTRAR: 'CASHIER',
  ACCOUNTING_CASHIER: 'ACCOUNTING',
  CASHIER: 'CASHIER',
  ACCOUNTING: 'ACCOUNTING',
};

function getRoutingDepartmentForWindow(windowNumber?: number | null) {
  if (!windowNumber) return null;
  return windowNumber <= 8 ? 'CASHIER' : 'ACCOUNTING';
}

function getCounterWindowNumber(counter: Counter) {
  return counter.windowNumber ?? counter.counterNumber ?? null;
}

function getTicketRoutingDepartment(ticket: Ticket) {
  return ticket.routingDepartment ?? ROUTING_BY_SERVICE[ticket.serviceType];
}

function getLocalDayWindow(now = new Date()) {
  const start = startOfDay(now);
  const end = endOfDay(now);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export const WINDOW_COLLEGE_ROUTING: Record<number, string[] | 'ALL'> = {
  9: ['IS', 'CBA', 'COA', 'SOIR'],
  10: ['CON', 'CMT', 'COM', 'CPT', 'CRT'],
  11: ['CAS', 'CEA', 'COE', 'CICS', 'CRIM', 'COC', 'COL', 'Music'],
  12: 'ALL'
};

export function canWindowServeTicket(windowNumber: number | null, ticketCollege: string | undefined): boolean {
  if (!windowNumber || windowNumber < 9 || windowNumber > 12) return true;
  
  const rules = WINDOW_COLLEGE_ROUTING[windowNumber];
  if (!rules || rules === 'ALL') return true;
  
  if (!ticketCollege) return false;
  
  const match = ticketCollege.match(/\((.*?)\)/);
  const acronym = match ? match[1] : ticketCollege;

  return rules.includes(acronym);
}


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
    windowNumber: (currentUserProfile as any)?.windowNumber ?? (currentUserProfile as any)?.counterNumber ?? null,
    routingDepartment: (currentUserProfile as any)?.routingDepartment || ((currentUserProfile as any)?.serviceType ? ROUTING_BY_SERVICE[(currentUserProfile as any).serviceType as ServiceType] : null)
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

  const createTicket = async ({ serviceType, studentName, purpose, college }: { serviceType: ServiceType; studentName: string; purpose: string; college?: string }) => {
    if (!db || !currentDepartment) throw new Error("Database not ready");

    const normalizedStudentName = studentName.trim();
    const { startIso, endIso } = getLocalDayWindow();
    const strikeQuery = query(
      collection(db, 'departments', currentDeptId, 'tickets'),
      where('studentName', '==', normalizedStudentName),
      where('status', 'in', ['NOSHOW', 'CANCELLED']),
      where('createdAt', '>=', startIso),
      where('createdAt', '<=', endIso),
    );
    const strikeSnapshot = await getDocs(strikeQuery);

    if (strikeSnapshot.size >= 3) {
      throw new QueueValidationError('Limit Exceeded: Please try again tomorrow', 'STRIKE_LIMIT_EXCEEDED');
    }

    const ticketsRef = collection(db, 'departments', currentDeptId, 'tickets');
    const newDocRef = doc(ticketsRef);
    
    const buildingTickets = tickets.filter(t => t.departmentId === currentDeptId);
    const num = (buildingTickets.length + 1).toString().padStart(3, '0');
    
    const ticketData = {
      queueNumber: `${currentDepartment.code}-${num}`,
      serviceType,
      routingDepartment: ROUTING_BY_SERVICE[serviceType],
      status: 'WAITING' as TicketStatus,
      departmentId: currentDeptId,
      studentName: normalizedStudentName,
      purpose,
      college,
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
    if (status === 'COMPLETED' || status === 'Finish' || status === 'NOSHOW' || status === 'CANCELLED') updates.completedAt = new Date().toISOString();

    updateDoc(ticketRef, updates).catch((err) => {
      console.error("Failed to update ticket", err);
    });

    if (status === 'COMPLETED' || status === 'Finish' || status === 'NOSHOW' || status === 'CANCELLED') {
      const counter = counters.find(c => c.currentTicketId === ticketId);
      if (counter) {
        const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
        updateDoc(counterRef, { status: 'VACANT', currentTicketId: null });
      }
    }
  };

  const transferTicket = async (ticketId: string, destinationServiceType: ServiceType) => {
    if (!db) return;

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket || ticket.serviceType === destinationServiceType) return;

    const sourceDeptId = ticket.departmentId || currentDeptId;
    const sourceTicketRef = doc(db, 'departments', sourceDeptId, 'tickets', ticketId);
    const sourceCounter = counters.find(c => c.id === ticket.counterId || c.currentTicketId === ticketId);
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    batch.update(sourceTicketRef, {
      serviceType: destinationServiceType,
      routingDepartment: ROUTING_BY_SERVICE[destinationServiceType],
      status: 'WAITING',
      createdAt: nowIso,
      updatedAt: nowIso,
      counterId: null,
      calledAt: null,
      servedAt: null,
      completedAt: null,
      csat: null,
      csatRecordedAt: null,
    });

    if (sourceCounter) {
      const sourceCounterRef = doc(db, 'departments', sourceCounter.departmentId, 'counters', sourceCounter.id);
      batch.update(sourceCounterRef, {
        status: 'VACANT',
        currentTicketId: null,
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error('Failed to transfer ticket', err);
      throw err;
    }
  };

  const transferTicketToWindow = async (ticketId: string, targetCounterId: string) => {
    if (!db) return;

    const ticket = tickets.find(t => t.id === ticketId);
    const targetCounter = counters.find(c => c.id === targetCounterId);

    if (!ticket || !targetCounter) return;
    if (ticket.departmentId !== targetCounter.departmentId) return;

    const ticketRef = doc(db, 'departments', ticket.departmentId, 'tickets', ticketId);
    const sourceCounter = ticket.counterId ? counters.find(c => c.id === ticket.counterId) : null;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    batch.update(ticketRef, {
      counterId: targetCounterId,
      status: 'WAITING',
      updatedAt: nowIso,
      calledAt: null,
    });

    if (sourceCounter) {
      const sourceCounterRef = doc(db, 'departments', sourceCounter.departmentId, 'counters', sourceCounter.id);
      batch.update(sourceCounterRef, {
        status: 'VACANT',
        currentTicketId: null,
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      console.error('Failed to transfer ticket to window', err);
      throw err;
    }
  };

  const submitCsat = (ticketId: string, score: CSATScore, departmentId?: string) => {
    if (!db) return;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    const deptId = departmentId || ticket.departmentId || currentDeptId;
    const ticketRef = doc(db, 'departments', deptId, 'tickets', ticketId);
    updateDoc(ticketRef, { csat: score, csatRecordedAt: new Date().toISOString() }).catch((err) => {
      console.error("Failed to submit CSAT", err);
    });
  };

  const callNextTicket = async (counterId: string) => {
    if (!db) return;
    const counter = counters.find(c => c.id === counterId);
    if (!counter) return;
    const windowNumber = getCounterWindowNumber(counter);
    const routingDepartment = counter.routingDepartment ?? getRoutingDepartmentForWindow(windowNumber);
    if (!routingDepartment) return;

    const serviceType = SERVICE_BY_ROUTING[routingDepartment];
    
    const nextTicket = tickets.find(t => 
      t.status === 'WAITING' && 
      t.departmentId === counter.departmentId && 
      t.serviceType === serviceType &&
      getTicketRoutingDepartment(t) === routingDepartment &&
      canWindowServeTicket(windowNumber, t.college)
    );

    if (nextTicket) {
      const ticketRef = doc(db, 'departments', counter.departmentId, 'tickets', nextTicket.id);
      const counterRef = doc(db, 'departments', counter.departmentId, 'counters', counter.id);
      
      updateDoc(ticketRef, { status: 'CALLED', counterId: counter.id, routingDepartment, calledAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      updateDoc(counterRef, { status: 'SERVING', currentTicketId: nextTicket.id, routingDepartment, windowNumber, counterNumber: windowNumber, assignedStaffId: user?.uid || counter.assignedStaffId || null });
    }
  };

  const setStaffAssignment = async (deptId: string | null, serviceType: ServiceType | null, windowNumber?: number) => {
    if (!db || !user?.uid) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const routingDepartment = serviceType ? ROUTING_BY_SERVICE[serviceType] : null;
      const updates: any = { 
        departmentId: deptId || null, 
        serviceType: serviceType || null,
        windowNumber: windowNumber || null,
        counterNumber: windowNumber || null,
        routingDepartment
      };
      
      await updateDoc(userRef, updates);
      setStaffCounterId(null);

      if (deptId && serviceType && windowNumber) {
        const counterId = `${deptId}-${routingDepartment}-${windowNumber}-${user.uid}`;
        const counterRef = doc(db, 'departments', deptId, 'counters', counterId);
        
        const counterSnap = await getDoc(counterRef);
        if (!counterSnap.exists()) {
          await setDoc(counterRef, {
            id: counterId,
            departmentId: deptId,
            serviceType: serviceType,
            routingDepartment,
            counterNumber: windowNumber,
            windowNumber,
            assignedStaffId: user.uid,
            status: 'VACANT'
          }, { merge: true });
        } else {
          await setDoc(counterRef, {
            id: counterId,
            departmentId: deptId,
            serviceType: serviceType,
            routingDepartment,
            counterNumber: windowNumber,
            windowNumber,
            assignedStaffId: user.uid,
            status: counterSnap.data()?.status || 'VACANT',
            currentTicketId: counterSnap.data()?.currentTicketId || null
          }, { merge: true });
        }
        setStaffCounterId(counterId);
      }
    } catch (error) {
      console.error('Failed to set staff assignment', error);
    }
  };

  const updateUserAssignment = (userId: string, deptId: string | null, serviceType: ServiceType | null) => {
    if (!db || !isAdmin) return;
    const userRef = doc(db, 'users', userId);
    updateDoc(userRef, { 
      departmentId: deptId || null, 
      serviceType: serviceType || null,
      windowNumber: null,
      counterNumber: null,
      routingDepartment: serviceType ? ROUTING_BY_SERVICE[serviceType] : null
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
      departments, counters, tickets, allUsers: visibleUsers, currentDepartment, currentUserProfile,
      setCurrentDepartment: setCurrentDeptId, createTicket, callNextTicket, updateTicketStatus,
      transferTicket, transferTicketToWindow,
      submitCsat,
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
