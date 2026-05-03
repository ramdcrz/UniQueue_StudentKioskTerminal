
export type Role = 'SUPERADMIN' | 'DEPTADMIN' | 'STAFF' | 'KIOSK' | 'MONITOR';

export type ServiceType = 'CASHIER' | 'ACCOUNTING';

export type TicketStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'NOSHOW' | 'CANCELLED';

export type CounterStatus = 'ONLINE' | 'OFFLINE' | 'SERVING' | 'VACANT';

export interface Department {
  id: string;
  name: string;
  acronym: string;
  code: string;
  hasAccounting: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  departmentId?: string;
  serviceType?: ServiceType;
  email?: string;
}

export interface Counter {
  id: string;
  departmentId: string;
  counterNumber: number;
  serviceType: ServiceType;
  status: CounterStatus;
  assignedStaffId?: string;
  currentTicketId?: string | null;
}

export interface Ticket {
  id: string;
  queueNumber: string; // e.g., M-001, I-001
  serviceType: ServiceType;
  status: TicketStatus;
  departmentId: string;
  studentName?: string;
  purpose?: string;
  counterId?: string;
  createdAt: string;
  updatedAt: string;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
}
