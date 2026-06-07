"use client";
import React, { useEffect, useState } from 'react';

export default function DashboardStats({ role }: { role: string }) {
  const [counts, setCounts] = useState<{ users?: number; templates?: number; instances?: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [u, t, i] = await Promise.all([
          fetch('/api/users', { credentials: 'include' }).then(r => r.json()).catch(() => null),
          fetch('/api/templates', { credentials: 'include' }).then(r => r.json()).catch(() => null),
          fetch('/api/instances', { credentials: 'include' }).then(r => r.json()).catch(() => null),
        ]);
        if (!mounted) return;
        setCounts({ users: u?.users?.length ?? u?.length ?? null, templates: t?.templates?.length ?? t?.length ?? null, instances: i?.instances?.length ?? i?.length ?? null });
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => { mounted = false; };
  }, [role]);

  if (!counts) return <div className="p-4 border rounded">Loading stats...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 border rounded">Users: {counts.users ?? '—'}</div>
      <div className="p-4 border rounded">Templates: {counts.templates ?? '—'}</div>
      <div className="p-4 border rounded">Instances: {counts.instances ?? '—'}</div>
    </div>
  );
}
