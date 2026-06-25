"use client";
import { useEffect, useState } from 'react';
import { Loader2, Trash2, KeyRound } from 'lucide-react';

type Group = { id: string; name: string };
type User = {
  id: string; email: string; fullName: string | null;
  role: string; groupId: string | null; isActive: boolean;
};

export default function UserList() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'USER', groupId: '' });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    try {
      const [u, g] = await Promise.all([
        fetch('/api/users', { credentials: 'include' }).then((r) => r.json()),
        fetch('/api/groups', { credentials: 'include' }).then((r) => r.json()),
      ]);
      setUsers(u.users || []);
      setGroups(g.groups || []);
    } catch {
      setUsers([]);
    }
  }
  useEffect(() => { load(); }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: form.email,
        fullName: form.fullName || undefined,
        password: form.password,
        role: form.role,
        groupId: form.groupId || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); return; }
    setForm({ email: '', fullName: '', password: '', role: 'USER', groupId: '' });
    flash('User created');
    load();
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (res.ok) { flash('Updated'); load(); }
  }

  async function resetPassword(u: User) {
    const pw = prompt(`New password for ${u.email}:`);
    if (!pw) return;
    await patchUser(u.id, { password: pw });
  }

  async function deleteUser(u: User) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { flash('User deleted'); load(); }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Create User</h2>
        <form onSubmit={create} className="grid grid-cols-2 gap-3">
          <input className="px-3 py-2 border rounded-lg" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="px-3 py-2 border rounded-lg" placeholder="Full name (optional)" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="px-3 py-2 border rounded-lg" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="px-3 py-2 border rounded-lg" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <select className="px-3 py-2 border rounded-lg col-span-2" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
            <option value="">No group</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <div className="col-span-2 flex items-center gap-3">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" type="submit">Create User</button>
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
        </form>
      </div>

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      <div className="bg-white border rounded-xl overflow-hidden">
        {!users ? (
          <div className="p-12 flex items-center justify-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="p-3">Email</th><th className="p-3">Name</th>
                <th className="p-3">Role</th><th className="p-3">Group</th>
                <th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{u.email}</td>
                  <td className="p-3 text-gray-700">{u.fullName || '—'}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.groupId || ''}
                      onChange={(e) => patchUser(u.id, { groupId: e.target.value || null })}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      <option value="">None</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => patchUser(u.id, { isActive: !u.isActive })}
                      className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => resetPassword(u)} className="p-1 text-gray-500 hover:text-indigo-600" title="Reset password">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteUser(u)} className="p-1 text-red-500 hover:text-red-700 ml-1" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}