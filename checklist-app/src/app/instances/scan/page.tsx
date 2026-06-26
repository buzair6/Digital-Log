'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanLine, Camera } from 'lucide-react';

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetTag = searchParams.get('asset') || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tag, setTag] = useState(presetTag);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  async function startCamera() {
    setError(null);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Camera requires HTTPS or localhost. Use the manual entry below.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not available in this browser. Use manual entry below.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);

      const BD = (window as any).BarcodeDetector;
      if (BD) {
        detectorRef.current = new BD({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'] });
        tick();
      } else {
        setError('Barcode detection not supported in this browser (use Chrome/Edge). Enter the tag manually below.');
        setScanning(false);
      }
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') setError('Camera permission denied. Allow access or use manual entry below.');
      else if (e?.name === 'NotFoundError') setError('No camera detected. Use manual entry below.');
      else setError('Could not start camera. Use manual entry below.');
      setScanning(false);
    }
  }

  function tick() {
    if (!detectorRef.current || !videoRef.current) return;
    detectorRef.current.detect(videoRef.current).then((found: any[]) => {
      if (found && found.length) {
        const value = found[0].rawValue;
        setTag(value);
        stopCamera();
        lookupAndStart(value);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }).catch(() => { rafRef.current = requestAnimationFrame(tick); });
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    detectorRef.current = null;
    const s = videoRef.current?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function lookupAndStart(tagValue: string) {
    const res = await fetch('/api/assets', { credentials: 'include' });
    const d = await res.json();
    const asset = (d.assets || []).find((a: any) => a.tag === tagValue);
    if (!asset) { setError(`No asset with tag "${tagValue}". Register it first.`); return; }
    sessionStorage.setItem('pendingAssetId', asset.id);
    router.push(`/instances/new?assetId=${asset.id}`);
  }

  return (
    <>
      {error && <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}
      <div className="bg-white border rounded-xl p-6">
        <video ref={videoRef} className={`w-full rounded-lg mb-4 ${scanning ? '' : 'hidden'}`} playsInline muted />
        {!scanning && <div className="text-center py-8 text-gray-400"><Camera className="w-10 h-10 mx-auto mb-2" /><div>Camera preview will appear here.</div></div>}
        {!scanning && <button onClick={startCamera} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-700"><ScanLine className="w-4 h-4" /> Start scanning</button>}
        {scanning && <button onClick={stopCamera} className="w-full px-4 py-2 border rounded-lg">Stop</button>}
        <div className="mt-4 border-t pt-4">
          <label className="block text-xs text-gray-500 mb-1">Or enter tag manually</label>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 border rounded-lg" placeholder="Asset tag" value={tag} onChange={(e) => setTag(e.target.value)} />
            <button onClick={() => tag && lookupAndStart(tag)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Look up</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b"><div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-2"><ScanLine className="w-5 h-5 text-indigo-600" /><h1 className="font-semibold text-gray-900">Scan Asset to Start Round</h1></div></header>
      <main className="max-w-2xl mx-auto px-6 py-8">
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading...</div>}>
          <ScanContent />
        </Suspense>
      </main>
    </div>
  );
}