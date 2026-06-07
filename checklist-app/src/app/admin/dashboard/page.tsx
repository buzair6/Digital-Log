import React from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardStats from '@/components/DashboardStats';

export const metadata = { title: 'Admin Dashboard' };

export default async function AdminDashboard() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
        {/* @ts-expect-error Server component includes client component */}
        <DashboardStats role="ADMIN" />
      </main>
    </div>
  );
}
