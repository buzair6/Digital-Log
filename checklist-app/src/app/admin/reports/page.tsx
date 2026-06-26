'use client';
import { Download, FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Reports & Export</h1>
      <div className="grid grid-cols-2 gap-4">
        <a href="/api/reports/summary" className="bg-white border rounded-xl p-6 hover:shadow-sm transition flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">Summary Report</div>
            <div className="text-sm text-gray-500 mt-0.5">
              One row per checklist instance with status, assignee, created/submitted dates. Opens in Excel.
            </div>
            <div className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Download CSV
            </div>
          </div>
        </a>
        <a href="/api/reports/responses" className="bg-white border rounded-xl p-6 hover:shadow-sm transition flex items-start gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">Detailed Responses Export</div>
            <div className="text-sm text-gray-500 mt-0.5">
              One row per answered question across all checklists — question, value, who filled it, when.
            </div>
            <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" /> Download CSV
            </div>
          </div>
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-6">CSV files open directly in Microsoft Excel and Google Sheets.</p>
    </main>
  );
}
