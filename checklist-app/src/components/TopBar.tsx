"use client"
import React, { useEffect, useState } from 'react';

export default function TopBar() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'include' }).then(r=>r.json()).then(d=>setNotifications(d.notifications||[])).catch(()=>{});
  }, []);

  const unreadCount = notifications.filter(n=>!n.isRead).length;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
    setNotifications((prev)=> prev.map(n=> n.id===id ? { ...n, isRead: true } : n));
  }

  async function markAll() {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ readAll: true }), credentials: 'include' });
    setNotifications((prev)=> prev.map(n=> ({ ...n, isRead: true })));
  }

  return (
    <div className="w-full bg-white border-b p-3 flex items-center justify-between">
      <div className="font-semibold">Checklist App</div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button onClick={()=>setOpen(!open)} className="relative">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {unreadCount>0 && <span className="absolute -top-1 -right-2 bg-red-500 text-white rounded-full text-xs px-1">{unreadCount}</span>}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow p-2 z-50">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">Notifications</div>
                <button className="text-xs text-blue-600" onClick={markAll}>Mark all read</button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length ? notifications.map(n=> (
                  <div key={n.id} className={`p-2 border-b ${n.isRead? 'bg-white' : 'bg-gray-50'}`}>
                    <a href={n.url} onClick={()=> markRead(n.id)} className="block text-sm font-medium">{n.title}</a>
                    <div className="text-xs text-gray-600">{n.body}</div>
                  </div>
                )) : <div className="text-sm text-gray-500">No notifications</div>}
              </div>
            </div>
          )}
        </div>
        <div className="text-sm">Profile</div>
      </div>
    </div>
  );
}
