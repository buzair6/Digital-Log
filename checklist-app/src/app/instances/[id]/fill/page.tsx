"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function FillChecklistPage() {
  const params = useParams() as any;
  const id = params.id;
  const [instance, setInstance] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [responses, setResponses] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r1 = await fetch(`/api/instances/${id}`, { credentials: 'include' });
      const d1 = await r1.json();
      if (d1.error) return;
      setInstance(d1.instance);
      const r2 = await fetch(`/api/templates/${d1.instance.templateId}`, { credentials: 'include' });
      const d2 = await r2.json();
      setTemplate(d2.template || d2);
      const initResponses: any = {};
      (d1.instance.responses || []).forEach((r: any) => { initResponses[r.nodeId] = r.value || ''; });
      setResponses(initResponses);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function saveProgress() {
    const updates = Object.entries(responses).map(([nodeId, value]) => ({ nodeId, value: value || '' }));
    await fetch(`/api/instances/${id}/responses`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }), credentials: 'include' });
  }

  async function submitChecklist() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/instances/${id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}), credentials: 'include' });
      if (res.ok) alert('Checklist submitted for approval!');
      else alert('Error submitting checklist');
    } catch (e) {
      alert('Error: ' + (e as any).message);
    } finally { setSubmitting(false); }
  }

  function renderNode(node: any, level: number = 0): React.ReactElement {
    const isQuestion = node.nodeType === 'QUESTION';
    const value = responses[node.nodeId] || '';
    const children = (node.children || []).map((c: any) => renderNode(c, level + 1));

    if (node.nodeType === 'SECTION' || node.nodeType === 'SUB_SECTION') {
      return (
        <div key={node.id} className="mb-4" style={{ marginLeft: `${level * 20}px` }}>
          <div className="font-semibold text-lg mb-2">{node.title}</div>
          {children}
        </div>
      );
    }

    if (isQuestion) {
      return (
        <div key={node.id} className="mb-3 p-3 border rounded bg-white" style={{ marginLeft: `${level * 20}px` }}>
          <label className="block font-medium">
            {node.title}
            {node.isRequired && <span className="text-red-600"> *</span>}
          </label>
          {node.helpText && <div className="text-xs text-gray-500 mb-2">{node.helpText}</div>}
          {node.inputType === 'text' && <input className="w-full p-2 border rounded" value={value} onChange={(e)=>setResponses({...responses, [node.id]: e.target.value})} />}
          {node.inputType === 'number' && <input className="w-full p-2 border rounded" type="number" value={value} onChange={(e)=>setResponses({...responses, [node.id]: e.target.value})} />}
          {node.inputType === 'checkbox' && <input className="mt-1" type="checkbox" checked={!!value} onChange={(e)=>setResponses({...responses, [node.id]: e.target.checked ? 'yes' : ''})} />}
          {node.inputType === 'yes_no' && (
            <select className="w-full p-2 border rounded" value={value} onChange={(e)=>setResponses({...responses, [node.id]: e.target.value})}>
              <option value="">Select...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          )}
          {node.inputType === 'dropdown' && node.options && (
            <select className="w-full p-2 border rounded" value={value} onChange={(e)=>setResponses({...responses, [node.id]: e.target.value})}>
              <option value="">Select...</option>
              {JSON.parse(node.options).map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
            </select>
          )}
          {node.inputType === 'date' && <input className="w-full p-2 border rounded" type="date" value={value} onChange={(e)=>setResponses({...responses, [node.id]: e.target.value})} />}
          {node.inputType === 'file_upload' && <input className="w-full p-2 border rounded" type="file" onChange={(e)=>{ /* file upload can be enhanced */ }} />}
        </div>
      );
    }

    return <></>;
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (!instance) return <div className="p-4">Instance not found</div>;

  const allNodes = (template?.nodes || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const rootNodes = allNodes.filter((n: any) => !n.parentNodeId);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">{template?.name}</h1>
      <div className="mb-2 text-sm text-gray-600">Status: {instance.status}</div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          {rootNodes.map((node: any) => renderNode(node))}
        </div>
        <div className="border rounded p-4 h-fit sticky top-4">
          <div className="font-medium mb-4">Actions</div>
          <div className="flex gap-2 flex-col">
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={saveProgress}>Save Draft</button>
            <button className="px-3 py-2 bg-green-600 text-white rounded" onClick={submitChecklist} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit for Review'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
