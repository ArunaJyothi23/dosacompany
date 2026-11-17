'use client';

import { CartItem } from '@/lib/cartStore';
import { LocationId, ORDER_PREFIX } from '@/lib/locations';

export type FulfilmentType = 'collection' | 'delivery';

export type OrderStatus =
  | 'placed' |'accepted' |'preparing' |'ready' |'out_for_delivery' |'completed' |'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  locationId: LocationId;
  active: boolean;
}

export interface StoredOrder {
  id: string;
  orderNumber: string;
  locationId: LocationId;
  type: FulfilmentType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  items: CartItem[];
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  vatPence: number;
  totalPence: number;
  refundedPence: number;
  promoCode?: string;
  customer: { name: string; email: string; phone: string; note: string };
  address?: { line1: string; city: string; postcode: string };
  slot: string;
  driverId?: string;
  createdAt: string;
  updatedAt: string;
  history: { status: OrderStatus; at: string }[];
}

const ORDERS_KEY = 'watan_orders_v1';
const DRIVERS_KEY = 'watan_drivers_v1';
const EVENT = 'watan-orders-updated';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

export function getAllOrders(): StoredOrder[] {
  return read<StoredOrder[]>(ORDERS_KEY, []);
}

export function getOrdersForLocation(locationId: LocationId | 'all'): StoredOrder[] {
  const all = getAllOrders();
  return locationId === 'all' ? all : all.filter((o) => o.locationId === locationId);
}

export function getOrderById(id: string): StoredOrder | undefined {
  return getAllOrders().find((o) => o.id === id);
}

export function nextOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = String(getAllOrders().length + 1).padStart(5, '0');
  return `${ORDER_PREFIX}-${ymd}-${seq}`;
}

export function saveOrder(order: StoredOrder): void {
  const all = getAllOrders();
  const idx = all.findIndex((o) => o.id === order.id);
  if (idx >= 0) all[idx] = order;
  else all.unshift(order);
  write(ORDERS_KEY, all);
}

export function updateOrder(id: string, patch: Partial<StoredOrder>): StoredOrder | undefined {
  const all = getAllOrders();
  const idx = all.findIndex((o) => o.id === id);
  if (idx < 0) return undefined;
  const now = new Date().toISOString();
  const next: StoredOrder = { ...all[idx], ...patch, updatedAt: now };
  if (patch.status && patch.status !== all[idx].status) {
    next.history = [...all[idx].history, { status: patch.status, at: now }];
  }
  all[idx] = next;
  write(ORDERS_KEY, all);
  return next;
}

export function subscribeOrders(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function getDrivers(locationId: LocationId | 'all'): Driver[] {
  const all = read<Driver[]>(DRIVERS_KEY, []);
  return locationId === 'all' ? all : all.filter((d) => d.locationId === locationId);
}

export function saveDrivers(drivers: Driver[]): void {
  write(DRIVERS_KEY, drivers);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function nextStatusFor(order: StoredOrder): OrderStatus | null {
  switch (order.status) {
    case 'placed':
      return 'accepted';
    case 'accepted':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return order.type === 'delivery' ? 'out_for_delivery' : 'completed';
    case 'out_for_delivery':
      return 'completed';
    default:
      return null;
  }
}

export function nextStatusLabel(order: StoredOrder): string {
  const n = nextStatusFor(order);
  if (!n) return '';
  if (n === 'accepted') return 'Accept order';
  if (n === 'preparing') return 'Start preparing';
  if (n === 'ready') return order.type === 'delivery' ? 'Ready for dispatch' : 'Ready for collection';
  if (n === 'out_for_delivery') return 'Out for delivery';
  return order.type === 'delivery' ? 'Mark delivered' : 'Mark collected';
}
