'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Save, Plus, Trash2, FolderPlus, CornerDownLeft, RotateCcw } from 'lucide-react';
import { authApi } from '@/lib/api';
import { INDIVIDUAL_PLAN_DEFAULT_DOMAINS, INDIVIDUAL_PLAN_EVALUATIONS, evaluationFromSubGoals } from '@/types';
import type { QuarterlyPlan, IndividualPlanEvaluation, User } from '@/types';

interface Props {
  plan?: QuarterlyPlan | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading?: boolean;
}

let tempKeyCounter = 0;
const nextKey = () => `new-${++tempKeyCounter}`;

interface SubGoalRow {
  _key: string;
  text: string;
  post_evaluation: IndividualPlanEvaluation;
}

interface GoalRow {
  _key: string; // مفتاح React محلي فقط — ما يُرسل للخادم
  domain: string;
  goal_text: string;
  start_date: string | null;
  end_date: string | null;
  post_evaluation: IndividualPlanEvaluation;
  post_evaluation_manual: boolean;
  order: number;
  sub_goals: SubGoalRow[];
}

function makeEmptyGoal(domain: string, order: number): GoalRow {
  return {
    _key: nextKey(), domain, goal_text: '', start_date: null, end_date: null,
    post_evaluation: '', post_evaluation_manual: false, order, sub_goals: [],
  };
}

/** التقييم الفعلي: محسوب من الأهداف الفرعية ما لم يختره المختص يدويًا. */
function effectiveEvaluation(g: GoalRow): { value: IndividualPlanEvaluation; auto: boolean } {
  const auto = evaluationFromSubGoals(
    g.sub_goals.filter(s => s.text.trim()).map(s => s.post_evaluation)
  );
  if (auto === null || g.post_evaluation_manual) return { value: g.post_evaluation, auto: false };
  return { value: auto, auto: true };
}

