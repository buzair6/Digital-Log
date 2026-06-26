'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, QrCode, Printer } from 'lucide-react';
import QRCode from 'qrcode';

type Asset = { id: string; tag: string; name: string; location: string | null; notes: string | null };

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [form, setForm] = useState({ tag: '', name: '', location: '', notes: '' });
  const [toast, setToast] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<Asset | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2000); }

  async function load() {
    const d = await fetch('/api/assets', { credentials: 'include' }).then((r) => r.json());
    setAssets(d.assets || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
    if (res.ok) { flash('Asset created'); setForm({ tag: '', name: '', location: '', notes: '' }); load(); }
    else { const d = await res.json(); flash(d.error || 'Failed'); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this asset?')) return;
    await fetch(`/api/assets?id=${id}`, { method: 'DELETE', credentials: 'include' });
    flash('Deleted'); load();
  }

  async function showQr(a: Asset) {
    const url = await QRCode.toDataURL(a.tag, { width: 320, margin: 2 });
    setQrDataUrl(url);
    setQrFor(a);
  }

  function printQr() {
    if (!qrFor || !qrDataUrl) return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) { flash('Pop-up blocked — allow pop-ups to print'); return; }
    w.document.write(`
      <html><head><title>QR ${qrFor.tag}</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:24px;}
        img{width:280px;height:280px;}
        .tag{font-family:monospace;font-size:18px;margin-top:8px;}
        .name{font-size:14px;color:#444;margin-top:4px;}
      </style></head>
      <body onload="window.print(); setTimeout(()=>window.close(),300);">
        <img src="${qrDataUrl}" />
        <div class="tag">${qrFor.tag}</div>
        <div class="name">${qrFor.name}${qrFor.location ? ' — ' + qrFor.location : ''}</div>
      </body></html>`);
    w.document.close();
  }

  return (
    <main className="flex-1 p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Assets</h1>
      <form onSubmit={create} className="bg-white border rounded-xl p-5 mb-6 grid grid-cols-2 gap-3">
        <div className="col-span-2 font-medium text-gray-900">Register asset</div>
        <input className="px-3 py-2 border rounded-lg" placeholder="Barcode / QR tag" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} required />
        <input className="px-3 py-2 border rounded-lg" placeholder="Asset name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="px-3 py-2 border rounded-lg" placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="col-span-2"><button className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1.5" type="submit"><Plus className="w-4 h-4" /> Add Asset</button></div>
      </form>

      {toast && <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">{toast}</div>}

      {qrFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setQrFor(null)}>
          <div className="bg-white rounded-xl p-6 w-80 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="font-medium text-gray-900 mb-1">{qrFor.name}</div>
            <div className="font-mono text-sm text-gray-500 mb-3">{qrFor.tag}</div>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="mx-auto w-48 h-48" />}
            <div className="flex gap-2 mt-4">
              <button onClick={printQr} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-1.5"><Printer className="w-4 h-4" /> Print</button>
              <button onClick={() => setQrFor(null)} className="px-3 py-2 border rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {!assets ? <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div> :
       assets.length === 0 ? <div className="bg-white border rounded-xl p-12 text-center text-gray-400">No assets registered yet.</div> : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left"><tr><th className="p-3">Tag</th><th className="p-3">Name</th><th className="p-3">Location</th><th className="p-3">QR</th><th className="p-3">Scan</th><th className="p-3"></th></tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-gray-900">{a.tag}</td>
                  <td className="p-3 font-medium text-gray-900">{a.name}</td>
                  <td className="p-3 text-gray-700">{a.location || '—'}</td>
                  <td className="p-3"><button onClick={() => showQr(a)} className="text-indigo-600 hover:underline text-xs flex items-center gap-1"><QrCode className="w-3.5 h-3.5" /> QR / Print</button></td>
                  <td className="p-3"><a href={`/instances/scan?asset=${a.tag}`} className="text-blue-600 hover:underline text-xs">Scan</a></td>
                  <td className="p-3 text-right"><button onClick={() => remove(a.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}