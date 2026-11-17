'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AdminLayout from '@/components/AdminLayout';
import { getSession, getActiveScope } from '@/lib/adminAuth';
import { LOCATIONS, LocationId } from '@/lib/locations';
import { getOrdersForLocation, StoredOrder, subscribeOrders } from '@/lib/orderStore';
import { formatPrice } from '@/lib/menuData';
import { Download } from 'lucide-react';

type Range = 'today' | '7d' | '30d' | 'all';
type TypeFilter = 'all' | 'collection' | 'delivery';

function inRange(o: StoredOrder, range: Range): boolean {
  if (range === 'all') return true;
  const t = new Date(o.createdAt).getTime();
  const now = Date.now();
  if (range === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  const days = range === '7d' ? 7 : 30;
  return t >= now - days * 86400000;
}

export default function AdminDashboardClient() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [range, setRange] = useState<Range>('today');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

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

  const filtered = useMemo(
    () => orders.filter((o) => inRange(o, range) && (typeFilter === 'all' || o.type === typeFilter)),
    [orders, range, typeFilter]
  );
  const paid = filtered.filter((o) => o.paymentStatus === 'paid' || o.paymentStatus === 'partially_refunded' || o.paymentStatus === 'refunded');
  const revenue = paid.reduce((s, o) => s + o.totalPence - o.refundedPence, 0);
  const collectionSales = paid.filter((o) => o.type === 'collection').reduce((s, o) => s + o.totalPence - o.refundedPence, 0);
  const deliverySales = paid.filter((o) => o.type === 'delivery').reduce((s, o) => s + o.totalPence - o.refundedPence, 0);
  const refunds = filtered.reduce((s, o) => s + o.refundedPence, 0);
  const cancelled = filtered.filter((o) => o.status === 'cancelled').length;
  const active = filtered.filter((o) => !['completed', 'cancelled'].includes(o.status) && o.paymentStatus === 'paid').length;
  const aov = paid.length ? Math.round(revenue / paid.length) : 0;

  const byLocation = LOCATIONS.map((l) => {
    const ls = paid.filter((o) => o.locationId === l.id);
    return { name: l.shortName, sales: Math.round(ls.reduce((s, o) => s + o.totalPence - o.refundedPence, 0) / 100), orders: ls.length };
  }).filter((d) => scope === 'all' || LOCATIONS.find((l) => l.id === scope)?.shortName === d.name);

  const topItems = useMemo(() => {
    const map = new Map<string, { qty: number; rev: number }>();
    paid.forEach((o) =>
      o.items.forEach((i) => {
        const cur = map.get(i.name) ?? { qty: 0, rev: 0 };
        const unit = i.basePrice + i.modifiers.reduce((s, m) => s + m.extraPrice, 0);
        map.set(i.name, { qty: cur.qty + i.quantity, rev: cur.rev + unit * i.quantity });
      })
    );
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [paid]);

  const exportCsv = () => {
    const header = ['Order', 'Restaurant', 'Type', 'Status', 'Payment', 'Total (GBP)', 'Created'];
    const rows = filtered.map((o) => [o.orderNumber, o.locationId, o.type, o.status, o.paymentStatus, (o.totalPence / 100).toFixed(2), o.createdAt]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `watan-orders-${scope}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kpis = [
    { label: 'Total sales', value: formatPrice(revenue) },
    { label: 'Paid orders', value: String(paid.length) },
    { label: 'Collection sales', value: formatPrice(collectionSales) },
    { label: 'Delivery sales', value: formatPrice(deliverySales) },
    { label: 'Average order value', value: formatPrice(aov) },
    { label: 'Active orders', value: String(active) },
    { label: 'Refunds', value: formatPrice(refunds) },
    { label: 'Cancellations', value: String(cancelled) },
  ];

  return (
    <AdminLayout activePage="dashboard">
      <div className="p-6 xl:p-8 max-w-screen-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-admin-foreground">Dashboard</h1>
            <p className="text-admin-muted text-sm mt-0.5">
              {scope === 'all' ? 'All WATAN restaurants' : LOCATIONS.find((l) => l.id === scope)?.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={range} onChange={(e) => setRange(e.target.value as Range)} className="text-sm bg-admin-card border border-admin-border text-admin-foreground rounded-xl px-3 py-2">
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="text-sm bg-admin-card border border-admin-border text-admin-foreground rounded-xl px-3 py-2">
              <option value="all">Collection &amp; delivery</option>
              <option value="collection">Collection only</option>
              <option value="delivery">Delivery only</option>
            </select>
            <button onClick={exportCsv} className="flex items-center gap-2 text-sm bg-admin-card border border-admin-border text-admin-foreground rounded-xl px-3 py-2 hover:bg-admin-card-hover">
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((k) => (
            <div key={k.label} className="admin-card rounded-2xl p-4">
              <p className="text-xs font-semibold text-admin-muted uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-extrabold text-admin-foreground mt-2 font-mono-nums">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 admin-card rounded-2xl p-5">
            <h2 className="font-bold text-admin-foreground mb-4">Restaurant sales comparison (£)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byLocation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2A22" />
                  <XAxis dataKey="name" stroke="#8a8478" fontSize={12} />
                  <YAxis stroke="#8a8478" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1A1814', border: '1px solid #2E2A22', borderRadius: 12, color: '#F1F5F9' }} />
                  <Bar dataKey="sales" fill="#B8892B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-card rounded-2xl p-5">
            <h2 className="font-bold text-admin-foreground mb-4">Best-selling items</h2>
            {topItems.length === 0 ? (
              <p className="text-admin-muted text-sm py-8 text-center">No paid orders in this period yet.</p>
            ) : (
              <ul className="space-y-3">
                {topItems.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-sm text-admin-foreground truncate">{t.name}</span>
                    <span className="text-xs text-admin-muted font-mono-nums">{t.qty} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="admin-card rounded-2xl p-5 mt-6">
          <h2 className="font-bold text-admin-foreground mb-4">Recent orders</h2>
          {filtered.length === 0 ? (
            <p className="text-admin-muted text-sm py-8 text-center">No orders yet. Orders placed on the customer site will appear here instantly.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-admin-muted border-b" style={{ borderColor: 'var(--admin-border)' }}>
                    <th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Restaurant</th><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Payment</th><th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 10).map((o) => (
                    <tr key={o.id} className="border-b text-admin-foreground" style={{ borderColor: 'var(--admin-border)' }}>
                      <td className="py-2.5 pr-4 font-mono-nums">{o.orderNumber}</td>
                      <td className="py-2.5 pr-4 capitalize">{o.locationId.replace('-', ' ')}</td>
                      <td className="py-2.5 pr-4 capitalize">{o.type}</td>
                      <td className="py-2.5 pr-4 capitalize">{o.status.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 pr-4 capitalize">{o.paymentStatus.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 text-right font-mono-nums">{formatPrice(o.totalPence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}