'use client';
import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const PRIORITY: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function ActionsPage() {
  const [actions, setActions] = useState<any[] | null>(null);
  async function load() {
    const d = await fetch('/api/actions', { credentials: 'include' }).then((r) => r.json());
    setActions(d.actions || []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/actions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }) });
    load();
  }

  return (
    <main className="flex-1 p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Corrective Actions</h1>
      {!actions ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> :
        actions.length === 0 ? <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No open actions.</div> : (
        <div className="space-y-3">
          {actions.map((a) => (
            <div key={a.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-gray-900">{a.title}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${PRIORITY[a.priority]}`}>{a.priority}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {a.instance?.template?.name} · {a.assignedToUser?.fullName || a.assignedToUser?.email || 'Unassigned'}
                  {a.dueDate && ` · due ${new Date(a.dueDate).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{a.status}</span>
                {a.status === 'OPEN' && <button onClick={() => setStatus(a.id, 'IN_PROGRESS')} className="text-xs px-2 py-1 border rounded">Start</button>}
                {a.status === 'IN_PROGRESS' && <button onClick={() => setStatus(a.id, 'DONE')} className="text-xs px-2 py-1 bg-green-600 text-white rounded">Mark done</button>}
                {a.status === 'DONE' && <button onClick={() => setStatus(a.id, 'VERIFIED')} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verify</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}