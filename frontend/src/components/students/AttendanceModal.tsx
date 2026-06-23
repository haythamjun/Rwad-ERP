'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { Attendance, AttendanceFormData } from '@/types';

const schema = z.object({
  attendance_date:    z.string().min(1, 'تاريخ الحضور مطلوب'),
  status:             z.enum(['present', 'absent', 'late', 'excused_absence', 'early_leave']),
  check_in_time:      z.string().optional(),
  check_out_time:     z.string().optional(),
  absence_reason:     z.string().optional(),
  late_reason:        z.string().optional(),
  early_leave_reason: z.string().optional(),
  guardian_notified:  z.boolean().optional(),
  notification_notes: z.string().optional(),
  notes:              z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.check_in_time && d.check_out_time && d.check_out_time <= d.check_in_time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['check_out_time'],
      message: 'وقت الانصراف يجب أن يكون بعد وقت الحضور',
    });
  }
  if (d.status === 'early_leave' && !d.check_out_time?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['check_out_time'],
      message: 'وقت الانصراف مطلوب عند الانصراف المبكر',
    });
  }
  if (d.status === 'excused_absence' && !d.absence_reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['absence_reason'],
      message: 'سبب الغياب مطلوب عند الغياب بعذر',
    });
  }
});

type FormValues = z.infer<typeof schema>;

interface Props {
  record?: Attendance;
  onClose: () => void;
  onSave: (data: AttendanceFormData) => void;
  loading?: boolean;
}

const today = new Date().toISOString().split('T')[0];

export default function AttendanceModal({ record, onClose, onSave, loading }: Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attendance_date:    record?.attendance_date    || today,
      status:             record?.status             || 'present',
      check_in_time:      record?.check_in_time      || '',
      check_out_time:     record?.check_out_time     || '',
      absence_reason:     record?.absence_reason     || '',
      late_reason:        record?.late_reason        || '',
      early_leave_reason: record?.early_leave_reason || '',
      guardian_notified:  record?.guardian_notified  ?? false,
      notification_notes: record?.notification_notes || '',
      notes:              record?.notes              || '',
    },
  });

  const status           = watch('status');
  const guardianNotified = watch('guardian_notified');

  const nowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const showCheckIn   = status === 'present' || status === 'late';
  const showCheckOut  = status === 'present' || status === 'late' || status === 'early_leave';
  const showAbsence   = status === 'absent' || status === 'excused_absence';
  const showLateReason       = status === 'late';
  const showEarlyLeaveReason = status === 'early_leave';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {record ? 'تعديل سجل الحضور' : 'تسجيل حضور / غياب'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((v) => onSave(v as AttendanceFormData))} className="p-5 space-y-4">

          {/* التاريخ والحالة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">التاريخ <span className="text-red-500">*</span></label>
              <input
                {...register('attendance_date')}
                type="date"
                className="form-input"
                max={today}
              />
              {errors.attendance_date && (
                <p className="text-red-500 text-xs mt-1">{errors.attendance_date.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">الحالة <span className="text-red-500">*</span></label>
              <select {...register('status')} className="form-input">
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="late">متأخر</option>
                <option value="excused_absence">غياب بعذر</option>
                <option value="early_leave">انصراف مبكر</option>
              </select>
            </div>
          </div>

          {/* أوقات الحضور والانصراف */}
          {(showCheckIn || showCheckOut) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {showCheckIn && (
                <div>
                  <label className="form-label">وقت الحضور</label>
                  <div className="flex gap-2">
                    <input {...register('check_in_time')} type="time" className="form-input flex-1" />
                    <button
                      type="button"
                      onClick={() => setValue('check_in_time', nowTime())}
                      className="flex-shrink-0 px-3 py-2 text-xs font-medium bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl transition-colors"
                    >
                      الآن
                    </button>
                  </div>
                  {errors.check_in_time && (
                    <p className="text-red-500 text-xs mt-1">{errors.check_in_time.message}</p>
                  )}
                </div>
              )}
              {showCheckOut && (
                <div>
                  <label className="form-label">
                    وقت الانصراف{' '}
                    {status === 'early_leave' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <input {...register('check_out_time')} type="time" className="form-input flex-1" />
                    <button
                      type="button"
                      onClick={() => setValue('check_out_time', nowTime())}
                      className="flex-shrink-0 px-3 py-2 text-xs font-medium bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl transition-colors"
                    >
                      الآن
                    </button>
                  </div>
                  {errors.check_out_time && (
                    <p className="text-red-500 text-xs mt-1">{errors.check_out_time.message}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* سبب الغياب */}
          {showAbsence && (
            <div>
              <label className="form-label">
                سبب الغياب{' '}
                {status === 'excused_absence' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                {...register('absence_reason')}
                rows={2}
                className="form-input resize-none"
                placeholder="اذكر سبب الغياب..."
              />
              {errors.absence_reason && (
                <p className="text-red-500 text-xs mt-1">{errors.absence_reason.message}</p>
              )}
            </div>
          )}

          {/* سبب التأخر */}
          {showLateReason && (
            <div>
              <label className="form-label">سبب التأخر</label>
              <textarea
                {...register('late_reason')}
                rows={2}
                className="form-input resize-none"
                placeholder="اذكر سبب التأخر..."
              />
            </div>
          )}

          {/* سبب الانصراف المبكر */}
          {showEarlyLeaveReason && (
            <div>
              <label className="form-label">سبب الانصراف المبكر</label>
              <textarea
                {...register('early_leave_reason')}
                rows={2}
                className="form-input resize-none"
                placeholder="اذكر سبب الانصراف المبكر..."
              />
            </div>
          )}

          {/* إخطار ولي الأمر */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="guardian_notified"
                {...register('guardian_notified')}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <label htmlFor="guardian_notified" className="text-sm text-gray-700 cursor-pointer">
                تم إخطار ولي الأمر
              </label>
            </div>

            {guardianNotified && (
              <div>
                <label className="form-label">ملاحظات الإخطار</label>
                <textarea
                  {...register('notification_notes')}
                  rows={2}
                  className="form-input resize-none"
                  placeholder="طريقة الإخطار، وقته، ملاحظات..."
                />
              </div>
            )}
          </div>

          {/* ملاحظات عامة */}
          <div>
            <label className="form-label">ملاحظات</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="form-input resize-none"
              placeholder="أي ملاحظات إضافية..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
