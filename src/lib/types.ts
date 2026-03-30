
export type Role = 'SUPERADMIN' | 'DEPTADMIN' | 'STAFF' | 'KIOSK' | 'MONITOR';

export type ServiceType = 'CASHIER' | 'ACCOUNTING';

export type TicketStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'NOSHOW';

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
  queueNumber: string; // e.g., MC-001, ISA-001
  serviceType: ServiceType;
  status: TicketStatus;
  departmentId: string;
  counterId?: string;
  createdAt: string;
  updatedAt: string;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
}
