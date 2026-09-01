'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { Medication } from '@/types';

const schema = z.object({
  name:      z.string().min(1, 'اسم الدواء مطلوب'),
  dose:      z.string().optional(),
  frequency: z.string().optional(),
  notes:     z.string().optional(),
  is_active: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  medication?: Medication;
  onClose: () => void;
  onSave: (data: FormValues) => void;
  loading?: boolean;
}

export default function MedicationModal({ medication, onClose, onSave, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:      medication?.name || '',
      dose:      medication?.dose || '',
      frequency: medication?.frequency || '',
      notes:     medication?.notes || '',
      is_active: medication?.is_active ?? true,
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{medication ? 'تعديل الدواء' : 'إضافة دواء'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((v) => onSave(v))} className="p-5 space-y-4">
          <div>
            <label className="form-label">اسم الدواء <span className="text-red-500">*</span></label>
            <input className="form-input" {...register('name')} placeholder="مثال: فنتولين" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">الجرعة</label>
              <input className="form-input" {...register('dose')} placeholder="مثال: بخة واحدة" />
            </div>
            <div>
              <label className="form-label">عدد المرات باليوم</label>
              <input className="form-input" {...register('frequency')} placeholder="مثال: مرتين يوميًا" />
            </div>
          </div>

          <div>
            <label className="form-label">ملاحظات</label>
            <textarea rows={2} className="form-input resize-none" {...register('notes')} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-600" {...register('is_active')} />
            <span className="text-sm text-gray-700">دواء نشط (يظهر في التشيك إن اليومي)</span>
          </label>

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
