"use client";
import React, { useEffect, useState } from 'react';

type Node = { id: string; title: string; nodeType: string; parentNodeId?: string | null; orderIndex?: number; children?: Node[] };

const INPUT_TYPES = ['text', 'number', 'checkbox', 'dropdown', 'date', 'file_upload', 'yes_no', 'signature'];

export default function TemplateBuilder({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<any>(null);
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [selected, setSelected] = useState<Node | null>(null);
  const [editing, setEditing] = useState<any>({});
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [childForm, setChildForm] = useState<any>({ title: '', nodeType: 'QUESTION', inputType: 'text', options: '', isRequired: false });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      const data = await res.json();
      setTemplate(data.template || data);
      setNodes((data.nodes || data.template?.nodes || []).map((n: any) => ({
        ...n,
        children: n.children || [],
      })));
    } catch (e) {
      setNodes([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [templateId]);

  async function addRoot() {
    if (!newTitle) return;
    await fetch(`/api/templates/${templateId}/nodes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, nodeType: 'SECTION' }), credentials: 'include',
    });
    setNewTitle('');
    load();
  }

  function openAddChild(parentId: string) {
    setAddingParentId(parentId);
    setChildForm({ title: '', nodeType: 'QUESTION', inputType: 'text', options: '', isRequired: false });
  }

  async function submitChild(e: React.FormEvent) {
    e.preventDefault();
    if (!childForm.title.trim()) return;
    const payload: any = {
      parentNodeId: addingParentId,
      title: childForm.title,
      nodeType: childForm.nodeType,
      isRequired: !!childForm.isRequired,
    };
    if (childForm.nodeType === 'QUESTION') {
      payload.inputType = childForm.inputType || 'text';
      if (childForm.inputType === 'dropdown' && childForm.options.trim()) {
        let opts: string[];
        try { opts = JSON.parse(childForm.options); }
        catch { opts = childForm.options.split(',').map((s: string) => s.trim()).filter(Boolean); }
        payload.options = JSON.stringify(opts);
      }
    }
    await fetch(`/api/templates/${templateId}/nodes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), credentials: 'include',
    });
    setAddingParentId(null);
    load();
  }

  async function editNode(node: Node) {
    setSelected(node);
    setEditing({
      title: node.title,
      nodeType: node.nodeType,
      inputType: (node as any).inputType ?? '',
      options: (node as any).options ?? '',
      isRequired: !!(node as any).isRequired,
      helpText: (node as any).helpText ?? '',
      minValue: (node as any).minValue ?? '',
      maxValue: (node as any).maxValue ?? '',
      exceptionAction: (node as any).exceptionAction ?? '',
    });
  }

  function flatten(list: Node[]) {
    const out: Node[] = [];
    function walk(nodes: Node[]) { for (const n of nodes) { out.push(n); if (n.children) walk(n.children); } }
    walk(list);
    return out;
  }

  async function reorderUpdates(updates: any[]) {
    await fetch(`/api/templates/${templateId}/nodes/reorder`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }), credentials: 'include',
    });
    load();
  }

  function onDragStart(e: React.DragEvent, nodeId: string) {
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
  }
  async function onDropOnNode(e: React.DragEvent, targetNode: Node) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetNode.id) return;
    await reorderUpdates([{ id: draggedId, parentNodeId: targetNode.id, orderIndex: 0 }]);
  }
  async function onDropOnRoot(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;
    await reorderUpdates([{ id: draggedId, parentNodeId: null, orderIndex: 0 }]);
  }

  async function moveUp(node: Node) {
    const flat = flatten(nodes || []);
    const siblings = flat.filter(n => (n.parentNodeId ?? null) === (node.parentNodeId ?? null)).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const idx = siblings.findIndex(s => s.id === node.id);
    if (idx <= 0) return;
    const prev = siblings[idx - 1];
    await reorderUpdates([
      { id: node.id, parentNodeId: node.parentNodeId ?? null, orderIndex: (prev.orderIndex || 0) },
      { id: prev.id, parentNodeId: prev.parentNodeId ?? null, orderIndex: (node.orderIndex || 0) },
    ]);
  }
  async function moveDown(node: Node) {
    const flat = flatten(nodes || []);
    const siblings = flat.filter(n => (n.parentNodeId ?? null) === (node.parentNodeId ?? null)).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    const idx = siblings.findIndex(s => s.id === node.id);
    if (idx === -1 || idx >= siblings.length - 1) return;
    const next = siblings[idx + 1];
    await reorderUpdates([
      { id: node.id, parentNodeId: node.parentNodeId ?? null, orderIndex: (next.orderIndex || 0) },
      { id: next.id, parentNodeId: next.parentNodeId ?? null, orderIndex: (node.orderIndex || 0) },
    ]);
  }

  async function deleteNode(node: Node) {
    if (!confirm('Delete node and its children?')) return;
    await fetch(`/api/templates/${templateId}/nodes/${node.id}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  function renderTree(list: Node[]) {
    return (
      <ul onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDropOnRoot(e)}>
        {list.map((n) => (
          <li key={n.id} className="mb-2" draggable onDragStart={(e) => onDragStart(e, n.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDropOnNode(e, n)}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium cursor-pointer" onClick={() => editNode(n)}>{n.title}</div>
              <div className="text-sm text-gray-500">[{n.nodeType}{(n as any).inputType ? `:${(n as any).inputType}` : ''}]</div>
              {n.nodeType !== 'QUESTION' && (
                <button className="ml-2 text-xs text-indigo-600" onClick={() => openAddChild(n.id)}>Add Child</button>
              )}
              <button className="ml-2 text-xs text-green-600" onClick={() => editNode(n)}>Edit</button>
              <button className="ml-2 text-xs text-gray-600" onClick={() => moveUp(n)}>↑</button>
              <button className="ml-2 text-xs text-gray-600" onClick={() => moveDown(n)}>↓</button>
              <button className="ml-2 text-xs text-red-600" onClick={() => deleteNode(n)}>Delete</button>
            </div>

            {addingParentId === n.id && (
              <form onSubmit={submitChild} className="ml-6 mt-2 p-3 border rounded bg-slate-50 grid gap-2 max-w-md">
                <input className="p-2 border rounded" placeholder="Question / section title"
                  value={childForm.title} onChange={(e) => setChildForm({ ...childForm, title: e.target.value })} autoFocus />
                <div className="flex gap-2">
                  <select className="p-2 border rounded flex-1" value={childForm.nodeType}
                    onChange={(e) => setChildForm({ ...childForm, nodeType: e.target.value })}>
                    <option value="QUESTION">QUESTION</option>
                    <option value="SUB_SECTION">SUB_SECTION</option>
                    <option value="SECTION">SECTION</option>
                  </select>
                  {childForm.nodeType === 'QUESTION' && (
                    <select className="p-2 border rounded flex-1" value={childForm.inputType}
                      onChange={(e) => setChildForm({ ...childForm, inputType: e.target.value })}>
                      {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
                {childForm.nodeType === 'QUESTION' && childForm.inputType === 'dropdown' && (
                  <input className="p-2 border rounded" placeholder='Options: comma-separated e.g. Low,Medium,High'
                    value={childForm.options} onChange={(e) => setChildForm({ ...childForm, options: e.target.value })} />
                )}
                {childForm.nodeType === 'QUESTION' && (
                  <label className="inline-flex items-center text-sm">
                    <input type="checkbox" className="mr-2" checked={childForm.isRequired}
                      onChange={(e) => setChildForm({ ...childForm, isRequired: e.target.checked })} /> Required
                  </label>
                )}
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Add</button>
                  <button type="button" className="px-3 py-1 border rounded text-sm" onClick={() => setAddingParentId(null)}>Cancel</button>
                </div>
              </form>
            )}

            {n.children && n.children.length > 0 && <div className="ml-6">{renderTree(n.children)}</div>}
          </li>
        ))}
      </ul>
    );
  }

  if (loading) return <div>Loading template...</div>;
  if (!template) return <div>Template not found</div>;

  return (
    <div>
      <div className="mb-4"><strong>{template.name}</strong> · v{template.version}</div>

      <div className="p-4 border rounded mb-4">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New section title" className="p-2 border rounded mr-2" />
        <button onClick={addRoot} className="px-3 py-1 bg-indigo-600 text-white rounded">Add Section</button>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">{nodes && nodes.length ? renderTree(nodes) : <div>No nodes yet. Add a section, then add questions inside it.</div>}</div>

        <div style={{ width: 360 }}>
          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Node Details</h3>
            {!selected && <div className="text-sm text-gray-500">Select a node to edit its details.</div>}
            {selected && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const payload = {
                  title: editing.title,
                  nodeType: editing.nodeType,
                  inputType: editing.inputType || null,
                  options: editing.options || null,
                  isRequired: !!editing.isRequired,
                  helpText: editing.helpText || null,
                  minValue: editing.minValue || null,
                  maxValue: editing.maxValue || null,
                  exceptionAction: editing.exceptionAction || null,
                };
                await fetch(`/api/templates/${templateId}/nodes/${selected.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload), credentials: 'include',
                });
                setSelected(null); setEditing({}); load();
              }}>
                <div className="mb-2">
                  <label className="block text-sm">Title</label>
                  <input className="w-full p-2 border rounded" value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="mb-2">
                  <label className="block text-sm">Node Type</label>
                  <select className="w-full p-2 border rounded" value={editing.nodeType || ''} onChange={(e) => setEditing({ ...editing, nodeType: e.target.value })}>
                    <option value="SECTION">SECTION</option>
                    <option value="QUESTION">QUESTION</option>
                    <option value="SUB_SECTION">SUB_SECTION</option>
                  </select>
                </div>
                {editing.nodeType === 'QUESTION' && (
                  <>
                    <div className="mb-2">
                      <label className="block text-sm">Input Type</label>
                      <select className="w-full p-2 border rounded" value={editing.inputType || ''} onChange={(e) => setEditing({ ...editing, inputType: e.target.value })}>
                        <option value="">(none)</option>
                        {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm">Options (comma-separated or JSON)</label>
                      <textarea rows={3} className="w-full p-2 border rounded" value={editing.options || ''} onChange={(e) => setEditing({ ...editing, options: e.target.value })} />
                    </div>
                    <div className="mb-2">
                      <label className="inline-flex items-center"><input type="checkbox" checked={!!editing.isRequired} onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })} className="mr-2" />Required</label>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm">Help Text</label>
                      <input className="w-full p-2 border rounded" value={editing.helpText || ''} onChange={(e) => setEditing({ ...editing, helpText: e.target.value })} />
                    </div>
                    {editing.inputType === 'number' && (
                      <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded">
                        <div className="text-xs font-medium text-amber-800 mb-2">Exception Detection (optional)</div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Min</label>
                            <input className="w-full p-2 border rounded text-sm" type="number" value={editing.minValue || ''} onChange={(e) => setEditing({ ...editing, minValue: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Max</label>
                            <input className="w-full p-2 border rounded text-sm" type="number" value={editing.maxValue || ''} onChange={(e) => setEditing({ ...editing, maxValue: e.target.value })} />
                          </div>
                        </div>
                        <input className="w-full p-2 border rounded text-sm" value={editing.exceptionAction || ''} onChange={(e) => setEditing({ ...editing, exceptionAction: e.target.value })} placeholder="Corrective action when out of range" />
                      </div>
                    )}
                  </>
                )}
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded" type="submit">Save</button>
                  <button className="px-3 py-1 border rounded" type="button" onClick={() => { setSelected(null); setEditing({}); }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}