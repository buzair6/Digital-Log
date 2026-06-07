"use client";
import React, { useEffect, useState } from 'react';

export default function AdminAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: '', entityType: '' });

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.action) params.append('action', filter.action);
      if (filter.entityType) params.append('entityType', filter.entityType);
      const res = await fetch(`/api/audit?${params}`, { credentials: 'include' });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Audit Log</h1>
      <div className="mb-4 flex gap-2">
        <input placeholder="Filter by action" className="p-2 border rounded flex-1" value={filter.action} onChange={(e)=>setFilter({...filter, action: e.target.value})} />
        <select className="p-2 border rounded" value={filter.entityType} onChange={(e)=>setFilter({...filter, entityType: e.target.value})}>
          <option value="">All entity types</option>
          <option value="user">User</option>
          <option value="template">Template</option>
          <option value="instance">Instance</option>
          <option value="group">Group</option>
        </select>
      </div>
      {loading ? <div>Loading...</div> : (
        <div className="border rounded">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Action</th>
                <th className="text-left p-2">Entity Type</th>
                <th className="text-left p-2">Entity ID</th>
                <th className="text-left p-2">User</th>
                <th className="text-left p-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? logs.map((l:any) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2 text-sm">{l.action}</td>
                  <td className="p-2 text-sm">{l.entityType}</td>
                  <td className="p-2 text-sm font-mono text-xs">{l.entityId?.slice(0, 8)}</td>
                  <td className="p-2 text-sm">{l.user?.fullName || l.user?.email || l.userId}</td>
                  <td className="p-2 text-sm text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              )) : <tr><td colSpan={5} className="p-4 text-center text-gray-500">No logs</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