export default function QuarterlyPlanModal({ plan, onClose, onSave, loading }: Props) {
  const [specialist, setSpecialist] = useState<string>(plan?.specialist != null ? String(plan.specialist) : '');
  const [startDate, setStartDate] = useState(plan?.start_date || '');
  const [endDate, setEndDate] = useState(plan?.end_date || '');
  const [notes, setNotes] = useState(plan?.notes || '');
  const [goals, setGoals] = useState<GoalRow[]>(() =>
    (plan?.goals || []).map(g => ({
      _key: `existing-${g.id}`,
      domain: g.domain,
      goal_text: g.goal_text,
      start_date: g.start_date,
      end_date: g.end_date,
      post_evaluation: g.post_evaluation,
      post_evaluation_manual: g.post_evaluation_manual,
      order: g.order,
      sub_goals: (g.sub_goals || []).map(sg => ({
        _key: `existing-sub-${sg.id}`, text: sg.text, post_evaluation: sg.post_evaluation,
      })),
    }))
  );
  const [domains, setDomains] = useState<string[]>(() => {
    if (plan) {
      const seen = new Set<string>();
      const ordered: string[] = [];
      for (const g of plan.goals) {
        if (!seen.has(g.domain)) { seen.add(g.domain); ordered.push(g.domain); }
      }
      return ordered;
    }
    return [...INDIVIDUAL_PLAN_DEFAULT_DOMAINS];
  });
  const [newDomainName, setNewDomainName] = useState('');

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: () => authApi.allUsers().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const addDomain = () => {
    const name = newDomainName.trim();
    if (!name || domains.includes(name)) return;
    setDomains(d => [...d, name]);
    setNewDomainName('');
  };

  const removeDomain = (domain: string) => {
    setDomains(d => d.filter(x => x !== domain));
    setGoals(g => g.filter(x => x.domain !== domain));
  };

  const addGoal = (domain: string) => {
    const domainGoals = goals.filter(g => g.domain === domain);
    const nextOrder = domainGoals.length > 0 ? Math.max(...domainGoals.map(g => g.order)) + 1 : 1;
    setGoals(g => [...g, makeEmptyGoal(domain, nextOrder)]);
  };

  const removeGoal = (key: string) => setGoals(g => g.filter(x => x._key !== key));

  const updateGoal = (key: string, patch: Partial<GoalRow>) =>
    setGoals(g => g.map(x => (x._key === key ? { ...x, ...patch } : x)));

  const addSubGoal = (key: string) =>
    setGoals(g => g.map(x => (x._key === key
      ? { ...x, sub_goals: [...x.sub_goals, { _key: nextKey(), text: '', post_evaluation: '' as IndividualPlanEvaluation }] }
      : x)));

  const updateSubGoal = (key: string, subKey: string, patch: Partial<SubGoalRow>) =>
    setGoals(g => g.map(x => (x._key === key
      ? { ...x, sub_goals: x.sub_goals.map(sg => (sg._key === subKey ? { ...sg, ...patch } : sg)) }
      : x)));

  const removeSubGoal = (key: string, subKey: string) =>
    setGoals(g => g.map(x => (x._key === key
      ? { ...x, sub_goals: x.sub_goals.filter(sg => sg._key !== subKey) }
      : x)));

  const submit = () => {
    onSave({
      specialist: specialist || null,
      start_date: startDate,
      end_date: endDate,
      notes,
      goals: goals
        .filter(g => g.goal_text.trim())
        .map(g => {
          const subs = g.sub_goals.filter(sg => sg.text.trim());
          return {
            domain: g.domain,
            goal_text: g.goal_text,
            start_date: g.start_date,
            end_date: g.end_date,
            order: g.order,
            post_evaluation: effectiveEvaluation(g).value,
            post_evaluation_manual: subs.length > 0 && g.post_evaluation_manual,
            sub_goals: subs.map((sg, i) => ({ text: sg.text.trim(), post_evaluation: sg.post_evaluation, order: i + 1 })),
          };
        }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{plan ? 'تعديل الخطة الفصلية' : 'إضافة خطة فصلية'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">المختص المسؤول</label>
              <select className="form-input" value={specialist} onChange={e => setSpecialist(e.target.value)}>
                <option value="">-- غير محدد --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">تاريخ بدء الفصل</label>
              <input type="date" dir="ltr" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">تاريخ انتهاء الفصل</label>
              <input type="date" dir="ltr" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
            <input
              className="form-input text-sm flex-1"
              placeholder="اسم مجال جديد..."
              value={newDomainName}
              onChange={e => setNewDomainName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
            />
            <button type="button" onClick={addDomain} className="btn-secondary py-1.5 px-3 text-xs flex-shrink-0">
              <FolderPlus size={13} /> إضافة مجال
            </button>
          </div>

          {domains.map((domain) => {
            const domainGoals = goals.filter(g => g.domain === domain).sort((a, b) => a.order - b.order);
            return (
              <div key={domain} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">{domain}</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => addGoal(domain)} className="btn-secondary py-1 px-2 text-xs">
                      <Plus size={12} /> إضافة هدف
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDomain(domain)}
                      className="text-gray-400 hover:text-red-600"
                      title="حذف المجال"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {domainGoals.length === 0 ? (
                  <p className="text-xs text-gray-400">لا توجد أهداف بهذا المجال بعد.</p>
                ) : (
                  <div className="space-y-2">
                    {domainGoals.map(g => {
                      const ev = effectiveEvaluation(g);
                      const hasSubs = g.sub_goals.some(sg => sg.text.trim());
                      return (
                        <div key={g._key} className="bg-gray-50 rounded-lg p-2 space-y-2">
                          <div className="flex items-start gap-2">
                            <textarea
                              rows={2}
                              className="form-input resize-none text-sm flex-1"
                              placeholder="نص الهدف..."
                              value={g.goal_text}
                              onChange={e => updateGoal(g._key, { goal_text: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => removeGoal(g._key)}
                              className="text-gray-400 hover:text-red-600 mt-1 flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="date" dir="ltr"
                              className="form-input text-xs py-1"
                              value={g.start_date || ''}
                              onChange={e => updateGoal(g._key, { start_date: e.target.value || null })}
                            />
                            <input
                              type="date" dir="ltr"
                              className="form-input text-xs py-1"
                              value={g.end_date || ''}
                              onChange={e => updateGoal(g._key, { end_date: e.target.value || null })}
                            />
                            <div className="flex items-center gap-1">
                              <select
                                className="form-input text-xs py-1 flex-1 min-w-0"
                                value={ev.value}
                                title={ev.auto ? 'محسوب تلقائيًا من الأهداف الفرعية' : undefined}
                                onChange={e => updateGoal(g._key, {
                                  post_evaluation: e.target.value as IndividualPlanEvaluation,
                                  post_evaluation_manual: hasSubs,
                                })}
                              >
                                {INDIVIDUAL_PLAN_EVALUATIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              {hasSubs && !ev.auto && (
                                <button
                                  type="button"
                                  onClick={() => updateGoal(g._key, { post_evaluation_manual: false })}
                                  className="text-gray-400 hover:text-primary-600 flex-shrink-0"
                                  title="إرجاع للحساب التلقائي من الأهداف الفرعية"
                                >
                                  <RotateCcw size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          {hasSubs && (
                            <p className="text-[11px] text-gray-400">
                              {ev.auto ? 'تقييم الهدف محسوب تلقائيًا من الأهداف الفرعية' : 'تقييم الهدف معدّل يدويًا'}
                            </p>
                          )}

                          {g.sub_goals.length > 0 && (
                            <div className="space-y-1.5 border-r-2 border-primary-100 pr-3 mr-1">
                              {g.sub_goals.map((sg, i) => (
                                <div key={sg._key} className="flex items-center gap-2">
                                  <CornerDownLeft size={12} className="text-gray-300 flex-shrink-0" />
                                  <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                                  <input
                                    className="form-input text-xs py-1 flex-1 min-w-0"
                                    placeholder="نص الهدف الفرعي..."
                                    value={sg.text}
                                    onChange={e => updateSubGoal(g._key, sg._key, { text: e.target.value })}
                                  />
                                  <select
                                    className="form-input text-xs py-1 w-28 flex-shrink-0"
                                    value={sg.post_evaluation}
                                    onChange={e => updateSubGoal(g._key, sg._key, { post_evaluation: e.target.value as IndividualPlanEvaluation })}
                                  >
                                    {INDIVIDUAL_PLAN_EVALUATIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => removeSubGoal(g._key, sg._key)}
                                    className="text-gray-400 hover:text-red-600 flex-shrink-0"
                                    title="حذف الهدف الفرعي"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => addSubGoal(g._key)}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Plus size={12} /> هدف فرعي
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div>
            <label className="form-label">ملاحظات عامة</label>
            <textarea
              rows={3}
              className="form-input resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
          <button type="button" disabled={loading} onClick={submit} className="btn-primary">
            {loading ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ</>}
          </button>
        </div>
      </div>
    </div>
  );
}
