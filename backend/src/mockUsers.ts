// Demo accounts available only when NODE_ENV is not 'production'. They exist so
// a fresh checkout is usable without registering, and are kept here (rather than
// in the auth route) so the token middleware can rehydrate them after a restart.
export interface MockUser {
  id: string;
  username: string;
  role: 'superadmin' | 'admin' | 'staff';
  name: string;
  email: string;
}

export const mockUsers: MockUser[] = [
  { id: '1', username: 'superadmin', role: 'superadmin', name: 'Super Admin', email: 'super@printpress.com' },
  { id: '2', username: 'admin', role: 'admin', name: 'Admin User', email: 'admin@printpress.com' },
  { id: '3', username: 'staff', role: 'staff', name: 'Staff User', email: 'staff@printpress.com' },
];

export const mockUserPassword = 'admin123';

export function findMockUserById(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}