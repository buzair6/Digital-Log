import React from 'react';
import Sidebar from '@/components/Sidebar';
import TemplateBuilder from '@/components/TemplateBuilder';

export default function TemplateDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  return (
    <div className="flex">
      <Sidebar />
      <main className="p-6 flex-1">
        <h1 className="text-2xl font-semibold mb-4">Template Builder</h1>
        <TemplateBuilder templateId={id} />
      </main>
    </div>
  );
}
