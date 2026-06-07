import React from 'react';
import Sidebar from '@/components/Sidebar';

export const metadata = { title: 'Templates' };

export default function TemplatesPage() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">Checklist Templates</h1>
        <div>
          <a className="px-4 py-2 bg-indigo-600 text-white rounded" href="/admin/templates/new">Create Template</a>
        </div>
        <div className="mt-6">
          {/* simple list fetched client-side in future; for now show link to templates API */}
          <p>Templates are managed via the API. Use the builder to edit nodes.</p>
          <p className="mt-2 text-sm text-gray-500">Open a template: <a href="/admin/templates/" className="text-indigo-600">/admin/templates/[id]</a></p>
        </div>
      </main>
    </div>
  );
}
