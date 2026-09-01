'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { branchesApi, busesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { StudentFormData, Branch, Bus, DisabilityEntry } from '@/types';

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
  nationality:       z.string().min(1, 'الجنسية مطلوبة'),
  // إعاقة (disability_type مع درجة كل نوع — يُدار كحالة منفصلة، ليس ضمن الفورم)
  diagnosis:         z.string().min(1, 'التشخيص التفصيلي مطلوب'),
  iq_score:          z.string().optional()
    .refine(v => !v || (!isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 200), 'درجة الذكاء يجب أن تكون رقمًا بين 1 و 200'),
  // تعليم
  educational_level: z.string().optional(),
  school_name:       z.string().optional(),
  grade:             z.string().optional(),
  // إحالة
  referral_source:        z.string().optional(),
  referral_source_detail: z.string().optional(),
  // حالة
  status:            z.enum(['pending','active','inactive','graduated','suspended','transferred']),
  registration_date: z
    .string()
    .min(1, 'تاريخ التسجيل مطلوب')
    .refine((val) => {
      const d = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d <= today;
    }, 'تاريخ التسجيل لا يمكن أن يكون في المستقبل'),
  notes:             z.string().optional(),
  branch:            z.string().optional(),
  bus:               z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (data: StudentFormData) => void;
  loading?: boolean;
  defaultValues?: Partial<FormValues>;
  initialDisabilityTypes?: DisabilityEntry[];
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

