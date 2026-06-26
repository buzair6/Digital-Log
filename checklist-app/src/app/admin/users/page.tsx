import React from 'react';
import UserList from '@/components/UserList';

export const metadata = { title: 'User Management' };

export default function UsersPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">User Management</h1>
      <UserList />
    </main>
  );
}
