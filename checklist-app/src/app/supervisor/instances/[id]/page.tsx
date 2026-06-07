"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SupervisorInstancePage() {
  const router = useRouter();
  const params = useParams() as any;
  const id = params.id;
  const [instance, setInstance] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [modal, setModal] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const r1 = await fetch(`/api/instances/${id}`);
      const d1 = await r1.json();
      if (d1.error) { setInstance(null); return; }
      setInstance(d1.instance);
      const r2 = await fetch(`/api/templates/${d1.instance.templateId}`);
      const d2 = await r2.json();
      setTemplate(d2.template ?? d2);
      const r3 = await fetch(`/api/instances/${id}/comments`);
      const d3 = await r3.json();
      setComments(d3.comments || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (id) load(); }, [id]);

  function nodeTitle(nodeId: string) {
    if (!template || !template.nodes) return nodeId;
    const n = template.nodes.find((x:any)=>x.id===nodeId);
    return n ? n.title : nodeId;
  }

  async function postComment(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;
    const payload: any = { text: newComment };
    if (selectedNode) payload.nodeId = selectedNode;
    await fetch(`/api/instances/${id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    setNewComment(''); setSelectedNode(null); load();
  }

  async function approveInstance() {
    setModal({ type: 'approve', text: '' });
  }

  async function confirmApprove() {
    await fetch(`/api/instances/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comments: modal.text }), credentials: 'include' });
    setModal(null);
    load();
  }

  async function requestRevision() {
    setModal({ type: 'revision', text: '' });
  }

  async function confirmRevision() {
    if (!modal.text.trim()) { alert('Revision comment required'); return; }
    await fetch(`/api/instances/${id}/request-revision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comments: modal.text }), credentials: 'include' });
    setModal(null);
    load();
  }

  async function rejectInstance() {
    setModal({ type: 'reject', text: '' });
  }

  async function confirmReject() {
    if (!modal.text.trim()) { alert('Rejection reason required'); return; }
    await fetch(`/api/instances/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comments: modal.text }), credentials: 'include' });
    setModal(null);
    load();
  }

  if (loading) return <div>Loading...</div>;
  if (!instance) return <div>Instance not found or access denied.</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Review: {template?.name || instance.templateId}</h1>
      <div className="mb-4">
        <strong>Status:</strong> {instance.status}
        <div><strong>Assigned to:</strong> {instance.assignedToUser?.fullName ?? instance.assignedToUser?.email ?? 'Unassigned'}</div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <h2 className="font-medium mb-2">Responses</h2>
          <div className="border rounded p-3">
            {instance.responses && instance.responses.length ? instance.responses.map((r:any)=> (
              <div key={r.id} className="mb-3 p-2 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{nodeTitle(r.nodeId)}</div>
                    <div className="text-sm text-gray-600">Answered by: {r.filledByUserId}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-blue-600" onClick={()=>setSelectedNode(r.nodeId)}>Comment</button>
                  </div>
                </div>
                <div className="mt-2">{r.value ?? (r.fileUrl ? <a href={r.fileUrl}>File</a> : <em>(no value)</em>)}</div>
                <div className="mt-2">
                  {comments.filter(c=>c.nodeId===r.nodeId).map(c=> (
                    <div key={c.id} className="mt-1 p-2 bg-gray-50 rounded">
                      <div className="text-sm"><strong>{c.author.fullName ?? c.author.email}</strong> — <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span></div>
                      <div>{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )) : <div>No responses yet</div>}
          </div>
        </div>
        <div>
          <h2 className="font-medium mb-2">Comments</h2>
          <div className="border rounded p-3 mb-3">
            <form onSubmit={postComment}>
              <div className="mb-2">
                <label className="block text-sm">Target node</label>
                <select value={selectedNode||''} onChange={(e)=>setSelectedNode(e.target.value||null)} className="w-full p-2 border">
                  <option value="">(General comment)</option>
                  {template?.nodes?.map((n:any)=>(<option key={n.id} value={n.id}>{n.title}</option>))}
                </select>
              </div>
              <div className="mb-2">
                <label className="block text-sm">Comment</label>
                <textarea className="w-full p-2 border" rows={4} value={newComment} onChange={(e)=>setNewComment(e.target.value)} />
              </div>
                <div className="flex gap-2">
                <button className="px-3 py-1 bg-yellow-500 text-white rounded" type="submit">Add Comment</button>
                <button className="px-3 py-1 bg-green-600 text-white rounded" type="button" onClick={approveInstance}>Approve</button>
                <button className="px-3 py-1 bg-orange-500 text-white rounded" type="button" onClick={requestRevision}>Request Revision</button>
                <button className="px-3 py-1 bg-red-600 text-white rounded" type="button" onClick={rejectInstance}>Reject</button>
              </div>
            </form>
          </div>

          <div className="border rounded p-3">
            <h3 className="font-medium mb-2">All comments</h3>
            {comments.length ? comments.map(c=> (
              <div key={c.id} className="mb-2 p-2 bg-gray-50 rounded">
                <div className="text-sm"><strong>{c.author.fullName ?? c.author.email}</strong> — <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span></div>
                <div>{c.text}</div>
              </div>
            )) : <div>No comments</div>}
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg max-w-md w-full">
            <h2 className="font-medium mb-2">
              {modal.type === 'approve' && 'Approve Checklist'}
              {modal.type === 'revision' && 'Request Revision'}
              {modal.type === 'reject' && 'Reject Checklist'}
            </h2>
            <textarea className="w-full p-2 border rounded mb-2" rows={4} placeholder="Enter your comment..." value={modal.text} onChange={(e)=>setModal({...modal, text: e.target.value})} />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={()=>setModal(null)}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>{
                if (modal.type === 'approve') confirmApprove();
                if (modal.type === 'revision') confirmRevision();
                if (modal.type === 'reject') confirmReject();
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
