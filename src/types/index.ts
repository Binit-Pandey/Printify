export interface User {
  id: string;
  username: string;
  role: 'superadmin' | 'admin' | 'staff';
  name: string;
  email: string;
  avatar?: string;
  lastLogin?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  outstandingBalance: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  vendor: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface Vendor {
  id: string;
  name: string;
  phone: string;
  address: string;
  panNumber: string;
  outstandingBalance: number;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  date: string;
  type: 'purchase' | 'payment';
  description: string;
  dueDate?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  reason: string;
  date: string;
  addedBy: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  customer: Customer;
  items: BillItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  vat: number;
  grandTotal: number;
  status: 'Paid' | 'Pending';
  paymentMethod: 'Cash' | 'Card' | 'Online' | 'Credit';
  notes: string;
  createdBy: string;
}

export interface CompanySettings {
  name: string;
  panNumber: string;
  vatNumber: string;
  address: string;
  contactNumber: string;
  email: string;
  logo?: string;
  vatRate?: number;
}
