'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight, Save, Printer, Plus, Grid3x3 } from 'lucide-react';
import { individualPlansApi, goalAnalysisApi, studentsApi, siteSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { mediaUrl } from '@/lib/utils';
import Header from '@/components/layout/Header';
import { GOAL_ANALYSIS_LEVELS } from '@/types';
import type {
  IndividualPlan, IndividualPlanGoal, GoalAnalysisSheet, GoalAnalysisLevel, Student, SiteSettings,
} from '@/types';

const DAYS = 20;              // 4 أسابيع × (الأحد–الخميس)
const MIN_ROWS = 10;          // النموذج الورقي فيه 10 صفوف ثابتة
const DAY_LETTERS = ['ح', 'ن', 'ث', 'ع', 'خ'];
const DEFAULT_NAME_AR = 'مركز رؤية للتأهيل';

const LEVEL_CLASSES: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-red-100 text-red-700',
};

interface Draft {
  ratings: Record<string, GoalAnalysisLevel[]>;
  teaching_aids: string;
  teacher_note: string;
  achieved: Record<string, string>;
}

function parseISO(v: string): Date {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 20 يوم دراسي (الأحد=0 .. الخميس=4) تبدأ من التاريخ المحدد
function schoolDays(start: string): Date[] {
  const d = parseISO(start);
  const out: Date[] = [];
  while (out.length < DAYS) {
    if (d.getDay() <= 4) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function nextSchoolDay(d: Date): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + 1);
  while (n.getDay() > 4) n.setDate(n.getDate() + 1);
  return n;
}

const shortDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
const fullDate = (d: Date) => `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear()}`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emptyRow(): GoalAnalysisLevel[] {
  return new Array(DAYS).fill(0) as GoalAnalysisLevel[];
}

function draftFrom(sheet: GoalAnalysisSheet, goals: IndividualPlanGoal[]): Draft {
  const achieved: Record<string, string> = {};
  for (const g of goals) achieved[g.id] = g.achieved_date || '';
  return {
    ratings: { ...sheet.ratings },
    teaching_aids: sheet.teaching_aids || '',
    teacher_note: sheet.teacher_note || '',
    achieved,
  };
}

// ── نسخة الطباعة — نفس تخطيط «نموذج جمع البيانات» الورقي ─────────────────────
function buildSheetHTML(opts: {
  studentName: string; teacherName: string; domain: string; days: Date[];
  goals: IndividualPlanGoal[]; draft: Draft; centerNameAr: string; logoUrl: string | null;
}): string {
  const { studentName, teacherName, domain, days, goals, draft, centerNameAr, logoUrl } = opts;
  const rows = Math.max(MIN_ROWS, goals.length);
  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="" style="width:100%;height:100%;object-fit:contain">`
    : `<span>${escapeHtml(centerNameAr)}</span>`;

  let body = '';
  for (let r = 0; r < rows; r++) {
    const g = goals[r];
    const vals = g ? (draft.ratings[g.id] || emptyRow()) : emptyRow();
    body += `<tr><td class="num">${r + 1}</td><td class="goal">${g ? escapeHtml(g.goal_text) : ''}</td>`;
    vals.forEach((v, i) => { body += `<td class="${i % 5 === 0 ? 'wk' : ''}">${v || ''}</td>`; });
    const ach = g && draft.achieved[g.id] ? fullDate(parseISO(draft.achieved[g.id])) : '';
    body += `<td class="wk ach">${ach}</td></tr>`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>تحليل الأهداف — ${escapeHtml(studentName)} — ${escapeHtml(domain)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Cairo', Tahoma, sans-serif; font-size: 11px; color: #000; }
.logo { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; }
td, th { border: 1px solid #000; padding: 3px 4px; }
.title { text-align: center; font-size: 15px; font-weight: 700; }
.lbl { font-weight: 700; }
.grid th { background: #8db3e2; font-weight: 700; text-align: center; }
.grid td { text-align: center; height: 22px; font-weight: 700; }
.grid td.goal { text-align: right; font-weight: 400; width: 30%; }
.grid td.num { width: 22px; }
.grid .wk { border-right: 2px solid #000; }
.grid td.ach { font-weight: 400; font-size: 10px; width: 70px; }
.dates td { font-size: 9px; font-weight: 400; height: auto; }
.legend td { text-align: center; font-weight: 700; }
</style></head><body>
<div class="logo">${logo}</div>
<table>
  <tr><td colspan="2" class="title">تحليل الأهداف</td></tr>
  <tr><td><span class="lbl">اسم المستفيد/ه:</span> ${escapeHtml(studentName)}</td><td><span class="lbl">اسم المعلمة:</span> ${escapeHtml(teacherName)}</td></tr>
  <tr><td colspan="2"><span class="lbl">مجال التدريب الرئيسي:</span> ${escapeHtml(domain)}</td></tr>
  <tr><td><span class="lbl">تاريخ البدء:</span> ${fullDate(days[0])}</td><td><span class="lbl">تاريخ الانتهاء:</span> ${fullDate(days[DAYS - 1])}</td></tr>
</table>
<table class="grid" style="margin-top:-1px">
  <thead><tr><th>#</th><th>الهدف</th>${days.map((_, i) => `<th class="${i % 5 === 0 ? 'wk' : ''}">${DAY_LETTERS[i % 5]}</th>`).join('')}<th class="wk">تاريخ إنجاز الهدف</th></tr></thead>
  <tbody>${body}
  <tr class="dates"><td></td><td class="goal lbl">تاريخ اليوم</td>${days.map((d, i) => `<td class="${i % 5 === 0 ? 'wk' : ''}">${shortDate(d)}</td>`).join('')}<td class="wk"></td></tr>
  </tbody>
</table>
<table style="margin-top:-1px">
  <tr><td><span class="lbl">الوسائل التعليمية المقترحة:</span> ${escapeHtml(draft.teaching_aids)}</td></tr>
  <tr><td><span class="lbl">ملاحظة المعلمة:</span> ${escapeHtml(draft.teacher_note)}</td></tr>
</table>
<table class="legend" style="margin-top:-1px">
  <tr>${GOAL_ANALYSIS_LEVELS.map((l) => `<td>${l.label}</td>`).join('')}</tr>
  <tr>${GOAL_ANALYSIS_LEVELS.map((l) => `<td>${l.value}</td>`).join('')}</tr>
</table>
</body></html>`;
}

export default function GoalAnalysisPage() {
  const { id, planId } = useParams<{ id: string; planId: string }>();
  const studentId = Number(id);
  const planPk = Number(planId);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const canEdit = !!(user?.is_admin || user?.permissions?.some((p) => p.module === 'individual_plans' && p.can_edit));

  const { data: plan, isLoading: loadingPlan } = useQuery<IndividualPlan>({
    queryKey: ['individual-plan', id, planId],
    queryFn: () => individualPlansApi.detail(studentId, planPk).then((r) => r.data),
  });

  const { data: sheets = [], isLoading: loadingSheets } = useQuery<GoalAnalysisSheet[]>({
    queryKey: ['goal-analysis', id, planId],
    queryFn: () => goalAnalysisApi.list(studentId, planPk).then((r) => r.data),
  });

  const { data: student } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => studentsApi.detail(studentId).then((r) => r.data),
  });

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: () => siteSettingsApi.get().then((r) => r.data),
  });

  // المجالات بنفس ترتيب ظهورها في الخطة
  const domains = useMemo(() => {
    const seen: string[] = [];
    for (const g of plan?.goals || []) if (!seen.includes(g.domain)) seen.push(g.domain);
    return seen;
  }, [plan]);

  const [domain, setDomain] = useState<string>('');
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newStart, setNewStart] = useState('');

  useEffect(() => {
    if (!domain && domains.length) setDomain(domains[0]);
  }, [domains, domain]);

  const domainGoals = useMemo(
    () => (plan?.goals || []).filter((g) => g.domain === domain).sort((a, b) => a.order - b.order),
    [plan, domain],
  );
  const domainSheets = useMemo(
    () => sheets.filter((s) => s.domain === domain).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [sheets, domain],
  );
  const sheet = domainSheets.find((s) => s.id === sheetId) || null;

  // عند تغيير المجال أو تحميل النماذج: افتح آخر شهر للمجال
  useEffect(() => {
    if (!domain) return;
    if (!sheetId || !domainSheets.some((s) => s.id === sheetId)) {
      setSheetId(domainSheets.length ? domainSheets[domainSheets.length - 1].id : null);
    }
  }, [domain, domainSheets, sheetId]);

  useEffect(() => {
    if (sheet && plan) {
      setDraft(draftFrom(sheet, plan.goals));
      setDirty(false);
    } else {
      setDraft(null);
    }
  }, [sheet, plan]);

  // تاريخ مقترح للشهر الجديد: اليوم الدراسي التالي لنهاية آخر شهر، وإلا أقدم تاريخ بدء بأهداف المجال
  useEffect(() => {
    if (domainSheets.length) {
      const last = domainSheets[domainSheets.length - 1];
      setNewStart(toISO(nextSchoolDay(schoolDays(last.start_date)[DAYS - 1])));
    } else {
      const starts = domainGoals.map((g) => g.start_date).filter(Boolean) as string[];
      setNewStart(starts.length ? starts.sort()[0] : toISO(new Date()));
    }
  }, [domainSheets, domainGoals]);

  const confirmDiscard = () => !dirty || window.confirm('فيه تعديلات ما انحفظت. تبغى تتركها؟');

  const createMutation = useMutation({
    mutationFn: () => goalAnalysisApi.create(studentId, planPk, { domain, start_date: newStart, ratings: {} }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['goal-analysis', id, planId] });
      setSheetId(res.data.id);
      toast.success('تم فتح شهر متابعة جديد');
    },
    onError: (err: { response?: { data?: Record<string, string[]> } }) => {
      const msg = err.response?.data?.start_date?.[0];
      toast.error(msg || 'تعذّر فتح الشهر');
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const achieved_dates: Record<string, string | null> = {};
      for (const g of domainGoals) achieved_dates[g.id] = draft!.achieved[g.id] || null;
      return goalAnalysisApi.update(studentId, planPk, sheet!.id, {
        ratings: draft!.ratings,
        teaching_aids: draft!.teaching_aids,
        teacher_note: draft!.teacher_note,
        achieved_dates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-analysis', id, planId] });
      queryClient.invalidateQueries({ queryKey: ['individual-plan', id, planId] });
      queryClient.invalidateQueries({ queryKey: ['individual-plans', id] });
      setDirty(false);
      toast.success('تم حفظ تحليل الأهداف');
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const cycleCell = (goalId: number, day: number) => {
    if (!canEdit || !draft) return;
    const row = [...(draft.ratings[goalId] || emptyRow())];
    row[day] = ((row[day] + 1) % 5) as GoalAnalysisLevel;
    setDraft({ ...draft, ratings: { ...draft.ratings, [goalId]: row } });
    setDirty(true);
  };

  const patchDraft = (patch: Partial<Draft>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    setDirty(true);
  };

  if (loadingPlan || loadingSheets || !plan) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const studentName = student?.full_name || plan.student_name;
  const teacherName = plan.teacher_name || '—';
  const days = sheet ? schoolDays(sheet.start_date) : [];
  const rows = Math.max(MIN_ROWS, domainGoals.length);

  const handlePrint = () => {
    if (!sheet || !draft) return;
    const html = buildSheetHTML({
      studentName, teacherName, domain, days, goals: domainGoals, draft,
      centerNameAr: siteSettings?.center_name_ar || DEFAULT_NAME_AR,
      logoUrl: mediaUrl(siteSettings?.logo),
    });
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      toast.error('يرجى السماح بفتح النوافذ المنبثقة في المتصفح');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 700);
  };

  let filled = 0, independent = 0;
  if (draft) {
    for (const g of domainGoals) {
      for (const v of draft.ratings[g.id] || []) { if (v) filled++; if (v === 1) independent++; }
    }
  }
  const achievedCount = draft ? domainGoals.filter((g) => draft.achieved[g.id]).length : 0;

  return (
    <div className="space-y-5">
      <Header
        title="تحليل الأهداف"
        subtitle={`الخطة الفردية — ${studentName}`}
        actions={
          <div className="flex items-center gap-2">
            {sheet && (
              <button onClick={handlePrint} className="btn-secondary">
                <Printer size={16} /> طباعة
              </button>
            )}
            {sheet && canEdit && (
              <button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending} className="btn-primary">
                <Save size={16} /> {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            )}
            <Link href={`/students/${id}`} className="btn-secondary">
              <ArrowRight size={16} /> ملف الطالب
            </Link>
          </div>
        }
      />

      {domains.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Grid3x3 size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا توجد أهداف في هذه الخطة بعد. أضف الأهداف من الخطة الفردية أولًا.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {domains.map((d) => {
              const count = plan.goals.filter((g) => g.domain === d).length;
              const active = d === domain;
              return (
                <button
                  key={d}
                  onClick={() => { if (d !== domain && confirmDiscard()) { setDomain(d); setSheetId(null); } }}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                    active ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400'
                  }`}
                >
                  {d} <span className={`text-xs ${active ? 'text-white/80' : 'text-gray-400'}`}>({count})</span>
                </button>
              );
            })}
          </div>

          <div className="card flex flex-wrap items-end gap-4">
            {domainSheets.length > 0 && (
              <div>
                <label className="form-label">شهر المتابعة</label>
                <select
                  className="form-input"
                  value={sheetId ?? ''}
                  onChange={(e) => { if (confirmDiscard()) setSheetId(Number(e.target.value)); }}
                >
                  {domainSheets.map((s) => {
                    const ds = schoolDays(s.start_date);
                    return <option key={s.id} value={s.id}>{shortDate(ds[0])} — {shortDate(ds[DAYS - 1])} / {ds[0].getFullYear()}</option>;
                  })}
                </select>
              </div>
            )}
            {canEdit && (
              <div className="flex items-end gap-2">
                <div>
                  <label className="form-label">{domainSheets.length ? 'بداية شهر جديد' : 'بداية الشهر'}</label>
                  <input type="date" dir="ltr" className="form-input" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                </div>
                <button
                  onClick={() => { if (confirmDiscard()) createMutation.mutate(); }}
                  disabled={!newStart || createMutation.isPending}
                  className="btn-secondary"
                >
                  <Plus size={15} /> {domainSheets.length ? 'فتح شهر جديد' : 'بدء المتابعة'}
                </button>
              </div>
            )}
            {dirty && <span className="text-xs text-amber-600 font-medium">تعديلات غير محفوظة</span>}
          </div>

          {!sheet || !draft ? (
            <div className="card text-center py-12 text-gray-400 border-2 border-dashed border-gray-200">
              <Grid3x3 size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                {canEdit
                  ? 'ما بدأت متابعة هذا المجال بعد. اختر بداية الشهر واضغط «بدء المتابعة».'
                  : 'لا توجد متابعة مسجّلة لهذا المجال بعد.'}
              </p>
            </div>
          ) : (
            <div className="card space-y-4">
              <h2 className="text-center text-lg font-bold text-gray-800">تحليل الأهداف</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 border border-gray-800 text-sm">
                <div className="px-3 py-2 border-b md:border-l border-gray-800"><b>اسم المستفيد/ه:</b> {studentName}</div>
                <div className="px-3 py-2 border-b border-gray-800"><b>اسم المعلمة:</b> {teacherName}</div>
                <div className="px-3 py-2 border-b border-gray-800 md:col-span-2"><b>مجال التدريب الرئيسي:</b> {domain}</div>
                <div className="px-3 py-2 border-b md:border-b-0 md:border-l border-gray-800"><b>تاريخ البدء:</b> {fullDate(days[0])}</div>
                <div className="px-3 py-2"><b>تاريخ الانتهاء:</b> {fullDate(days[DAYS - 1])}</div>
              </div>

              {canEdit && (
                <p className="text-xs text-gray-500">اضغط على الخانة لتغيير التقييم: فارغ ← 1 ← 2 ← 3 ← 4 ← فارغ.</p>
              )}

              <div className="overflow-x-auto border border-gray-800">
                <table className="w-full min-w-[980px] border-collapse text-sm tabular-nums">
                  <thead>
                    <tr className="bg-[#8db3e2] text-gray-900">
                      <th rowSpan={2} className="border border-gray-300 w-8">#</th>
                      <th rowSpan={2} className="border border-gray-300 min-w-[220px]">الهدف</th>
                      {[0, 1, 2, 3].map((w) => (
                        <th key={w} colSpan={5} className="border border-gray-300 border-r-2 border-r-gray-800 text-xs py-1">الأسبوع {w + 1}</th>
                      ))}
                      <th rowSpan={2} className="border border-gray-300 border-r-2 border-r-gray-800 min-w-[130px] text-xs">تاريخ إنجاز الهدف</th>
                    </tr>
                    <tr className="bg-[#8db3e2] text-gray-900">
                      {days.map((_, i) => (
                        <th key={i} className={`border border-gray-300 py-1 ${i % 5 === 0 ? 'border-r-2 border-r-gray-800' : ''}`}>{DAY_LETTERS[i % 5]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rows }).map((_, r) => {
                      const g = domainGoals[r];
                      const vals = g ? (draft.ratings[g.id] || emptyRow()) : emptyRow();
                      return (
                        <tr key={r}>
                          <td className="border border-gray-300 text-center font-bold">{r + 1}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-right text-[13px] leading-snug">{g?.goal_text || ''}</td>
                          {vals.map((v, c) => (
                            <td
                              key={c}
                              className={`border border-gray-300 p-0 ${c % 5 === 0 ? 'border-r-2 border-r-gray-800' : ''} ${Math.floor(c / 5) % 2 ? 'bg-gray-50' : ''}`}
                            >
                              <button
                                type="button"
                                disabled={!g || !canEdit}
                                onClick={() => g && cycleCell(g.id, c)}
                                aria-label={g ? `${g.goal_text} — ${shortDate(days[c])}` : undefined}
                                className={`w-full h-8 min-w-[30px] font-bold ${v ? LEVEL_CLASSES[v] : ''} ${g && canEdit ? 'hover:ring-2 hover:ring-inset hover:ring-primary-300' : 'cursor-default'}`}
                              >
                                {v || ''}
                              </button>
                            </td>
                          ))}
                          <td className="border border-gray-300 border-r-2 border-r-gray-800 px-1">
                            {g && (
                              <input
                                type="date" dir="ltr"
                                disabled={!canEdit}
                                className="w-full text-xs bg-transparent py-1 outline-none"
                                value={draft.achieved[g.id] || ''}
                                onChange={(e) => patchDraft({ achieved: { ...draft.achieved, [g.id]: e.target.value } })}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="border border-gray-300" />
                      <td className="border border-gray-300 px-2 font-bold">تاريخ اليوم</td>
                      {days.map((d, i) => (
                        <td key={i} className={`border border-gray-300 text-[11px] text-gray-500 text-center py-1 ${i % 5 === 0 ? 'border-r-2 border-r-gray-800' : ''}`}>
                          <span className="inline-block [writing-mode:vertical-rl] rotate-180">{shortDate(d)}</span>
                        </td>
                      ))}
                      <td className="border border-gray-300 border-r-2 border-r-gray-800" />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="badge bg-gray-100 text-gray-600">{domainGoals.length} أهداف في المجال</span>
                <span className="badge bg-gray-100 text-gray-600">{filled} خانة مقيّمة من {domainGoals.length * DAYS}</span>
                <span className="badge bg-green-50 text-green-700">{independent} مرة «مستقل»</span>
                <span className="badge bg-gray-100 text-gray-600">{achievedCount} هدف منجز</span>
              </div>

              <div className="border border-gray-800 text-sm divide-y divide-gray-800">
                <label className="flex flex-col md:flex-row">
                  <span className="px-3 py-2 font-bold md:w-52 flex-shrink-0">الوسائل التعليمية المقترحة:</span>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    className="flex-1 px-3 py-2 resize-y outline-none md:border-r border-gray-200 bg-transparent"
                    value={draft.teaching_aids}
                    onChange={(e) => patchDraft({ teaching_aids: e.target.value })}
                  />
                </label>
                <label className="flex flex-col md:flex-row">
                  <span className="px-3 py-2 font-bold md:w-52 flex-shrink-0">ملاحظة المعلمة:</span>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    className="flex-1 px-3 py-2 resize-y outline-none md:border-r border-gray-200 bg-transparent"
                    value={draft.teacher_note}
                    onChange={(e) => patchDraft({ teacher_note: e.target.value })}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 border border-gray-800 text-center text-sm">
                {GOAL_ANALYSIS_LEVELS.map((l, i) => (
                  <div key={l.value} className={`${i > 0 ? 'md:border-r' : ''} ${i % 2 ? 'border-r' : ''} border-gray-800`}>
                    <div className="font-bold py-1 border-b border-gray-800">{l.label}</div>
                    <div className={`font-bold py-1 ${LEVEL_CLASSES[l.value]}`}>{l.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
