'use client';

import { useState } from 'react';
import { X, Save, Plus, Trash2, FolderPlus } from 'lucide-react';
import { INDIVIDUAL_PLAN_DEFAULT_DOMAINS, INDIVIDUAL_PLAN_EVALUATIONS } from '@/types';
import type { IndividualPlan, IndividualPlanEvaluation } from '@/types';

interface Props {
  plan?: IndividualPlan | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading?: boolean;
}

let tempKeyCounter = 0;

interface GoalRow {
  _key: string; // مفتاح React محلي فقط — ما يُرسل للخادم
  domain: string;
  goal_text: string;
  start_date: string | null;
  end_date: string | null;
  post_evaluation: IndividualPlanEvaluation;
  order: number;
}

function makeEmptyGoal(domain: string, order: number): GoalRow {
  tempKeyCounter += 1;
  return { _key: `new-${tempKeyCounter}`, domain, goal_text: '', start_date: null, end_date: null, post_evaluation: '', order };
}

export default function IndividualPlanModal({ plan, onClose, onSave, loading }: Props) {
  const [notes, setNotes] = useState(plan?.notes || '');
  const [goals, setGoals] = useState<GoalRow[]>(() =>
    (plan?.goals || []).map(g => ({
      _key: `existing-${g.id}`,
      domain: g.domain,
      goal_text: g.goal_text,
      start_date: g.start_date,
      end_date: g.end_date,
      post_evaluation: g.post_evaluation,
      order: g.order,
    }))
  );
  // قائمة أقسام المجالات المعروضة — خطة جديدة تبدأ بالمجالات الافتراضية كنقطة
  // انطلاق، وخطة قائمة تبدأ بمجالات أهدافها الحالية. المعلم يضيف/يحذف بحرية.
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

  const submit = () => {
    onSave({
      notes,
      // نتجاهل صفوف الأهداف الفاضية (بدون نص) — السيرفر يرفضها أصلاً
      goals: goals
        .filter(g => g.goal_text.trim())
        .map(({ _key, ...rest }) => rest),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{plan ? 'تعديل الخطة الفردية' : 'إضافة خطة فردية'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
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
                    {domainGoals.map(g => (
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
                          <select
                            className="form-input text-xs py-1"
                            value={g.post_evaluation}
                            onChange={e => updateGoal(g._key, { post_evaluation: e.target.value as IndividualPlanEvaluation })}
                          >
                            {INDIVIDUAL_PLAN_EVALUATIONS.map(ev => (
                              <option key={ev.value} value={ev.value}>{ev.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
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
