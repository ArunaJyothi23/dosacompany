'use client';

import { LocationId } from '@/lib/locations';

export type AdminRole =
  | 'SUPER_ADMIN' |'CENTRAL_OPS' |'RESTAURANT_MANAGER' |'ORDER_MANAGER' |'KITCHEN_STAFF' |'DELIVERY_MANAGER' |'FINANCE';

export interface AdminSession {
  email: string;
  name: string;
  role: AdminRole;
  roleLabel: string;
  locationId: LocationId | 'all';
}

export interface AdminAccount extends AdminSession {
  password: string;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  CENTRAL_OPS: 'Central Operations Manager',
  RESTAURANT_MANAGER: 'Restaurant Manager',
  ORDER_MANAGER: 'Order Manager',
  KITCHEN_STAFF: 'Kitchen Staff',
  DELIVERY_MANAGER: 'Delivery Manager',
  FINANCE: 'Finance User',
};

// Initial accounts — change passwords after first sign-in. Move to a server-side auth provider for production.
export const ADMIN_ACCOUNTS: AdminAccount[] = [
  { email: 'admin@watanrestaurant.co.uk', password: 'WatanAdmin2026!', name: 'WATAN Super Admin', role: 'SUPER_ADMIN', roleLabel: ROLE_LABELS.SUPER_ADMIN, locationId: 'all' },
  { email: 'operations@watanrestaurant.co.uk', password: 'WatanOps2026!', name: 'Central Operations', role: 'CENTRAL_OPS', roleLabel: ROLE_LABELS.CENTRAL_OPS, locationId: 'all' },
  { email: 'southall@watanrestaurant.co.uk', password: 'Southall2026!', name: 'Watan Southall Admin', role: 'RESTAURANT_MANAGER', roleLabel: ROLE_LABELS.RESTAURANT_MANAGER, locationId: 'southall' },
  { email: 'ilford@watanrestaurant.co.uk', password: 'Ilford2026!', name: 'Watan Ilford Admin', role: 'RESTAURANT_MANAGER', roleLabel: ROLE_LABELS.RESTAURANT_MANAGER, locationId: 'ilford' },
  { email: 'tooting@watanrestaurant.co.uk', password: 'Tooting2026!', name: 'Watan Tooting Admin', role: 'RESTAURANT_MANAGER', roleLabel: ROLE_LABELS.RESTAURANT_MANAGER, locationId: 'tooting' },
  { email: 'woodgreen@watanrestaurant.co.uk', password: 'WoodGreen2026!', name: 'Watan Wood Green Admin', role: 'RESTAURANT_MANAGER', roleLabel: ROLE_LABELS.RESTAURANT_MANAGER, locationId: 'wood-green' },
  { email: 'kitchen.southall@watanrestaurant.co.uk', password: 'Kitchen2026!', name: 'Southall Kitchen', role: 'KITCHEN_STAFF', roleLabel: ROLE_LABELS.KITCHEN_STAFF, locationId: 'southall' },
  { email: 'finance@watanrestaurant.co.uk', password: 'Finance2026!', name: 'WATAN Finance', role: 'FINANCE', roleLabel: ROLE_LABELS.FINANCE, locationId: 'all' },
];

const SESSION_KEY = 'watan_admin_session_v1';
const SCOPE_KEY = 'watan_admin_scope_v1';

export function signIn(email: string, password: string): AdminSession | null {
  const acc = ADMIN_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
  );
  if (!acc) return null;
  const { password: _pw, ...session } = acc;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.localStorage.setItem(SCOPE_KEY, session.locationId);
  return session;
}

export function signOut(): void {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SCOPE_KEY);
}

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

// Location the admin is currently viewing. Restaurant-level users are locked to their own location.
export function getActiveScope(session: AdminSession | null): LocationId | 'all' {
  if (!session) return 'all';
  if (session.locationId !== 'all') return session.locationId;
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SCOPE_KEY) : null;
  return (stored as LocationId | 'all' | null) ?? 'all';
}

export function setActiveScope(session: AdminSession, scope: LocationId | 'all'): void {
  if (session.locationId !== 'all') return;
  window.localStorage.setItem(SCOPE_KEY, scope);
  window.dispatchEvent(new Event('watan-scope-updated'));
}
