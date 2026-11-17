// Basket persistence (one restaurant per basket). Prices are re-validated server-side at checkout.

import type { LocationId } from '@/lib/locations';

export interface CartModifier {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  extraPrice: number; // pence
}

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePrice: number; // pence
  quantity: number;
  modifiers: CartModifier[];
  specialInstructions: string;
  image: string;
}

export function getItemTotal(item: CartItem): number {
  const modifierTotal = item.modifiers.reduce((sum, m) => sum + m.extraPrice, 0);
  return (item.basePrice + modifierTotal) * item.quantity;
}

export function getCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + getItemTotal(item), 0);
}

// Prices are VAT-inclusive. The VAT rate is configurable by the business (default 20%).
export function getCartVAT(subtotal: number, vatRate = 0.2): number {
  return Math.round((subtotal * vatRate) / (1 + vatRate));
}

export function getCartTotal(items: CartItem[]): number {
  return getCartSubtotal(items);
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export { formatPrice };

// ── Persistence ──
const CART_KEY = 'watan_cart_v1';
const LOC_KEY = 'watan_location_v1';

export function loadCart(locationId: LocationId): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { locationId: LocationId; items: CartItem[] };
    return parsed.locationId === locationId ? parsed.items : [];
  } catch {
    return [];
  }
}

export function saveCart(locationId: LocationId, items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify({ locationId, items }));
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CART_KEY);
}

export function getSelectedLocationId(): LocationId | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LOC_KEY) as LocationId | null;
}

export function setSelectedLocationId(id: LocationId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOC_KEY, id);
}