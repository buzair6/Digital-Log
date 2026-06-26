'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Users, Loader2 } from 'lucide-react';

type Group = { id: string; name: string; members: { id: string; email: string; fullName: string | null }[] };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function load() {
    const [g, u] = await Promise.all([
      fetch('/api/groups', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/users', { credentials: 'include' }).then((r) => r.json()),
    ]);
    setGroups(g.groups || []);
    setUsers(u.users || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name }) });
    if (res.ok) { setName(''); flash('Group created'); load(); }
  }

  async function remove(id: string) {
    if (!confirm('Delete group?')) return;
    await fetch(`/api/groups/${id}`, { method: 'DELETE', credentials: 'include' });
    flash('Deleted'); load();
  }

  async function addMember(groupId: string, userId: string) {
    await fetch(`/api/groups/${groupId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId }) });
    load();
  }

  async function removeMember(groupId: string, userId: string) {
    await fetch(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  return (
    <main className="flex-1 p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Groups</h1>

      <form onSubmit={create} className="bg-white border rounded-xl p-4 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Group name</label>
          <input className="w-full px-3 py-2 border rounded-lg" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Safety Reviewers" required />
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1.5"><Plus className="w-4 h-4" /> Create</button>
      </form>

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {!groups ? <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div> :
        groups.length === 0 ? <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No groups yet.</div> : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{g.name}</div>
                  <button onClick={() => remove(g.id)} className="text-red-500 text-sm">Delete</button>
                </div>
                <div className="text-sm text-gray-600 mb-2">{g.members.length} members</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {g.members.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs">
                      {m.fullName || m.email}
                      <button onClick={() => removeMember(g.id, m.id)} className="text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select id={`add-${g.id}`} className="px-2 py-1 border rounded text-sm">
                    <option value="">Add member…</option>
                    {users.filter((u: any) => !g.members.some((m: any) => m.id === u.id)).map((u: any) => (
                      <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
                    ))}
                  </select>
                  <button onClick={() => { const sel = document.getElementById(`add-${g.id}`) as HTMLSelectElement | null; if (sel?.value) addMember(g.id, sel.value); }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
  );
}