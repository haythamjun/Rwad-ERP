'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, Trash2, Save, GripVertical, Layers } from 'lucide-react';
import { assessmentsApi } from '@/lib/api';
import type { AssessmentDetail, AssessmentBuilderData } from '@/types';

let keyCounter = 0;
const nextKey = () => `tmp_${++keyCounter}`;

interface LocalQuestion { key: string; id?: number; text: string; }
interface LocalSection { key: string; id?: number; name: string; questions: LocalQuestion[]; }
interface LocalOption { key: string; id?: number; label: string; }

interface Props {
  assessmentId?: number;
}

export default function AssessmentBuilderForm({ assessmentId }: Props) {
  const router = useRouter();
  const isEdit = !!assessmentId;

  const { data: existing, isLoading } = useQuery<AssessmentDetail>({
    queryKey: ['assessment-template', assessmentId],
    queryFn: () => assessmentsApi.detail(assessmentId as number).then((r) => r.data),
    enabled: isEdit,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<LocalSection[]>([]);
  const [preOptions, setPreOptions] = useState<LocalOption[]>([]);
  const [postOptions, setPostOptions] = useState<LocalOption[]>([]);
  const [seeded, setSeeded] = useState(!isEdit);

  useEffect(() => {
    if (existing && !seeded) {
      setName(existing.name);
      setDescription(existing.description || '');
      setIsActive(existing.is_active);
      setSections(existing.sections.map((s) => ({
        key: nextKey(), id: s.id, name: s.name,
        questions: s.questions.map((q) => ({ key: nextKey(), id: q.id, text: q.text })),
      })));
      setPreOptions(existing.pre_options.map((o) => ({ key: nextKey(), id: o.id, label: o.label })));
      setPostOptions(existing.post_options.map((o) => ({ key: nextKey(), id: o.id, label: o.label })));
      setSeeded(true);
    }
  }, [existing, seeded]);

  const saveMutation = useMutation({
    mutationFn: (data: AssessmentBuilderData) =>
      isEdit ? assessmentsApi.update(assessmentId as number, data) : assessmentsApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'تم تحديث المقياس' : 'تم إنشاء المقياس');
      router.push('/assessments');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: string[] | { non_field_errors?: string[] } } })?.response?.data;
      const text = Array.isArray(msg) ? msg[0] : msg?.non_field_errors?.[0];
      toast.error(text || 'حدث خطأ أثناء الحفظ');
    },
  });

  // ── sections/questions helpers ───────────────────────────────────────────
  const addSection = () => setSections((s) => [...s, { key: nextKey(), name: '', questions: [] }]);
  const removeSection = (key: string) => setSections((s) => s.filter((sec) => sec.key !== key));
  const updateSectionName = (key: string, name: string) =>
    setSections((s) => s.map((sec) => (sec.key === key ? { ...sec, name } : sec)));

  const addQuestion = (secKey: string) =>
    setSections((s) => s.map((sec) => (
      sec.key === secKey ? { ...sec, questions: [...sec.questions, { key: nextKey(), text: '' }] } : sec
    )));
  const removeQuestion = (secKey: string, qKey: string) =>
    setSections((s) => s.map((sec) => (
      sec.key === secKey ? { ...sec, questions: sec.questions.filter((q) => q.key !== qKey) } : sec
    )));
  const updateQuestionText = (secKey: string, qKey: string, text: string) =>
    setSections((s) => s.map((sec) => (
      sec.key === secKey
        ? { ...sec, questions: sec.questions.map((q) => (q.key === qKey ? { ...q, text } : q)) }
        : sec
    )));

  // ── scale options helpers ────────────────────────────────────────────────
  const addOption = (kind: 'pre' | 'post') =>
    (kind === 'pre' ? setPreOptions : setPostOptions)((o) => [...o, { key: nextKey(), label: '' }]);
  const removeOption = (kind: 'pre' | 'post', key: string) =>
    (kind === 'pre' ? setPreOptions : setPostOptions)((o) => o.filter((op) => op.key !== key));
  const updateOptionLabel = (kind: 'pre' | 'post', key: string, label: string) =>
    (kind === 'pre' ? setPreOptions : setPostOptions)((o) => o.map((op) => (op.key === key ? { ...op, label } : op)));

  const handleSave = () => {
    if (!name.trim()) { toast.error('اسم المقياس مطلوب'); return; }
    if (sections.some((s) => !s.name.trim())) { toast.error('كل قسم يحتاج اسمًا'); return; }
    if (sections.some((s) => s.questions.some((q) => !q.text.trim()))) { toast.error('لا يمكن ترك نص مهارة فارغًا'); return; }
    if (preOptions.some((o) => !o.label.trim()) || postOptions.some((o) => !o.label.trim())) {
      toast.error('لا يمكن ترك خيار تقدير فارغًا'); return;
    }

    const data: AssessmentBuilderData = {
      name: name.trim(),
      description: description.trim(),
      is_active: isActive,
      sections: sections.map((s, si) => ({
        id: s.id, name: s.name.trim(), order: si,
        questions: s.questions.map((q, qi) => ({ id: q.id, text: q.text.trim(), order: qi })),
      })),
      scale_options: [
        ...preOptions.map((o, oi) => ({ id: o.id, kind: 'pre' as const, label: o.label.trim(), order: oi })),
        ...postOptions.map((o, oi) => ({ id: o.id, kind: 'post' as const, label: o.label.trim(), order: oi })),
      ],
    };
    saveMutation.mutate(data);
  };

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      <div className="card space-y-4">
        <div>
          <label className="form-label">اسم المقياس <span className="text-red-500">*</span></label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: المهارات الحركية الدقيقة لبرنامج بورتيج" />
        </div>
        <div>
          <label className="form-label">وصف</label>
          <textarea rows={2} className="form-input resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span className="text-sm text-gray-700">نشط (يظهر للاختيار عند بدء تقييم جديد لطالب)</span>
        </label>
      </div>

      {/* خيارات التقدير */}
      <div className="card">
        <h3 className="section-title">خيارات التقدير</h3>
        <p className="text-xs text-gray-400 -mt-3 mb-4">تُشارَك هذه الخيارات بين كل أسئلة المقياس</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">التقدير القبلي</p>
            <div className="space-y-2">
              {preOptions.map((o) => (
                <div key={o.key} className="flex items-center gap-2">
                  <input
                    className="form-input py-1.5 text-sm"
                    value={o.label}
                    onChange={(e) => updateOptionLabel('pre', o.key, e.target.value)}
                    placeholder="موجود"
                  />
                  <button onClick={() => removeOption('pre', o.key)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => addOption('pre')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus size={12} /> إضافة خيار
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">التقدير البعدي</p>
            <div className="space-y-2">
              {postOptions.map((o) => (
                <div key={o.key} className="flex items-center gap-2">
                  <input
                    className="form-input py-1.5 text-sm"
                    value={o.label}
                    onChange={(e) => updateOptionLabel('post', o.key, e.target.value)}
                    placeholder="انجز"
                  />
                  <button onClick={() => removeOption('post', o.key)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => addOption('post')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus size={12} /> إضافة خيار
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* الأقسام والأسئلة */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Layers size={16} className="text-primary-600" /> الأقسام والمهارات</h3>
        <button onClick={addSection} className="btn-secondary py-1.5 px-3 text-xs"><Plus size={13} /> إضافة قسم</button>
      </div>

      {sections.map((sec) => (
        <div key={sec.key} className="card">
          <div className="flex items-center gap-2 mb-4">
            <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
            <input
              className="form-input font-semibold flex-1"
              value={sec.name}
              onChange={(e) => updateSectionName(sec.key, e.target.value)}
              placeholder="اسم القسم — مثال: الفئة العمرية من (0 - 1) سنة"
            />
            <button onClick={() => removeSection(sec.key)} className="text-gray-300 hover:text-red-500 flex-shrink-0 p-2"><Trash2 size={16} /></button>
          </div>

          <div className="space-y-2">
            {sec.questions.map((q, qi) => (
              <div key={q.key} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5 text-center flex-shrink-0">{qi + 1}</span>
                <input
                  className="form-input py-1.5 text-sm flex-1"
                  value={q.text}
                  onChange={(e) => updateQuestionText(sec.key, q.key, e.target.value)}
                  placeholder="نص المهارة..."
                />
                <button onClick={() => removeQuestion(sec.key, q.key)} className="text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => addQuestion(sec.key)} className="mt-3 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={12} /> إضافة مهارة
          </button>
        </div>
      ))}

      <div className="fixed bottom-0 inset-x-0 lg:right-64 bg-white border-t border-gray-200 p-4 flex justify-end gap-3 shadow-lg z-40">
        <button onClick={() => router.push('/assessments')} className="btn-secondary">إلغاء</button>
        <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary px-8 disabled:opacity-50">
          {saveMutation.isPending ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ المقياس</>}
        </button>
      </div>
    </div>
  );
}
