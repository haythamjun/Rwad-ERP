'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { X, Save, Trash2 } from 'lucide-react';
import { authApi } from '@/lib/api';
import { SCHEDULE_DAYS, SCHEDULE_TIME_SLOTS } from '@/types';
import type { ScheduleSlot, ScheduleSlotFormData, ScheduleDay, User } from '@/types';

const schema = z.object({
  subject:    z.string().min(1, 'اسم المادة / الحصة مطلوب'),
  specialist: z.string().optional(),
  notes:      z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  day: ScheduleDay;
  startTime: string;
  slot?: ScheduleSlot;
  onClose: () => void;
  onSave: (data: ScheduleSlotFormData) => void;
  onDelete?: () => void;
  loading?: boolean;
}

export default function ScheduleSlotModal({ day, startTime, slot, onClose, onSave, onDelete, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject:    slot?.subject || '',
      specialist: slot?.specialist ? String(slot.specialist) : '',
      notes:      slot?.notes || '',
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn:  () => authApi.users().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  // الأخصائيون أولًا، ثم بقية المستخدمين
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === 'specialist' && b.role !== 'specialist') return -1;
    if (b.role === 'specialist' && a.role !== 'specialist') return 1;
    return a.full_name.localeCompare(b.full_name, 'ar');
  });

  const dayLabel  = SCHEDULE_DAYS.find(d => d.value === day)?.label || day;
  const timeLabel = SCHEDULE_TIME_SLOTS.find(t => t.start === startTime)?.label || startTime;

  const submit = (values: FormValues) => {
    onSave({
      day, start_time: startTime,
      subject: values.subject,
      specialist: values.specialist ? Number(values.specialist) : null,
      notes: values.notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">{slot ? 'تعديل الحصة' : 'إضافة حصة'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{dayLabel} — {timeLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="p-5 space-y-4">
          <div>
            <label className="form-label">المادة / الحصة <span className="text-red-500">*</span></label>
            <input
              {...register('subject')}
              className="form-input"
              placeholder="مثال: علاج نطق"
              autoFocus
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="form-label">الأخصائي المسؤول</label>
            <select {...register('specialist')} className="form-input">
              <option value="">-- بدون تحديد --</option>
              {sortedUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} {u.role === 'specialist' ? '' : `(${u.role_display})`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">ملاحظات</label>
            <textarea {...register('notes')} rows={2} className="form-input resize-none" placeholder="أي ملاحظات إضافية..." />
          </div>

          <div className="flex justify-between items-center pt-2">
            {slot && onDelete ? (
              <button type="button" onClick={onDelete} disabled={loading} className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium">
                <Trash2 size={15} /> حذف الحصة
              </button>
            ) : <span />}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
