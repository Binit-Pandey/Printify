import type { User, Customer, InventoryItem, Vendor, Expense, Bill, CompanySettings } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'superadmin',
    role: 'superadmin',
    name: 'Super Admin',
    email: 'super@printpress.com',
  },
  {
    id: '2',
    username: 'admin',
    role: 'admin',
    name: 'Admin User',
    email: 'admin@printpress.com',
  },
  {
    id: '3',
    username: 'staff',
    role: 'staff',
    name: 'Staff User',
    email: 'staff@printpress.com',
  },
];

export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'Rahul Sharma',
    phone: '9841234567',
    address: 'Kathmandu, Nepal',
    email: 'rahul@email.com',
    outstandingBalance: 4500,
  },
  {
    id: 'c2',
    name: 'Priya Patel',
    phone: '9861234567',
    address: 'Pokhara, Nepal',
    email: 'priya@email.com',
    outstandingBalance: 2300,
  },
];

export const mockInventory: InventoryItem[] = [
  {
    id: 'i1',
    name: 'A4 Paper',
    category: 'Paper',
    unit: 'Ream',
    quantity: 45,
    purchasePrice: 450,
    vendor: 'Paper Mart',
    status: 'In Stock',
  },
  {
    id: 'i2',
    name: 'Black Ink',
    category: 'Ink',
    unit: 'Liter',
    quantity: 8,
    purchasePrice: 1200,
    vendor: 'Ink Suppliers',
    status: 'Low Stock',
  },
];

export const mockVendors: Vendor[] = [
  {
    id: 'v1',
    name: 'Paper Mart',
    phone: '9851234567',
    address: 'Biratnagar',
    panNumber: 'PAN123456',
    outstandingBalance: 15000,
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    category: 'Rent',
    amount: 25000,
    reason: 'Monthly office rent',
    date: '2026-07-01',
    addedBy: 'Admin',
  },
];

export const mockBills: Bill[] = [
  {
    id: 'b1',
    billNumber: 'BILL-0001',
    date: '2026-07-05',
    customer: mockCustomers[0],
    items: [
      { id: 'bi1', name: 'Visiting Cards', quantity: 1000, unitPrice: 2.5, discount: 0 },
    ],
    subtotal: 2500,
    discount: 0,
    vat: 325,
    grandTotal: 2825,
    status: 'Paid',
  },
];

export const mockCompanySettings: CompanySettings = {
  name: 'Shree Printing Press',
  panNumber: 'PAN987654',
  vatNumber: 'VAT123456',
  address: 'New Road, Kathmandu, Nepal',
  contactNumber: '01-4567890',
  email: 'info@shreeprint.com',
  logo: '/logo.png',
  vatRate: 13,
};
