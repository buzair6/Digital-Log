import React from 'react';
import Sidebar from '@/components/Sidebar';
import UserList from '@/components/UserList';

export const metadata = { title: 'User Management' };

export default function UsersPage() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">User Management</h1>
        <UserList />
      </main>
    </div>
  );
}
