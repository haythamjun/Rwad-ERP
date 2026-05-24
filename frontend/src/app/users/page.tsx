'use client';

import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';
import Header from '@/components/layout/Header';
import { ShieldAlert } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  manager:    'bg-orange-100 text-orange-700',
  specialist: 'bg-blue-100 text-blue-700',
  reception:  'bg-green-100 text-green-700',
  viewer:     'bg-gray-100 text-gray-600',
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  // All hooks must be called before any conditional return
  const { data, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => authApi.users().then((r) => r.data.results || r.data),
    enabled: !!currentUser?.is_admin,
  });

  if (!currentUser?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header title="إدارة المستخدمين" subtitle="قائمة جميع مستخدمي النظام" />

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['المستخدم', 'الدور', 'البريد', 'الجوال', 'الحالة', 'تاريخ الإنشاء'].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data || []).map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
                          {u.full_name?.[0] || u.username[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.full_name || u.username}</p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'نشط' : 'معطّل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
