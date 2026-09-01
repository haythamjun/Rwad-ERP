'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';

const schema = z.object({
  visit_date: z.string().min(1, 'تاريخ الزيارة مطلوب'),
  status:     z.enum(['stable', 'unstable']),
  notes:      z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
  onSave: (data: FormValues) => void;
  loading?: boolean;
}

const today = new Date().toISOString().split('T')[0];

export default function MedicalVisitModal({ onClose, onSave, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { visit_date: today, status: 'stable', notes: '' },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">إضافة زيارة تقييم</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((v) => onSave(v))} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">تاريخ الزيارة <span className="text-red-500">*</span></label>
              <input type="date" dir="ltr" className="form-input" max={today} {...register('visit_date')} />
              {errors.visit_date && <p className="text-red-500 text-xs mt-1">{errors.visit_date.message}</p>}
            </div>
            <div>
              <label className="form-label">الحالة</label>
              <select className="form-input" {...register('status')}>
                <option value="stable">مستقر</option>
                <option value="unstable">غير مستقر</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">ملاحظات</label>
            <textarea rows={3} className="form-input resize-none" {...register('notes')} placeholder="سبب عدم الاستقرار، توصيات..." />
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
