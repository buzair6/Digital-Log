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

  const links = [{ href: '/', label: 'Home' }, { href: '/dashboard', label: 'My Checklists' }];
  if (role === 'ADMIN') links.splice(1, 0, { href: '/admin/dashboard', label: 'Admin' });
  if (role === 'SUPERVISOR') links.splice(1, 0, { href: '/supervisor/dashboard', label: 'Supervisor' });

  return (
    <aside className="w-64 min-h-screen bg-gray-50 border-r p-4">
      <div className="mb-6 font-bold text-lg">Checklist App</div>
      {loading ? <div className="text-sm text-gray-500">Loading...</div> : (
        <nav className="flex flex-col gap-2">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-gray-700 hover:text-black">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </aside>
  );
}
