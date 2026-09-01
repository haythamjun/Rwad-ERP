'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Building2, Stethoscope, CheckCircle, Clock, Pill, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { branchesApi, medicalApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/layout/Header';
import MedicalCheckInModal from '@/components/students/MedicalCheckInModal';
import type { Branch, MedicalSheetRow } from '@/types';

const today = new Date().toISOString().split('T')[0];

export default function MedicalSectionPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const canViewMedical = user?.is_admin || user?.permissions?.some((p) => p.module === 'medical_file' && p.can_view);
  const canEditMedical = user?.is_admin || user?.permissions?.some((p) => p.module === 'medical_file' && p.can_edit);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [checkinModal, setCheckinModal] = useState<{ studentId: number; studentName: string; checkin?: MedicalSheetRow['checkin'] } | null>(null);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: rows = [], isLoading } = useQuery<MedicalSheetRow[]>({
    queryKey: ['medical-sheet', branchId, date, search],
    queryFn:  () => medicalApi.sheet({ date, branch: branchId!, search: search || undefined }).then(r => r.data),
    enabled:  !!branchId && !!canViewMedical,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      checkinModal!.checkin
        ? medicalApi.checkins.update(checkinModal!.studentId, checkinModal!.checkin!.id, data)
        : medicalApi.checkins.create(checkinModal!.studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-sheet'] });
      setCheckinModal(null);
      toast.success('تم حفظ التشيك إن');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  if (!canViewMedical) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Header
        title="القسم الطبي"
        subtitle="تشيك إن يومي وإعطاء الأدوية لطلاب الفرع"
      />

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label flex items-center gap-1"><Building2 size={14}/> الفرع</label>
            <select
              className="form-input w-56"
              value={branchId ?? ''}
              onChange={e => setBranchId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">-- اختر الفرع --</option>
              {branches.filter(b => b.is_active).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">التاريخ</label>
            <input type="date" dir="ltr" className="form-input" max={today} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">بحث</label>
            <div className="relative">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="form-input pr-8" placeholder="بحث بالاسم أو رقم الملف..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {!branchId ? (
        <div className="card text-center py-16 text-gray-400">
          <Building2 size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">اختر فرعًا لعرض طلابه</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Stethoscope size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا يوجد طلاب نشطون في هذا الفرع</p>
        </div>
      ) : (
        <div className="card p-0 divide-y divide-gray-100">
          {rows.map((row) => {
            const done = !!row.checkin;
            return (
              <div key={row.student_id} className="flex items-center gap-4 py-4 px-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-50' : 'bg-gray-100'}`}>
                  {done ? <CheckCircle size={18} className="text-green-600" /> : <Stethoscope size={18} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{row.student_name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                    <span className="font-mono">{row.file_number}</span>
                    {row.active_medications_count > 0 && (
                      <span className="flex items-center gap-1 text-primary-600">
                        <Pill size={11}/> {row.active_medications_count} دواء نشط
                      </span>
                    )}
                    {done && row.checkin?.check_time && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Clock size={11}/> تشيك إن {row.checkin.check_time.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
                {canEditMedical && (
                  <button
                    onClick={() => setCheckinModal({ studentId: row.student_id, studentName: row.student_name, checkin: row.checkin })}
                    className={done ? 'btn-secondary py-1.5 px-3 text-xs' : 'btn-primary py-1.5 px-3 text-xs'}
                  >
                    {done ? 'تعديل التشيك إن' : 'تسجيل تشيك إن'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {checkinModal && (
        <MedicalCheckInModal
          studentId={checkinModal.studentId}
          studentName={checkinModal.studentName}
          date={date}
          checkin={checkinModal.checkin}
          onClose={() => setCheckinModal(null)}
          onSave={(data) => saveMutation.mutate(data)}
          loading={saveMutation.isPending}
        />
      )}
    </div>
  );
}