const NATIONALITIES = [
  'سعودي',
  'يمني',
  'مصري',
  'سوري',
  'أردني',
  'فلسطيني',
  'عراقي',
  'لبناني',
  'سوداني',
  'موريتاني',
  'باكستاني',
  'هندي',
  'بنغلاديشي',
  'فلبيني',
  'إندونيسي',
  'إثيوبي',
  'نيجيري',
  'أمريكي',
  'بريطاني',
  'أخرى',
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

export default function StudentForm({ onSubmit, loading, defaultValues, initialDisabilityTypes }: Props) {
  const [photo, setPhoto]                 = useState<File | null>(null);
  const [photoPreview, setPreview]        = useState<string | null>(null);
  const fileRef                           = useRef<HTMLInputElement>(null);
  // key = disability type code, value = its own degree ('' if not yet chosen)
  const [disabilityDegrees, setDisDegrees] = useState<Record<string, string>>(
    () => Object.fromEntries((initialDisabilityTypes || []).map(e => [e.type, e.degree || '']))
  );
  const currentUser                       = useAuthStore((s) => s.user);
  // "قبول الطالب" (pending -> active) يتطلب صلاحية مدير فأعلى — عبر زر مخصص، وليس هذا النموذج.
  const canActivateFromPending = defaultValues?.status !== 'pending' || !!currentUser?.can_delete;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status:            'pending',
      registration_date: new Date().toISOString().split('T')[0],
      nationality:       'سعودي',
      ...defaultValues,
    },
  });

  const referralSource = watch('referral_source');
  const currentBranch  = watch('branch');

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  // الباصات الخاصة بفرع الطالب الحالي فقط
  const { data: buses = [] } = useQuery<Bus[]>({
    queryKey: ['buses', currentBranch],
    queryFn:  () => busesApi.list({ branch: currentBranch }).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled:  !!currentBranch,
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = (values: FormValues) => {
    if (Object.keys(disabilityDegrees).length === 0) {
      toast.error('يرجى اختيار نوع الإعاقة على الأقل');
      return;
    }
    const disability_type: DisabilityEntry[] = Object.entries(disabilityDegrees)
      .map(([type, degree]) => ({ type, degree }));
    onSubmit({ ...values, disability_type, photo } as StudentFormData);
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
            <select {...register('nationality')} className="form-input">
              <option value="">-- اختر --</option>
              {NATIONALITIES.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {errors.nationality && <p className="text-red-500 text-xs mt-1">{errors.nationality.message}</p>}
          </div>

          <div>
            <label className="form-label">تاريخ التسجيل <span className="text-red-500">*</span></label>
            <input
              {...register('registration_date')}
              type="date"
              className="form-input"
              dir="ltr"
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.registration_date && <p className="text-red-500 text-xs mt-1">{errors.registration_date.message}</p>}
          </div>

          <div>
            <label className="form-label">الحالة</label>
            <select {...register('status')} className="form-input">
              <option value="pending">في انتظار القبول</option>
              {canActivateFromPending && <option value="active">نشط</option>}
              <option value="inactive">غير نشط</option>
              <option value="graduated">خرّيج</option>
              <option value="suspended">موقوف</option>
              <option value="transferred">محوّل</option>
            </select>
            {!canActivateFromPending && (
              <p className="text-xs text-gray-400 mt-1">
                قبول الطالب يتطلب صلاحية مدير فأعلى — استخدم زر "قبول الطالب" في صفحة الملف.
              </p>
            )}
          </div>

          {branches.length > 0 && (
            <div>
              <label className="form-label">الفرع</label>
              <select
                {...register('branch')}
                className="form-input"
                onChange={e => { setValue('branch', e.target.value); setValue('bus', ''); }}
              >
                <option value="">-- بدون فرع --</option>
                {branches.filter(b => b.is_active).map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {currentBranch && (
            <div>
              <label className="form-label">الباص</label>
              <select {...register('bus')} className="form-input">
                <option value="">-- بدون نقل --</option>
                {buses.map(b => (
                  <option key={b.id} value={b.id}>{b.brand} — {b.plate_number}</option>
                ))}
              </select>
              {currentBranch && buses.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">لا يوجد باصات مسجّلة لهذا الفرع.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ 2. الإعاقة والتشخيص ═════════════════════════════════════════ */}
      <div className="card">
        <SectionTitle num="٢" title="الإعاقة والتشخيص" />

        <div className="space-y-4">
          {/* نوع الإعاقة — متعدد الاختيار، كل نوع له درجته الخاصة */}
          <div>
            <label className="form-label">
              نوع الإعاقة <span className="text-red-500">*</span>
              {Object.keys(disabilityDegrees).length > 0 && (
                <span className="mr-2 text-xs font-normal text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                  {Object.keys(disabilityDegrees).length} مختار
                </span>
              )}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {DISABILITY_TYPES.map(o => {
                const checked = o.value in disabilityDegrees;
                return (
                  <label
                    key={o.value}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors select-none ${
                      checked
                        ? 'border-primary-400 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary-600 flex-shrink-0"
                      checked={checked}
                      onChange={e => {
                        setDisDegrees(prev => {
                          const next = { ...prev };
                          if (e.target.checked) next[o.value] = '';
                          else delete next[o.value];
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm">{o.label}</span>
                  </label>
                );
              })}
            </div>

            {/* درجة كل نوع إعاقة مختار — على حدة */}
            {Object.keys(disabilityDegrees).length > 0 && (
              <div className="mt-3 space-y-2">
                {DISABILITY_TYPES.filter(o => o.value in disabilityDegrees).map(o => (
                  <div key={o.value} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <span className="text-sm text-gray-700 flex-1">{o.label}</span>
                    <select
                      className="form-input py-1.5 text-sm w-44"
                      value={disabilityDegrees[o.value]}
                      onChange={e => setDisDegrees(prev => ({ ...prev, [o.value]: e.target.value }))}
                    >
                      <option value="">-- درجة الإعاقة --</option>
                      {DISABILITY_DEGREES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">درجة الذكاء</label>
            <input
              type="number" min="1" max="200"
              {...register('iq_score')}
              className="form-input md:w-1/2"
              placeholder="مثال: 85"
            />
            {errors.iq_score && <p className="text-red-500 text-xs mt-1">{errors.iq_score.message}</p>}
          </div>

          <div>
            <label className="form-label">التشخيص التفصيلي <span className="text-red-500">*</span></label>
            <textarea
              {...register('diagnosis')}
              rows={3}
              className={`form-input resize-none`}
              placeholder="التشخيص الطبي أو النفسي التفصيلي..."
            />
            {errors.diagnosis && <p className="text-red-500 text-xs mt-1">{errors.diagnosis.message}</p>}
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
