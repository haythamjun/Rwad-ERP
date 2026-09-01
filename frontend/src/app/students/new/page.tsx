'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, Save, Upload, X, Plus, Trash2, UserPlus, FileText, Check,
} from 'lucide-react';
import { studentsApi, guardiansApi, familyApi, attachmentsApi, branchesApi } from '@/lib/api';
import type { Branch } from '@/types';
import Header from '@/components/layout/Header';

// ─── Zod schema for basic student data ───────────────────────────────────────
const schema = z.object({
  first_name:       z.string().min(2, 'الاسم الأول مطلوب').max(50),
  middle_name:      z.string().min(2, 'اسم الأب مطلوب').max(50),
  grandfather_name: z.string().min(2, 'اسم الجد مطلوب').max(50),
  family_name:      z.string().min(2, 'اسم العائلة مطلوب').max(50),
  national_id: z.string().min(1, 'رقم الهوية مطلوب').regex(/^\d{10}$/, 'يجب أن يكون 10 أرقام'),
  date_of_birth: z.string().min(1, 'تاريخ الميلاد مطلوب')
    .refine(v => new Date(v) <= new Date(), 'لا يمكن أن يكون في المستقبل'),
  gender:      z.enum(['male', 'female'], { required_error: 'الجنس مطلوب' }),
  nationality: z.string().min(1, 'الجنسية مطلوبة'),
  // disability_type (with its per-type degrees) managed as separate state — not in schema
  diagnosis:              z.string().min(1, 'التشخيص التفصيلي مطلوب'),
  iq_score:               z.string().optional()
    .refine(v => !v || (!isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 200), 'درجة الذكاء يجب أن تكون رقمًا بين 1 و 200'),
  educational_level:      z.string().optional(),
  school_name:            z.string().optional(),
  grade:                  z.string().optional(),
  referral_source:        z.string().optional(),
  referral_source_detail: z.string().optional(),
  status: z.literal('pending'),
  registration_date: z.string().min(1, 'تاريخ التسجيل مطلوب')
    .refine(v => new Date(v) <= new Date(), 'لا يمكن أن يكون في المستقبل'),
  notes:  z.string().optional(),
  branch: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Draft types (local state, not yet saved) ────────────────────────────────
type GuardianDraft = {
  _key:               string;
  full_name:          string;
  relationship:       string;
  national_id:        string;
  phone:              string;
  phone_alt:          string;
  email:              string;
  address:            string;
  is_primary_contact: boolean;
  notes:              string;
};

type AttachmentDraft = {
  _key: string;
  file: File;
  type: string;
  name: string;
};

// ─── Options ──────────────────────────────────────────────────────────────────
const NATIONALITIES = [
  'سعودي','يمني','مصري','سوري','أردني','فلسطيني','عراقي','لبناني',
  'سوداني','موريتاني','باكستاني','هندي','بنغلاديشي','فلبيني',
  'إندونيسي','إثيوبي','نيجيري','أمريكي','بريطاني','أخرى',
];
const DISABILITY_TYPES = [
  { value:'intellectual',label:'إعاقة ذهنية' },{ value:'autism',label:'طيف التوحد' },
  { value:'down',label:'متلازمة داون' },{ value:'physical',label:'إعاقة حركية' },
  { value:'hearing',label:'إعاقة سمعية' },{ value:'visual',label:'إعاقة بصرية' },
  { value:'speech',label:'إعاقة لغوية / نطقية' },{ value:'learning',label:'صعوبات تعلم' },
  { value:'behavioral',label:'اضطراب سلوكي' },{ value:'multiple',label:'إعاقة مركّبة' },
  { value:'other',label:'أخرى' },
];
const DISABILITY_DEGREES = [
  { value:'mild',label:'بسيطة' },{ value:'moderate',label:'متوسطة' },
  { value:'severe',label:'شديدة' },{ value:'profound',label:'شديدة جداً' },
];
const EDUCATIONAL_LEVELS = [
  { value:'none',label:'لا يتعلم' },{ value:'kindergarten',label:'رياض أطفال' },
  { value:'elementary',label:'ابتدائي' },{ value:'intermediate',label:'متوسط' },
  { value:'secondary',label:'ثانوي' },{ value:'university',label:'جامعي' },
  { value:'special',label:'برنامج تربية خاصة' },
];
const REFERRAL_SOURCES = [
  { value:'hospital',label:'مستشفى / عيادة' },{ value:'school',label:'مدرسة' },
  { value:'family',label:'الأسرة مباشرة' },{ value:'ngo',label:'جمعية / مؤسسة' },
  { value:'ministry',label:'وزارة / جهة حكومية' },{ value:'specialist',label:'طبيب / معالج' },
  { value:'other',label:'أخرى' },
];
const RELATIONSHIPS = [
  { value:'father',label:'أب' },{ value:'mother',label:'أم' },
  { value:'brother',label:'أخ' },{ value:'sister',label:'أخت' },
  { value:'grandfather',label:'جد' },{ value:'grandmother',label:'جدة' },
  { value:'uncle',label:'عم / خال' },{ value:'aunt',label:'عمة / خالة' },
  { value:'other',label:'أخرى' },
];
const PARENTS_STATUS = [
  { value:'married',label:'متزوجان' },{ value:'divorced',label:'مطلقان' },
  { value:'father_deceased',label:'الأب متوفى' },{ value:'mother_deceased',label:'الأم متوفاة' },
  { value:'both_deceased',label:'كلاهما متوفى' },{ value:'separated',label:'منفصلان' },
];
const INCOME_RANGE = [
  { value:'very_low',label:'أقل من 3,000 ريال' },{ value:'low',label:'3,000 – 6,000 ريال' },
  { value:'medium',label:'6,000 – 10,000 ريال' },{ value:'high',label:'10,000 – 20,000 ريال' },
  { value:'very_high',label:'أكثر من 20,000 ريال' },
];
const HOUSING_TYPE = [
  { value:'owned',label:'ملك' },{ value:'rented',label:'إيجار' },
  { value:'relative',label:'مع الأقارب' },{ value:'government',label:'سكن حكومي' },
  { value:'other',label:'أخرى' },
];

// ─── Required attachments ────────────────────────────────────────────────────
const REQUIRED_ATTACHMENTS = [
  { type: 'national_id',    label: 'صورة الهوية الوطنية' },
  { type: 'family_card',    label: 'كرت العائلة' },
  { type: 'medical_report', label: 'التقرير الطبي' },
] as const;

// ─── Helper: section title ────────────────────────────────────────────────────
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

// ─── Wizard steps ──────────────────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'البيانات الشخصية' },
  { num: 2, label: 'الإعاقة والتشخيص' },
  { num: 3, label: 'التعليم وجهة الإحالة' },
  { num: 4, label: 'ولي الأمر والأسرة' },
  { num: 5, label: 'المرفقات والملاحظات' },
] as const;

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="card">
      <div className="flex items-start">
        {STEPS.map((s, i) => (
          <div key={s.num} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1.5 w-20 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                  s.num < current
                    ? 'bg-primary-600 text-white'
                    : s.num === current
                    ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {s.num < current ? <Check size={16} /> : s.num}
              </div>
              <span
                className={`text-[11px] font-medium text-center leading-tight ${
                  s.num <= current ? 'text-primary-700' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${s.num < current ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step navigation row ────────────────────────────────────────────────────────
function StepNav({
  step, onBack, onNext, nextLabel = 'التالي', nextDisabled = false,
}: {
  step: number; onBack?: () => void; onNext: () => void; nextLabel?: string; nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3">
      {step > 1 && onBack && (
        <button type="button" onClick={onBack} className="btn-secondary">
          <ArrowRight size={16} /> العودة
        </button>
      )}
      <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-primary px-8">
        {nextLabel} {nextLabel === 'التالي' && <ArrowLeft size={16} />}
      </button>
    </div>
  );
}

let _keyCounter = 0;
const nextKey = () => String(++_keyCounter);

// ─────────────────────────────────────────────────────────────────────────────
export default function NewStudentPage() {
  const router = useRouter();

  // ── Basic form ──────────────────────────────────────────────────────────
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status:            'pending',
      registration_date: new Date().toISOString().split('T')[0],
      nationality:       'سعودي',
    },
  });
  const referralSource = watch('referral_source');

  // ── Wizard step ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const STEP_1_FIELDS = ['first_name', 'middle_name', 'grandfather_name', 'family_name',
    'national_id', 'date_of_birth', 'gender', 'nationality', 'registration_date'] as const;
  const STEP_2_FIELDS = ['diagnosis', 'iq_score'] as const;

  // ── Branches ─────────────────────────────────────────────────────────────
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  // ── Disability types (multi-select state) ────────────────────────────────
  // key = disability type code, value = its own degree ('' if not yet chosen)
  const [disabilityDegrees, setDisDegrees] = useState<Record<string, string>>({});

  // ── Photo ────────────────────────────────────────────────────────────────
  const [photo, setPhoto]         = useState<File | null>(null);
  const [photoPreview, setPreview] = useState<string | null>(null);
  const photoRef                   = useRef<HTMLInputElement>(null);

  // ── Guardians (local drafts) ─────────────────────────────────────────────
  const [guardians, setGuardians] = useState<GuardianDraft[]>([]);

  const addGuardian = () =>
    setGuardians(prev => [...prev, {
      _key: nextKey(), full_name:'', relationship:'father',
      national_id:'', phone:'', phone_alt:'', email:'',
      address:'', is_primary_contact: prev.length === 0, notes:'',
    }]);

  const removeGuardian = (key: string) =>
    setGuardians(prev => prev.filter(g => g._key !== key));

  const updateGuardian = (key: string, field: keyof GuardianDraft, val: unknown) =>
    setGuardians(prev => prev.map(g => g._key === key ? { ...g, [field]: val } : g));

  // ── Family (optional) ────────────────────────────────────────────────────
  const [showFamily, setShowFamily] = useState(false);
  const [family, setFamily] = useState({
    family_size:'', sibling_order:'', parents_status:'',
    income_range:'', monthly_income:'', housing_type:'',
    other_special_needs: false, social_notes:'',
  });
  const setFam = (k: string, v: unknown) => setFamily(f => ({ ...f, [k]: v }));

  const incomeRangeFrom = (n: number): string => {
    if (n < 3000)  return 'very_low';
    if (n < 6000)  return 'low';
    if (n < 10000) return 'medium';
    if (n < 20000) return 'high';
    return 'very_high';
  };

  // ── API error ────────────────────────────────────────────────────────────
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Required attachments ─────────────────────────────────────────────────
  const [requiredFiles, setRequiredFiles] = useState<Record<string, File | null>>({ national_id: null, family_card: null, medical_report: null });
  const [activeReqType, setActiveReqType] = useState<string | null>(null);
  const reqFileRef = useRef<HTMLInputElement>(null);

  // ── Optional attachments ──────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const attachRef = useRef<HTMLInputElement>(null);

  const addAttachment = (file: File) =>
    setAttachments(prev => [...prev, {
      _key: nextKey(), file,
      type: '',
      name: file.name.replace(/\.[^/.]+$/, ''),
    }]);

  const removeAttachment = (key: string) =>
    setAttachments(prev => prev.filter(a => a._key !== key));

  const updateAttachment = (key: string, field: 'type' | 'name', val: string) =>
    setAttachments(prev => prev.map(a => a._key === key ? { ...a, [field]: val } : a));

  // ── Wizard navigation ────────────────────────────────────────────────────
  const goBack = () => { setStep(s => Math.max(1, s - 1)); scrollTop(); };

  const goNext = async () => {
    if (step === 1) {
      if (!(await trigger(STEP_1_FIELDS))) return;
    }
    if (step === 2) {
      if (Object.keys(disabilityDegrees).length === 0) {
        toast.error('يرجى اختيار نوع الإعاقة على الأقل'); return;
      }
      if (!(await trigger(STEP_2_FIELDS))) return;
    }
    if (step === 4) {
      if (guardians.length === 0) {
        toast.error('يرجى إضافة ولي أمر واحد على الأقل'); return;
      }
      for (const g of guardians) {
        if (!g.full_name.trim()) { toast.error('يرجى إدخال اسم ولي الأمر'); return; }
        if (!/^\d{10}$/.test(g.phone)) { toast.error(`رقم جوال ولي الأمر "${g.full_name}" غير صحيح`); return; }
      }
      if (showFamily) {
        if (!family.family_size || !family.sibling_order || !family.parents_status) {
          toast.error('يرجى تعبئة الحقول الإلزامية في بيانات الأسرة'); return;
        }
        if (Number(family.sibling_order) > Number(family.family_size)) {
          toast.error('ترتيب المستفيد لا يمكن أن يكون أكبر من عدد أفراد الأسرة'); return;
        }
      }
    }
    setStep(s => Math.min(5, s + 1));
    scrollTop();
  };

  // ── Save all ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const saveAll = async (data: FormValues) => {
    // Validate disability types
    if (Object.keys(disabilityDegrees).length === 0) {
      toast.error('يرجى اختيار نوع الإعاقة على الأقل');
      return;
    }
    // Require at least one guardian
    if (guardians.length === 0) {
      toast.error('يرجى إضافة ولي أمر واحد على الأقل');
      return;
    }
    // Validate guardians minimally
    for (const g of guardians) {
      if (!g.full_name.trim()) { toast.error('يرجى إدخال اسم ولي الأمر'); return; }
      if (!/^\d{10}$/.test(g.phone)) { toast.error(`رقم جوال ولي الأمر "${g.full_name}" غير صحيح`); return; }
    }
    // Validate family if shown
    if (showFamily) {
      if (!family.family_size || !family.sibling_order || !family.parents_status) {
        toast.error('يرجى تعبئة الحقول الإلزامية في بيانات الأسرة'); return;
      }
      if (Number(family.sibling_order) > Number(family.family_size)) {
        toast.error('ترتيب المستفيد لا يمكن أن يكون أكبر من عدد أفراد الأسرة'); return;
      }
    }
    // Validate required attachments
    const missingRequired = REQUIRED_ATTACHMENTS.filter(r => !requiredFiles[r.type]);
    if (missingRequired.length > 0) {
      toast.error(`يرجى إرفاق: ${missingRequired.map(r => r.label).join('، ')}`);
      return;
    }
    // Validate optional attachments
    for (const a of attachments) {
      if (!a.type) { toast.error(`يرجى اختيار نوع المرفق: ${a.name}`); return; }
    }

    setApiError(null);
    setSaving(true);
    let studentId: number | null = null;

    try {
      // 1. Create student
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') fd.append(k, String(v));
      });
      fd.append('disability_type', JSON.stringify(
        Object.entries(disabilityDegrees).map(([type, degree]) => ({ type, degree }))
      ));
      if (photo) fd.append('photo', photo);
      const res = await studentsApi.create(fd);
      const sid: number = res.data.id;
      studentId = sid;

      // 2. Guardians
      for (const g of guardians) {
        await guardiansApi.create(sid, {
          full_name:          g.full_name,
          relationship:       g.relationship as never,
          national_id:        g.national_id || undefined,
          phone:              g.phone,
          phone_alt:          g.phone_alt   || undefined,
          email:              g.email       || undefined,
          address:            g.address     || undefined,
          is_primary_contact: g.is_primary_contact,
          notes:              g.notes       || undefined,
        });
      }

      // 3. Family
      if (showFamily && family.parents_status) {
        await familyApi.create(sid, {
          family_size:         Number(family.family_size),
          sibling_order:       Number(family.sibling_order),
          parents_status:      family.parents_status,
          income_range:        family.income_range  || undefined,
          monthly_income:      family.monthly_income ? Number(family.monthly_income) : undefined,
          housing_type:        family.housing_type  || undefined,
          other_special_needs: family.other_special_needs,
          social_notes:        family.social_notes  || undefined,
        });
      }

      // 4. Required attachments (upload first)
      for (const req of REQUIRED_ATTACHMENTS) {
        const file = requiredFiles[req.type];
        if (file) {
          const afd = new FormData();
          afd.append('file', file);
          afd.append('attachment_type', req.type);
          afd.append('name', file.name.replace(/\.[^/.]+$/, ''));
          await attachmentsApi.upload(sid, afd);
        }
      }

      // 5. Optional attachments
      for (const a of attachments) {
        const afd = new FormData();
        afd.append('file', a.file);
        afd.append('attachment_type', a.type);
        afd.append('name', a.name);
        await attachmentsApi.upload(sid, afd);
      }

      toast.success(`تمت الإضافة بنجاح — رقم الملف: ${res.data.file_number}`, { duration: 5000 });
      router.push('/students');
    } catch (err: unknown) {
      console.error('[saveAll error]', err);
      const apiErr = err as { response?: { data?: unknown; status?: number } };
      const rawData = apiErr?.response?.data;
      const status  = apiErr?.response?.status;

      let msg: string;
      if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
        // DRF JSON validation error — show field messages
        const lines = Object.entries(rawData as Record<string, unknown>).map(([k, v]) => {
          const text = Array.isArray(v) ? v.join(', ') : String(v);
          return `${k}: ${text}`;
        });
        msg = lines.join(' | ');
      } else if (typeof rawData === 'string' && rawData.includes('DOCTYPE')) {
        // Server returned HTML (Django 500 error page)
        msg = `خطأ في الخادم (${status || 500}) — يرجى التواصل مع الدعم التقني`;
      } else {
        msg = `حدث خطأ أثناء الحفظ${status ? ` (${status})` : ''} — تحقق من الاتصال وأعد المحاولة`;
      }

      setApiError(msg);
      toast.error(msg, { duration: 8000 });
      // If student was created but later steps failed, go to list
      if (studentId) router.push('/students');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl">
      <Header
        title="إضافة طالب جديد"
        subtitle={`الخطوة ${step} من ${STEPS.length} — ${STEPS[step - 1].label}`}
        actions={
          <Link href="/students" className="btn-secondary">
            <ArrowLeft size={16} /> العودة للقائمة
          </Link>
        }
      />

      <ProgressBar current={step} />

      <form onSubmit={handleSubmit(saveAll, (errs) => {
        const first = Object.values(errs)[0] as { message?: string } | undefined;
        toast.error(`يوجد حقول مطلوبة — ${first?.message || 'يرجى مراجعة البيانات الأساسية'}`, { duration: 5000 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })} className="space-y-5">

        {/* ══ خطوة ١: البيانات الشخصية ═══════════════════════════════════════ */}
        {step === 1 && (
        <>
        <div className="card">
          <SectionTitle num="١" title="البيانات الشخصية" />

          {/* Photo */}
          <div className="flex items-start gap-4 mb-6">
            <div
              className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors flex-shrink-0"
              onClick={() => photoRef.current?.click()}
            >
              {photoPreview
                ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                : <Upload size={20} className="text-gray-400" />}
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPhoto(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
            <div className="pt-1">
              <button type="button" onClick={() => photoRef.current?.click()} className="btn-secondary text-xs py-1">
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
              <input {...register('first_name')} className="form-input" />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="form-label">اسم الأب <span className="text-red-500">*</span></label>
              <input {...register('middle_name')} className="form-input" />
              {errors.middle_name && <p className="text-red-500 text-xs mt-1">{errors.middle_name.message}</p>}
            </div>
            <div>
              <label className="form-label">اسم الجد <span className="text-red-500">*</span></label>
              <input {...register('grandfather_name')} className="form-input" />
              {errors.grandfather_name && <p className="text-red-500 text-xs mt-1">{errors.grandfather_name.message}</p>}
            </div>
            <div>
              <label className="form-label">اسم العائلة <span className="text-red-500">*</span></label>
              <input {...register('family_name')} className="form-input" />
              {errors.family_name && <p className="text-red-500 text-xs mt-1">{errors.family_name.message}</p>}
            </div>
            <div>
              <label className="form-label">رقم الهوية / الإقامة <span className="text-red-500">*</span></label>
              <input {...register('national_id')} className="form-input font-mono" dir="ltr" maxLength={10} inputMode="numeric" placeholder="1XXXXXXXXX" />
              {errors.national_id && <p className="text-red-500 text-xs mt-1">{errors.national_id.message}</p>}
            </div>
            <div>
              <label className="form-label">تاريخ الميلاد <span className="text-red-500">*</span></label>
              <input {...register('date_of_birth')} type="date" className="form-input" dir="ltr"
                max={new Date().toISOString().split('T')[0]} />
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
                {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">تاريخ التسجيل <span className="text-red-500">*</span></label>
              <input {...register('registration_date')} type="date" className="form-input" dir="ltr"
                max={new Date().toISOString().split('T')[0]} />
              {errors.registration_date && <p className="text-red-500 text-xs mt-1">{errors.registration_date.message}</p>}
            </div>
            <div>
              <label className="form-label">الحالة</label>
              <div className="form-input bg-gray-50 flex items-center gap-2 cursor-default select-none">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <span className="text-gray-600 text-sm">في انتظار القبول</span>
                <span className="text-gray-400 text-xs mr-auto">تُضبط تلقائياً عند التسجيل</span>
              </div>
              <input type="hidden" {...register('status')} value="pending" />
            </div>

            {branches.length > 0 && (
              <div>
                <label className="form-label">الفرع</label>
                <select {...register('branch')} className="form-input">
                  <option value="">-- بدون فرع --</option>
                  {branches.filter(b => b.is_active).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <StepNav step={step} onNext={goNext} />
        </>
        )}

        {/* ══ خطوة ٢: الإعاقة والتشخيص ════════════════════════════════════════ */}
        {step === 2 && (
        <>
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
              <textarea {...register('diagnosis')} rows={3} className="form-input resize-none"
                placeholder="التشخيص الطبي أو النفسي التفصيلي..." />
              {errors.diagnosis && <p className="text-red-500 text-xs mt-1">{errors.diagnosis.message}</p>}
            </div>
          </div>
        </div>
        <StepNav step={step} onBack={goBack} onNext={goNext} />
        </>
        )}

        {/* ══ خطوة ٣: المعلومات التعليمية وجهة الإحالة ═══════════════════════ */}
        {step === 3 && (
        <>
        <div className="card">
          <SectionTitle num="٣" title="المعلومات التعليمية" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">المستوى التعليمي</label>
              <select {...register('educational_level')} className="form-input">
                <option value="">-- اختر --</option>
                {EDUCATIONAL_LEVELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">اسم المدرسة / المؤسسة</label>
              <input {...register('school_name')} className="form-input" />
            </div>
            <div>
              <label className="form-label">الصف / المرحلة</label>
              <input {...register('grade')} className="form-input" placeholder="مثال: الثالث الابتدائي" />
            </div>
          </div>
        </div>

        {/* ══ ٤. جهة الإحالة ══════════════════════════════════════════════ */}
        <div className="card">
          <SectionTitle num="٤" title="جهة الإحالة" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">جهة الإحالة</label>
              <select {...register('referral_source')} className="form-input">
                <option value="">-- اختر --</option>
                {REFERRAL_SOURCES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{referralSource === 'other' ? 'اذكر جهة الإحالة' : 'تفاصيل إضافية'}</label>
              <input {...register('referral_source_detail')} className="form-input"
                placeholder="مثال: مستشفى الملك فهد، الرياض" />
            </div>
          </div>
        </div>
        <StepNav step={step} onBack={goBack} onNext={goNext} />
        </>
        )}

        {/* ══ خطوة ٤: ولي الأمر وبيانات الأسرة ════════════════════════════════ */}
        {step === 4 && (
        <>
        {/* ══ ٥. أولياء الأمور ════════════════════════════════════════════ */}
        <div className="card">
          <div className="flex items-center justify-between mb-5 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">٥</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                أولياء الأمور <span className="text-red-500">*</span>
              </h3>
              <span className="text-xs text-gray-400">(مطلوب ولي أمر واحد على الأقل)</span>
            </div>
            <button type="button" onClick={addGuardian}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <UserPlus size={15} /> إضافة ولي أمر
            </button>
          </div>

          {guardians.length === 0 ? (
            <div className="text-center py-6 text-sm border-2 border-dashed border-red-200 bg-red-50 rounded-xl">
              <p className="text-red-500 font-medium">يجب إضافة ولي أمر واحد على الأقل</p>
              <p className="text-gray-400 text-xs mt-1">اضغط «إضافة ولي أمر» أعلاه</p>
            </div>
          ) : (
            <div className="space-y-4">
              {guardians.map((g, idx) => (
                <div key={g._key} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      ولي الأمر {idx + 1}
                    </span>
                    <button type="button" onClick={() => removeGuardian(g._key)}
                      className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="form-label">الاسم الكامل <span className="text-red-500">*</span></label>
                      <input className="form-input" value={g.full_name}
                        onChange={e => updateGuardian(g._key, 'full_name', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">صلة القرابة <span className="text-red-500">*</span></label>
                      <select className="form-input" value={g.relationship}
                        onChange={e => updateGuardian(g._key, 'relationship', e.target.value)}>
                        {RELATIONSHIPS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">رقم الهوية</label>
                      <input
                        className="form-input font-mono" dir="ltr"
                        inputMode="numeric" maxLength={10} placeholder="1XXXXXXXXX"
                        value={g.national_id}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                          updateGuardian(g._key, 'national_id', v);
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label">رقم الجوال <span className="text-red-500">*</span></label>
                      <input className="form-input" dir="ltr" placeholder="05XXXXXXXX" maxLength={10}
                        inputMode="numeric" value={g.phone}
                        onChange={e => updateGuardian(g._key, 'phone', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">رقم جوال إضافي</label>
                      <input className="form-input" dir="ltr" placeholder="05XXXXXXXX" maxLength={10}
                        inputMode="numeric" value={g.phone_alt}
                        onChange={e => updateGuardian(g._key, 'phone_alt', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">البريد الإلكتروني</label>
                      <input className="form-input" type="email" dir="ltr" value={g.email}
                        onChange={e => updateGuardian(g._key, 'email', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">العنوان</label>
                      <input className="form-input" value={g.address}
                        onChange={e => updateGuardian(g._key, 'address', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">ملاحظات</label>
                      <input className="form-input" value={g.notes}
                        onChange={e => updateGuardian(g._key, 'notes', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <input type="checkbox" id={`prim-${g._key}`} className="w-4 h-4 accent-primary-600"
                        checked={g.is_primary_contact}
                        onChange={e => updateGuardian(g._key, 'is_primary_contact', e.target.checked)} />
                      <label htmlFor={`prim-${g._key}`} className="text-sm text-gray-700 cursor-pointer">
                        جهة التواصل الرئيسية
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ ٦. بيانات الأسرة ════════════════════════════════════════════ */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">٦</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">بيانات الأسرة</h3>
            </div>
            <button type="button"
              onClick={() => setShowFamily(v => !v)}
              className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                showFamily
                  ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {showFamily ? '▲ إخفاء' : '▼ إضافة بيانات الأسرة'}
            </button>
          </div>

          {showFamily && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">عدد أفراد الأسرة <span className="text-red-500">*</span></label>
                <input type="number" min="1" className="form-input" value={family.family_size}
                  onChange={e => setFam('family_size', e.target.value)} />
              </div>
              <div>
                <label className="form-label">ترتيب المستفيد بين الإخوة <span className="text-red-500">*</span></label>
                <input
                  type="number" min="1"
                  className={`form-input ${family.sibling_order && family.family_size && Number(family.sibling_order) > Number(family.family_size) ? 'border-red-400 bg-red-50' : ''}`}
                  value={family.sibling_order}
                  onChange={e => setFam('sibling_order', e.target.value)}
                />
                {family.sibling_order && family.family_size && Number(family.sibling_order) > Number(family.family_size) && (
                  <p className="text-red-500 text-xs mt-1">يجب ألا يتجاوز عدد أفراد الأسرة ({family.family_size})</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">حالة الوالدين <span className="text-red-500">*</span></label>
                <select className="form-input" value={family.parents_status}
                  onChange={e => setFam('parents_status', e.target.value)}>
                  <option value="">-- اختر --</option>
                  {PARENTS_STATUS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الدخل الشهري التقريبي</label>
                <select className="form-input" value={family.income_range}
                  onChange={e => setFam('income_range', e.target.value)}>
                  <option value="">-- اختر --</option>
                  {INCOME_RANGE.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">الدخل الشهري (ريال)</label>
                <input type="number" min="0" step="100" className="form-input" placeholder="مثال: 5000"
                  value={family.monthly_income}
                  onChange={e => {
                    const v = e.target.value;
                    setFam('monthly_income', v);
                    if (v && Number(v) > 0) setFam('income_range', incomeRangeFrom(Number(v)));
                  }} />
              </div>
              <div>
                <label className="form-label">نوع السكن</label>
                <select className="form-input" value={family.housing_type}
                  onChange={e => setFam('housing_type', e.target.value)}>
                  <option value="">-- اختر --</option>
                  {HOUSING_TYPE.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="other_needs" className="w-4 h-4 accent-primary-600"
                  checked={family.other_special_needs}
                  onChange={e => setFam('other_special_needs', e.target.checked)} />
                <label htmlFor="other_needs" className="text-sm text-gray-700 cursor-pointer">
                  يوجد أفراد آخرون بحاجات خاصة في الأسرة
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">ملاحظات اجتماعية</label>
                <textarea rows={3} className="form-input resize-none" value={family.social_notes}
                  onChange={e => setFam('social_notes', e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <StepNav step={step} onBack={goBack} onNext={goNext} />
        </>
        )}

        {/* ══ خطوة ٥: المرفقات والملاحظات العامة ══════════════════════════════ */}
        {step === 5 && (
        <>
        {/* ══ ٧. المرفقات ═════════════════════════════════════════════════ */}
        <div className="card">
          <div className="flex items-center gap-3 mb-5 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">٧</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">المرفقات</h3>
          </div>

          {/* المستندات الإلزامية */}
          <p className="text-xs font-semibold text-gray-700 mb-3">
            المستندات الإلزامية <span className="text-red-500">*</span>
          </p>
          <div className="space-y-2 mb-5">
            {REQUIRED_ATTACHMENTS.map(req => {
              const file = requiredFiles[req.type];
              return (
                <div key={req.type}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                    file ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                  <FileText size={18} className={`flex-shrink-0 ${file ? 'text-green-500' : 'text-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {req.label} <span className="text-red-500">*</span>
                    </p>
                    {file && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {file.name} — {(file.size / 1024).toFixed(0)} KB
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setActiveReqType(req.type); reqFileRef.current?.click(); }}
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      file
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {file ? 'تغيير' : 'رفع ملف'}
                  </button>
                </div>
              );
            })}
          </div>
          <input ref={reqFileRef} type="file" accept=".pdf,image/*" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f && activeReqType) {
                setRequiredFiles(prev => ({ ...prev, [activeReqType]: f }));
                e.target.value = '';
                setActiveReqType(null);
              }
            }} />

          {/* فاصل */}
          <div className="border-t border-gray-100 mb-4" />

          {/* المرفقات الإضافية */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-600">مرفقات إضافية (اختيارية)</p>
            <button type="button" onClick={() => attachRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Plus size={15} /> إضافة ملف
            </button>
          </div>
          <input ref={attachRef} type="file" accept=".pdf,image/*" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) { addAttachment(f); e.target.value = ''; }
            }} />

          {attachments.length === 0 ? (
            <div
              className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors"
              onClick={() => attachRef.current?.click()}>
              <Upload size={20} className="mx-auto mb-1.5 text-gray-300" />
              اضغط لإضافة مرفق اختياري (PDF أو صورة)
            </div>
          ) : (
            <div className="space-y-3">
              {attachments.map(a => (
                <div key={a._key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <FileText size={18} className="text-primary-400 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="form-label text-xs">نوع المرفق <span className="text-red-500">*</span></label>
                      <select className="form-input py-1.5 text-sm" value={a.type}
                        onChange={e => updateAttachment(a._key, 'type', e.target.value)}>
                        <option value="">-- اختر --</option>
                        <option value="birth_certificate">شهادة الميلاد</option>
                        <option value="medical_report">تقرير طبي</option>
                        <option value="psychological_report">تقرير نفسي</option>
                        <option value="disability_card">بطاقة إعاقة</option>
                        <option value="referral_letter">خطاب إحالة</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-xs">اسم المرفق</label>
                      <input className="form-input py-1.5 text-sm" value={a.name}
                        onChange={e => updateAttachment(a._key, 'name', e.target.value)} />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeAttachment(a._key)}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => attachRef.current?.click()}
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors">
                + إضافة ملف آخر
              </button>
            </div>
          )}
        </div>

        {/* ══ ٨. ملاحظات ══════════════════════════════════════════════════ */}
        <div className="card">
          <SectionTitle num="٨" title="ملاحظات عامة" />
          <textarea {...register('notes')} rows={3} className="form-input resize-none"
            placeholder="أي ملاحظات إضافية تخص المستفيد..." />
        </div>

        {/* ── Errors summary (always visible near save button) ────────────── */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-right">
            <p className="text-sm font-semibold text-red-700 mb-2">⚠ يرجى تصحيح الأخطاء التالية قبل الحفظ:</p>
            <ul className="space-y-0.5 text-xs text-red-600">
              {Object.entries(errors).map(([, e]) =>
                e?.message ? <li key={e.message as string}>• {e.message as string}</li> : null
              )}
            </ul>
          </div>
        )}
        {apiError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-right text-sm text-red-700">
            ⚠ {apiError}
          </div>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pb-6">
          <button type="button" onClick={goBack} disabled={saving} className="btn-secondary">
            <ArrowRight size={16} /> العودة
          </button>
          <Link href="/students" className="btn-secondary">إلغاء</Link>
          <button type="submit" disabled={saving} className="btn-primary px-10 py-2.5">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                جارٍ الحفظ...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16}/> حفظ جميع البيانات</span>
            )}
          </button>
        </div>
        </>
        )}

      </form>
    </div>
  );
}
