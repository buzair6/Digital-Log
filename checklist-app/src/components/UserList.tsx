"use client";
import React, { useEffect, useState } from 'react';

type User = { id: string; email: string; fullName?: string; role: string; groupId?: string; isActive?: boolean };

export default function UserList() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'USER' });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch (e) {
      setUsers([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/users', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setForm({ email: '', fullName: '', password: '', role: 'USER' });
      load();
    } catch (err) {
      setError('Network error');
    }
  }

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">Users</h2>
      {loading && <div>Loading...</div>}
      {!loading && (
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 border rounded">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-2">
              <input className="p-2 border" placeholder="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
              <input className="p-2 border" placeholder="full name" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} />
              <input className="p-2 border" placeholder="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
              <select className="p-2 border" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                <option value="USER">USER</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <div className="col-span-2">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded" type="submit">Create User</button>
                {error && <div className="text-red-600 mt-2">{error}</div>}
              </div>
            </form>
          </div>

          <div className="p-4 border rounded">
            <table className="w-full text-left">
              <thead>
                <tr><th className="pb-2">Email</th><th className="pb-2">Name</th><th className="pb-2">Role</th></tr>
              </thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id}><td className="pt-2">{u.email}</td><td className="pt-2">{u.fullName}</td><td className="pt-2">{u.role}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
