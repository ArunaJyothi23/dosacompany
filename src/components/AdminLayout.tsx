'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { AdminSession, getSession } from '@/lib/adminAuth';

interface Props {
  children: React.ReactNode;
  activePage: string;
}

export default function AdminLayout({ children, activePage }: Props) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace('/admin-login');
      return;
    }
    setSession(s);
    setChecked(true);
  }, [router]);

  if (!checked || !session) {
    return <div className="h-screen" style={{ background: 'var(--admin-bg)' }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--admin-bg)' }}>
      <AdminSidebar
        collapsed={sidebarCollapsed}
        activePage={activePage}
        session={session}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminTopbar session={session} onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}