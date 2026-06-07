"use client";
import React, { useEffect, useState } from 'react';

type Node = { id: string; title: string; nodeType: string; parentNodeId?: string | null; orderIndex?: number; children?: Node[] };

export default function TemplateBuilder({ templateId }: { templateId: string }) {
  const [template, setTemplate] = useState<any>(null);
  const [nodes, setNodes] = useState<Node[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [selected, setSelected] = useState<Node | null>(null);
  const [editing, setEditing] = useState<any>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      const data = await res.json();
      setTemplate(data.template);
      setNodes(data.nodes || []);
    } catch (e) {
      setNodes([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [templateId]);

  async function addRoot() {
    if (!newTitle) return;
    await fetch(`/api/templates/${templateId}/nodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle, nodeType: 'SECTION' }), credentials: 'include' });
    setNewTitle('');
    load();
  }

  async function addChild(parentId: string) {
    const title = prompt('Child title');
    if (!title) return;
    await fetch(`/api/templates/${templateId}/nodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentNodeId: parentId, title, nodeType: 'QUESTION' }), credentials: 'include' });
    load();
  }

  async function editNode(node: Node) {
    // open detail editor
    setSelected(node);
    setEditing({ title: node.title, nodeType: node.nodeType, inputType: (node as any).inputType ?? '', options: (node as any).options ?? '', isRequired: !!(node as any).isRequired, helpText: (node as any).helpText ?? '' });
  }

  function flatten(list: Node[]) {
    const out: Node[] = []
    function walk(nodes: Node[]) {
      for (const n of nodes) { out.push(n); if (n.children) walk(n.children); }
    }
    walk(list)
    return out
  }

  async function reorderUpdates(updates: any[]) {
    await fetch(`/api/templates/${templateId}/nodes/reorder`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }), credentials: 'include' });
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
    // Make dragged node a child of targetNode
    const updates = [{ id: draggedId, parentNodeId: targetNode.id, orderIndex: 0 }];
    await reorderUpdates(updates);
  }

  async function onDropOnRoot(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId) return;
    const updates = [{ id: draggedId, parentNodeId: null, orderIndex: 0 }];
    await reorderUpdates(updates);
  }

  async function moveUp(node: Node) {
    const flat = flatten(nodes || []);
    const siblings = flat.filter(n => (n.parentNodeId ?? null) === (node.parentNodeId ?? null)).sort((a,b)=> (a.orderIndex||0) - (b.orderIndex||0));
    const idx = siblings.findIndex(s=>s.id===node.id);
    if (idx <= 0) return;
    const prev = siblings[idx-1];
    const updates = [ { id: node.id, parentNodeId: node.parentNodeId ?? null, orderIndex: (prev.orderIndex||0) }, { id: prev.id, parentNodeId: prev.parentNodeId ?? null, orderIndex: (node.orderIndex||0) } ];
    await reorderUpdates(updates);
  }

  async function moveDown(node: Node) {
    const flat = flatten(nodes || []);
    const siblings = flat.filter(n => (n.parentNodeId ?? null) === (node.parentNodeId ?? null)).sort((a,b)=> (a.orderIndex||0) - (b.orderIndex||0));
    const idx = siblings.findIndex(s=>s.id===node.id);
    if (idx === -1 || idx >= siblings.length-1) return;
    const next = siblings[idx+1];
    const updates = [ { id: node.id, parentNodeId: node.parentNodeId ?? null, orderIndex: (next.orderIndex||0) }, { id: next.id, parentNodeId: next.parentNodeId ?? null, orderIndex: (node.orderIndex||0) } ];
    await reorderUpdates(updates);
  }

  async function changeParent(node: Node) {
    const flat = flatten(nodes || []);
    const options = ['ROOT: leave as root (null)'];
    for (const n of flat) { options.push(`${n.id} — ${n.title}`); }
    const choice = prompt(`Enter new parent id from list:\n${options.join('\n')}`);
    if (choice === null) return;
    let newParentId: string | null = null;
    if (choice.trim() && !choice.startsWith('ROOT')) newParentId = choice.split(' ')[0].trim();
    const updates = [ { id: node.id, parentNodeId: newParentId ?? null, orderIndex: 0 } ];
    await reorderUpdates(updates);
  }

  async function deleteNode(node: Node) {
    if (!confirm('Delete node and its children?')) return;
    await fetch(`/api/templates/${templateId}/nodes/${node.id}`, { method: 'DELETE', credentials: 'include' });
    load();
  }

  function renderTree(list: Node[]) {
    return (
      <ul onDragOver={(e) => e.preventDefault()} onDrop={(e)=>onDropOnRoot(e)}>
        {list.map((n) => (
          <li key={n.id} className="mb-2" draggable onDragStart={(e)=>onDragStart(e,n.id)} onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>onDropOnNode(e,n)}>
            <div className="flex items-center gap-2">
              <div className="font-medium cursor-pointer" onClick={() => editNode(n)}>{n.title}</div>
              <div className="text-sm text-gray-500">[{n.nodeType}]</div>
              <button className="ml-2 text-xs text-indigo-600" onClick={() => addChild(n.id)}>Add Child</button>
              <button className="ml-2 text-xs text-green-600" onClick={() => editNode(n)}>Edit</button>
              <button className="ml-2 text-xs text-gray-600" onClick={() => moveUp(n)}>↑</button>
              <button className="ml-2 text-xs text-gray-600" onClick={() => moveDown(n)}>↓</button>
              <button className="ml-2 text-xs text-purple-600" onClick={() => changeParent(n)}>Change Parent</button>
              <button className="ml-2 text-xs text-yellow-600" onClick={async () => {
                if (!confirm('Duplicate this node and its children?')) return;
                await fetch(`/api/templates/${templateId}/nodes/${n.id}/duplicate`, { method: 'POST', credentials: 'include' });
                load();
              }}>Duplicate</button>
              <button className="ml-2 text-xs text-red-600" onClick={() => deleteNode(n)}>Delete</button>
            </div>
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
      <div className="mb-4">
        <strong>{template.name}</strong> — v{template.version}
      </div>

      <div className="p-4 border rounded mb-4">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New root title" className="p-2 border mr-2" />
        <button onClick={addRoot} className="px-3 py-1 bg-indigo-600 text-white rounded">Add Root</button>
      </div>
      <div className="flex gap-6">
        <div className="flex-1">{nodes && nodes.length ? renderTree(nodes) : <div>No nodes</div>}</div>
        <div style={{ width: 360 }}>
          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Node Details</h3>
            {!selected && <div className="text-sm text-gray-500">Select a node to edit its details.</div>}
            {selected && (
              <form onSubmit={async (e) => { e.preventDefault();
                // save
                const payload = { title: editing.title, nodeType: editing.nodeType, inputType: editing.inputType || null, options: editing.options || null, isRequired: !!editing.isRequired, helpText: editing.helpText || null };
                await fetch(`/api/templates/${templateId}/nodes/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
                setSelected(null); setEditing({}); load();
              }}>
                <div className="mb-2">
                  <label className="block text-sm">Title</label>
                  <input className="w-full p-2 border" value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="mb-2">
                  <label className="block text-sm">Node Type</label>
                  <select className="w-full p-2 border" value={editing.nodeType || ''} onChange={(e) => setEditing({ ...editing, nodeType: e.target.value })}>
                    <option value="SECTION">SECTION</option>
                    <option value="QUESTION">QUESTION</option>
                    <option value="SUB_SECTION">SUB_SECTION</option>
                  </select>
                </div>
                {editing.nodeType === 'QUESTION' && (
                  <>
                    <div className="mb-2">
                      <label className="block text-sm">Input Type</label>
                      <select className="w-full p-2 border" value={editing.inputType || ''} onChange={(e) => setEditing({ ...editing, inputType: e.target.value })}>
                        <option value="">(none)</option>
                        <option value="text">text</option>
                        <option value="number">number</option>
                        <option value="checkbox">checkbox</option>
                        <option value="dropdown">dropdown</option>
                        <option value="date">date</option>
                        <option value="file_upload">file_upload</option>
                        <option value="yes_no">yes_no</option>
                        <option value="signature">signature</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm">Options (JSON)</label>
                      <textarea rows={3} className="w-full p-2 border" value={editing.options || ''} onChange={(e) => setEditing({ ...editing, options: e.target.value })} />
                    </div>
                    <div className="mb-2">
                      <label className="inline-flex items-center"><input type="checkbox" checked={!!editing.isRequired} onChange={(e) => setEditing({ ...editing, isRequired: e.target.checked })} className="mr-2" />Required</label>
                    </div>
                    <div className="mb-2">
                      <label className="block text-sm">Help Text</label>
                      <input className="w-full p-2 border" value={editing.helpText || ''} onChange={(e) => setEditing({ ...editing, helpText: e.target.value })} />
                    </div>
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
