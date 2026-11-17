'use client';

import React, { useEffect, useState } from 'react';
import { Truck, Plus, Trash2, Phone, MapPin } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { getSession, getActiveScope, AdminSession } from '@/lib/adminAuth';
import { getLocation, LOCATIONS, LocationId } from '@/lib/locations';
import { Driver, getDrivers, getOrdersForLocation, saveDrivers, subscribeOrders, updateOrder, StoredOrder } from '@/lib/orderStore';
import { formatPrice } from '@/lib/menuData';

export default function AdminDeliveryPage() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tab, setTab] = useState<'active' | 'history' | 'drivers'>('active');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [driverLoc, setDriverLoc] = useState<LocationId>('southall');

  useEffect(() => {
    const refresh = () => {
      const s = getSession();
      setSession(s);
      const sc = getActiveScope(s);
      setScope(sc);
      if (sc !== 'all') setDriverLoc(sc);
      setOrders(getOrdersForLocation(sc).filter((o) => o.type === 'delivery' && o.paymentStatus !== 'pending' && o.paymentStatus !== 'failed'));
      setDrivers(getDrivers(sc));
    };
    refresh();
    const unsub = subscribeOrders(refresh);
    window.addEventListener('watan-scope-updated', refresh);
    return () => {
      unsub();
      window.removeEventListener('watan-scope-updated', refresh);
    };
  }, []);

  const addDriver = () => {
    if (!name.trim() || !phone.trim()) return;
    const all = getDrivers('all');
    saveDrivers([...all, { id: `drv-${Date.now()}`, name: name.trim(), phone: phone.trim(), locationId: scope === 'all' ? driverLoc : scope, active: true }]);
    setName('');
    setPhone('');
  };
  const removeDriver = (id: string) => saveDrivers(getDrivers('all').filter((d) => d.id !== id));

  const active = orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
  const history = orders.filter((o) => ['completed', 'cancelled'].includes(o.status));

  const assign = (o: StoredOrder, driverId: string) => {
    if (!driverId) return;
    updateOrder(o.id, { driverId, status: 'out_for_delivery' });
  };

  const driverName = (id?: string) => getDrivers('all').find((d) => d.id === id)?.name ?? '—';

  return (
    <AdminLayout activePage="delivery">
      <div className="p-6 xl:p-8 max-w-screen-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-admin-foreground flex items-center gap-2"><Truck size={22} className="text-primary" /> Delivery</h1>
          <p className="text-admin-muted text-sm mt-0.5">{scope === 'all' ? 'All restaurants' : getLocation(scope)?.name}</p>
        </div>

        <div className="flex gap-2 mb-5">
          {(['active', 'history', 'drivers'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${tab === t ? 'bg-primary text-white' : 'bg-admin-card text-admin-muted border border-admin-border'}`}>
              {t === 'active' ? `Active (${active.length})` : t === 'history' ? `History (${history.length})` : `Drivers (${drivers.length})`}
            </button>
          ))}
        </div>

        {tab === 'drivers' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="admin-card rounded-2xl p-5 h-fit">
              <h2 className="font-bold text-admin-foreground mb-4">Add driver</h2>
              <div className="space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Driver name" className="w-full px-3 py-2.5 rounded-xl border text-sm bg-admin-bg text-admin-foreground" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full px-3 py-2.5 rounded-xl border text-sm text-admin-foreground" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }} />
                {scope === 'all' && (
                  <select value={driverLoc} onChange={(e) => setDriverLoc(e.target.value as LocationId)} className="w-full px-3 py-2.5 rounded-xl border text-sm text-admin-foreground" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
                    {LOCATIONS.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                )}
                <button onClick={addDriver} className="w-full h-10 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2"><Plus size={15} /> Add driver</button>
              </div>
            </div>
            <div className="lg:col-span-2 admin-card rounded-2xl p-5">
              <h2 className="font-bold text-admin-foreground mb-4">Drivers</h2>
              {drivers.length === 0 ? (
                <p className="text-admin-muted text-sm py-8 text-center">No drivers added yet.</p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                  {drivers.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold text-admin-foreground">{d.name}</p>
                        <p className="text-xs text-admin-muted flex items-center gap-1"><Phone size={11} /> {d.phone} · {getLocation(d.locationId)?.shortName}</p>
                      </div>
                      <button onClick={() => removeDriver(d.id)} className="text-admin-muted hover:text-red-400" aria-label="Remove driver"><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(tab === 'active' ? active : history).length === 0 && (
              <div className="admin-card rounded-2xl p-12 text-center text-admin-muted text-sm">No {tab === 'active' ? 'active' : 'past'} delivery orders.</div>
            )}
            {(tab === 'active' ? active : history).map((o) => {
              const locDrivers = getDrivers(o.locationId).filter((d) => d.active);
              return (
                <div key={o.id} className="admin-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
                  <div className="min-w-[160px]">
                    <p className="font-bold text-admin-foreground font-mono-nums text-sm">{o.orderNumber}</p>
                    <p className="text-xs text-admin-muted">{o.customer.name} · {o.customer.phone}</p>
                  </div>
                  <div className="flex-1 min-w-[200px] text-xs text-admin-muted flex items-start gap-1.5">
                    <MapPin size={12} className="mt-0.5 text-primary flex-shrink-0" />
                    <span>{o.address?.line1}, {o.address?.city} {o.address?.postcode}</span>
                  </div>
                  <div className="text-xs text-admin-muted">For {o.slot}</div>
                  <div className="text-sm font-bold text-admin-foreground font-mono-nums">{formatPrice(o.totalPence)}</div>
                  <span className="text-xs font-bold capitalize px-2 py-1 rounded-full bg-white/5 text-admin-foreground">{o.status.replace(/_/g, ' ')}</span>
                  {tab === 'active' && o.status === 'ready' && (
                    <select defaultValue="" onChange={(e) => assign(o, e.target.value)} className="text-xs rounded-xl px-3 py-2 border text-admin-foreground" style={{ borderColor: 'var(--admin-border)', background: 'var(--admin-bg)' }}>
                      <option value="">Assign driver…</option>
                      {locDrivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  )}
                  {tab === 'active' && o.status === 'out_for_delivery' && (
                    <>
                      <span className="text-xs text-admin-muted">Driver: {driverName(o.driverId)}</span>
                      <button onClick={() => updateOrder(o.id, { status: 'completed' })} className="px-3 h-8 rounded-xl bg-secondary text-white text-xs font-bold">Mark delivered</button>
                      <button onClick={() => updateOrder(o.id, { status: 'cancelled' })} className="px-3 h-8 rounded-xl border text-xs font-bold text-red-400" style={{ borderColor: 'var(--admin-border)' }}>Failed</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
