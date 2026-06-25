'use client';
import { useEffect, useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Notif = { id: string; title: string; body?: string; url?: string; isRead: boolean };

export default function TopBar() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setNotifs(d.notifications || []))
      .catch(() => {});
  }, []);

  const unread = notifs.filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    setNotifs((p) => p.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  return (
    <div className="w-full bg-white border-b px-4 py-2.5 flex items-center justify-between">
      <div className="font-semibold text-gray-800">Checklist App</div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="relative p-1.5 rounded-lg hover:bg-gray-100">
            <Bell className="w-5 h-5 text-gray-600" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b font-medium text-sm">Notifications</div>
              <div className="max-h-72 overflow-y-auto">
                {notifs.length ? (
                  notifs.map((n) => (
                    <a
                      key={n.id}
                      href={n.url || '#'}
                      onClick={() => markRead(n.id)}
                      className={`block px-3 py-2 border-b hover:bg-gray-50 ${n.isRead ? '' : 'bg-indigo-50'}`}
                    >
                      <div className="text-sm font-medium text-gray-900">{n.title}</div>
                      {n.body && <div className="text-xs text-gray-500 mt-0.5">{n.body}</div>}
                    </a>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-gray-400">No notifications</div>
                )}
              </div>
            </div>
          )}
        </div>
        <button onClick={logout} className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );
}