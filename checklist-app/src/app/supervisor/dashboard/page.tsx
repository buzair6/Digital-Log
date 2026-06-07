import React from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardStats from '@/components/DashboardStats';

export const metadata = { title: 'Supervisor Dashboard' };

export default async function SupervisorDashboard() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">Supervisor Dashboard</h1>
        {/* @ts-expect-error Server component includes client component */}
        <DashboardStats role="SUPERVISOR" />
      </main>
    </div>
  );
}
