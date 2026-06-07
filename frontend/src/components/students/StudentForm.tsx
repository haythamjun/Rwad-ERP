'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import type { StudentFormData } from '@/types';

const schema = z.object({
  // أساسية
  first_name:       z.string().min(2, 'الاسم الأول مطلوب').max(50),
  middle_name:      z.string().min(2, 'اسم الأب مطلوب').max(50),
  grandfather_name: z.string().min(2, 'اسم الجد مطلوب').max(50),
  family_name:      z.string().min(2, 'اسم العائلة مطلوب').max(50),
  national_id: z
    .string()
    .min(1, 'رقم الهوية مطلوب')
    .regex(/^\d{10}$/, 'رقم الهوية يجب أن يكون 10 أرقام'),
  date_of_birth: z
    .string()
    .min(1, 'تاريخ الميلاد مطلوب')
    .refine((val) => {
      const dob = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dob <= today;
    }, 'تاريخ الميلاد لا يمكن أن يكون في المستقبل')
    .refine((val) => {
      const dob = new Date(val);
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 100);
      return dob >= minDate;
    }, 'تاريخ الميلاد غير صحيح (أكثر من 100 سنة)'),
  gender:            z.enum(['male', 'female'], { required_error: 'الجنس مطلوب' }),
  nationality:       z.string().min(2, 'الجنسية مطلوبة'),
  // إعاقة
  disability_type:   z.string().optional(),
  disability_degree: z.string().optional(),
  diagnosis:         z.string().optional(),
  // تعليم
  educational_level: z.string().optional(),
  school_name:       z.string().optional(),
  grade:             z.string().optional(),
  // إحالة
  referral_source:        z.string().optional(),
  referral_source_detail: z.string().optional(),
  // حالة
  status:            z.enum(['pending','active','inactive','graduated','suspended','transferred']),
  registration_date: z.string().min(1, 'تاريخ التسجيل مطلوب'),
  notes:             z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: StudentFormData) => void;
  loading?: boolean;
  defaultValues?: Partial<FormValues>;
}

// ── Options ──────────────────────────────────────────────────────────────────

const DISABILITY_TYPES = [
  { value: 'intellectual', label: 'إعاقة ذهنية' },
  { value: 'autism',       label: 'طيف التوحد' },
  { value: 'down',         label: 'متلازمة داون' },
  { value: 'physical',     label: 'إعاقة حركية' },
  { value: 'hearing',      label: 'إعاقة سمعية' },
  { value: 'visual',       label: 'إعاقة بصرية' },
  { value: 'speech',       label: 'إعاقة لغوية / نطقية' },
  { value: 'learning',     label: 'صعوبات تعلم' },
  { value: 'behavioral',   label: 'اضطراب سلوكي' },
  { value: 'multiple',     label: 'إعاقة مركّبة' },
  { value: 'other',        label: 'أخرى' },
];

const DISABILITY_DEGREES = [
  { value: 'mild',     label: 'بسيطة' },
  { value: 'moderate', label: 'متوسطة' },
  { value: 'severe',   label: 'شديدة' },
  { value: 'profound', label: 'شديدة جداً' },
];

const EDUCATIONAL_LEVELS = [
  { value: 'none',         label: 'لا يتعلم' },
  { value: 'kindergarten', label: 'رياض أطفال' },
  { value: 'elementary',   label: 'ابتدائي' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'secondary',    label: 'ثانوي' },
  { value: 'university',   label: 'جامعي' },
  { value: 'special',      label: 'برنامج تربية خاصة' },
];

const REFERRAL_SOURCES = [
  { value: 'hospital',   label: 'مستشفى / عيادة' },
  { value: 'school',     label: 'مدرسة' },
  { value: 'family',     label: 'الأسرة مباشرة' },
  { value: 'ngo',        label: 'جمعية / مؤسسة' },
  { value: 'ministry',   label: 'وزارة / جهة حكومية' },
  { value: 'specialist', label: 'طبيب / معالج' },
  { value: 'other',      label: 'أخرى' },
];

