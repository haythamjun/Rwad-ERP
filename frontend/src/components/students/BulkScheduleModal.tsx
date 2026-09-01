'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Save, Trash2, Search } from 'lucide-react';
import { authApi, studentsApi } from '@/lib/api';
import { SCHEDULE_DAYS, SCHEDULE_TIME_SLOTS } from '@/types';
import type { ScheduleClassGroup, ScheduleDay, User, Student, PaginatedResponse } from '@/types';

interface Props {
  branchId: number;
  classGroup?: ScheduleClassGroup;
  onClose: () => void;
  onCreate: (data: { student_ids: number[]; day: ScheduleDay; start_time: string; subject: string; specialist: number | null; notes: string }) => void;
  onUpdateMembers: (params: {
    toAdd: number[];
    toRemove: { slotId: number; studentId: number }[];
    toPatch: { slotId: number; studentId: number }[];
    day: ScheduleDay; start_time: string; subject: string; specialist: number | null; notes: string;
  }) => void;
  onDeleteAll: (members: { slotId: number; studentId: number }[]) => void;
  loading?: boolean;
}

export default function BulkScheduleModal({ branchId, classGroup, onClose, onCreate, onUpdateMembers, onDeleteAll, loading }: Props) {
  const isEdit = !!classGroup;

  const [day, setDay]           = useState<ScheduleDay>(classGroup?.day || 'sunday');
  const [startTime, setStart]   = useState(classGroup?.start_time || SCHEDULE_TIME_SLOTS[0].start);
  const [subject, setSubject]   = useState(classGroup?.subject || '');
  const [specialist, setSpec]   = useState(classGroup?.specialist ? String(classGroup.specialist) : '');
  const [notes, setNotes]       = useState('');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<Set<number>>(
    new Set((classGroup?.students || []).map(m => m.student_id))
  );
  const [subjectError, setSubjectError] = useState('');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn:  () => authApi.users().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'specialist' && b.role !== 'specialist') return -1;
    if (b.role === 'specialist' && a.role !== 'specialist') return 1;
    return a.full_name.localeCompare(b.full_name, 'ar');
  });

  const { data: studentsData } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students', 'branch', branchId],
    queryFn:  () => studentsApi.list({ branch: branchId, status: 'active', page_size: 500 }).then(r => r.data),
  });
  const students = (studentsData?.results || []).filter(s =>
    !search.trim() || s.full_name.includes(search.trim())
  );

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = () => {
    if (!subject.trim()) { setSubjectError('اسم المادة / الحصة مطلوب'); return; }
    if (selected.size === 0) { setSubjectError('يرجى اختيار طالب واحد على الأقل'); return; }
    setSubjectError('');

    const specialistId = specialist ? Number(specialist) : null;

    if (!isEdit) {
      onCreate({ student_ids: Array.from(selected), day, start_time: startTime, subject: subject.trim(), specialist: specialistId, notes });
      return;
    }

    const originalIds = new Set((classGroup!.students || []).map(m => m.student_id));
    const toAdd = Array.from(selected).filter(id => !originalIds.has(id));
    const toRemove = classGroup!.students.filter(m => !selected.has(m.student_id))
      .map(m => ({ slotId: m.slot_id, studentId: m.student_id }));
    const toPatch  = classGroup!.students.filter(m => selected.has(m.student_id))
      .map(m => ({ slotId: m.slot_id, studentId: m.student_id }));

    onUpdateMembers({
      toAdd, toRemove, toPatch,
      day: classGroup!.day, start_time: classGroup!.start_time,
      subject: subject.trim(), specialist: specialistId, notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'تعديل الحصة الجماعية' : 'إنشاء حصة جماعية'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">اليوم <span className="text-red-500">*</span></label>
              <select
                className="form-input disabled:bg-gray-50 disabled:text-gray-400"
                value={day}
                disabled={isEdit}
                onChange={e => setDay(e.target.value as ScheduleDay)}
              >
                {SCHEDULE_DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">الوقت <span className="text-red-500">*</span></label>
              <select
                className="form-input disabled:bg-gray-50 disabled:text-gray-400"
                value={startTime}
                disabled={isEdit}
                onChange={e => setStart(e.target.value)}
              >
                {SCHEDULE_TIME_SLOTS.map(t => <option key={t.start} value={t.start}>{t.label}</option>)}
              </select>
            </div>
          </div>
          {isEdit && (
            <p className="text-xs text-gray-400 -mt-2">لتغيير اليوم أو الوقت، احذف هذه الحصة وأنشئ حصة جديدة.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">المادة / الحصة <span className="text-red-500">*</span></label>
              <input
                className="form-input"
                value={subject}
                onChange={e => { setSubject(e.target.value); setSubjectError(''); }}
                placeholder="مثال: علاج نطق جماعي"
              />
            </div>
            <div>
              <label className="form-label">الأخصائي المسؤول</label>
              <select className="form-input" value={specialist} onChange={e => setSpec(e.target.value)}>
                <option value="">-- بدون تحديد --</option>
                {sortedUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} {u.role === 'specialist' ? '' : `(${u.role_display})`}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">
              الطلاب <span className="text-red-500">*</span>
              {selected.size > 0 && (
                <span className="mr-2 text-xs font-normal text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {selected.size} مختار
                </span>
              )}
            </label>
            <div className="relative mb-2">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="form-input pr-8 py-1.5 text-sm"
                placeholder="بحث بالاسم..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-50">
              {students.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">لا يوجد طلاب نشطون في هذا الفرع</p>
              ) : (
                students.map(s => (
                  <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary-600 flex-shrink-0"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <span className="text-sm text-gray-700">{s.full_name}</span>
                    <span className="text-xs text-gray-400 mr-auto">{s.file_number}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="form-label">ملاحظات</label>
            <textarea rows={2} className="form-input resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." />
          </div>

          {subjectError && <p className="text-red-500 text-xs">{subjectError}</p>}

          <div className="flex justify-between items-center pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={() => { if (confirm('حذف هذه الحصة بالكامل من جميع الطلاب المسجّلين فيها؟')) onDeleteAll(classGroup!.students.map(m => ({ slotId: m.slot_id, studentId: m.student_id }))); }}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                <Trash2 size={15} /> حذف الحصة بالكامل
              </button>
            ) : <span />}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
              <button type="button" onClick={submit} disabled={loading} className="btn-primary">
                {loading ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
