'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, ArrowLeft } from 'lucide-react';

type Template = { id: string; name: string; description: string | null };

export default function NewChecklistPage() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/templates', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  async function startFromTemplate(t: Template) {
    setCreating(t.id);
    setError(null);
    // Check for assetId from sessionStorage (set by barcode scan page)
    const assetId = sessionStorage.getItem('pendingAssetId') || undefined;
    const res = await fetch('/api/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId: t.id, assetId }),
    });
    const data = await res.json();
    if (res.ok && data.instance?.id) {
      sessionStorage.removeItem('pendingAssetId');
      router.push(`/instances/${data.instance.id}/fill`);
    } else {
      setError(data.error || 'Failed to create checklist');
      setCreating(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">Start a New Checklist</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {!templates ? (
          <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading templates…</div>
        ) : templates.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
            No templates are available yet. An administrator must create a template first.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="bg-white border rounded-xl p-5 flex items-center justify-between hover:shadow-sm transition">
                <div>
                  <div className="font-medium text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{t.description || 'No description'}</div>
                </div>
                <button
                  onClick={() => startFromTemplate(t)}
                  disabled={creating === t.id}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {creating === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Start</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}