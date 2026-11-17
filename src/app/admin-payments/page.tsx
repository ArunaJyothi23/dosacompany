'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { CreditCard, Search, Download, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { getSession, getActiveScope } from '@/lib/adminAuth';
import { getLocation, LocationId } from '@/lib/locations';
import { getOrdersForLocation, subscribeOrders, StoredOrder, PaymentStatus } from '@/lib/orderStore';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  paid: { label: 'Paid', color: '#10984B', bg: 'rgba(16,152,75,0.15)', icon: <CheckCircle size={13} /> },
  pending: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: <Clock size={13} /> },
  failed: { label: 'Failed', color: '#EF4444', bg: 'rgba(239,68,68,0.15)', icon: <XCircle size={13} /> },
  refunded: { label: 'Refunded', color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', icon: <RefreshCw size={13} /> },
  partially_refunded: { label: 'Part. refunded', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', icon: <RefreshCw size={13} /> },
};

const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
const PAGE = 10;

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [page, setPage] = useState(0);

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
    () =>
      orders.filter((o) => {
        const q = search.toLowerCase();
        const m = !q || o.orderNumber.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q) || o.customer.email.toLowerCase().includes(q);
        return m && (statusFilter === 'all' || o.paymentStatus === statusFilter);
      }),
    [orders, search, statusFilter]
  );

  useEffect(() => setPage(0), [search, statusFilter, scope]);

  const paidOrders = orders.filter((o) => ['paid', 'partially_refunded'].includes(o.paymentStatus));
  const revenue = paidOrders.reduce((s, o) => s + o.totalPence - o.refundedPence, 0);
  const refunded = orders.reduce((s, o) => s + o.refundedPence, 0);
  const failed = orders.filter((o) => o.paymentStatus === 'failed').length;
  const attempts = orders.length;
  const success = attempts ? Math.round((orders.filter((o) => o.paymentStatus !== 'pending' && o.paymentStatus !== 'failed').length / attempts) * 100) : 0;

  const exportCsv = () => {
    const rows = [['Order', 'Restaurant', 'Customer', 'Email', 'Total (GBP)', 'Refunded (GBP)', 'Payment status', 'Stripe session', 'Date']].concat(
      filtered.map((o) => [o.orderNumber, o.locationId, o.customer.name, o.customer.email, (o.totalPence / 100).toFixed(2), (o.refundedPence / 100).toFixed(2), o.paymentStatus, o.stripeSessionId ?? '', o.createdAt])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `watan-payments-${scope}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));

  return (
    <AdminLayout activePage="payments">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(184,137,43,0.15)' }}>
              <CreditCard size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-admin-foreground">Payments</h1>
              <p className="text-xs text-admin-muted mt-0.5">{scope === 'all' ? 'All restaurants' : getLocation(scope)?.name} · {orders.length} transactions</p>
            </div>
          </div>
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border text-admin-muted hover:text-admin-foreground" style={{ borderColor: 'var(--admin-border)' }}>
            <Download size={15} /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Net revenue', value: fmt(revenue) },
            { label: 'Refunded', value: fmt(refunded) },
            { label: 'Success rate', value: `${success}%` },
            { label: 'Failed payments', value: String(failed) },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl p-4 border" style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
              <p className="text-xs font-semibold text-admin-muted">{k.label}</p>
              <p className="text-2xl font-extrabold text-admin-foreground mt-2">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer, email..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-semibold text-admin-foreground border outline-none focus:border-primary" style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-2 rounded-xl text-xs font-bold capitalize" style={{ background: statusFilter === s ? 'var(--primary)' : 'var(--admin-card)', color: statusFilter === s ? '#fff' : 'var(--admin-muted)', border: `1px solid ${statusFilter === s ? 'var(--primary)' : 'var(--admin-border)'}` }}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-admin-muted text-sm">No transactions yet. Payments appear here once customers check out.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--admin-border)' }}>
                    {['Order', ...(scope === 'all' ? ['Restaurant'] : []), 'Customer', 'Total', 'Refunded', 'Status', 'Stripe ref', 'Date'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-admin-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((o) => {
                    const sc = STATUS_CONFIG[o.paymentStatus];
                    return (
                      <tr key={o.id} className="border-b text-sm text-admin-foreground" style={{ borderColor: 'var(--admin-border)' }}>
                        <td className="px-4 py-3 font-mono-nums whitespace-nowrap">{o.orderNumber}</td>
                        {scope === 'all' && <td className="px-4 py-3 capitalize whitespace-nowrap">{o.locationId.replace('-', ' ')}</td>}
                        <td className="px-4 py-3"><div>{o.customer.name}</div><div className="text-xs text-admin-muted">{o.customer.email}</div></td>
                        <td className="px-4 py-3 font-mono-nums">{fmt(o.totalPence)}</td>
                        <td className="px-4 py-3 font-mono-nums text-admin-muted">{o.refundedPence ? fmt(o.refundedPence) : '—'}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{sc.icon}{sc.label}</span></td>
                        <td className="px-4 py-3 text-xs text-admin-muted font-mono-nums">{o.stripeSessionId ? `${o.stripeSessionId.slice(0, 14)}…` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-admin-muted whitespace-nowrap">{new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > PAGE && (
            <div className="flex items-center justify-between px-4 py-3 text-xs text-admin-muted">
              <span>Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--admin-border)' }}>Previous</button>
                <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: 'var(--admin-border)' }}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
