'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, LayoutDashboard, FileText, Users, Group, ScrollText, LogOut } from 'lucide-react';

type Me = { id: string; email: string; fullName?: string | null; role: string };

export default function Sidebar() {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setMe(d?.user ?? null))
      .catch(() => setMe(null));
  }, []);

  const isAdmin = (me?.role || '').toUpperCase() === 'ADMIN';

  const adminLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/templates', label: 'Templates', icon: FileText },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/groups', label: 'Groups', icon: Group },
    { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  ];
  const userLinks = [
    { href: '/dashboard', label: 'My Checklists', icon: ClipboardList },
  ];

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
  }

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/');
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-300 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-white">Digital Log</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {userLinks.map((l) => (
          <NavLink key={l.href} {...l} active={isActive(l.href)} />
        ))}
        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-xs uppercase tracking-wider text-slate-500">Management</div>
            {adminLinks.map((l) => (
              <NavLink key={l.href} {...l} active={isActive(l.href)} />
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <div className="px-2 pb-3">
          <div className="text-sm text-white truncate">{me?.fullName || me?.email || '—'}</div>
          <div className="text-xs text-slate-500">{me?.role}</div>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );
}

function NavLink({
  href, label, icon: Icon, active,
}: { href: string; label: string; icon: any; active: boolean }) {
  return (
    <a
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </a>
  );
}