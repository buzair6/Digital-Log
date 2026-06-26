'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Play } from 'lucide-react';

type Template = { id: string; name: string };
type User = { id: string; email: string; fullName: string | null };
type Group = { id: string; name: string };
type Schedule = {
  id: string; name: string; cronExpr: string | null; intervalMinutes: number | null;
  isActive: boolean; nextRunAt: string; lastRunAt: string | null;
  template: { name: string };
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({ name: '', templateId: '', scheduleType: 'cron', cronExpr: 'daily 08:00', intervalMinutes: '60', assignedToUserId: '', routedToGroupId: '' });
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function load() {
    const [s, t, u, g] = await Promise.all([
      fetch('/api/schedules', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/templates', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/users', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/groups', { credentials: 'include' }).then((r) => r.json()),
    ]);
    setSchedules(s.schedules || []);
    setTemplates(t.templates || []);
    setUsers(u.users || []);
    setGroups(g.groups || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.templateId) return;
    const body: any = { name: form.name, templateId: form.templateId, assignedToUserId: form.assignedToUserId || undefined, routedToGroupId: form.routedToGroupId || undefined };
    if (form.scheduleType === 'cron') body.cronExpr = form.cronExpr;
    else body.intervalMinutes = parseInt(form.intervalMinutes, 10);
    const res = await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
    if (res.ok) { flash('Schedule created'); setForm({ ...form, name: '' }); load(); }
    else { const d = await res.json(); flash(d.error || 'Failed'); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this schedule?')) return;
    await fetch(`/api/schedules?id=${id}`, { method: 'DELETE', credentials: 'include' });
    flash('Deleted'); load();
  }

  async function runDue() {
    const res = await fetch('/api/schedules/run-due', { method: 'POST', credentials: 'include' });
    const d = await res.json();
    flash(res.ok ? `Ran ${d.ran} schedule(s)` : 'Failed');
    load();
  }

  return (
    <main className="flex-1 p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Schedules</h1>
        <button onClick={runDue} className="px-3 py-1.5 bg-green-600 text-white rounded-lg flex items-center gap-1.5 text-sm hover:bg-green-700">
          <Play className="w-4 h-4" /> Run due now
        </button>
      </div>

      <form onSubmit={create} className="bg-white border rounded-xl p-5 mb-6 grid grid-cols-2 gap-3">
        <div className="col-span-2 font-medium text-gray-900">New schedule</div>
        <input className="px-3 py-2 border rounded-lg" placeholder="Schedule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select className="px-3 py-2 border rounded-lg" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} required>
          <option value="">Template…</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="col-span-2 flex gap-4">
          <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={form.scheduleType === 'cron'} onChange={() => setForm({ ...form, scheduleType: 'cron' })} /> Cron-like</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={form.scheduleType === 'interval'} onChange={() => setForm({ ...form, scheduleType: 'interval' })} /> Interval (minutes)</label>
        </div>
        {form.scheduleType === 'cron' ? (
          <input className="col-span-2 px-3 py-2 border rounded-lg" placeholder='e.g. "daily 08:00" or "weekly Mon 09:00"' value={form.cronExpr} onChange={(e) => setForm({ ...form, cronExpr: e.target.value })} />
        ) : (
          <input className="col-span-2 px-3 py-2 border rounded-lg" type="number" placeholder="e.g. 60" value={form.intervalMinutes} onChange={(e) => setForm({ ...form, intervalMinutes: e.target.value })} />
        )}
        <select className="px-3 py-2 border rounded-lg" value={form.assignedToUserId} onChange={(e) => setForm({ ...form, assignedToUserId: e.target.value })}>
          <option value="">No assignee</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.fullName || u.email}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg" value={form.routedToGroupId} onChange={(e) => setForm({ ...form, routedToGroupId: e.target.value })}>
          <option value="">No group routing</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="col-span-2"><button className="px-4 py-2 bg-indigo-600 text-white rounded-lg" type="submit">Create Schedule</button></div>
      </form>

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {!schedules ? <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div> :
       schedules.length === 0 ? <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No schedules yet.</div> : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left"><tr><th className="p-3">Name</th><th className="p-3">Template</th><th className="p-3">Pattern</th><th className="p-3">Next run</th><th className="p-3"></th></tr></thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{s.name}</td>
                  <td className="p-3 text-gray-700">{s.template.name}</td>
                  <td className="p-3 text-gray-600">{s.cronExpr || `every ${s.intervalMinutes} min`}</td>
                  <td className="p-3 text-gray-500">{new Date(s.nextRunAt).toLocaleString()}</td>
                  <td className="p-3 text-right"><button onClick={() => remove(s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}