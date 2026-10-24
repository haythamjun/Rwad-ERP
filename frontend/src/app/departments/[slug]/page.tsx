'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users2, ShieldAlert } from 'lucide-react';
import { authApi } from '@/lib/api';
import { DEPARTMENTS } from '@/types';
import type { User } from '@/types';
import Header from '@/components/layout/Header';

export default function DepartmentDirectoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const dept = DEPARTMENTS.find(d => d.value === slug);

  const { data: specialists = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'department', slug],
    queryFn: () => authApi.users({ department: slug }).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: !!dept,
  });

  if (!dept) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">قسم غير معروف</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title={dept.label} subtitle="الأخصائيون والأخصائيات التابعون لهذا القسم" />

      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : specialists.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <Users2 size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لا يوجد مختصون معيّنون بهذا القسم بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specialists.map((s) => (
              <Link
                key={s.id}
                href={`/departments/${slug}/${s.id}`}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                  {(s.full_name || s.username)[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{s.full_name || s.username}</p>
                  <p className="text-xs text-gray-400">{s.role_display}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
