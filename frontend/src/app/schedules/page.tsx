'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarClock, Users2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { branchesApi, scheduleApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import BulkScheduleModal from '@/components/students/BulkScheduleModal';
import type { Branch, ScheduleClassGroup, ScheduleDay, ScheduleBulkCreateResult } from '@/types';

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ open: boolean; classGroup?: ScheduleClassGroup }>({ open: false });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: classes = [], isLoading } = useQuery<ScheduleClassGroup[]>({
    queryKey: ['schedule-classes', branchId],
    queryFn:  () => scheduleApi.classes(branchId!).then(r => r.data),
    enabled:  !!branchId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['schedule-classes', branchId] });

  const reportBulkResult = (res: ScheduleBulkCreateResult, verb: string) => {
    if (res.created > 0) toast.success(`تم ${verb} ${res.created} طالب`);
    if (res.skipped > 0) {
      toast.error(`${res.skipped} طالب لديهم حصة أخرى في هذا الوقت ولم يُضافوا`, { duration: 6000 });
    }
    if (res.created === 0 && res.skipped === 0) toast.success('تم الحفظ');
  };

  const createMutation = useMutation({
    mutationFn: (data: { student_ids: number[]; day: ScheduleDay; start_time: string; subject: string; specialist: number | null; notes: string }) =>
      scheduleApi.bulkCreate(data).then(r => r.data as ScheduleBulkCreateResult),
    onSuccess: (res) => { invalidate(); setModal({ open: false }); reportBulkResult(res, 'تسجيل'); },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const updateMembersMutation = useMutation({
    mutationFn: async (params: {
      toAdd: number[];
      toRemove: { slotId: number; studentId: number }[];
      toPatch: { slotId: number; studentId: number }[];
      day: ScheduleDay; start_time: string; subject: string; specialist: number | null; notes: string;
    }) => {
      const tasks: Promise<unknown>[] = [];
      if (params.toAdd.length > 0) {
        tasks.push(scheduleApi.bulkCreate({
          student_ids: params.toAdd, day: params.day, start_time: params.start_time,
          subject: params.subject, specialist: params.specialist, notes: params.notes,
        }));
      }
      for (const m of params.toRemove) tasks.push(scheduleApi.delete(m.studentId, m.slotId));
      for (const m of params.toPatch) {
        tasks.push(scheduleApi.update(m.studentId, m.slotId, {
          subject: params.subject, specialist: params.specialist, notes: params.notes,
        }));
      }
      await Promise.all(tasks);
    },
    onSuccess: () => { invalidate(); setModal({ open: false }); toast.success('تم تحديث الحصة'); },
    onError: () => toast.error('حدث خطأ أثناء التحديث'),
  });

  const deleteAllMutation = useMutation({
    mutationFn: (members: { slotId: number; studentId: number }[]) =>
      Promise.all(members.map(m => scheduleApi.delete(m.studentId, m.slotId))),
    onSuccess: () => { invalidate(); setModal({ open: false }); toast.success('تم حذف الحصة'); },
    onError: () => toast.error('فشل الحذف'),
  });

  const mutationLoading = createMutation.isPending || updateMembersMutation.isPending || deleteAllMutation.isPending;

  return (
    <div className="space-y-5 max-w-4xl">
      <Header
        title="الجداول الدراسية"
        subtitle="إنشاء حصص جماعية وتسجيل عدة طلاب عليها دفعة واحدة"
      />

      <div className="card p-4">
        <label className="form-label flex items-center gap-1.5"><Building2 size={14} /> الفرع</label>
        <select
          className="form-input max-w-xs"
          value={branchId ?? ''}
          onChange={e => setBranchId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- اختر الفرع --</option>
          {branches.filter(b => b.is_active).map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {!branchId ? (
        <div className="card text-center py-16 text-gray-400">
          <Building2 size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">اختر فرعًا لعرض حصصه الجماعية</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> إنشاء حصة جماعية
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : classes.length === 0 ? (
            <div className="card text-center py-16 text-gray-400">
              <CalendarClock size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">لا توجد حصص جماعية في هذا الفرع بعد</p>
            </div>
          ) : (
            <div className="card p-0 divide-y divide-gray-100">
              {classes.map((c, i) => (
                <button
                  key={`${c.day}-${c.start_time}-${c.subject}-${c.specialist ?? 'x'}-${i}`}
                  onClick={() => setModal({ open: true, classGroup: c })}
                  className="w-full text-right flex items-center gap-4 py-4 px-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <CalendarClock size={18} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{c.subject}</p>
                      <span className="badge text-xs bg-gray-100 text-gray-600">{c.day_display}</span>
                      <span className="badge text-xs bg-gray-100 text-gray-600 font-mono" dir="ltr">{c.start_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap text-xs text-gray-500">
                      {c.specialist_name && <span>الأخصائي: {c.specialist_name}</span>}
                      <span className="flex items-center gap-1 text-primary-600 font-medium">
                        <Users2 size={12} /> {c.student_count} طالب
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {modal.open && branchId && (
        <BulkScheduleModal
          branchId={branchId}
          classGroup={modal.classGroup}
          onClose={() => setModal({ open: false })}
          onCreate={(data) => createMutation.mutate(data)}
          onUpdateMembers={(data) => updateMembersMutation.mutate(data)}
          onDeleteAll={(members) => deleteAllMutation.mutate(members)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
}
