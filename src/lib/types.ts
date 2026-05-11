
export type Role = 'SUPERADMIN' | 'ADMIN' | 'STAFF' | 'KIOSK' | 'MONITOR';

export type ServiceType = 'CASHIER' | 'ACCOUNTING';
export type RoutingDepartment = 'REGISTRAR' | 'ACCOUNTING_CASHIER' | 'CASHIER' | 'ACCOUNTING';

export type TicketStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'Finish' | 'NOSHOW' | 'CANCELLED';

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
  windowNumber?: number;
  routingDepartment?: RoutingDepartment;
  email?: string;
}

export interface Counter {
  id: string;
  departmentId: string;
  counterNumber?: number;
  windowNumber?: number;
  serviceType: ServiceType;
  routingDepartment?: RoutingDepartment;
  status: CounterStatus;
  assignedStaffId?: string;
  currentTicketId?: string | null;
}

export type CSATScore = 'POSITIVE' | 'NEGATIVE' | null;

export interface Ticket {
  id: string;
  queueNumber: string; // e.g., M-001, I-001
  serviceType: ServiceType;
  routingDepartment?: RoutingDepartment;
  status: TicketStatus;
  departmentId: string;
  studentName?: string;
  purpose?: string;
  college?: string;
  counterId?: string;
  createdAt: string;
  updatedAt: string;
  calledAt?: string;
  servedAt?: string;
  completedAt?: string;
  csat?: CSATScore;
  csatRecordedAt?: string;
}
