'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) router.replace('/login');
    }, 4000);

    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        done = true;
        clearTimeout(timeout);
        const role = (d?.user?.role || '').toUpperCase();
        if (role === 'ADMIN') router.replace('/admin/dashboard');
        else if (d?.user) router.replace('/dashboard');
        else router.replace('/login');
      })
      .catch(() => {
        done = true;
        clearTimeout(timeout);
        router.replace('/login');
      });

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      Loading…
    </div>
  );
}
