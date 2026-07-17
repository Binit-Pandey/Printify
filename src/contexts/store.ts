import { create } from 'zustand';
import type { Customer, InventoryItem, Vendor, Expense, Bill, CompanySettings } from '../types';
import { api } from '../services/api';

interface AppState {
  customers: Customer[];
  inventory: InventoryItem[];
  vendors: Vendor[];
  expenses: Expense[];
  bills: Bill[];
  settings: CompanySettings;
  isInitialized: boolean;

  initialize: () => Promise<void>;

  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (vendor: Vendor) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addBill: (bill: Bill) => Promise<void>;
  updateBill: (bill: Bill) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;

  updateSettings: (settings: CompanySettings) => Promise<void>;
}

const defaultSettings: CompanySettings = {
  name: '',
  panNumber: '',
  vatNumber: '',
  address: '',
  contactNumber: '',
  email: '',
};

export const useStore = create<AppState>()((set) => ({
  customers: [],
  inventory: [],
  vendors: [],
  expenses: [],
  bills: [],
  settings: defaultSettings,
  isInitialized: false,

  initialize: async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 5000)
      );
      
      const loadDataPromise = Promise.all([
        api.customers.list(),
        api.inventory.list(),
        api.vendors.list(),
        api.expenses.list(),
        api.bills.list(),
        api.settings.get(),
      ]);

      const [customers, inventory, vendors, expenses, bills, settings] = await Promise.race([
        loadDataPromise,
        timeoutPromise,
      ]) as any;
      
      set({ customers, inventory, vendors, expenses, bills, settings, isInitialized: true });
    } catch (error) {
      console.warn('Failed to load data, using defaults:', error);
      set({ 
        customers: [],
        inventory: [],
        vendors: [],
        expenses: [],
        bills: [],
        settings: defaultSettings,
        isInitialized: true 
      });
    }
  },

  // Customers
  addCustomer: async (customer) => {
    await api.customers.create(customer);
    set((s) => ({ customers: [...s.customers, customer] }));
  },
  updateCustomer: async (customer) => {
    await api.customers.update(customer);
    set((s) => ({ customers: s.customers.map((c) => (c.id === customer.id ? customer : c)) }));
  },
  deleteCustomer: async (id) => {
    await api.customers.remove(id);
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
  },

  // Inventory
  addInventoryItem: async (item) => {
    await api.inventory.create(item);
    set((s) => ({ inventory: [...s.inventory, item] }));
  },
  updateInventoryItem: async (item) => {
    await api.inventory.update(item);
    set((s) => ({ inventory: s.inventory.map((i) => (i.id === item.id ? item : i)) }));
  },
  deleteInventoryItem: async (id) => {
    await api.inventory.remove(id);
    set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) }));
  },

  // Vendors
  addVendor: async (vendor) => {
    await api.vendors.create(vendor);
    set((s) => ({ vendors: [...s.vendors, vendor] }));
  },
  updateVendor: async (vendor) => {
    await api.vendors.update(vendor);
    set((s) => ({ vendors: s.vendors.map((v) => (v.id === vendor.id ? vendor : v)) }));
  },
  deleteVendor: async (id) => {
    await api.vendors.remove(id);
    set((s) => ({ vendors: s.vendors.filter((v) => v.id !== id) }));
  },

  // Expenses
  addExpense: async (expense) => {
    await api.expenses.create(expense);
    set((s) => ({ expenses: [...s.expenses, expense] }));
  },
  updateExpense: async (expense) => {
    await api.expenses.update(expense);
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === expense.id ? expense : e)) }));
  },
  deleteExpense: async (id) => {
    await api.expenses.remove(id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  // Bills
  addBill: async (bill) => {
    await api.bills.create(bill);
    set((s) => ({ bills: [...s.bills, bill] }));
  },
  updateBill: async (bill) => {
    await api.bills.update(bill);
    set((s) => ({ bills: s.bills.map((b) => (b.id === bill.id ? bill : b)) }));
  },
  deleteBill: async (id) => {
    await api.bills.remove(id);
    set((s) => ({ bills: s.bills.filter((b) => b.id !== id) }));
  },

  // Settings
  updateSettings: async (settings) => {
    await api.settings.update(settings);
    set({ settings });
  },
}));
