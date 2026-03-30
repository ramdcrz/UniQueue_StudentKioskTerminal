"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Department, Ticket, Counter, ServiceType, TicketStatus } from '@/lib/types';
import { announceTicket } from '@/ai/flows/public-monitor-tts-announcements';

interface QueueContextType {
  departments: Department[];
  counters: Counter[];
  tickets: Ticket[];
  currentDepartment: Department | null;
  setCurrentDepartment: (deptId: string) => void;
  createTicket: (serviceType: ServiceType) => Ticket;
  callNextTicket: (counterId: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
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
  const [departments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [counters, setCounters] = useState<Counter[]>(INITIAL_COUNTERS);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentDeptId, setCurrentDeptId] = useState<string>('main');
  const [staffCounterId, setStaffCounterId] = useState<string | null>(null);

  const currentDepartment = departments.find(d => d.id === currentDeptId) || null;
  const staffCounter = counters.find(c => c.id === staffCounterId) || null;

  const createTicket = (serviceType: ServiceType) => {
    const deptTickets = tickets.filter(t => t.departmentId === currentDeptId && t.serviceType === serviceType);
    const prefix = serviceType === 'CASHIER' ? 'C' : 'A';
    const num = (deptTickets.length + 1).toString().padStart(3, '0');
    const newTicket: Ticket = {
      id: Math.random().toString(36).substr(2, 9),
      queueNumber: `${prefix}-${num}`,
      serviceType,
      status: 'WAITING',
      departmentId: currentDeptId,
      createdAt: new Date().toISOString(),
    };
    setTickets(prev => [...prev, newTicket]);
    return newTicket;
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { 
      ...t, 
      status, 
      calledAt: status === 'CALLED' ? new Date().toISOString() : t.calledAt,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : t.completedAt
    } : t));
  };

  const callNextTicket = async (counterId: string) => {
    const counter = counters.find(c => c.id === counterId);
    if (!counter) return;

    const nextTicket = tickets.find(t => 
      t.departmentId === counter.departmentId && 
      t.serviceType === counter.serviceType && 
      t.status === 'WAITING'
    );

    if (nextTicket) {
      setTickets(prev => prev.map(t => t.id === nextTicket.id ? { 
        ...t, 
        status: 'CALLED', 
        counterId: counter.id,
        calledAt: new Date().toISOString() 
      } : t));
      
      setCounters(prev => prev.map(c => c.id === counter.id ? { 
        ...c, 
        status: 'SERVING',
        currentTicketId: nextTicket.id 
      } : c));

      // Trigger TTS Announcement
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
