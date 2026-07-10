import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, InventoryItem, Vendor, Expense, Bill, CompanySettings } from '../types';
import { mockCustomers, mockInventory, mockVendors, mockExpenses, mockBills, mockCompanySettings } from '../mock-data';

interface AppState {
  customers: Customer[];
  inventory: InventoryItem[];
  vendors: Vendor[];
  expenses: Expense[];
  bills: Bill[];
  settings: CompanySettings;
  
  // Actions
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  
  addVendor: (vendor: Vendor) => void;
  updateVendor: (vendor: Vendor) => void;
  deleteVendor: (id: string) => void;
  
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  
  addBill: (bill: Bill) => void;
  updateBill: (bill: Bill) => void;
  deleteBill: (id: string) => void;
  
  updateSettings: (settings: CompanySettings) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      customers: mockCustomers,
      inventory: mockInventory,
      vendors: mockVendors,
      expenses: mockExpenses,
      bills: mockBills,
      settings: mockCompanySettings,

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (customer) => set((state) => ({
        customers: state.customers.map((c) => (c.id === customer.id ? customer : c)),
      })),
      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      })),

      addInventoryItem: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
      updateInventoryItem: (item) => set((state) => ({
        inventory: state.inventory.map((i) => (i.id === item.id ? item : i)),
      })),
      deleteInventoryItem: (id) => set((state) => ({
        inventory: state.inventory.filter((i) => i.id !== id),
      })),

      addVendor: (vendor) => set((state) => ({ vendors: [...state.vendors, vendor] })),
      updateVendor: (vendor) => set((state) => ({
        vendors: state.vendors.map((v) => (v.id === vendor.id ? vendor : v)),
      })),
      deleteVendor: (id) => set((state) => ({
        vendors: state.vendors.filter((v) => v.id !== id),
      })),

      addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
      updateExpense: (expense) => set((state) => ({
        expenses: state.expenses.map((e) => (e.id === expense.id ? expense : e)),
      })),
      deleteExpense: (id) => set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
      })),

      addBill: (bill) => set((state) => ({ bills: [...state.bills, bill] })),
      updateBill: (bill) => set((state) => ({
        bills: state.bills.map((b) => (b.id === bill.id ? bill : b)),
      })),
      deleteBill: (id) => set((state) => ({
        bills: state.bills.filter((b) => b.id !== id),
      })),

      updateSettings: (settings) => set({ settings }),
    }),
    {
      name: 'printing-system-storage',
    }
  )
);
