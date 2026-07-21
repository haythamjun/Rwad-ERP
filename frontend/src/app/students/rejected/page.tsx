'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Search, XCircle, RotateCcw, Eye } from 'lucide-react';
import { studentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import type { PaginatedResponse, Student } from '@/types';
import Header from '@/components/layout/Header';

export default function RejectedStudentsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students-rejected', search, page],
    queryFn: () =>
      studentsApi
        .list({ status: 'rejected', search: search || undefined, page })
        .then((r) => r.data),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => studentsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-rejected'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تمت استعادة الطالب إلى قائمة الانتظار');
    },
    onError: () => toast.error('فشل استعادة الطالب'),
  });

  const students = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  return (
    <div className="space-y-5 max-w-6xl">
      <Header
        title="الطلاب المرفوضون"
        subtitle={`إجمالي ${data?.count ?? 0} طالب مرفوض`}
        actions={
          <Link href="/students" className="btn-secondary">
            <ArrowRight size={16} /> العودة
          </Link>
        }
      />

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الملف أو الهوية..."
            className="form-input pr-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <XCircle size={40} className="mx-auto mb-3 text-gray-300" />
            <p>لا يوجد طلاب مرفوضون</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-rose-50 border-b border-rose-100">
                <th className="text-right py-3 px-4 font-semibold text-rose-700">رقم الملف</th>
                <th className="text-right py-3 px-4 font-semibold text-rose-700">الاسم الكامل</th>
                <th className="text-right py-3 px-4 font-semibold text-rose-700">الفرع</th>
                <th className="text-right py-3 px-4 font-semibold text-rose-700">تاريخ التسجيل</th>
                <th className="text-right py-3 px-4 font-semibold text-rose-700">تاريخ الرفض</th>
                <th className="text-right py-3 px-4 font-semibold text-rose-700">سبب الرفض</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {s.file_number}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800">{s.full_name}</td>
                  <td className="py-3 px-4 text-gray-500">{s.branch_name || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{formatDate(s.registration_date)}</td>
                  <td className="py-3 px-4 text-gray-500">{formatDate(s.updated_at)}</td>
                  <td className="py-3 px-4 max-w-[260px]">
                    {s.rejection_reason ? (
                      <p className="text-rose-700 text-xs leading-relaxed line-clamp-2">
                        {s.rejection_reason}
                      </p>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/students/${s.id}`}
                        className="btn-secondary py-1 px-2 text-xs"
                        title="عرض الملف"
                      >
                        <Eye size={13} />
                      </Link>
                      {user?.can_delete && (
                        <button
                          onClick={() => {
                            if (confirm(`استعادة ${s.full_name} إلى قائمة الانتظار؟`)) {
                              restoreMutation.mutate(s.id);
                            }
                          }}
                          disabled={restoreMutation.isPending}
                          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-1 px-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                          title="استعادة الطالب"
                        >
                          <RotateCcw size={12} /> استعادة
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-gray-500">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
