'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { StudentMedicalProfile } from '@/types';

const schema = z.object({
  height_cm:       z.coerce.number().int().min(0).optional().or(z.literal('')),
  weight_kg:       z.coerce.number().int().min(0).optional().or(z.literal('')),
  chronic_disease: z.string().optional(),
  medical_allergy: z.string().optional(),
  food_allergy:    z.string().optional(),
  has_seizures:    z.boolean().optional(),
  uses_nebulizer:  z.boolean().optional(),
  notes:           z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  profile?: StudentMedicalProfile;
  onClose: () => void;
  onSave: (data: FormValues) => void;
  loading?: boolean;
}

export default function MedicalProfileModal({ profile, onClose, onSave, loading }: Props) {
  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      height_cm:       profile?.height_cm ?? undefined,
      weight_kg:       profile?.weight_kg ?? undefined,
      chronic_disease: profile?.chronic_disease || '',
      medical_allergy: profile?.medical_allergy || '',
      food_allergy:    profile?.food_allergy || '',
      has_seizures:    profile?.has_seizures ?? false,
      uses_nebulizer:  profile?.uses_nebulizer ?? false,
      notes:           profile?.notes || '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{profile ? 'تعديل الملف الطبي' : 'إنشاء ملف طبي'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit((v) => onSave(v))} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">الطول (سم)</label>
              <input type="number" min="0" className="form-input" {...register('height_cm')} />
            </div>
            <div>
              <label className="form-label">الوزن (كجم)</label>
              <input type="number" min="0" className="form-input" {...register('weight_kg')} />
            </div>
          </div>

          <div>
            <label className="form-label">الأمراض المزمنة</label>
            <textarea rows={2} className="form-input resize-none" {...register('chronic_disease')} placeholder="مثال: ربو، سكري..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">الحساسية الطبية</label>
              <textarea rows={2} className="form-input resize-none" {...register('medical_allergy')} placeholder="مثال: بنسلين" />
            </div>
            <div>
              <label className="form-label">الحساسية الغذائية</label>
              <textarea rows={2} className="form-input resize-none" {...register('food_allergy')} placeholder="مثال: مكسرات" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary-600" {...register('has_seizures')} />
              <span className="text-sm text-gray-700">يعاني من تشنجات</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary-600" {...register('uses_nebulizer')} />
              <span className="text-sm text-gray-700">يستخدم جهاز الاستنشاق</span>
            </label>
          </div>

          <div>
            <label className="form-label">ملاحظات إضافية</label>
            <textarea rows={2} className="form-input resize-none" {...register('notes')} />
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
