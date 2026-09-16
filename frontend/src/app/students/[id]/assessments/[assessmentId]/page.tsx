'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Save, ListChecks, Printer } from 'lucide-react';
import { assessmentsApi, studentAssessmentsApi, studentsApi, siteSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';
import type {
  AssessmentDetail, StudentAssessment, AssessmentQuestion, AssessmentSection,
  AssessmentScaleOption, StudentAssessmentAnswerInput, Student, SiteSettings,
} from '@/types';

type AnswerState = Record<number, { pre_rating: number | null; plan_text: string; post_rating: number | null }>;

const DEFAULT_NAME_AR = 'مركز رؤية للتأهيل';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayArabic(): string {
  return new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── وثيقة الخطة الفردية (للطباعة / الحفظ كـ PDF) ───────────────────────────────
function buildPlanHTML(
  student: Student,
  studentAssessment: StudentAssessment,
  template: AssessmentDetail,
  answers: AnswerState,
  centerNameAr: string,
  logoUrl: string | null,
): string {
  const preMap = new Map(template.pre_options.map((o) => [o.id, o.label]));
  const postMap = new Map(template.post_options.map((o) => [o.id, o.label]));

  const renderSection = (section: Pick<AssessmentSection, 'name' | 'questions'>) => `
    <h2 class="section-title">${escapeHtml(section.name)}</h2>
    <table>
      <thead>
        <tr><th style="width:32px">م</th><th>المهارة</th><th style="width:90px">التقدير القبلي</th><th>خطة التطبيق</th><th style="width:90px">التقدير البعدي</th></tr>
      </thead>
      <tbody>
        ${section.questions.map((q: AssessmentQuestion, i: number) => {
          const a = answers[q.id];
          const pre = a?.pre_rating != null ? preMap.get(a.pre_rating) : null;
          const post = a?.post_rating != null ? postMap.get(a.post_rating) : null;
          return `<tr>
            <td class="num">${i + 1}</td>
            <td>${escapeHtml(q.text)}</td>
            <td class="center">${pre ? escapeHtml(pre) : '—'}</td>
            <td>${a?.plan_text ? escapeHtml(a.plan_text) : ''}</td>
            <td class="center">${post ? escapeHtml(post) : '—'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  const logoHTML = logoUrl
    ? `<img src="${logoUrl}" alt="الشعار" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : centerNameAr.trim().charAt(0) || 'ر';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>الخطة الفردية — ${escapeHtml(student.full_name)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif;color:#1a202c;direction:rtl;padding:24px}
.doc-header{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:2px solid #e2e8f0;margin-bottom:18px}
.logo{width:52px;height:52px;border-radius:50%;background:#0F2A47;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:800;flex-shrink:0;overflow:hidden}
.org{flex:1}
.org h1{font-size:17px;font-weight:800;color:#0F2A47}
.org p{font-size:11px;color:#718096;margin-top:2px}
.info-card{background:#f7faff;border:1px solid #dde8f5;border-right:4px solid #0F2A47;border-radius:6px;padding:12px 18px;margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px 16px}
.info-card div{font-size:11.5px}
.info-card span{display:block;color:#6b7280;font-size:10px;margin-bottom:2px}
.info-card b{color:#111827;font-weight:700}
.section-title{font-size:13px;font-weight:800;color:#0F2A47;background:#eef2f7;padding:8px 12px;border-radius:5px;margin:18px 0 8px}
table{width:100%;border-collapse:collapse;margin-bottom:6px}
thead{display:table-header-group}
tr{page-break-inside:avoid}
th,td{border:1px solid #e2e8f0;padding:6px 8px;font-size:10.5px;text-align:right;vertical-align:top;line-height:1.5}
th{background:#0F2A47;color:#fff;font-weight:700;font-size:10px}
td.num,td.center{text-align:center}
.sig-row{margin-top:30px;display:flex;justify-content:space-between;font-size:11.5px;page-break-inside:avoid}
.sig-block strong{display:block;color:#0F2A47;margin-top:20px;border-top:1px solid #cbd5e0;padding-top:4px;width:180px}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;color:#9ca3af;font-size:10px}
@media print{ body{padding:0 6px} @page{margin:1.3cm;size:A4} }
</style>
</head>
<body>
  <div class="doc-header">
    <div class="logo">${logoHTML}</div>
    <div class="org">
      <h1>${escapeHtml(centerNameAr)}</h1>
      <p>الخطة الدراسية/العلاجية الفردية</p>
    </div>
  </div>

  <div class="info-card">
    <div><span>اسم المستفيد</span><b>${escapeHtml(student.full_name)}</b></div>
    <div><span>رقم الملف</span><b>${escapeHtml(student.file_number)}</b></div>
    <div><span>المقياس</span><b>${escapeHtml(studentAssessment.assessment_name)}</b></div>
    <div><span>تاريخ البدء</span><b>${escapeHtml(studentAssessment.started_at)}</b></div>
    ${student.branch_name ? `<div><span>الفرع</span><b>${escapeHtml(student.branch_name)}</b></div>` : ''}
    ${studentAssessment.started_by_name ? `<div><span>أُعدّت بواسطة</span><b>${escapeHtml(studentAssessment.started_by_name)}</b></div>` : ''}
    <div><span>تاريخ الطباعة</span><b>${todayArabic()}</b></div>
  </div>

  ${template.sections.map(renderSection).join('')}
  ${template.questions.length > 0 ? renderSection({ name: 'أسئلة عامة', questions: template.questions }) : ''}

  <div class="sig-row">
    <div class="sig-block">توقيع الأخصائي<strong>&nbsp;</strong></div>
    <div class="sig-block">توقيع ولي الأمر<strong>&nbsp;</strong></div>
  </div>

  <div class="footer">صدرت هذه الوثيقة إلكترونياً &nbsp;|&nbsp; ${escapeHtml(centerNameAr)}</div>
</body>
</html>`;
}

function RatingGroup({
  options, value, onChange, disabled,
}: {
  options: AssessmentScaleOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === o.id ? null : o.id)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            value === o.id
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function StudentAssessmentFillPage() {
  const { id, assessmentId } = useParams<{ id: string; assessmentId: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const canEditAssessments = user?.is_admin || user?.permissions?.some((p) => p.module === 'assessments' && p.can_edit);

  const [answers, setAnswers] = useState<AnswerState>({});
  const [initialized, setInitialized] = useState(false);

  const { data: studentAssessment, isLoading: loadingSA } = useQuery<StudentAssessment>({
    queryKey: ['student-assessment', id, assessmentId],
    queryFn: () => studentAssessmentsApi.detail(Number(id), Number(assessmentId)).then((r) => r.data),
  });

  const { data: template, isLoading: loadingTemplate } = useQuery<AssessmentDetail>({
    queryKey: ['assessment-template', studentAssessment?.assessment],
    queryFn: () => assessmentsApi.detail(studentAssessment!.assessment).then((r) => r.data),
    enabled: !!studentAssessment,
  });

  // نفس queryKey المستخدم بملف الطالب — يُقرأ من الكاش مباشرة غالبًا بدون طلب إضافي
  const { data: student } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => studentsApi.detail(Number(id)).then((r) => r.data),
  });

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: () => siteSettingsApi.get().then((r) => r.data),
  });

  useEffect(() => {
    if (studentAssessment && !initialized) {
      const seeded: AnswerState = {};
      for (const a of studentAssessment.answers) {
        seeded[a.question] = { pre_rating: a.pre_rating, plan_text: a.plan_text || '', post_rating: a.post_rating };
      }
      setAnswers(seeded);
      setInitialized(true);
    }
  }, [studentAssessment, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: StudentAssessmentAnswerInput[] = Object.entries(answers)
        .filter(([, v]) => v.pre_rating || v.post_rating || v.plan_text.trim())
        .map(([qid, v]) => ({
          question: Number(qid),
          pre_rating: v.pre_rating,
          plan_text: v.plan_text,
          post_rating: v.post_rating,
        }));
      return studentAssessmentsApi.update(Number(id), Number(assessmentId), { answers: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-assessment', id, assessmentId] });
      queryClient.invalidateQueries({ queryKey: ['student-assessments', id] });
      toast.success('تم حفظ التقييم');
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const emptyAnswer: AnswerState[number] = { pre_rating: null, plan_text: '', post_rating: null };

  const setAnswer = (qid: number, patch: Partial<AnswerState[number]>) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...emptyAnswer, ...prev[qid], ...patch },
    }));
  };

  if (loadingSA || loadingTemplate || !studentAssessment || !template) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const answeredPreCount = Object.values(answers).filter((a) => a.pre_rating).length;
  const answeredPostCount = Object.values(answers).filter((a) => a.post_rating).length;
  const totalQuestions = template.questions.length + template.sections.reduce((sum, s) => sum + s.questions.length, 0);

  const handlePrint = () => {
    if (!student) {
      toast.error('لم تُحمَّل بيانات الطالب بعد، أعد المحاولة خلال لحظات');
      return;
    }
    const centerNameAr = siteSettings?.center_name_ar || DEFAULT_NAME_AR;
    const logoUrl = siteSettings?.logo ? `${process.env.NEXT_PUBLIC_MEDIA_URL}${siteSettings.logo}` : null;
    const html = buildPlanHTML(student, studentAssessment, template, answers, centerNameAr, logoUrl);
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) {
      toast.error('يرجى السماح بفتح النوافذ المنبثقة في المتصفح');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 700);
  };

  const renderQuestionRow = (q: AssessmentQuestion) => {
    const a = answers[q.id] || { pre_rating: null, plan_text: '', post_rating: null };
    return (
      <div key={q.id} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 py-4 border-b border-gray-50 last:border-0">
        <div>
          <p className="text-sm text-gray-800 mb-2">{q.text}</p>
          <textarea
            rows={1}
            disabled={!canEditAssessments}
            className="form-input text-xs resize-none py-1.5 disabled:bg-gray-50"
            placeholder="خطة التطبيق..."
            value={a.plan_text}
            onChange={(e) => setAnswer(q.id, { plan_text: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2 lg:w-72 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">التقدير القبلي</p>
            <RatingGroup
              options={template.pre_options}
              value={a.pre_rating}
              disabled={!canEditAssessments}
              onChange={(v) => setAnswer(q.id, { pre_rating: v })}
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">التقدير البعدي</p>
            <RatingGroup
              options={template.post_options}
              value={a.post_rating}
              disabled={!canEditAssessments}
              onChange={(v) => setAnswer(q.id, { post_rating: v })}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl pb-24">
      <Header
        title={studentAssessment.assessment_name}
        subtitle={`${studentAssessment.student_name} — بدأ في ${formatDate(studentAssessment.started_at)}`}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href={`/students/${id}`} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
          <ArrowRight size={15} /> العودة إلى ملف الطالب
        </Link>
        <button onClick={handlePrint} className="btn-secondary py-1.5 px-3 text-xs">
          <Printer size={14} /> طباعة / تصدير PDF
        </button>
      </div>

      <div className="card !py-3 flex items-center gap-6 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><ListChecks size={14} className="text-primary-500" /> {totalQuestions} مهارة</span>
        <span>تقدير قبلي مسجّل: <b className="text-gray-700">{answeredPreCount}</b> / {totalQuestions}</span>
        <span>تقدير بعدي مسجّل: <b className="text-gray-700">{answeredPostCount}</b> / {totalQuestions}</span>
      </div>

      {template.sections.map((section) => (
        <div key={section.id} className="card">
          <h3 className="section-title">{section.name}</h3>
          <div>{section.questions.map(renderQuestionRow)}</div>
        </div>
      ))}

      {template.questions.length > 0 && (
        <div className="card">
          <h3 className="section-title">أسئلة عامة</h3>
          <div>{template.questions.map(renderQuestionRow)}</div>
        </div>
      )}

      {canEditAssessments && (
        <div className="fixed bottom-0 inset-x-0 lg:right-64 bg-white border-t border-gray-200 p-4 flex justify-end shadow-lg z-40">
          <button
            className="btn-primary px-8 disabled:opacity-50"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ التقييم</>}
          </button>
        </div>
      )}
    </div>
  );
}