// ── Section Header ────────────────────────────────────────────────────────────
function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-2 border-b border-gray-100">
      <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-xs">{num}</span>
      </div>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function StudentForm({ onSubmit, loading, defaultValues }: Props) {
  const [photo, setPhoto]           = useState<File | null>(null);
  const [photoPreview, setPreview]  = useState<string | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status:            'pending',
      registration_date: new Date().toISOString().split('T')[0],
      nationality:       'سعودي',
      ...defaultValues,
    },
  });

  const referralSource = watch('referral_source');

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = (values: FormValues) => {
    onSubmit({ ...values, photo } as StudentFormData);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">

      {/* ══ 1. البيانات الشخصية ══════════════════════════════════════════ */}
      <div className="card">
        <SectionTitle num="١" title="البيانات الشخصية" />

        {/* Photo */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300
                       flex items-center justify-center overflow-hidden cursor-pointer
                       hover:border-primary-400 transition-colors flex-shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview
              ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              : <Upload size={20} className="text-gray-400" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="pt-1">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-1">
              رفع صورة المستفيد
            </button>
            {photo && (
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }}
                className="mr-2 text-xs text-red-500 hover:text-red-700">
                <X size={12} className="inline" /> إزالة
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">JPG، PNG — حد أقصى 5 ميجا</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">الاسم الأول <span className="text-red-500">*</span></label>
            <input {...register('first_name')} className="form-input" placeholder="مثال: محمد" />
            {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
          </div>

          <div>
            <label className="form-label">اسم الأب <span className="text-red-500">*</span></label>
            <input {...register('middle_name')} className="form-input" placeholder="مثال: أحمد" />
            {errors.middle_name && <p className="text-red-500 text-xs mt-1">{errors.middle_name.message}</p>}
          </div>

          <div>
            <label className="form-label">اسم الجد <span className="text-red-500">*</span></label>
            <input {...register('grandfather_name')} className="form-input" placeholder="مثال: سعد" />
            {errors.grandfather_name && <p className="text-red-500 text-xs mt-1">{errors.grandfather_name.message}</p>}
          </div>

          <div>
            <label className="form-label">اسم العائلة <span className="text-red-500">*</span></label>
            <input {...register('family_name')} className="form-input" placeholder="مثال: العتيبي" />
            {errors.family_name && <p className="text-red-500 text-xs mt-1">{errors.family_name.message}</p>}
          </div>

          <div>
            <label className="form-label">رقم الهوية / الإقامة <span className="text-red-500">*</span></label>
            <input {...register('national_id')} className="form-input font-mono" placeholder="1XXXXXXXXX" dir="ltr" maxLength={10} inputMode="numeric" />
            {errors.national_id && <p className="text-red-500 text-xs mt-1">{errors.national_id.message}</p>}
          </div>

          <div>
            <label className="form-label">تاريخ الميلاد <span className="text-red-500">*</span></label>
            <input
              {...register('date_of_birth')}
              type="date"
              className="form-input"
              dir="ltr"
              max={new Date().toISOString().split('T')[0]}
              min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
            />
            {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message}</p>}
          </div>

          <div>
            <label className="form-label">الجنس <span className="text-red-500">*</span></label>
            <select {...register('gender')} className="form-input">
              <option value="">-- اختر --</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
          </div>

          <div>
            <label className="form-label">الجنسية <span className="text-red-500">*</span></label>
            <input {...register('nationality')} className="form-input" />
            {errors.nationality && <p className="text-red-500 text-xs mt-1">{errors.nationality.message}</p>}
          </div>

          <div>
            <label className="form-label">تاريخ التسجيل <span className="text-red-500">*</span></label>
            <input {...register('registration_date')} type="date" className="form-input" dir="ltr" />
            {errors.registration_date && <p className="text-red-500 text-xs mt-1">{errors.registration_date.message}</p>}
          </div>

          <div>
            <label className="form-label">الحالة</label>
            <select {...register('status')} className="form-input">
              <option value="pending">في انتظار القبول</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="graduated">خرّيج</option>
              <option value="suspended">موقوف</option>
              <option value="transferred">محوّل</option>
            </select>
          </div>
        </div>
      </div>

      {/* ══ 2. الإعاقة والتشخيص ═════════════════════════════════════════ */}
      <div className="card">
        <SectionTitle num="٢" title="الإعاقة والتشخيص" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">نوع الإعاقة</label>
            <select {...register('disability_type')} className="form-input">
              <option value="">-- اختر --</option>
              {DISABILITY_TYPES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">درجة الإعاقة</label>
            <select {...register('disability_degree')} className="form-input">
              <option value="">-- اختر --</option>
              {DISABILITY_DEGREES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="form-label">التشخيص التفصيلي</label>
            <textarea
              {...register('diagnosis')}
              rows={3}
              className="form-input resize-none"
              placeholder="التشخيص الطبي أو النفسي التفصيلي..."
            />
          </div>
        </div>
      </div>

      {/* ══ 3. المعلومات التعليمية ══════════════════════════════════════ */}
      <div className="card">
        <SectionTitle num="٣" title="المعلومات التعليمية" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">المستوى التعليمي</label>
            <select {...register('educational_level')} className="form-input">
              <option value="">-- اختر --</option>
              {EDUCATIONAL_LEVELS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">اسم المدرسة / المؤسسة</label>
            <input {...register('school_name')} className="form-input" placeholder="اسم المدرسة" />
          </div>

          <div>
            <label className="form-label">الصف / المرحلة</label>
            <input {...register('grade')} className="form-input" placeholder="مثال: الثالث الابتدائي" />
          </div>
        </div>
      </div>

      {/* ══ 4. جهة الإحالة ══════════════════════════════════════════════ */}
      <div className="card">
        <SectionTitle num="٤" title="جهة الإحالة" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">جهة الإحالة</label>
            <select {...register('referral_source')} className="form-input">
              <option value="">-- اختر --</option>
              {REFERRAL_SOURCES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              {referralSource === 'other' ? 'اذكر جهة الإحالة' : 'تفاصيل إضافية'}
            </label>
            <input
              {...register('referral_source_detail')}
              className="form-input"
              placeholder="مثال: مستشفى الملك فهد، الرياض"
            />
          </div>
        </div>
      </div>

      {/* ══ 5. ملاحظات ══════════════════════════════════════════════════ */}
      <div className="card">
        <SectionTitle num="٥" title="ملاحظات" />
        <textarea
          {...register('notes')}
          rows={4}
          className="form-input resize-none"
          placeholder="أي ملاحظات إضافية تخص المستفيد..."
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button type="submit" disabled={loading} className="btn-primary px-8 py-2.5">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              جارٍ الحفظ...
            </span>
          ) : (
            <span className="flex items-center gap-2"><Save size={16}/> حفظ البيانات</span>
          )}
        </button>
      </div>
    </form>
  );
}
