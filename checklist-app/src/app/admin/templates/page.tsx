"use client";
import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/templates', { credentials: 'include' });
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/templates', {
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

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">Checklist Templates</h1>

        <form onSubmit={createTemplate} className="mb-6 p-4 border rounded flex gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Template Name</label>
            <input className="p-2 border rounded" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New template" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input className="p-2 border rounded" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" type="submit">Create</button>
        </form>

        {loading ? <div>Loading...</div> : (
          <div className="grid gap-4">
            {templates.length === 0 && <p className="text-gray-500">No templates yet. Create one above.</p>}
            {templates.map((t: any) => (
              <div key={t.id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <a href={`/admin/templates/${t.id}`} className="font-medium text-indigo-600 hover:underline">{t.name}</a>
                  <div className="text-sm text-gray-500">{t.description || 'No description'}</div>
                  <div className="text-xs text-gray-400">v{t.version} · {t.isActive ? 'Active' : 'Inactive'} · Created {new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`/admin/templates/${t.id}`} className="px-3 py-1 bg-blue-600 text-white text-sm rounded">Edit Nodes</a>
                  <button className="px-3 py-1 bg-red-600 text-white text-sm rounded" onClick={() => deleteTemplate(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}