'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Printer, Volume2, VolumeX, Check, X as XIcon, ShoppingBag, Truck } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { getSession, getActiveScope } from '@/lib/adminAuth';
import { getLocation, LocationId } from '@/lib/locations';
import {
  getOrdersForLocation,
  subscribeOrders,
  updateOrder,
  StoredOrder,
  OrderStatus,
  nextStatusFor,
  nextStatusLabel,
} from '@/lib/orderStore';
import { formatPrice } from '@/lib/menuData';

const COLUMNS: { id: OrderStatus; label: string }[] = [
  { id: 'placed', label: 'New orders' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function notifyCustomer(order: StoredOrder, status: OrderStatus) {
  const msg: Partial<Record<OrderStatus, string>> = {
    accepted: 'Your order has been accepted by the restaurant.',
    preparing: 'Your order is now being prepared.',
    ready: order.type === 'delivery' ? 'Your order is ready and waiting for a driver.' : 'Your order is ready for collection.',
    out_for_delivery: 'Your order is out for delivery.',
    completed: order.type === 'delivery' ? 'Your order has been delivered. Enjoy!' : 'Your order has been collected. Enjoy!',
    cancelled: 'Unfortunately your order was cancelled. Any payment will be refunded.',
  };
  const m = msg[status];
  if (!m) return;
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: order.customer.email,
      subject: `WATAN order ${order.orderNumber} update`,
      orderNumber: order.orderNumber,
      restaurant: getLocation(order.locationId)?.name ?? 'WATAN',
      type: order.type,
      slot: order.slot,
      statusMessage: m,
      totalPence: order.totalPence,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    }),
  }).catch(() => undefined);
}

export function printTicket(o: StoredOrder) {
  const w = window.open('', '_blank', 'width=380,height=600');
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  const items = o.items
    .map((i) => `<div style="margin:6px 0"><b>${i.quantity}× ${esc(i.name)}</b>${i.modifiers.length ? `<div>${esc(i.modifiers.map((m) => m.optionLabel).join(', '))}</div>` : ''}${i.specialInstructions ? `<div><i>${esc(i.specialInstructions)}</i></div>` : ''}</div>`)
    .join('');
  w.document.write(`<html><body style="font-family:monospace;font-size:14px;padding:12px"><h2>WATAN ${esc(getLocation(o.locationId)?.shortName ?? '')}</h2><div>${esc(o.orderNumber)}</div><div><b>${o.type.toUpperCase()}</b> · ${esc(o.slot)}</div><hr/>${items}<hr/><div>${esc(o.customer.name)} · ${esc(o.customer.phone)}</div>${o.address ? `<div>${esc(o.address.line1)}, ${esc(o.address.postcode)}</div>` : ''}${o.customer.note ? `<div><b>Note:</b> ${esc(o.customer.note)}</div>` : ''}<script>window.print()</script></body></html>`);
  w.document.close();
}

