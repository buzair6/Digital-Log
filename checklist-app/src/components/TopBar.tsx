'use client';
import { ClipboardList } from 'lucide-react';

export default function TopBar() {
  return (
    <header className="bg-white border-b">
      <div className="px-6 py-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-indigo-600" />
        <span className="font-semibold text-gray-900">Digital Log</span>
      </div>
    </header>
  );
}