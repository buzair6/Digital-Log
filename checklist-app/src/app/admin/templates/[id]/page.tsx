import React from 'react';
import TemplateBuilder from '@/components/TemplateBuilder';

export default async function TemplateDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Template Builder</h1>
      <TemplateBuilder templateId={id} />
    </main>
  );
}
