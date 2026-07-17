import type { Customer, InventoryItem, Vendor, VendorPayment, Expense, Bill, CompanySettings } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${options?.method ?? 'GET'} ${path} failed (${res.status}): ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get  = <T>(path: string)                   => request<T>(path);
const post = <T>(path: string, body: unknown)    => request<T>(path, { method: 'POST',   body: JSON.stringify(body) });
const put  = <T>(path: string, body: unknown)    => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) });
const del  =    (path: string)                   => request<void>(path, { method: 'DELETE' });

export const api = {
  customers: {
    list:   ()               => get<Customer[]>('/customers'),
    listWithDue: ()          => get<Customer[]>('/customers/with-due'),
    findOrCreate: (data: { name: string; phone: string; address?: string; email?: string }) =>
                    post<Customer>('/customers/find-or-create', data),
    create: (c: Customer)    => post<Customer>('/customers', c),
    update: (c: Customer)    => put<Customer>(`/customers/${c.id}`, c),
    remove: (id: string)     => del(`/customers/${id}`),
  },

  inventory: {
    list:   ()                    => get<InventoryItem[]>('/inventory'),
    create: (item: InventoryItem) => post<InventoryItem>('/inventory', item),
    update: (item: InventoryItem) => put<InventoryItem>(`/inventory/${item.id}`, item),
    remove: (id: string)          => del(`/inventory/${id}`),
  },

  vendors: {
    list:   ()              => get<Vendor[]>('/vendors'),
    create: (v: Vendor)     => post<Vendor>('/vendors', v),
    update: (v: Vendor)     => put<Vendor>(`/vendors/${v.id}`, v),
    remove: (id: string)    => del(`/vendors/${id}`),
  },

  vendorPayments: {
    list:   (vendorId: string) => get<VendorPayment[]>(`/vendor-payments/${vendorId}`),
    listAll: ()                  => get<VendorPayment[]>('/vendor-payments/all'),
    create: (p: VendorPayment) => post<VendorPayment>('/vendor-payments', p),
    remove: (id: string)       => del(`/vendor-payments/${id}`),
  },

  expenses: {
    list:   ()              => get<Expense[]>('/expenses'),
    create: (e: Expense)    => post<Expense>('/expenses', e),
    update: (e: Expense)    => put<Expense>(`/expenses/${e.id}`, e),
    remove: (id: string)    => del(`/expenses/${id}`),
  },

  bills: {
    list:   ()           => get<Bill[]>('/bills'),
    create: (b: Bill)    => post<Bill>('/bills', b),
    update: (b: Bill)    => put<Bill>(`/bills/${b.id}`, b),
    remove: (id: string) => del(`/bills/${id}`),
  },

  settings: {
    get: async () => {
      const row = await get<CompanySettings & { id?: number }>('/settings');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...settings } = row;
      return settings as CompanySettings;
    },
    update: (s: CompanySettings) => put<CompanySettings>('/settings', s),
    exportData: () => get<any>('/settings/export'),
    importData: (data: any) => post<any>('/settings/import', data),
  },
};
