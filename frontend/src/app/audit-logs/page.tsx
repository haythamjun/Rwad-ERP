'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ClipboardList, Search } from 'lucide-react';

interface AuditLog {
  id: number;
  user_name: string | null;
  action_display: string;
  object_repr: string;
  ip_address: string | null;
  timestamp: string;
}

const ACTION_COLORS: Record<string, string> = {
  إضافة: 'bg-green-100 text-green-700',
  تعديل: 'bg-blue-100 text-blue-700',
  حذف: 'bg-red-100 text-red-700',
  عرض: 'bg-gray-100 text-gray-600',
  'تسجيل دخول': 'bg-purple-100 text-purple-700',
  'تسجيل خروج': 'bg-orange-100 text-orange-700',
  تصدير: 'bg-yellow-100 text-yellow-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/core/audit-logs/')
      .then((res) => setLogs(res.data.results ?? res.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) =>
    log.object_repr?.includes(search) ||
    log.user_name?.includes(search) ||
    log.action_display?.includes(search)
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="text-brand" size={24} />
        <h1 className="text-2xl font-bold text-gray-800">سجل العمليات</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="بحث..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-lg py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">لا توجد سجلات</div>
        ) : (
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-4 py-3">المستخدم</th>
                <th className="px-4 py-3">العملية</th>
                <th className="px-4 py-3">العنصر</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {log.user_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action_display] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.object_repr || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip_address ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(log.timestamp).toLocaleString('ar-SA')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
