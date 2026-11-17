'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  QrCode,
  UtensilsCrossed,
  Sliders,
  CreditCard,
  RotateCcw,
  Plug,
  ChefHat,
  Truck,
  Settings,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import AppLogo from './ui/AppLogo';
import { AdminSession, signOut } from '@/lib/adminAuth';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
  roles?: string[]; // if set, only these roles can see it
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin-dashboard', icon: <LayoutDashboard size={18} />, group: 'main' },
  { id: 'orders', label: 'Live Orders', href: '/live-order-management', icon: <ShoppingBag size={18} />, group: 'main' },
  { id: 'kitchen', label: 'Kitchen', href: '/admin-kitchen', icon: <ChefHat size={18} />, group: 'main' },
  { id: 'delivery', label: 'Delivery', href: '/admin-delivery', icon: <Truck size={18} />, group: 'main' },
  { id: 'menu', label: 'Menu Management', href: '/admin-menu-management', icon: <UtensilsCrossed size={18} />, group: 'menu' },
  { id: 'modifiers', label: 'Modifiers', href: '/admin-modifiers', icon: <Sliders size={18} />, group: 'menu' },
  { id: 'qr-codes', label: 'QR Codes', href: '/admin-qr-manager', icon: <QrCode size={18} />, group: 'menu' },
  { id: 'payments', label: 'Payments', href: '/admin-payments', icon: <CreditCard size={18} />, group: 'finance', roles: ['SUPER_ADMIN', 'CENTRAL_OPS', 'RESTAURANT_MANAGER', 'FINANCE'] },
  { id: 'refunds', label: 'Refunds', href: '/admin-refunds', icon: <RotateCcw size={18} />, group: 'finance', roles: ['SUPER_ADMIN', 'CENTRAL_OPS', 'RESTAURANT_MANAGER', 'FINANCE'] },
  { id: 'epos', label: 'EPOS Integration', href: '/admin-epos', icon: <Plug size={18} />, group: 'integrations', roles: ['SUPER_ADMIN', 'CENTRAL_OPS'] },
  { id: 'settings', label: 'Settings', href: '/admin-settings', icon: <Settings size={18} />, group: 'system', roles: ['SUPER_ADMIN', 'CENTRAL_OPS', 'RESTAURANT_MANAGER'] },
  { id: 'users', label: 'Users & Roles', href: '/admin-users', icon: <Users size={18} />, group: 'system', roles: ['SUPER_ADMIN', 'CENTRAL_OPS'] },
  { id: 'audit', label: 'Audit Logs', href: '/admin-audit-logs', icon: <ClipboardList size={18} />, group: 'system', roles: ['SUPER_ADMIN', 'CENTRAL_OPS'] },
];

const GROUP_LABELS: Record<string, string> = {
  main: 'Operations',
  menu: 'Menu',
  finance: 'Finance',
  integrations: 'Integrations',
  system: 'System',
};

interface Props {
  collapsed: boolean;
  activePage: string;
  session: AdminSession;
  onToggleCollapse: () => void;
}

export default function AdminSidebar({ collapsed, activePage, session, onToggleCollapse }: Props) {
  const router = useRouter();
  const visible = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(session.role));
  const groups = Array.from(new Set(visible.map((i) => i.group)));

  const handleSignOut = () => {
    signOut();
    router.push('/admin-login');
  };

  return (
    <aside
      className={`flex flex-col h-full border-r flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'w-16' : 'w-60'}`}
      style={{ background: 'var(--admin-card)', borderColor: 'var(--admin-border)' }}
    >
      <div className={`flex items-center h-14 border-b px-3 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`} style={{ borderColor: 'var(--admin-border)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <AppLogo size={30} />
            <span className="font-extrabold text-sm text-admin-foreground leading-tight tracking-wider">WATAN</span>
          </div>
        )}
        {collapsed && <AppLogo size={28} />}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-admin-muted hover:text-admin-foreground hover:bg-white/5 transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-hide">
        {groups.map((group) => {
          const items = visible.filter((i) => i.group === group);
          return (
            <div key={`nav-group-${group}`} className="mb-1">
              {!collapsed && (
                <p className="text-xs font-bold uppercase tracking-widest px-4 py-2 mt-2" style={{ color: 'var(--admin-muted)', opacity: 0.5 }}>
                  {GROUP_LABELS[group]}
                </p>
              )}
              {collapsed && <div className="h-3" />}
              {items.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <Link
                    key={`nav-${item.id}`}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-150 relative group ${
                      isActive ? 'bg-primary/15 text-primary' : 'text-admin-muted hover:text-admin-foreground hover:bg-white/5'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="text-sm font-semibold truncate flex-1">{item.label}</span>}
                    {collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {collapsed && (
        <div className="border-t p-2" style={{ borderColor: 'var(--admin-border)' }}>
          <button onClick={onToggleCollapse} className="w-full flex items-center justify-center py-2 text-admin-muted hover:text-admin-foreground hover:bg-white/5 rounded-xl transition-colors" aria-label="Expand sidebar">
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="border-t p-3 flex-shrink-0" style={{ borderColor: 'var(--admin-border)' }}>
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
              {session.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-admin-foreground text-xs font-bold truncate">{session.name}</p>
              <p className="text-admin-muted text-xs truncate">{session.roleLabel}</p>
            </div>
            <button onClick={handleSignOut} className="w-8 h-8 rounded-lg flex items-center justify-center text-admin-muted hover:text-red-400 hover:bg-white/5 transition-colors" aria-label="Sign out" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}