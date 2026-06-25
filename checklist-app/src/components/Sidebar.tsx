"use client";
import React, { useEffect, useState } from 'react';

export default function Sidebar() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setRole(data?.user?.role ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const topLinks = [
    { href: '/', label: 'Home' },
  ];
  
  const adminLinks = [
    { href: '/admin/dashboard', label: 'Admin Dashboard' },
    { href: '/admin/templates', label: 'Templates' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/groups', label: 'Groups' },
    { href: '/admin/audit', label: 'Audit Log' },
  ];

  const userLinks = [
    { href: '/dashboard', label: 'My Checklists' },
  ];

  const supervisorLinks = [
    { href: '/supervisor/dashboard', label: 'Supervisor Dashboard' },
  ];

  return (
    <aside className="w-64 min-h-screen bg-gray-50 border-r p-4 flex flex-col gap-6">
      <div className="mb-2 font-bold text-lg">Checklist App</div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : (
        <nav className="flex flex-col gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">General</div>
            <div className="flex flex-col gap-1">
              {topLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-black hover:bg-gray-100 px-2 py-1 rounded">{l.label}</a>
              ))}
              {userLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-black hover:bg-gray-100 px-2 py-1 rounded">{l.label}</a>
              ))}
            </div>
          </div>
          {(role === 'ADMIN' || role === 'SUPERVISOR') && (
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Management</div>
              <div className="flex flex-col gap-1">
                {(role === 'ADMIN' ? adminLinks : supervisorLinks).map((l) => (
                  <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-black hover:bg-gray-100 px-2 py-1 rounded">{l.label}</a>
                ))}
              </div>
            </div>
          )}
        </nav>
      )}
    </aside>
  );
}