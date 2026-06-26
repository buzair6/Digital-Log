'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Save, Send, CheckCircle2 } from 'lucide-react';

function isException(node: any, value: string): boolean {
  if (node.inputType !== 'number') return false;
  if (value === '' || value === null || value === undefined) return false;
  const num = parseFloat(value);
  if (Number.isNaN(num)) return false;
  const min = node.minValue !== null && node.minValue !== undefined && node.minValue !== '' ? parseFloat(node.minValue) : null;
  const max = node.maxValue !== null && node.maxValue !== undefined && node.maxValue !== '' ? parseFloat(node.maxValue) : null;
  if (min !== null && num < min) return true;
  if (max !== null && num > max) return true;
  return false;
}

export default function FillChecklistPage() {
  const params = useParams() as { id: string };
  const id = params.id;
  const router = useRouter();
  const [instance, setInstance] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [uploads, setUploads] = useState<Record<string, { url: string; fileName: string }>>({});

  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 1800); }

  async function load() {
    setLoading(true);
    try {
      const r1 = await fetch(`/api/instances/${id}`, { credentials: 'include' });
      const d1 = await r1.json();
      if (d1.error) { setError(d1.error); return; }
      setInstance(d1.instance);

      const r2 = await fetch(`/api/templates/${d1.instance.templateId}`, { credentials: 'include' });
      const d2 = await r2.json();
      setTemplate(d2.template || d2);
      const allNodes = d2.nodes || d2.template?.nodes || [];
      setNodes(allNodes);

      const init: Record<string, string> = {};
      (d1.instance.responses || []).forEach((r: any) => { init[r.nodeId] = r.value || ''; });
      setResponses(init);
    } catch (e) {
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function uploadFile(nodeId: string, file: File) {
    flash('Uploading…');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: fd, credentials: 'include' });
    const d = await res.json();
    if (res.ok) {
      setUploads((p) => ({ ...p, [nodeId]: { url: d.url, fileName: d.fileName } }));
      setResponses((prev) => ({ ...prev, [nodeId]: d.url }));
      flash('File attached');
    } else {
      flash(d.error || 'Upload failed');
    }
  }

  async function saveDraft() {
    setSaving(true);
    const payload = Object.entries(responses).map(([nodeId, value]) => ({ nodeId, value: value ?? '' }));

    const res = await fetch(`/api/instances/${id}/responses`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ responses: payload }),
    });

    const exceptions = nodes
      .filter((n) => n.nodeType === 'QUESTION' && isException(n, responses[n.id] ?? ''))
      .map((n) => ({ nodeId: n.id, title: n.title, value: responses[n.id] ?? '' }));
    if (exceptions.length) {
      await fetch(`/api/instances/${id}/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ exceptions }),
      });
      flash(`Saved. ${exceptions.length} exception(s) reported to admins.`);
    } else {
      flash(res.ok ? 'Draft saved' : 'Save failed');
    }
    setSaving(false);
  }

  function validateRequired(): string | null {
    const requiredQuestions = nodes.filter((n) => n.nodeType === 'QUESTION' && n.isRequired);
    for (const q of requiredQuestions) {
      const v = responses[q.id];
      if (v === undefined || v === '' || v === null) return `Required field missing: "${q.title}"`;
    }
    return null;
  }

  async function submit() {
    const verr = validateRequired();
    if (verr) { flash(verr); return; }
    setSubmitting(true);
    const payload = Object.entries(responses).map(([nodeId, value]) => ({ nodeId, value: value ?? '', isComplete: true }));
    await fetch(`/api/instances/${id}/responses`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ responses: payload }),
    });
    const res = await fetch(`/api/instances/${id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({}),
    });
    setSubmitting(false);
    if (res.ok) {
      flash('Submitted for review');
      setTimeout(() => router.push('/dashboard'), 900);
    } else {
      const d = await res.json();
      flash(d.error || 'Submit failed');
    }
  }

  function setVal(nodeId: string, val: string) {
    setResponses((prev) => ({ ...prev, [nodeId]: val }));
  }

  function renderNode(node: any, level = 0): React.ReactElement {
    if (node.nodeType === 'SECTION' || node.nodeType === 'SUB_SECTION') {
      const children = (node.children || []).map((c: any) => renderNode(c, level + 1));
      return (
        <div key={node.id} className="mb-5" style={{ marginLeft: `${level * 16}px` }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2 pb-1 border-b">{node.title}</h2>
          {children}
        </div>
      );
    }
    if (node.nodeType === 'QUESTION') {
      const value = responses[node.id] ?? '';
      const exception = isException(node, value);
      return (
        <div key={node.id} className={`mb-3 p-4 bg-white border rounded-lg ${exception ? 'border-red-500 bg-red-50' : ''}`}
          style={{ marginLeft: `${level * 16}px` }}>
          <label className="block font-medium text-gray-900 text-sm">
            {node.title}{node.isRequired && <span className="text-red-500"> *</span>}
          </label>
          {node.helpText && <p className="text-xs text-gray-500 mt-0.5 mb-2">{node.helpText}</p>}
          {exception && node.exceptionAction && (
            <div className="mb-2 px-3 py-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
              ⚠ Value is outside the acceptable range. {node.exceptionAction}
            </div>
          )}
          <div className="mt-2">
            {node.inputType === 'text' && (
              <input className="w-full px-3 py-2 border rounded-lg" value={value}
                onChange={(e) => setVal(node.id, e.target.value)}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'} />
            )}
            {node.inputType === 'number' && (
              <input className={`w-full px-3 py-2 border rounded-lg ${exception ? 'border-red-500 text-red-700 font-semibold' : ''}`}
                type="number" value={value}
                onChange={(e) => setVal(node.id, e.target.value)}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'} />
            )}
            {node.inputType === 'checkbox' && (
              <input className="w-5 h-5" type="checkbox" checked={value === 'yes'}
                onChange={(e) => setVal(node.id, e.target.checked ? 'yes' : '')}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'} />
            )}
            {node.inputType === 'yes_no' && (
              <select className="w-full px-3 py-2 border rounded-lg" value={value}
                onChange={(e) => setVal(node.id, e.target.value)}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'}>
                <option value="">Select…</option><option value="yes">Yes</option><option value="no">No</option>
              </select>
            )}
            {node.inputType === 'dropdown' && node.options && (
              <select className="w-full px-3 py-2 border rounded-lg" value={value}
                onChange={(e) => setVal(node.id, e.target.value)}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'}>
                <option value="">Select…</option>
                {(() => { try { return JSON.parse(node.options).map((o: string) => <option key={o} value={o}>{o}</option>); } catch { return []; } })()}
              </select>
            )}
            {node.inputType === 'date' && (
              <input className="w-full px-3 py-2 border rounded-lg" type="date" value={value}
                onChange={(e) => setVal(node.id, e.target.value)}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'} />
            )}
            {node.inputType === 'file_upload' && (
              <div>
                <input className="w-full px-3 py-2 border rounded-lg" type="file"
                  accept="image/*,application/pdf"
                  disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(node.id, f); }} />
                {(uploads[node.id]?.url || value) && (
                  <a href={uploads[node.id]?.url || value} target="_blank" rel="noreferrer"
                    className="inline-block mt-2 text-xs text-indigo-600 underline">
                    View attachment
                  </a>
                )}
              </div>
            )}
            {node.inputType === 'signature' && (
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Type name as signature"
                value={value} onChange={(e) => setVal(node.id, e.target.value)}
                disabled={instance?.status === 'SUBMITTED' || instance?.status === 'APPROVED'} />
            )}
          </div>
        </div>
      );
    }
    return <></>;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (error || !instance) {
    return <div className="p-8">{error || 'Instance not found'}</div>;
  }

  const rootNodes = nodes.filter((n: any) => !n.parentNodeId).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const readonly = instance.status === 'SUBMITTED' || instance.status === 'APPROVED' || instance.status === 'REJECTED';

  return (
    <main className="flex-1 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">{template?.name || 'Checklist'}</h1>
          <span className={`px-2 py-1 rounded text-xs ${instance.status === 'APPROVED' ? 'bg-green-100 text-green-700' : instance.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {instance.status}
          </span>
        </div>
        {instance.reviewComments && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-lg text-sm mb-4">
            Reviewer feedback: {instance.reviewComments}
          </div>
        )}

        {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {rootNodes.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
                This template has no questions yet. An admin needs to add questions in the Template Builder.
              </div>
            ) : (
              rootNodes.map((n: any) => renderNode(n))
            )}
          </div>

          <div className="border rounded-xl p-4 h-fit sticky top-4 bg-white">
            <div className="font-medium text-gray-900 mb-3">Actions</div>
            {!readonly ? (
              <div className="space-y-2">
                <button onClick={saveDraft} disabled={saving}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-700 disabled:bg-blue-400">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Draft</>}
                </button>
                <button onClick={submit} disabled={submitting}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-green-700 disabled:bg-green-400">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit for Review</>}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> This checklist is {instance.status.toLowerCase()} and read-only.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}