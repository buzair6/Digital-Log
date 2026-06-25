"use client";
import React, { useEffect, useState } from 'react';
import { Users, FileText, ClipboardList } from 'lucide-react';

export default function DashboardStats({ role }: { role: string }) {
  const [counts, setCounts] = useState<{ users: number; templates: number; instances: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [u, t, i] = await Promise.all([
          fetch('/api/users', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/templates', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/instances', { credentials: 'include' }).then(r => r.json()),
        ]);
        if (!mounted) return;
        setCounts({
          users: u?.users?.length ?? 0,
          templates: t?.templates?.length ?? 0,
          instances: i?.instances?.length ?? 0,
        });
      } catch {
        if (mounted) setCounts({ users: 0, templates: 0, instances: 0 });
      }
    }
    load();
    return () => { mounted = false; };
  }, [role]);

  if (!counts) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border rounded-xl p-6 animate-pulse">
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Users', value: counts.users, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Templates', value: counts.templates, icon: FileText, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Instances', value: counts.instances, icon: ClipboardList, color: 'bg-green-50 text-green-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white border rounded-xl p-5 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
            <card.icon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-gray-500">{card.label}</div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
