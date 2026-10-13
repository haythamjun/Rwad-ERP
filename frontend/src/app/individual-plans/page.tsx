'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FileHeart, Search } from 'lucide-react';
import { individualPlansApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import type { IndividualPlan } from '@/types';
import Header from '@/components/layout/Header';

export default function IndividualPlansPage() {
  const user = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');

  const canView = user?.is_admin || user?.permissions?.some(p => p.module === 'individual_plans' && p.can_view);

  const { data: plans = [], isLoading } = useQuery<IndividualPlan[]>({
    queryKey: ['individual-plans-all'],
    queryFn: () => individualPlansApi.listAll().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: !!canView,
  });

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return plans;
    return plans.filter(p => p.student_name.includes(q));
  }, [plans, search]);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <FileHeart size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="الخطة الفردية"
        subtitle="كل الخطط الفردية المسجّلة عبر كل الطلاب"
      />

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
            <FileHeart size={18} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-800">الخطط الفردية</h2>
            <p className="text-xs text-gray-400">{filtered.length} خطة</p>
          </div>
          <div className="relative w-64">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="form-input pr-9 py-1.5 text-sm"
              placeholder="بحث باسم الطالب..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <FileHeart size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{search ? 'لا توجد نتائج مطابقة' : 'لا توجد خطط فردية مسجّلة بعد'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/students/${p.student}?tab=individual_plans`}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{p.student_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(p.created_at)}
                    {p.created_by_name && ` — أُنشئت بواسطة: ${p.created_by_name}`}
                  </p>
                </div>
                <span className="badge text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                  {p.goals.length} هدف
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
