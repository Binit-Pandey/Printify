import type { Customer, InventoryItem, Vendor, VendorPayment, CustomerPayment, Expense, Bill, CompanySettings, User } from '../types';

const BASE = '/api';
export const TOKEN_KEY = 'printpress_token';
export const USER_KEY = 'printpress_user';

let authToken: string | null = null;
let expireNotified = false;

// A failed reload-repair is remembered so a genuinely stale cached session
// cannot put the renderer into a reload loop.
const SELF_HEAL_KEY = 'printpress:self-heal-attempted';

export function setAuthToken(token: string | null) {
  authToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      // A real credential means the last reload-repair attempt, if any, is moot.
      try { sessionStorage.removeItem(SELF_HEAL_KEY); } catch { /* ignore */ }
      expireNotified = false;
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable
  }
}

export function getAuthToken(): string | null {
  // Storage is the source of truth: it is correct across tabs and across a
  // re-login that happened after this module was evaluated.
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  } catch {
    // localStorage unavailable
  }
  return authToken;
}

// Fired when the backend confirms the stored token is no longer accepted
// (expired session, backend restarted, database reset). The app listens for
// this to sign the user out instead of failing every subsequent request.
export const SESSION_EXPIRED_EVENT = 'printpress:session-expired';

// Fired after every successful write so open pages can pull fresh data instead
// of showing state computed locally from a possibly stale snapshot.
export const DATA_CHANGED_EVENT = 'printpress:data-changed';

export interface DataChangedDetail {
  method: string;
  path: string;
}

// A 401 from these endpoints is the expected answer to a bad credential, not
// evidence that an established session died.
const AUTH_ENDPOINTS = /^\/auth\//;

function hasCachedUser(): boolean {
  try {
    return !!localStorage.getItem(USER_KEY);
  } catch {
    return false;
  }
}

let sessionCheck: Promise<void> | null = null;

/** Error carrying the HTTP status so callers can react to specific failures. */
export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

/**
 * Turns a failed response into a short sentence a user can act on, instead of
 * dumping `API POST /expenses failed (500): {"error":"..."}` into a toast.
 */
async function readErrorMessage(res: Response, method: string, path: string): Promise<string> {
  let serverMessage = '';
  try {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        serverMessage = typeof parsed?.error === 'string' ? parsed.error : '';
      } catch {
        serverMessage = '';
      }
    }
  } catch {
    serverMessage = '';
  }

  if (serverMessage) return serverMessage;
  if (res.status === 403) return 'You do not have permission to do that';
  if (res.status === 404) return `${method} ${path} was not found`;
  if (res.status === 413) return 'That file is too large to upload';
  if (res.status >= 500) return 'The server could not complete that request';
  return `${method} ${path} failed (${res.status})`;
}

function notifySessionExpired(): void {
  if (expireNotified) return;
  expireNotified = true;
  try {
    localStorage.removeItem(TOKEN_KEY);
    authToken = null;
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  } catch {
    /* localStorage unavailable */
  }
}

function scheduleSelfHealReload(): void {
  let alreadyTried = false;
  try {
    alreadyTried = sessionStorage.getItem(SELF_HEAL_KEY) === '1';
  } catch {
    /* sessionStorage unavailable */
  }
  if (alreadyTried) {
    // Reloading did not repair it, so the cached session really is gone.
    notifySessionExpired();
    return;
  }
  try { sessionStorage.setItem(SELF_HEAL_KEY, '1'); } catch { /* ignore */ }
  window.location.reload();
}

// A single 401 does not prove the session is dead: it can be one rejected
// request while the credential is still perfectly valid. Ask the backend
// before throwing the user out. The in-flight guard collapses the burst of
// 401s that arrives when a session dies into one verification.
function confirmSessionExpired(): Promise<void> {
  if (sessionCheck) return sessionCheck;

  sessionCheck = (async () => {
    const token = getAuthToken();
    if (!token) {
      notifySessionExpired();
      return;
    }
    try {
      const res = await fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) notifySessionExpired();
    } catch {
      // Backend unreachable is not proof of an expired session — keep the
      // token so the next attempt can succeed once the backend is back.
    }
  })().finally(() => {
    sessionCheck = null;
  });

  return sessionCheck;
}

