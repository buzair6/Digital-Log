'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const role = (d?.user?.role || '').toUpperCase();
        if (role === 'ADMIN') router.replace('/admin/dashboard');
        else if (d?.user) router.replace('/dashboard');
        else router.replace('/login');
      })
      .catch(() => router.replace('/login'));
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
  );
}