'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2, LogOut, CheckCircle2, ArrowRight } from 'lucide-react';

type Instance = {
  id: string;
  status: string;
  template: { name: string };
  createdAt: string;
};

export default function Dashboard() {
  const [instances, setInstances] = useState<Instance[] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user) return router.replace('/login');
        if ((d.user.role || '').toUpperCase() === 'ADMIN') return router.replace('/admin/dashboard');
        loadInstances();
      });
  }, [router]);

  async function loadInstances() {
    try {
      const res = await fetch('/api/instances?mine=1', { credentials: 'include' });
      const data = await res.json();
      setInstances(data.instances || []);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const active = instances?.filter((i) => i.status !== 'COMPLETED' && i.status !== 'APPROVED') ?? [];
  const done = instances?.filter((i) => i.status === 'COMPLETED' || i.status === 'APPROVED') ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            <span className="font-semibold text-gray-900">My Checklists</span>
          </div>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Active</h2>
          {active.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
              No active checklists assigned to you.
            </div>
          ) : (
            <div className="space-y-2">
              {active.map((i) => (
                <a
                  key={i.id}
                  href={`/instances/${i.id}/fill`}
                  className="bg-white border rounded-xl p-4 flex items-center justify-between hover:border-indigo-400 hover:shadow-sm transition"
                >
                  <div>
                    <div className="font-medium text-gray-900">{i.template.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {i.status} · {new Date(i.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Completed</h2>
          {done.length === 0 ? (
            <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
              Nothing completed yet.
            </div>
          ) : (
            <div className="space-y-2">
              {done.map((i) => (
                <div key={i.id} className="bg-white border rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{i.template.name}</div>
                    <div className="text-xs text-gray-500">{i.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}