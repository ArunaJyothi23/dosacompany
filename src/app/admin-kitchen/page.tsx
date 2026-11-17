'use client';

import React, { useEffect, useState } from 'react';
import { ChefHat, Printer, Clock } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { getSession, getActiveScope } from '@/lib/adminAuth';
import { getLocation, LocationId } from '@/lib/locations';
import { getOrdersForLocation, subscribeOrders, updateOrder, StoredOrder } from '@/lib/orderStore';
import { printTicket } from '@/app/live-order-management/components/LiveOrderManagementClient';

export default function AdminKitchenPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    const refresh = () => {
      const s = getActiveScope(getSession());
      setScope(s);
      setOrders(
        getOrdersForLocation(s).filter((o) => o.paymentStatus === 'paid' && ['accepted', 'preparing'].includes(o.status))
      );
    };
    refresh();
    const unsub = subscribeOrders(refresh);
    window.addEventListener('watan-scope-updated', refresh);
    return () => {
      clearInterval(t);
      unsub();
      window.removeEventListener('watan-scope-updated', refresh);
    };
  }, []);

  const mins = (o: StoredOrder) => (now ? Math.max(0, Math.round((now - new Date(o.createdAt).getTime()) / 60000)) : 0);

  return (
    <AdminLayout activePage="kitchen">
      <div className="p-6 xl:p-8 max-w-screen-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-admin-foreground flex items-center gap-2"><ChefHat size={22} className="text-primary" /> Kitchen</h1>
          <p className="text-admin-muted text-sm mt-0.5">{scope === 'all' ? 'All restaurants' : getLocation(scope)?.name} · {orders.length} tickets in progress</p>
        </div>

        {orders.length === 0 ? (
          <div className="admin-card rounded-2xl p-12 text-center">
            <ChefHat size={36} className="mx-auto text-admin-muted mb-3" />
            <p className="text-admin-foreground font-semibold">No tickets in the kitchen</p>
            <p className="text-admin-muted text-sm mt-1">Accepted orders appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map((o) => (
              <div key={o.id} className="admin-card rounded-2xl p-5" style={{ borderColor: o.status === 'preparing' ? 'rgba(245,158,11,0.5)' : 'rgba(59,130,246,0.5)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-admin-foreground font-mono-nums">{o.orderNumber.split('-').slice(-1)[0]}</p>
                    <p className="text-xs text-admin-muted">{o.type === 'delivery' ? 'Delivery' : 'Collection'} · {o.slot}{scope === 'all' ? ` · ${getLocation(o.locationId)?.shortName}` : ''}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-admin-muted"><Clock size={12} /> {mins(o)}m</span>
                </div>
                <ul className="space-y-1.5 mb-3">
                  {o.items.map((i) => (
                    <li key={i.cartItemId} className="text-sm text-admin-foreground">
                      <b>{i.quantity}×</b> {i.name}
                      {i.modifiers.length > 0 && <span className="text-admin-muted"> ({i.modifiers.map((m) => m.optionLabel).join(', ')})</span>}
                      {i.specialInstructions && <div className="text-xs text-amber-400 italic">“{i.specialInstructions}”</div>}
                    </li>
                  ))}
                </ul>
                {o.customer.note && <p className="text-xs rounded-lg bg-amber-500/10 text-amber-400 px-3 py-2 mb-3">⚠ {o.customer.note}</p>}
                <div className="flex gap-2">
                  <button onClick={() => printTicket(o)} className="w-10 h-9 rounded-xl border flex items-center justify-center text-admin-muted hover:text-admin-foreground" style={{ borderColor: 'var(--admin-border)' }} aria-label="Print ticket">
                    <Printer size={15} />
                  </button>
                  {o.status === 'accepted' ? (
                    <button onClick={() => updateOrder(o.id, { status: 'preparing' })} className="flex-1 h-9 rounded-xl bg-blue-500 text-white text-xs font-bold">Start preparing</button>
                  ) : (
                    <button onClick={() => updateOrder(o.id, { status: 'ready' })} className="flex-1 h-9 rounded-xl bg-secondary text-white text-xs font-bold">
                      {o.type === 'delivery' ? 'Ready for dispatch' : 'Ready for collection'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
