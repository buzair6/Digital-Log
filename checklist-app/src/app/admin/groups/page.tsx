"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

type Group = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  members: { id: string; email: string; fullName: string | null }[];
  emailMembers: { id: string; email: string; name: string | null }[];
};

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailName, setNewEmailName] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/groups', { credentials: 'include' });
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

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
      setNewName('');
      setNewDesc('');
      load();
    }
  }

  async function addEmailMember(groupId: string) {
    if (!newEmail.trim()) return;
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: newEmail, name: newEmailName || undefined }),
    });
    if (res.ok) {
      setNewEmail('');
      setNewEmailName('');
      load();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to add member');
    }
  }

  async function removeMember(groupId: string, memberId: string) {
    if (!confirm('Remove this member from the group?')) return;
    await fetch(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this group? This will also remove all members.')) return;
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">Group Management</h1>

        <form onSubmit={createGroup} className="mb-6 p-4 border rounded flex gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Group Name</label>
            <input className="p-2 border rounded" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New group name" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input className="p-2 border rounded" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" type="submit">Create Group</button>
        </form>

        {loading ? <div>Loading...</div> : (
          <div className="grid gap-4">
            {groups.length === 0 && <p className="text-gray-500">No groups yet.</p>}
            {groups.map((g) => (
              <div key={g.id} className="border rounded">
                <div
                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}
                >
                  <div>
                    <div className="font-medium">{g.name}</div>
                    <div className="text-sm text-gray-500">{g.description || 'No description'} · {g.type}</div>
                    <div className="text-xs text-gray-400">
                      {g.members.length} user member(s), {g.emailMembers.length} email member(s)
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-sm text-gray-400">{expandedGroup === g.id ? '▲' : '▼'}</span>
                    <button className="text-sm text-red-600" onClick={() => deleteGroup(g.id)}>Delete</button>
                  </div>
                </div>

                {expandedGroup === g.id && (
                  <div className="p-4 border-t bg-gray-50">
                    <h3 className="font-medium mb-2">User Members</h3>
                    {g.members.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-3">No user members. Assign users from the Users page.</p>
                    ) : (
                      <div className="mb-3">
                        {g.members.map((m) => (
                          <div key={m.id} className="flex justify-between items-center py-1 text-sm">
                            <span>{m.email} ({m.fullName || 'No name'})</span>
                            <button className="text-red-500 text-xs" onClick={() => removeMember(g.id, m.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <h3 className="font-medium mb-2">Email Members (External)</h3>
                    {g.emailMembers.length === 0 ? (
                      <p className="text-sm text-gray-500 mb-3">No email members.</p>
                    ) : (
                      <div className="mb-3">
                        {g.emailMembers.map((m) => (
                          <div key={m.id} className="flex justify-between items-center py-1 text-sm">
                            <span>{m.email} {m.name ? `(${m.name})` : ''}</span>
                            <button className="text-red-500 text-xs" onClick={() => removeMember(g.id, m.id)}>Remove</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 items-end mt-3">
                      <div>
                        <label className="block text-xs mb-1">Email</label>
                        <input className="p-1.5 border rounded text-sm" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Name</label>
                        <input className="p-1.5 border rounded text-sm" placeholder="Optional name" value={newEmailName} onChange={(e) => setNewEmailName(e.target.value)} />
                      </div>
                      <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded" onClick={() => addEmailMember(g.id)}>Add Email</button>
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