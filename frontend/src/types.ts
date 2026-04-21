export type PassType = '1 Month' | '3 Month' | '6 Month' | '12 Month';

export type PassStatus = 'Pending' | 'Active' | 'Approved' | 'Expired' | 'Rejected' | 'Pending Payment';

export interface BusPass {
  id: string;
  userId: string;
  userName: string;
  studentId?: string;
  department?: string;
  year?: string;
  mobile?: string;
  email?: string;
  from: string;
  to: string;
  type: PassType;
  issueDate: string;
  expiryDate: string;
  status: PassStatus;
  price: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'User' | 'Admin';
}

export interface BusRoute {
  id: string;
  routeName: string;
  startPlace: string;
  endPlace: string;
  distance: number;
  fare: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export type AdminSubView = 'applications' | 'routes' | 'departments' | 'payments' | 'reports' | 'users';

export interface Payment {
  id: string;
  passId: string;
  userId: string;
  userName: string;
  amount: number;
  date: string;
  transactionId: string;
  status: string;
}

export interface RouteModalState {
  isOpen: boolean;
  route: Partial<BusRoute> | null;
  isEditing: boolean;
}

export interface DepartmentModalState {
  isOpen: boolean;
  department: Partial<Department> | null;
  isEditing: boolean;
}

export interface AdminReports {
  totalPasses: number;
  revenue: number;
  activePasses: number;
  pendingApprovals: number;
  deptDistribution: { name: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}
