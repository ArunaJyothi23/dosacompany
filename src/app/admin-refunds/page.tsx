'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { RotateCcw, Search, AlertTriangle, XCircle } from 'lucide-react';
import { getSession, getActiveScope } from '@/lib/adminAuth';
import { getLocation, LocationId } from '@/lib/locations';
import { getOrdersForLocation, subscribeOrders, updateOrder, StoredOrder } from '@/lib/orderStore';
import { toast } from 'sonner';

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
const REASONS = ['Customer request', 'Item unavailable after order', 'Duplicate payment', 'Quality issue', 'Order cancelled by restaurant', 'Other'];

function RefundModal({ order, onClose }: { order: StoredOrder; onClose: () => void }) {
  const remaining = order.totalPence - order.refundedPence;
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const inKitchen = ['accepted', 'preparing', 'ready', 'out_for_delivery'].includes(order.status);

  const submit = async () => {
    const pence = Math.round(parseFloat(amount) * 100);
    if (!pence || pence <= 0 || pence > remaining) {
      toast.error(`Enter an amount up to ${fmt(remaining)}`);
      return;
    }
    if (!reason) {
      toast.error('Choose a reason');
      return;
    }
    setBusy(true);
    let stripeOk = false;
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeSessionId: order.stripeSessionId, amountPence: pence, reason }),
      });
      const json = (await res.json()) as { message?: string };
      stripeOk = res.ok;
      if (!res.ok) toast.warning(json.message || 'Refund could not be sent to Stripe.');
    } catch {
      toast.warning('Could not reach Stripe. Refund recorded locally only.');
    }
    if (stripeOk) {
      const newRefunded = order.refundedPence + pence;
      updateOrder(order.id, {
        refundedPence: newRefunded,
        paymentStatus: newRefunded >= order.totalPence ? 'refunded' : 'partially_refunded',
      });
      toast.success(`Refunded ${fmt(pence)} via Stripe`);
      onClose();
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--admin-card)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--admin-border)' }}>
          <h2 className="font-extrabold text-admin-foreground">Refund {order.orderNumber}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-admin-muted hover:bg-white/5" aria-label="Close"><XCircle size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {inKitchen && (
            <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-admin-muted">This order is already with the kitchen. Make sure they stop preparing it before you refund.</p>
            </div>
          )}
          <p className="text-xs text-admin-muted">Paid {fmt(order.totalPence)} · already refunded {fmt(order.refundedPence)} · refundable {fmt(remaining)}</p>
          <div>
            <label className="block text-xs font-bold text-admin-muted mb-1.5 uppercase tracking-wide">Refund amount (£)</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-admin-foreground border outline-none focus:border-primary" style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)' }} />
          </div>
          <div>
            <label className="block text-xs font-bold text-admin-muted mb-1.5 uppercase tracking-wide">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-admin-foreground border outline-none" style={{ background: 'var(--admin-bg)', borderColor: 'var(--admin-border)' }}>
              <option value="">Select reason…</option>
              {REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-admin-muted hover:bg-white/5">Cancel</button>
          <button onClick={submit} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-60" style={{ background: 'var(--primary)' }}>
            <RotateCcw size={15} /> {busy ? 'Refunding…' : 'Confirm refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRefundsPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'refundable' | 'refunded'>('refundable');
  const [target, setTarget] = useState<StoredOrder | null>(null);

  useEffect(() => {
    const refresh = () => {
      const s = getActiveScope(getSession());
      setScope(s);
      setOrders(getOrdersForLocation(s));
    };
    refresh();
    const unsub = subscribeOrders(refresh);
    window.addEventListener('watan-scope-updated', refresh);
    return () => {
      unsub();
      window.removeEventListener('watan-scope-updated', refresh);
    };
  }, []);

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const m = !q || o.orderNumber.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q);
      const t = tab === 'refundable' ? o.paymentStatus === 'paid' || o.paymentStatus === 'partially_refunded' : o.refundedPence > 0;
      return m && t;
    });
  }, [orders, search, tab]);

  const totalRefunded = orders.reduce((s, o) => s + o.refundedPence, 0);

  return (
    <AdminLayout activePage="refunds">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <RotateCcw size={20} style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-admin-foreground">Refunds</h1>
            <p className="text-xs text-admin-muted mt-0.5">{scope === 'all' ? 'All restaurants' : getLocation(scope)?.name} · {fmt(totalRefunded)} returned</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order or customer…" className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold text-admin-foreground border outline-none focus:border-primary" style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }} />
          </div>
          {(['refundable', 'refunded'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-xl text-xs font-bold capitalize" style={{ background: tab === t ? 'var(--primary)' : 'var(--admin-card)', color: tab === t ? '#fff' : 'var(--admin-muted)', border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--admin-border)'}` }}>
              {t === 'refundable' ? 'Refundable orders' : 'Refund history'}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
          {list.length === 0 ? (
            <div className="py-16 text-center text-admin-muted text-sm">{tab === 'refundable' ? 'No paid orders to refund yet.' : 'No refunds have been issued.'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--admin-border)' }}>
                    {['Order', ...(scope === 'all' ? ['Restaurant'] : []), 'Customer', 'Paid', 'Refunded', 'Order status', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-admin-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((o) => (
                    <tr key={o.id} className="border-b text-sm text-admin-foreground" style={{ borderColor: 'var(--admin-border)' }}>
                      <td className="px-4 py-3 font-mono-nums whitespace-nowrap">{o.orderNumber}</td>
                      {scope === 'all' && <td className="px-4 py-3 capitalize">{o.locationId.replace('-', ' ')}</td>}
                      <td className="px-4 py-3">{o.customer.name}</td>
                      <td className="px-4 py-3 font-mono-nums">{fmt(o.totalPence)}</td>
                      <td className="px-4 py-3 font-mono-nums text-admin-muted">{o.refundedPence ? fmt(o.refundedPence) : '—'}</td>
                      <td className="px-4 py-3 capitalize text-xs">{o.status.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-right">
                        {o.totalPence - o.refundedPence > 0 && o.paymentStatus !== 'refunded' && (
                          <button onClick={() => setTarget(o)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--primary)' }}>Refund</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {target && <RefundModal order={target} onClose={() => setTarget(null)} />}
    </AdminLayout>
  );
}
