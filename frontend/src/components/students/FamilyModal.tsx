'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { FamilyInfo, FamilyFormData } from '@/types';

const schema = z.object({
  family_size:         z.coerce.number().int().min(1, 'مطلوب'),
  sibling_order:       z.coerce.number().int().min(1, 'مطلوب'),
  parents_status:      z.string().min(1, 'مطلوب'),
  income_range:        z.string().optional(),
  monthly_income:      z.coerce.number().int().min(0).optional().or(z.literal('')),
  housing_type:        z.string().optional(),
  other_special_needs: z.boolean().optional(),
  social_notes:        z.string().optional(),
}).refine(
  (data) => data.sibling_order <= data.family_size,
  {
    message: 'ترتيب المستفيد لا يمكن أن يكون أكبر من عدد أفراد الأسرة',
    path: ['sibling_order'],
  }
);

type FormValues = z.infer<typeof schema>;

interface Props {
  familyInfo?: FamilyInfo;
  onClose: () => void;
  onSave: (data: FamilyFormData) => void;
  loading?: boolean;
}

const PARENTS_STATUS = [
  { value: 'married',         label: 'متزوجان' },
  { value: 'divorced',        label: 'مطلقان' },
  { value: 'father_deceased', label: 'الأب متوفى' },
  { value: 'mother_deceased', label: 'الأم متوفاة' },
  { value: 'both_deceased',   label: 'كلاهما متوفى' },
  { value: 'separated',       label: 'منفصلان' },
];

const INCOME_RANGE = [
  { value: 'very_low',  label: 'أقل من 3,000 ريال' },
  { value: 'low',       label: '3,000 – 6,000 ريال' },
  { value: 'medium',    label: '6,000 – 10,000 ريال' },
  { value: 'high',      label: '10,000 – 20,000 ريال' },
  { value: 'very_high', label: 'أكثر من 20,000 ريال' },
];

const HOUSING_TYPE = [
  { value: 'owned',      label: 'ملك' },
  { value: 'rented',     label: 'إيجار' },
  { value: 'relative',   label: 'مع الأقارب' },
  { value: 'government', label: 'سكن حكومي' },
  { value: 'other',      label: 'أخرى' },
];

export default function FamilyModal({ familyInfo, onClose, onSave, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      family_size:         familyInfo?.family_size        || undefined,
      sibling_order:       familyInfo?.sibling_order      || undefined,
      parents_status:      familyInfo?.parents_status     || '',
      income_range:        familyInfo?.income_range       || '',
      monthly_income:      familyInfo?.monthly_income     || '',
      housing_type:        familyInfo?.housing_type       || '',
      other_special_needs: familyInfo?.other_special_needs ?? false,
      social_notes:        familyInfo?.social_notes       || '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {familyInfo ? 'تعديل دراسة الحالة الاجتماعية' : 'إضافة دراسة الحالة الاجتماعية'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit((v) => onSave(v as FamilyFormData))} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="form-label">عدد أفراد الأسرة <span className="text-red-500">*</span></label>
              <input {...register('family_size')} type="number" min="1" className="form-input" />
              {errors.family_size && <p className="text-red-500 text-xs mt-1">{errors.family_size.message}</p>}
            </div>

            <div>
              <label className="form-label">ترتيب المستفيد بين الإخوة <span className="text-red-500">*</span></label>
              <input {...register('sibling_order')} type="number" min="1" className="form-input" />
              {errors.sibling_order && <p className="text-red-500 text-xs mt-1">{errors.sibling_order.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">حالة الوالدين <span className="text-red-500">*</span></label>
              <select {...register('parents_status')} className="form-input">
                <option value="">-- اختر --</option>
                {PARENTS_STATUS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {errors.parents_status && <p className="text-red-500 text-xs mt-1">{errors.parents_status.message}</p>}
            </div>

            <div>
              <label className="form-label">الدخل الشهري التقريبي</label>
              <select {...register('income_range')} className="form-input">
                <option value="">-- اختر --</option>
                {INCOME_RANGE.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">الدخل الشهري (بالرقم / ريال)</label>
              <input
                {...register('monthly_income')}
                type="number" min="0" step="100"
                className="form-input"
                placeholder="مثال: 5000"
              />
            </div>

            <div>
              <label className="form-label">نوع السكن</label>
              <select {...register('housing_type')} className="form-input">
                <option value="">-- اختر --</option>
                {HOUSING_TYPE.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="other_special_needs"
                {...register('other_special_needs')}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <label htmlFor="other_special_needs" className="text-sm text-gray-700 cursor-pointer">
                يوجد أفراد آخرون بحاجات خاصة في الأسرة
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">ملاحظات اجتماعية</label>
              <textarea {...register('social_notes')} rows={3} className="form-input resize-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'جارٍ الحفظ...' : <><Save size={15}/> حفظ</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