export default function LiveOrderManagementClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'collection' | 'delivery'>('all');
  const [sound, setSound] = useState(true);
  const knownNew = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const soundRef = useRef(sound);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    const refresh = () => {
      const s = getActiveScope(getSession());
      setScope(s);
      const list = getOrdersForLocation(s).filter((o) => o.paymentStatus !== 'pending' && o.paymentStatus !== 'failed');
      setOrders(list);
      const fresh = list.filter((o) => o.status === 'placed');
      const hasNew = fresh.some((o) => !knownNew.current.has(o.id));
      fresh.forEach((o) => knownNew.current.add(o.id));
      if (hasNew && !first.current && soundRef.current) beep();
      first.current = false;
    };
    refresh();
    const unsub = subscribeOrders(refresh);
    window.addEventListener('watan-scope-updated', refresh);
    return () => {
      unsub();
      window.removeEventListener('watan-scope-updated', refresh);
    };
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const q = search.toLowerCase();
        const m = !q || o.orderNumber.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.phone.includes(q);
        return m && (typeFilter === 'all' || o.type === typeFilter);
      }),
    [orders, search, typeFilter]
  );

  const advance = (o: StoredOrder) => {
    const next = nextStatusFor(o);
    if (!next) return;
    const updated = updateOrder(o.id, { status: next });
    if (updated) notifyCustomer(updated, next);
  };
  const reject = (o: StoredOrder) => {
    const updated = updateOrder(o.id, { status: 'cancelled' });
    if (updated) notifyCustomer(updated, 'cancelled');
  };

  const visibleCols = COLUMNS.filter((c) => (c.id === 'out_for_delivery' ? typeFilter !== 'collection' : true));

  return (
    <AdminLayout activePage="orders">
      <div className="p-6 xl:p-8 max-w-screen-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-admin-foreground">Live orders</h1>
            <p className="text-admin-muted text-sm mt-0.5">{filtered.length} orders · {scope === 'all' ? 'All restaurants' : getLocation(scope)?.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, name, phone" className="pl-9 pr-3 py-2 text-sm rounded-xl border bg-admin-card text-admin-foreground focus:outline-none focus:border-primary" style={{ borderColor: 'var(--admin-border)' }} />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'collection' | 'delivery')} className="text-sm bg-admin-card border border-admin-border text-admin-foreground rounded-xl px-3 py-2">
              <option value="all">All types</option>
              <option value="collection">Collection</option>
              <option value="delivery">Delivery</option>
            </select>
            <button onClick={() => setSound((v) => !v)} className="w-9 h-9 rounded-xl border flex items-center justify-center text-admin-foreground bg-admin-card" style={{ borderColor: 'var(--admin-border)' }} aria-label="Toggle order sound">
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleCols.map((col) => {
            const colOrders = filtered.filter((o) => o.status === col.id);
            return (
              <div key={col.id} className="w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-sm font-bold text-admin-foreground">{col.label}</h2>
                  <span className="text-xs font-bold bg-white/5 text-admin-muted rounded-full px-2 py-0.5">{colOrders.length}</span>
                </div>
                <div className="space-y-3">
                  {colOrders.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-5 text-center text-xs text-admin-muted" style={{ borderColor: 'var(--admin-border)' }}>No orders</div>
                  )}
                  {colOrders.map((o) => (
                    <OrderCard key={o.id} o={o} showLocation={scope === 'all'} onAdvance={() => advance(o)} onReject={() => reject(o)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* audio blocked */
  }
}

function OrderCard({ o, showLocation, onAdvance, onReject }: { o: StoredOrder; showLocation: boolean; onAdvance: () => void; onReject: () => void }) {
  const next = nextStatusFor(o);
  return (
    <div className="admin-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-admin-foreground font-mono-nums">{o.orderNumber.split('-').slice(-1)[0]}</p>
          <p className="text-xs text-admin-muted">{o.customer.name}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${o.type === 'delivery' ? 'bg-blue-500/15 text-blue-400' : 'bg-primary/15 text-primary'}`}>
          {o.type === 'delivery' ? <Truck size={11} /> : <ShoppingBag size={11} />}
          {o.type === 'delivery' ? 'Delivery' : 'Collection'}
        </span>
      </div>
      {showLocation && <p className="text-xs text-primary font-semibold capitalize mb-1">{o.locationId.replace('-', ' ')}</p>}
      <p className="text-xs text-admin-muted mb-2">For {o.slot} · {o.paymentStatus === 'paid' ? 'Paid' : o.paymentStatus.replace('_', ' ')}</p>
      <ul className="text-xs text-admin-foreground space-y-1 mb-3">
        {o.items.map((i) => (
          <li key={i.cartItemId}>
            <b>{i.quantity}×</b> {i.name}
            {i.modifiers.length > 0 && <span className="text-admin-muted"> ({i.modifiers.map((m) => m.optionLabel).join(', ')})</span>}
            {i.specialInstructions && <div className="text-amber-400 italic">“{i.specialInstructions}”</div>}
          </li>
        ))}
      </ul>
      {o.customer.note && <p className="text-xs text-amber-400 mb-3">Note: {o.customer.note}</p>}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-admin-foreground font-mono-nums">{formatPrice(o.totalPence)}</span>
        <button onClick={() => printTicket(o)} className="text-admin-muted hover:text-admin-foreground" aria-label="Print kitchen ticket"><Printer size={15} /></button>
      </div>
      {next && (
        <div className="flex gap-2">
          {o.status === 'placed' && (
            <button onClick={onReject} className="w-10 h-9 rounded-xl border flex items-center justify-center text-red-400 hover:bg-red-500/10" style={{ borderColor: 'var(--admin-border)' }} aria-label="Reject order">
              <XIcon size={15} />
            </button>
          )}
          <button onClick={onAdvance} className="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90">
            <Check size={14} /> {nextStatusLabel(o)}
          </button>
        </div>
      )}
    </div>
  );
}
