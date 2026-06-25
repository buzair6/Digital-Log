"use client";
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Plus, Trash2, FileText, Loader2, ArrowRight } from 'lucide-react';

type Template = {
  id: string; name: string; description: string | null;
  version: number; isActive: boolean; createdAt: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/templates', { credentials: 'include' });
    const data = await res.json();
    setTemplates(data.templates || []);
  }
  useEffect(() => { load(); }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    if (res.ok) { setNewName(''); setNewDesc(''); flash('Template created'); load(); }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template and all its nodes?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE', credentials: 'include' });
    flash('Template deleted');
    load();
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Checklist Templates</h1>

        <form onSubmit={createTemplate} className="bg-white border rounded-xl p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input className="w-full px-3 py-2 border rounded-lg" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Daily Site Walk" required />
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

        {!templates ? (
          <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        ) : templates.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No templates yet. Create one above.</div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="bg-white border rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <a href={`/admin/templates/${t.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{t.name}</a>
                    <div className="text-xs text-gray-500">{t.description || 'No description'}</div>
                    <div className="text-xs text-gray-400 mt-0.5">v{t.version} · {t.isActive ? 'Active' : 'Inactive'} · {new Date(t.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/admin/templates/${t.id}`} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg flex items-center gap-1 hover:bg-blue-700">
                    Edit <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}