'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ListChecks, ShieldAlert, Layers, ListOrdered } from 'lucide-react';
import { assessmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { AssessmentListItem } from '@/types';
import Header from '@/components/layout/Header';

export default function AssessmentsLibraryPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const canView = user?.is_admin || user?.permissions?.some((p) => p.module === 'assessments' && p.can_view);

  const { data: assessments = [], isLoading } = useQuery<AssessmentListItem[]>({
    queryKey: ['assessments-library'],
    queryFn: () => assessmentsApi.list().then((r) => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: !!canView,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assessmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments-library'] });
      setDeleteId(null);
      toast.success('تم حذف المقياس');
    },
    onError: () => {
      toast.error('تعذّر حذف المقياس — تأكد من عدم وجود تقييمات طلاب مرتبطة به');
      setDeleteId(null);
    },
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Header
        title="المقاييس والخطط الدراسية"
        subtitle="مكتبة المقاييس/الاختبارات المستخدمة لبناء الخطط الدراسية للطلاب"
      />

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <ListChecks size={18} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">مكتبة المقاييس</h2>
              <p className="text-xs text-gray-400">كل مقياس يُطبَّق لاحقًا على أي طالب من ملفه</p>
            </div>
          </div>
          {user?.is_admin && (
            <Link href="/assessments/new" className="btn-primary flex items-center gap-2">
              <Plus size={15} /> إنشاء مقياس جديد
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <ListChecks size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لا توجد مقاييس بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assessments.map((a) => (
              <div key={a.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <ListChecks size={16} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{a.name}</p>
                    {!a.is_active && <span className="badge text-xs bg-gray-100 text-gray-500">غير نشط</span>}
                  </div>
                  {a.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>}
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Layers size={11} /> {a.section_count} قسم
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <ListOrdered size={11} /> {a.question_count} سؤال
                    </span>
                  </div>
                </div>
                {user?.is_admin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link
                      href={`/assessments/${a.id}/edit`}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="تعديل"
                    >
                      <Pencil size={14} />
                    </Link>
                    <button
                      onClick={() => setDeleteId(a.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center" dir="rtl">
            <Trash2 size={36} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-5">
              هل أنت متأكد من حذف هذا المقياس؟ لن يمكن التراجع، وسيُرفض الحذف إن وُجدت تقييمات طلاب مسجّلة عليه.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 btn-secondary" onClick={() => setDeleteId(null)}>إلغاء</button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
