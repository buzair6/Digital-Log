import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function InstancesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-slate-50">{children}</main>
      </div>
    </div>
  );
}