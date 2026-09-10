export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  pcbType: string;
  amount: number;
  status: 'Pending' | 'In Review' | 'Sent to JLC' | 'Manufacturing' | 'Shipped' | 'Cancelled';
  params: {
    baseMaterial: string;
    layers: number;
    dimensions: string;
    copperThickness: string;
    maskColor: string;
    surfaceFinish: string;
  };
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  joinedDate: string;
  status: 'Active' | 'Inactive';
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export const mockOrders: Order[] = [];

export const mockClients: Client[] = [];

export const mockInventory: InventoryItem[] = [
];

export type StaffRole = 'Floor Supervisor' | 'QA Engineer' | 'Dispatch Staff' | 'Procurement' | 'Production Lead' | 'Assembly Technician';
export type StaffStatus = 'Active' | 'Inactive' | 'On Leave';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  department: string;
  shift: 'Morning' | 'Evening' | 'Night';
  joinedDate: string;
  status: StaffStatus;
  mobileAccess: boolean;
  lastActive: string;
  avatar: string;
}

export const mockStaff: StaffMember[] = [];

export interface StaffActivity {
  id: string;
  timestamp: string;
  orderId: string;
  clientName: string;
  action: 'Status Update' | 'Payment Marked' | 'Invoice Sent' | 'Order Viewed' | 'Dispatch Confirmed' | 'QC Passed' | 'QC Failed';
  detail: string;
  from?: string;
  to?: string;
}

export const mockStaffActivity: Record<string, StaffActivity[]> = {};

export const mockRevenueData = [];
