'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Plus, Loader2, Trash2, Send, CheckCircle2, XCircle, RotateCcw, ArrowRight,
} from 'lucide-react';

type Template = { id: string; name: string };
type User = { id: string; email: string; fullName: string | null };
type Group = { id: string; name: string };
type Instance = {
  id: string;
  status: string;
  createdAt: string;
  template: { name: string };
  assignedToUser?: { email: string; fullName: string | null } | null;
  routedToGroup?: { name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  ROUTED: 'bg-purple-100 text-purple-700',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-700',
};

export default function AdminInstancesPage() {
  const [instances, setInstances] = useState<Instance[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState({ status: '', template: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ templateId: '', assignedToUserId: '', routedToGroupId: '' });
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.template) params.append('template', filter.template);
    const [inst, t, u, g] = await Promise.all([
      fetch(`/api/instances?${params}`, { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/templates', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/users', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/groups', { credentials: 'include' }).then((r) => r.json()),
    ]);
    setInstances(inst.instances || []);
    setTemplates(t.templates || []);
    setUsers(u.users || []);
    setGroups(g.groups || []);
  }
  useEffect(() => { load(); }, [filter]);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2200); }

  async function createInstance(e: React.FormEvent) {
    e.preventDefault();
    if (!form.templateId) return;
    const res = await fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        templateId: form.templateId,
        assignedToUserId: form.assignedToUserId || undefined,
        routedToGroupId: form.routedToGroupId || undefined,
      }),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ templateId: '', assignedToUserId: '', routedToGroupId: '' });
      flash('Checklist created');
      load();
    } else {
      const d = await res.json();
      flash(d.error || 'Failed');
    }
  }

  async function routeToGroup(instanceId: string) {
    const groupId = prompt('Group ID to route to:', groups[0]?.id || '');
    if (!groupId) return;
    const res = await fetch(`/api/instances/${instanceId}/route-to`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ groupId }),
    });
    flash(res.ok ? 'Routed to group' : 'Failed');
    load();
  }

  async function approve(id: string) {
    const res = await fetch(`/api/instances/${id}/approve`, { method: 'POST', credentials: 'include' });
    flash(res.ok ? 'Approved' : 'Failed');
    load();
  }
  async function reject(id: string) {
    const comments = prompt('Reason for rejection:') || '';
    const res = await fetch(`/api/instances/${id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ comments }),
    });
    flash(res.ok ? 'Rejected' : 'Failed');
    load();
  }
  async function requestRevision(id: string) {
    const comments = prompt('What needs revision?') || '';
    const res = await fetch(`/api/instances/${id}/request-revision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ comments }),
    });
    flash(res.ok ? 'Revision requested' : 'Failed');
    load();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Checklist Instances</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> New Checklist
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createInstance} className="bg-white border rounded-xl p-5 mb-6 grid grid-cols-2 gap-3">
            <div className="col-span-2 font-medium text-gray-900">Create a new checklist</div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Template</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.templateId}
                onChange={(e) => setForm({ ...form, templateId: e.target.value })} required>
                <option value="">Select template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assign to user (optional)</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.assignedToUserId}
                onChange={(e) => setForm({ ...form, assignedToUserId: e.target.value })}>
                <option value="">No specific assignee</option>
                {users.filter((u) => u.email !== 'admin@example.com').map((u) =>
                  <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Route to group (optional — sends email to group members)</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.routedToGroupId}
                onChange={(e) => setForm({ ...form, routedToGroupId: e.target.value })}>
                <option value="">No group routing</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" type="submit">Create</button>
              <button type="button" className="px-4 py-2 border rounded-lg" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="bg-white border rounded-xl p-4 mb-4 flex gap-3">
          <select className="px-3 py-2 border rounded-lg" value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All statuses</option>
            {Object.keys(STATUS_COLOR).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="px-3 py-2 border rounded-lg" value={filter.template}
            onChange={(e) => setFilter({ ...filter, template: e.target.value })}>
            <option value="">All templates</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

        {!instances ? (
          <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        ) : instances.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No checklists yet. Click "New Checklist" to create one.</div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="p-3">Checklist</th><th className="p-3">Status</th>
                  <th className="p-3">Assignee</th><th className="p-3">Group</th>
                  <th className="p-3">Created</th><th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((i) => (
                  <tr key={i.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">
                      <a href={`/instances/${i.id}/fill`} className="hover:text-indigo-600">{i.template.name}</a>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_COLOR[i.status] || 'bg-gray-100'}`}>{i.status}</span>
                    </td>
                    <td className="p-3 text-gray-700">{i.assignedToUser?.fullName || i.assignedToUser?.email || '—'}</td>
                    <td className="p-3 text-gray-700">{i.routedToGroup?.name || '—'}</td>
                    <td className="p-3 text-gray-500">{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <a href={`/instances/${i.id}/fill`} className="inline-block px-2 py-1 text-xs text-indigo-600 hover:underline mr-2">Open</a>
                      {(i.status === 'IN_PROGRESS' || i.status === 'DRAFT') && (
                        <button onClick={() => routeToGroup(i.id)} className="inline-block px-2 py-1 text-xs text-purple-600 hover:underline mr-2" title="Route to group">
                          <Send className="w-3 h-3 inline" /> Route
                        </button>
                      )}
                      {i.status === 'SUBMITTED' && (
                        <>
                          <button onClick={() => approve(i.id)} className="inline-block px-2 py-1 text-xs text-green-600 hover:underline mr-2" title="Approve">
                            <CheckCircle2 className="w-3 h-3 inline" /> Approve
                          </button>
                          <button onClick={() => requestRevision(i.id)} className="inline-block px-2 py-1 text-xs text-orange-600 hover:underline mr-2" title="Request revision">
                            <RotateCcw className="w-3 h-3 inline" /> Revise
                          </button>
                          <button onClick={() => reject(i.id)} className="inline-block px-2 py-1 text-xs text-red-600 hover:underline" title="Reject">
                            <XCircle className="w-3 h-3 inline" /> Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}