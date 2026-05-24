'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save } from 'lucide-react';
import type { Guardian, GuardianFormData } from '@/types';

const schema = z.object({
  full_name: z.string().min(2, 'الاسم مطلوب'),
  relationship: z.enum(['father', 'mother', 'brother', 'sister', 'grandfather', 'grandmother', 'uncle', 'aunt', 'other']),
  national_id: z.string().optional(),
  phone: z.string().min(7, 'رقم الجوال مطلوب'),
  phone_alt: z.string().optional(),
  email: z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
  address: z.string().optional(),
  is_primary_contact: z.boolean(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  guardian?: Guardian;
  onClose: () => void;
  onSave: (data: GuardianFormData) => void;
  loading?: boolean;
}

const RELATIONSHIPS = [
  { value: 'father', label: 'أب' },
  { value: 'mother', label: 'أم' },
  { value: 'brother', label: 'أخ' },
  { value: 'sister', label: 'أخت' },
  { value: 'grandfather', label: 'جد' },
  { value: 'grandmother', label: 'جدة' },
  { value: 'uncle', label: 'عم / خال' },
  { value: 'aunt', label: 'عمة / خالة' },
  { value: 'other', label: 'أخرى' },
];

export default function GuardianModal({ guardian, onClose, onSave, loading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: guardian?.full_name || '',
      relationship: guardian?.relationship || undefined,
      national_id: guardian?.national_id || '',
      phone: guardian?.phone || '',
      phone_alt: guardian?.phone_alt || '',
      email: guardian?.email || '',
      address: guardian?.address || '',
      is_primary_contact: guardian?.is_primary_contact ?? false,
      notes: guardian?.notes || '',
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {guardian ? 'تعديل ولي الأمر' : 'إضافة ولي أمر جديد'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((v) => onSave(v as GuardianFormData))} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">الاسم الكامل <span className="text-red-500">*</span></label>
              <input {...register('full_name')} className="form-input" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="form-label">صلة القرابة <span className="text-red-500">*</span></label>
              <select {...register('relationship')} className="form-input">
                <option value="">-- اختر --</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {errors.relationship && <p className="text-red-500 text-xs mt-1">{errors.relationship.message}</p>}
            </div>

            <div>
              <label className="form-label">رقم الهوية</label>
              <input {...register('national_id')} className="form-input" dir="ltr" />
            </div>

            <div>
              <label className="form-label">رقم الجوال <span className="text-red-500">*</span></label>
              <input {...register('phone')} className="form-input" dir="ltr" placeholder="05XXXXXXXX" />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="form-label">رقم جوال إضافي</label>
              <input {...register('phone_alt')} className="form-input" dir="ltr" />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">البريد الإلكتروني</label>
              <input {...register('email')} type="email" className="form-input" dir="ltr" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">العنوان</label>
              <input {...register('address')} className="form-input" />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">ملاحظات</label>
              <textarea {...register('notes')} rows={2} className="form-input resize-none" />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('is_primary_contact')} className="w-4 h-4 rounded accent-primary-600" />
                <span className="text-sm text-gray-700">جهة التواصل الرئيسية</span>
              </label>
            </div>
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
