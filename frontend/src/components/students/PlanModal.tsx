'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Save, Paperclip, Upload, Trash2, FileText } from 'lucide-react';
import { authApi, plansApi } from '@/lib/api';
import { mediaUrl } from '@/lib/utils';
import { PLAN_DOMAINS } from '@/types';
import type { Plan, PlanAttachment, PlanDomain, User } from '@/types';

interface Props {
  studentId: number;
  plan?: Plan | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  onAttachmentsChanged?: () => void;
  loading?: boolean;
}

const today = new Date().toISOString().split('T')[0];

function attachmentFileName(fileUrl: string) {
  try {
    return decodeURIComponent(fileUrl.split('/').pop() || fileUrl);
  } catch {
    return fileUrl;
  }
}

export default function PlanModal({ studentId, plan, onClose, onSave, onAttachmentsChanged, loading }: Props) {
  const [teacher, setTeacher]     = useState(plan?.teacher ? String(plan.teacher) : '');
  const [startDate, setStartDate] = useState(plan?.start_date || today);
  const [endDate, setEndDate]     = useState(plan?.end_date || '');
  const [goalsByDomain, setGoalsByDomain] = useState<Record<PlanDomain, string>>(() => {
    const initial = {} as Record<PlanDomain, string>;
    for (const { value } of PLAN_DOMAINS) {
      initial[value] = plan?.goals.find(g => g.domain === value)?.goals_text || '';
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [attachments, setAttachments] = useState<PlanAttachment[]>(plan?.attachments || []);
  const [attachFile, setAttachFile]   = useState<File | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ['users-for-plans'],
    queryFn: () => authApi.users().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!startDate) e.start_date = 'تاريخ البدء مطلوب';
    if (!endDate)   e.end_date = 'تاريخ الانتهاء مطلوب';
    if (startDate && endDate && endDate < startDate) e.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSave({
      teacher: teacher || null,
      start_date: startDate,
      end_date: endDate,
      goals: PLAN_DOMAINS.map(({ value }) => ({ domain: value, goals_text: goalsByDomain[value] })),
    });
  };

  const handleUpload = async () => {
    if (!plan || !attachFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', attachFile);
      const res = await plansApi.uploadAttachment(studentId, plan.id, formData);
      setAttachments(a => [res.data, ...a]);
      setAttachFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onAttachmentsChanged?.();
      toast.success('تم رفع المرفق');
    } catch {
      toast.error('حدث خطأ أثناء الرفع — تأكد إن الملف Excel أو Word');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (!plan) return;
    setDeletingId(attachmentId);
    try {
      await plansApi.deleteAttachment(studentId, plan.id, attachmentId);
      setAttachments(a => a.filter(x => x.id !== attachmentId));
      onAttachmentsChanged?.();
      toast.success('تم حذف المرفق');
    } catch {
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{plan ? 'تعديل الخطة الشهرية' : 'إضافة خطة شهرية'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">المعلم/ة</label>
              <select className="form-input" value={teacher} onChange={e => setTeacher(e.target.value)}>
                <option value="">-- بدون معلم/ة --</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">تاريخ بدء الخطة <span className="text-red-500">*</span></label>
              <input
                type="date" dir="ltr"
                className={`form-input ${errors.start_date ? 'border-red-400' : ''}`}
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setErrors({}); }}
              />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="form-label">تاريخ انتهاء الخطة <span className="text-red-500">*</span></label>
              <input
                type="date" dir="ltr"
                className={`form-input ${errors.end_date ? 'border-red-400' : ''}`}
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setErrors({}); }}
              />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-3">
            <p className="form-label mb-0">الأهداف حسب المجال</p>
            {PLAN_DOMAINS.map(({ value, label }) => (
              <div key={value}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                <textarea
                  rows={2}
                  className="form-input resize-none text-sm"
                  value={goalsByDomain[value]}
                  onChange={e => setGoalsByDomain(g => ({ ...g, [value]: e.target.value }))}
                  placeholder={`الأهداف التي يتم تدريب المستفيد عليها بمجال ${label}...`}
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-3">
            <p className="form-label mb-0 flex items-center gap-1"><Paperclip size={12}/> مرفقات (Excel / Word)</p>
            {!plan ? (
              <p className="text-xs text-gray-400">احفظ الخطة أولًا، وبعدها تقدر ترفع مرفقات لها.</p>
            ) : (
              <>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                        <a
                          href={mediaUrl(att.file) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 min-w-0 text-primary-700 hover:underline"
                        >
                          <FileText size={14} className="flex-shrink-0" />
                          <span className="truncate text-sm">{attachmentFileName(att.file)}</span>
                        </a>
                        <button
                          type="button"
                          disabled={deletingId === att.id}
                          onClick={() => handleDelete(att.id)}
                          className="text-gray-400 hover:text-red-600 flex-shrink-0 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.docx,.doc"
                    className="form-input text-xs py-1.5"
                    onChange={e => setAttachFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    disabled={!attachFile || uploading}
                    onClick={handleUpload}
                    className="btn-secondary py-1.5 px-3 text-xs flex-shrink-0 disabled:opacity-50"
                  >
                    {uploading ? 'جارٍ الرفع...' : <><Upload size={13} /> رفع</>}
                  </button>
                </div>
              </>
            )}
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
