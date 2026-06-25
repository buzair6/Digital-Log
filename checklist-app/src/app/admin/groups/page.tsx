"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Trash2, ChevronDown, ChevronRight, Loader2, Mail } from 'lucide-react';

type Group = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  members: { id: string; email: string; fullName: string | null }[];
  emailMembers: { id: string; email: string; name: string | null }[];
};

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState<Record<string, { email: string; name: string }>>({});
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/groups', { credentials: 'include' });
    const data = await res.json();
    setGroups(data.groups || []);
  }
  useEffect(() => { load(); }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    if (res.ok) {
      setNewName(''); setNewDesc('');
      flash('Group created');
      load();
    }
  }

  async function addEmail(g: Group) {
    const draft = memberDraft[g.id] || { email: '', name: '' };
    if (!draft.email.trim()) return;
    const res = await fetch(`/api/groups/${g.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: draft.email, name: draft.name || undefined }),
    });
    if (res.ok) {
      setMemberDraft({ ...memberDraft, [g.id]: { email: '', name: '' } });
      flash('Member added');
      load();
    } else {
      const d = await res.json();
      flash(d.error || 'Failed');
    }
  }

  async function removeMember(gid: string, mid: string) {
    await fetch(`/api/groups/${gid}/members/${mid}`, { method: 'DELETE', credentials: 'include' });
    flash('Member removed');
    load();
  }

  async function deleteGroup(gid: string) {
    if (!confirm('Delete this group?')) return;
    await fetch(`/api/groups/${gid}`, { method: 'DELETE', credentials: 'include' });
    flash('Group deleted');
    load();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Groups</h1>

        <form onSubmit={createGroup} className="bg-white border rounded-xl p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input className="w-full px-3 py-2 border rounded-lg" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Safety Inspectors" required />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input className="w-full px-3 py-2 border rounded-lg" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional" />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Create
          </button>
        </form>

        {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

        {!groups ? (
          <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        ) : groups.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No groups yet.</div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="bg-white border rounded-xl overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                >
                  <div className="flex items-center gap-3">
                    {expanded === g.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div>
                      <div className="font-medium text-gray-900">{g.name}</div>
                      <div className="text-xs text-gray-500">
                        {g.description || 'No description'} · {g.members.length + g.emailMembers.length} member(s)
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup(g.id); }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {expanded === g.id && (
                  <div className="border-t bg-slate-50 p-4 space-y-4">
                    <div>
                      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">User Members</h3>
                      {g.members.length === 0 ? (
                        <p className="text-sm text-gray-400">No user members. Assign a group on the Users page.</p>
                      ) : (
                        <div className="space-y-1">
                          {g.members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-sm bg-white border rounded-lg px-3 py-1.5">
                              <span>{m.email} {m.fullName && <span className="text-gray-400">· {m.fullName}</span>}</span>
                              <button onClick={() => removeMember(g.id, m.id)} className="text-red-500 text-xs">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1"><Mail className="w-3 h-3" /> Email Members (External)</h3>
                      {g.emailMembers.length === 0 ? (
                        <p className="text-sm text-gray-400">No external email members yet.</p>
                      ) : (
                        <div className="space-y-1 mb-3">
                          {g.emailMembers.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-sm bg-white border rounded-lg px-3 py-1.5">
                              <span>{m.email} {m.name && <span className="text-gray-400">· {m.name}</span>}</span>
                              <button onClick={() => removeMember(g.id, m.id)} className="text-red-500 text-xs">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 items-end">
                        <input
                          className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                          placeholder="email@example.com"
                          value={memberDraft[g.id]?.email || ''}
                          onChange={(e) => setMemberDraft({ ...memberDraft, [g.id]: { ...(memberDraft[g.id] || { email: '', name: '' }), email: e.target.value } })}
                        />
                        <input
                          className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                          placeholder="Name (optional)"
                          value={memberDraft[g.id]?.name || ''}
                          onChange={(e) => setMemberDraft({ ...memberDraft, [g.id]: { ...(memberDraft[g.id] || { email: '', name: '' }), name: e.target.value } })}
                        />
                        <button onClick={() => addEmail(g)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Add</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}