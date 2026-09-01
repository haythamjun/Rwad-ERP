'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Save, ListChecks } from 'lucide-react';
import { assessmentsApi, studentAssessmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import Header from '@/components/layout/Header';
import type {
  AssessmentDetail, StudentAssessment, AssessmentQuestion,
  AssessmentScaleOption, StudentAssessmentAnswerInput,
} from '@/types';

type AnswerState = Record<number, { pre_rating: number | null; plan_text: string; post_rating: number | null }>;

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

      <Link href={`/students/${id}`} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
        <ArrowRight size={15} /> العودة إلى ملف الطالب
      </Link>

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
