'use client';

import React, { useEffect, useState } from 'react';
import { Menu, Bell, MapPin, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { AdminSession, getActiveScope, setActiveScope } from '@/lib/adminAuth';
import { LOCATIONS, LocationId } from '@/lib/locations';
import { getOrdersForLocation, subscribeOrders } from '@/lib/orderStore';

interface Props {
  session: AdminSession;
  onToggleSidebar: () => void;
}

export default function AdminTopbar({ session, onToggleSidebar }: Props) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [scope, setScope] = useState<LocationId | 'all'>('all');
  const [newOrders, setNewOrders] = useState<{ id: string; orderNumber: string; at: string; loc: string }[]>([]);

  useEffect(() => {
    const refresh = () => {
      const s = getActiveScope(session);
      setScope(s);
      const fresh = getOrdersForLocation(s)
        .filter((o) => o.status === 'placed' && o.paymentStatus === 'paid')
        .slice(0, 6)
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          at: new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          loc: o.locationId,
        }));
      setNewOrders(fresh);
    };
    refresh();
    const unsub = subscribeOrders(refresh);
    window.addEventListener('watan-scope-updated', refresh);
    return () => {
      unsub();
      window.removeEventListener('watan-scope-updated', refresh);
    };
  }, [session]);

  const canSwitch = session.locationId === 'all';
  const scopeLabel = scope === 'all' ? 'All restaurants' : LOCATIONS.find((l) => l.id === scope)?.name;

  return (
    <header className="h-14 flex items-center justify-between px-4 xl:px-6 flex-shrink-0 border-b" style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}>
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="w-9 h-9 rounded-xl flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-white/5 transition-colors lg:hidden" aria-label="Toggle sidebar">
          <Menu size={18} />
        </button>

        <nav className="hidden sm:flex items-center gap-1.5 text-sm">
          <Link href="/admin-dashboard" className="text-admin-muted hover:text-admin-foreground transition-colors">WATAN</Link>
          <span className="text-admin-border">/</span>
          <span className="text-admin-foreground font-semibold">{session.roleLabel}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {canSwitch ? (
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
            <select
              value={scope}
              onChange={(e) => setActiveScope(session, e.target.value as LocationId | 'all')}
              className="appearance-none text-sm font-semibold bg-transparent border rounded-xl pl-8 pr-8 py-1.5 focus:outline-none focus:border-primary"
              style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-foreground)', background: 'var(--admin-bg)' }}
              aria-label="Select restaurant"
            >
              <option value="all">All restaurants</option>
              {LOCATIONS.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-muted pointer-events-none" />
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary">
            <MapPin size={12} /> {scopeLabel}
          </div>
        )}

        <div className="hidden sm:flex items-center gap-1.5 bg-secondary/10 text-secondary text-xs font-bold px-2.5 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse" />
          Live
        </div>

        <div className="relative">
          <button onClick={() => setShowNotifications((v) => !v)} className="w-9 h-9 rounded-xl flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-white/5 transition-colors relative" aria-label="Notifications">
            <Bell size={16} />
            {newOrders.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 admin-card rounded-2xl shadow-xl border z-50 overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                <h3 className="text-admin-foreground font-bold text-sm">New orders awaiting acceptance</h3>
              </div>
              {newOrders.length === 0 ? (
                <p className="px-4 py-6 text-center text-admin-muted text-xs">No new orders right now</p>
              ) : (
                newOrders.map((n) => (
                  <Link key={n.id} href="/live-order-management" onClick={() => setShowNotifications(false)} className="block px-4 py-3 border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--admin-border)' }}>
                    <p className="text-admin-foreground text-xs font-medium">New order {n.orderNumber}</p>
                    <p className="text-xs text-admin-muted mt-0.5 capitalize">{n.loc.replace('-', ' ')} · {n.at}</p>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
          {session.name.charAt(0)}
        </div>
      </div>
    </header>
  );
}