async function request<T>(path: string, options?: RequestInit, isReplay = false): Promise<T> {  const token = getAuthToken();

  if (!token && !AUTH_ENDPOINTS.test(path)) {
    // Sending this without a credential is guaranteed to come back as
    // 401 "No token provided". If a user is still cached, the renderer state
    // and storage have drifted apart, so re-read both instead.
    if (hasCachedUser()) scheduleSelfHealReload();
    // Deliberately neutral: the session listener redirects to the sign-in
    // screen, so the page-level toast does not need to explain the logout.
    throw new ApiError('Not signed in', 401, path);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401 && token && !AUTH_ENDPOINTS.test(path)) {
    if (!isReplay && getAuthToken() !== token) {
      // The token was replaced while this request was in flight, so the 401
      // describes a credential that is no longer in use. Replay it.
      return request<T>(path, options, true);
    }
    await confirmSessionExpired();
  }

  if (!res.ok) {
    throw new ApiError(
      await readErrorMessage(res, options?.method ?? 'GET', path),
      res.status,
      path
    );
  }

  if (options?.method && options.method !== 'GET') {
    window.dispatchEvent(
      new CustomEvent<DataChangedDetail>(DATA_CHANGED_EVENT, {
        detail: { method: options.method, path },
      })
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

const get  = <T>(path: string)                   => request<T>(path);
const post = <T>(path: string, body: unknown)    => request<T>(path, { method: 'POST',   body: JSON.stringify(body) });
const put  = <T>(path: string, body: unknown)    => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) });
const del  =    (path: string)                   => request<void>(path, { method: 'DELETE' });

// For the two endpoints that cannot go through request() because they need a
// non-JSON content type.
function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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

  customerPayments: {
    list:   (customerId: string) => get<CustomerPayment[]>(`/customer-payments/${customerId}`),
    create: (p: Omit<CustomerPayment, 'id'>) => post<CustomerPayment>('/customer-payments', p),
  },

  expenses: {
    list:   ()              => get<Expense[]>('/expenses'),
    mine:   ()              => get<{ expenses: Expense[]; canEditOwn: boolean }>('/expenses/mine'),
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
    unlockSmtp: (token: string) =>
      post<{ smtpUnlocked: boolean }>('/settings/smtp/unlock', { token }),
    lockSmtp: () => post<{ smtpUnlocked: boolean }>('/settings/smtp/lock', {}),
    testEmail: (to: string) => post<{ message: string }>('/settings/test-email', { to }),
    exportData: () => get<any>('/settings/export'),
    importData: (data: any) => post<any>('/settings/import', data),
    downloadDbBackup: async () => {
      const res = await fetch(`${BASE}/settings/db-backup`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'POST', '/settings/db-backup'));
      return res.blob();
    },
    restoreDb: async (file: Blob) => {
      const res = await fetch(`${BASE}/settings/db-restore`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'POST', '/settings/db-restore'));
      return res.json();
    },
  },

  auth: {
    login: (username: string, password: string) =>
      post<{ user: User; token: string }>('/auth/login', { username, password }),
    me: () => get<{ user: User }>('/auth/me'),
    registerAdmin: (data: { companyName: string; fullName: string; email: string; password: string; confirmPassword: string }) =>
      post<{ message: string; email: string }>('/auth/register-admin', data),
    verifyOtp: (email: string, code: string) =>
      post<{ message: string }>('/auth/verify-otp', { email, code }),
    completeRegistration: (data: { companyName: string; fullName: string; email: string; password: string }) =>
      post<{ user: User; token: string }>('/auth/complete-registration', data),
    resendOtp: (email: string) =>
      post<{ message: string }>('/auth/resend-otp', { email }),
    forgotPassword: (email: string) =>
      post<{ message: string }>('/auth/forgot-password', { email }),
    resetPassword: (data: { email: string; code: string; newPassword: string }) =>
      post<{ message: string }>('/auth/reset-password', data),
    changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      post<{ message: string }>('/auth/change-password', data),
  },

  staff: {
    list: () => get<{ users: User[] }>('/staff'),
    create: (data: { username: string; fullName: string; email: string; password: string }) =>
      post<{ user: User }>('/staff', data),
    remove: (id: string) => del(`/staff/${id}`),
  },
};
