import React from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardStats from '@/components/DashboardStats';
import Link from 'next/link';
import { Plus, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Admin Dashboard' };

export default async function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
          <Link href="/admin/instances" className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> New Checklist
          </Link>
        </div>
        <DashboardStats role="ADMIN" />
        <div className="mt-6">
          <Link href="/admin/instances" className="text-indigo-600 hover:underline text-sm flex items-center gap-1">
            Manage all checklist instances <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
