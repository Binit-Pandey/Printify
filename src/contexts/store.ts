import { create } from 'zustand';
import type { Customer, InventoryItem, Vendor, VendorPayment, CustomerPayment, Expense, Bill, CompanySettings } from '../types';
import { api, getAuthToken, DATA_CHANGED_EVENT, type DataChangedDetail } from '../services/api';

interface AppState {
  customers: Customer[];
  inventory: InventoryItem[];
  vendors: Vendor[];
  expenses: Expense[];
  bills: Bill[];
  settings: CompanySettings;
  canEditOwnExpense: boolean;
  isInitialized: boolean;
  isRefreshing: boolean;

  initialize: (role?: string | null) => Promise<void>;
  refresh: () => Promise<void>;

  findOrCreateCustomer: (data: { name: string; phone: string; address?: string; email?: string }) => Promise<Customer>;
  addCustomer: (customer: Customer) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addInventoryItem: (item: InventoryItem) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;

  addVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (vendor: Vendor) => Promise<void>;
  deleteVendor: (id: string) => Promise<void>;

  addVendorPayment: (payment: VendorPayment) => Promise<void>;
  deleteVendorPayment: (id: string, vendorId: string) => Promise<void>;
  refreshVendor: (id: string) => Promise<void>;

  recordCustomerPayment: (payment: Omit<CustomerPayment, 'id'>) => Promise<void>;

  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addBill: (bill: Bill) => Promise<Bill>;
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

// The role decides which collections the current user is allowed to read; it is
// captured here so a refresh triggered by any page knows what to ask for.
let activeRole: string | null = null;

// Writes often land in bursts (saving an inventory item also records the
// matching vendor purchase), so refreshes are coalesced into one round trip
// instead of refetching everything per mutation.
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<void> | null = null;

export const useStore = create<AppState>()((set) => ({
  customers: [],
  inventory: [],
  vendors: [],
  expenses: [],
  bills: [],
  settings: defaultSettings,
  canEditOwnExpense: false,
  isInitialized: false,
  isRefreshing: false,

  // Re-pull everything from the server. Called after each write so totals,
  // balances and timestamps come from the authoritative record instead of a
  // local guess, which is what makes the UI consistent across pages.
  refresh: async () => {
    // activeRole outlives a sign-out (initialize is not re-run), so confirm a
    // credential is still present before spending requests on a doomed load.
    if (!activeRole || !getAuthToken()) return;
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      set({ isRefreshing: true });
      try {
        if (activeRole === 'staff') {
          const [expenseRes, bills, inventory, vendors, settings] = await Promise.all([
            api.expenses.mine(),
            api.bills.list(),
            api.inventory.list(),
            api.vendors.list(),
            api.settings.get(),
          ]);
          set({
            inventory,
            vendors,
            expenses: expenseRes.expenses,
            bills,
            settings,
            canEditOwnExpense: expenseRes.canEditOwn,
          });
          return;
        }

        const [customers, inventory, vendors, expenses, bills, settings] = await Promise.all([
          api.customers.list(),
          api.inventory.list(),
          api.vendors.list(),
          api.expenses.list(),
          api.bills.list(),
          api.settings.get(),
        ]);
        set({ customers, inventory, vendors, expenses, bills, settings });
      } finally {
        set({ isRefreshing: false });
      }
    })();

    try {
      await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  },

  initialize: async (role) => {
    activeRole = role ?? null;
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timeout')), 10000)
      );

      const isStaff = role === 'staff';

      if (isStaff) {
        const loadDataPromise = Promise.all([
          api.expenses.mine(),
          api.bills.list(),
          api.inventory.list(),
          api.vendors.list(),
          api.settings.get(),
        ]);
        // Promise.race settles with the array that Promise.all resolves to, so
        // this must destructure one level, not two.
        const [expenseRes, bills, inventory, vendors, settings] = await Promise.race([
          loadDataPromise,
          timeoutPromise,
        ]) as any;

        set({
          customers: [],
          inventory,
          vendors,
          expenses: expenseRes.expenses,
          bills,
          settings,
          canEditOwnExpense: expenseRes.canEditOwn,
          isInitialized: true,
        });
        return;
      }

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

      set({ customers, inventory, vendors, expenses, bills, settings, canEditOwnExpense: false, isInitialized: true });
    } catch (error) {
      // An unusable session is handled by the api layer (reload or sign-out);
      // surfacing an empty dashboard here beats leaving the app spinning.
      console.warn('Failed to load data, using defaults:', error);
      set({
        customers: [],
        inventory: [],
        vendors: [],
        expenses: [],
        bills: [],
        settings: defaultSettings,
        canEditOwnExpense: false,
        isInitialized: true
      });
    }
  },

  // Customers
  findOrCreateCustomer: async (data) => {
    const customer = await api.customers.findOrCreate(data);
    set((s) => {
      const exists = s.customers.find((c) => c.id === customer.id);
      if (exists) {
        return { customers: s.customers.map((c) => (c.id === customer.id ? customer : c)) };
      }
      return { customers: [...s.customers, customer] };
    });
    return customer;
  },
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

  addVendorPayment: async (payment) => {
    await api.vendorPayments.create(payment);
    // Refresh immediately so the outstanding balance the user is looking at
    // reflects the write; the coalesced auto-refresh then reconciles the rest.
    const vendors = await api.vendors.list();
    set({ vendors });
  },
  deleteVendorPayment: async (id, _vendorId) => {
    await api.vendorPayments.remove(id);
    const vendors = await api.vendors.list();
    set({ vendors });
  },
  refreshVendor: async (_id) => {
    const vendors = await api.vendors.list();
    set({ vendors });
  },

  recordCustomerPayment: async (payment) => {
    await api.customerPayments.create(payment);
    const [customers, bills] = await Promise.all([api.customers.list(), api.bills.list()]);
    set({ customers, bills });
  },

  // Expenses
  addExpense: async (expense) => {
    const created = await api.expenses.create(expense);
    set((s) => ({ expenses: [...s.expenses, created] }));
  },
  updateExpense: async (expense) => {
    const updated = await api.expenses.update(expense);
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === updated.id ? updated : e)) }));
  },
  deleteExpense: async (id) => {
    await api.expenses.remove(id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  // Bills
  addBill: async (bill) => {
    // Keep the server's persisted row: it is the authoritative record and
    // carries any values the backend filled in or normalised.
    const saved = await api.bills.create(bill);
    const record = saved ?? bill;
    set((s) => ({ bills: [record, ...s.bills] }));
    return record;
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

// Auto-reload after anything is written. Every successful non-GET request
// announces itself, so a purchase, an expense, a vendor edit or a staff change
// made in one place refreshes the data shown everywhere else — including
// totals and balances that are derived on the server.
if (typeof window !== 'undefined') {
  window.addEventListener(DATA_CHANGED_EVENT, ((event: Event) => {
    const detail = (event as CustomEvent<DataChangedDetail>).detail;
    if (!activeRole || !getAuthToken()) return; // signed out; nothing to refresh
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      console.debug(`Auto-refreshing after ${detail?.method ?? 'write'} ${detail?.path ?? ''}`);
      useStore.getState().refresh().catch((error) => {
        console.warn('Auto refresh failed:', error);
      });
    }, 250);
  }) as EventListener);
}
