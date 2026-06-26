'use client';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [filter, setFilter] = useState({ action: '', entityType: '' });

  async function load() {
    const params = new URLSearchParams();
    if (filter.action) params.append('action', filter.action);
    if (filter.entityType) params.append('entityType', filter.entityType);
    const res = await fetch(`/api/audit?${params}`, { credentials: 'include' });
    const data = await res.json();
    setLogs(data.logs || []);
  }

  useEffect(() => { load(); }, [filter]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Audit Log</h1>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 border-b flex gap-3">
          <input
            placeholder="Filter by action…"
            className="px-3 py-2 border rounded-lg flex-1"
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          />
          <select
            className="px-3 py-2 border rounded-lg"
            value={filter.entityType}
            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
          >
            <option value="">All types</option>
            <option value="user">User</option>
            <option value="template">Template</option>
            <option value="instance">Instance</option>
            <option value="group">Group</option>
          </select>
        </div>

        {!logs ? (
          <div className="p-12 flex items-center justify-center text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No audit entries.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">User</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{l.action}</td>
                  <td className="p-3 text-gray-600">
                    {l.entityType} <span className="font-mono text-xs text-gray-400">{l.entityId?.slice(0, 8)}</span>
                  </td>
                  <td className="p-3 text-gray-700">{l.user?.fullName || l.user?.email || '—'}</td>
                  <td className="p-3 text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
