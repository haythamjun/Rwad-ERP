'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { virtualClassesApi, classroomsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type {
  Classroom, VirtualSession, SessionAttendanceRow, ZohoRecordingItem, SessionRecording, ZohoConnectStatus,
} from '@/types';
import Header from '@/components/layout/Header';
import { cn, formatDateTime } from '@/lib/utils';
import {
  Plus, Pencil, X, Save, Video, Play, Users, Ban, RefreshCw,
  Copy, ExternalLink, CircleDot, Download, AlertTriangle, CheckCircle2, Clock, Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const listOf = <T,>(d: unknown): T[] =>
  Array.isArray(d) ? (d as T[]) : ((d as { results?: T[] })?.results ?? []);

const errMsg = (e: unknown, fallback: string) => {
  const d = (e as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!d) return fallback;
  if (typeof d.error === 'string') return d.error;
  if (typeof d.detail === 'string') return d.detail;
  const first = Object.values(d)[0];
  return Array.isArray(first) ? String(first[0]) : fallback;
};

const toLocalInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fileSize = (b: number | null) =>
  b == null ? '' : b > 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.round(b / 1024 ** 2)} MB`;

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  live:      { label: 'مباشرة الآن', cls: 'bg-red-50 text-red-600' },
  upcoming:  { label: 'قادمة',       cls: 'bg-blue-50 text-blue-600' },
  ended:     { label: 'منتهية',      cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'ملغاة',       cls: 'bg-gray-100 text-gray-400 line-through' },
};

// ── Session form modal ──────────────────────────────────────────────────────────
interface SessionModalProps {
  session?: VirtualSession | null;
  classrooms: Classroom[];
  onClose: () => void;
}

function SessionModal({ session, classrooms, onClose }: SessionModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    classroom:        session ? String(session.classroom) : (classrooms.length === 1 ? String(classrooms[0].id) : ''),
    title:            session?.title || '',
    starts_at:        toLocalInput(session?.starts_at),
    duration_minutes: String(session?.duration_minutes ?? 45),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      session ? virtualClassesApi.update(session.id, d) : virtualClassesApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] });
      toast.success(session ? 'تم تحديث الحصة' : 'تمت جدولة الحصة وإنشاء الاجتماع في Zoho');
      onClose();
    },
    onError: (e) => toast.error(errMsg(e, 'حدث خطأ أثناء الحفظ')),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.classroom)    e.classroom = 'الفصل مطلوب';
    if (!form.title.trim()) e.title = 'عنوان الحصة مطلوب';
    if (!form.starts_at)    e.starts_at = 'الموعد مطلوب';
    setErrors(e);
    if (Object.keys(e).length) return;
    mutation.mutate({
      ...(session ? {} : { classroom: Number(form.classroom) }),
      title:            form.title.trim(),
      starts_at:        new Date(form.starts_at).toISOString(),
      duration_minutes: Number(form.duration_minutes),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">{session ? 'تعديل الحصة' : 'جدولة حصة أونلاين'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="form-label">الفصل <span className="text-red-500">*</span></label>
            <select
              className={cn('form-input', errors.classroom && 'border-red-400')}
              value={form.classroom}
              disabled={!!session}
              onChange={e => setForm(f => ({ ...f, classroom: e.target.value }))}
            >
              <option value="">-- اختر --</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} — {c.branch_name}</option>)}
            </select>
            {errors.classroom && <p className="text-red-500 text-xs mt-1">{errors.classroom}</p>}
          </div>

          <div>
            <label className="form-label">عنوان الحصة <span className="text-red-500">*</span></label>
            <input
              className={cn('form-input', errors.title && 'border-red-400')}
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="مثال: مهارات التواصل — الوحدة الثالثة"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="form-label">الموعد <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                className={cn('form-input', errors.starts_at && 'border-red-400')}
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">المدة</label>
              <select
                className="form-input"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
              >
                {[15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} دقيقة</option>)}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            يُنشأ اجتماع Zoho تلقائيًا، ويظهر للطلاب بتطبيق أولياء الأمور. يفتح الدخول قبل الموعد بـ 10 دقائق.
            لا تنسَ تشغيل التسجيل عند بدء الحصة.
          </p>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button disabled={mutation.isPending} onClick={submit} className="btn-primary px-6">
            {mutation.isPending ? 'جارٍ الحفظ...' : <span className="flex items-center gap-1.5"><Save size={14}/> حفظ</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance modal ───────────────────────────────────────────────────────────
function AttendanceModal({ session, onClose }: { session: VirtualSession; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ total: number; attended: number; rows: SessionAttendanceRow[] }>({
    queryKey: ['virtual-session-attendance', session.id],
    queryFn:  () => virtualClassesApi.attendance(session.id).then(r => r.data),
    refetchInterval: session.live_state === 'live' ? 30_000 : false,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">حضور — {session.title}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {data ? `${data.attended} من ${data.total} دخلوا الحصة` : ' '}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : !data?.rows.length ? (
            <p className="text-center text-gray-400 text-sm py-8">لا يوجد طلاب في هذا الفصل</p>
          ) : (
            <div className="space-y-2">
              {data.rows.map(r => (
                <div key={r.student} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {r.attended
                    ? <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
                    : <Clock size={18} className="text-gray-300 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{r.student_name}</p>
                    <p className="text-xs text-gray-400">{r.file_number}</p>
                  </div>
                  <div className="text-left text-xs text-gray-500">
                    {r.attended ? (
                      <>
                        <p>{formatDateTime(r.first_joined_at)}</p>
                        {(r.join_count ?? 1) > 1 && <p className="text-gray-400">دخل {r.join_count} مرات</p>}
                      </>
                    ) : <span className="text-gray-400">لم يدخل</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Recording player modal ─────────────────────────────────────────────────────
function PlayerModal({ session, recording, onClose }: { session: VirtualSession; recording: SessionRecording; onClose: () => void }) {
  const { data, isLoading, error } = useQuery<{ url: string }>({
    queryKey: ['recording-play', recording.id],
    queryFn:  () => virtualClassesApi.play(recording.id).then(r => r.data),
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-800">{session.title}</h2>
            <p className="text-xs text-gray-400">{session.classroom_name} • {formatDateTime(recording.recorded_at || session.starts_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="bg-black aspect-video flex items-center justify-center">
          {isLoading ? (
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
          ) : error || !data ? (
            <p className="text-white/70 text-sm">{errMsg(error, 'تعذّر تحميل التسجيل')}</p>
          ) : (
            <video src={data.url} controls autoPlay controlsList="nodownload" className="w-full h-full" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Import old Zoho recordings ─────────────────────────────────────────────────
function ImportPanel({ classrooms }: { classrooms: Classroom[] }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<Record<string, string>>({});

  const { data: items = [], isLoading, error, refetch, isFetching } = useQuery<ZohoRecordingItem[]>({
    queryKey: ['zoho-recordings'],
    queryFn:  () => virtualClassesApi.zohoRecordings().then(r => r.data),
  });

  const importMutation = useMutation({
    mutationFn: ({ id, classroom }: { id: string; classroom: number }) => virtualClassesApi.importRecording(id, classroom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoho-recordings'] });
      queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] });
      toast.success('تم الربط — جارٍ أرشفة التسجيل بالخلفية');
    },
    onError: (e) => toast.error(errMsg(e, 'تعذّر الاستيراد')),
  });

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-800">تسجيلات Zoho السابقة</h2>
          <p className="text-xs text-gray-400">اربط أي تسجيل قديم بفصل ليُؤرشف ويظهر ضمن حصصه</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')}/> تحديث
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 text-sm py-8">{errMsg(error, 'تعذّر جلب التسجيلات من Zoho')}</p>
      ) : items.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">لا توجد تسجيلات في حساب Zoho</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map(it => (
            <div key={it.recording_id} className="flex items-center gap-3 py-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-gray-800 text-sm">{it.topic || 'بدون عنوان'}</p>
                <p className="text-xs text-gray-400">{it.recorded_at ? formatDateTime(it.recorded_at) : it.date_label} • {it.file_size}</p>
              </div>
              {it.imported ? (
                <span className="badge bg-green-50 text-green-700 text-xs">مستورد — {it.classroom_name}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    className="form-input py-1.5 text-sm w-44"
                    value={target[it.recording_id] || ''}
                    onChange={e => setTarget(t => ({ ...t, [it.recording_id]: e.target.value }))}
                  >
                    <option value="">-- اختر الفصل --</option>
                    {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    className="btn-primary text-sm flex items-center gap-1.5"
                    disabled={!target[it.recording_id] || importMutation.isPending}
                    onClick={() => importMutation.mutate({ id: it.recording_id, classroom: Number(target[it.recording_id]) })}
                  >
                    <Download size={14}/> استيراد
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recording status chip ──────────────────────────────────────────────────────
function RecordingChips({ session, onPlay }: { session: VirtualSession; onPlay: (r: SessionRecording) => void }) {
  // المعلم قد يبدأ قبل الموعد أو بعده، فالتسجيل يظهر متى ما وُجد بغض النظر عن الجدولة
  if (!session.recordings.length) {
    if (session.live_state !== 'ended') return null;
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600" title="لم يُعثر على تسجيل لهذه الحصة في Zoho بعد">
        <AlertTriangle size={12}/> لا يوجد تسجيل
      </span>
    );
  }
  return (
    <>
      {session.recordings.map((r, i) => r.status === 'archived' ? (
        <button key={r.id} onClick={() => onPlay(r)}
          className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
          <Play size={12}/> التسجيل{session.recordings.length > 1 ? ` ${i + 1}` : ''} ({fileSize(r.size_bytes)})
        </button>
      ) : (
        <span key={r.id} className={cn('flex items-center gap-1 text-xs', r.status === 'failed' ? 'text-red-500' : 'text-gray-400')}
          title={r.error || undefined}>
          {r.status === 'failed' ? <AlertTriangle size={12}/> : <RefreshCw size={12} className="animate-spin"/>}
          {r.status === 'failed' ? 'فشلت الأرشفة' : 'جارٍ الأرشفة'}
        </span>
      ))}
    </>
  );
}

// ── ربط حساب Zoho للمعلم ────────────────────────────────────────────────────────
// حصص فصول المعلم تُنشأ بحسابه لو ربطه (مضيف مستقل، وحصص متزامنة لعدة معلمين)،
// وإلا بحساب المركز.
function ZohoAccountCard({ teachesClasses }: { teachesClasses: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useQuery<ZohoConnectStatus>({
    queryKey: ['zoho-connect'],
    queryFn:  () => virtualClassesApi.zohoStatus().then(r => r.data),
  });

  // رجوع من صفحة موافقة Zoho: ?zoho=connected|mismatch|error&msg=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('zoho');
    if (!result) return;
    const msg = params.get('msg');
    if (result === 'connected') toast.success('تم ربط حساب Zoho — حصص فصولك تُنشأ الآن بحسابك');
    else toast.error(msg || 'تعذّر ربط حساب Zoho', { duration: 8000 });
    window.history.replaceState(null, '', window.location.pathname);
    queryClient.invalidateQueries({ queryKey: ['zoho-connect'] });
  }, [queryClient]);

  const connectMutation = useMutation({
    mutationFn: () => virtualClassesApi.zohoConnect().then(r => r.data),
    onSuccess:  (d: { url: string }) => { window.location.href = d.url; },
    onError:    (e) => toast.error(errMsg(e, 'تعذّر بدء الربط')),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => virtualClassesApi.zohoDisconnect(),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['zoho-connect'] }); toast.success('تم إلغاء ربط حساب Zoho'); },
    onError:    (e) => toast.error(errMsg(e, 'تعذّر إلغاء الربط')),
  });

  if (!data?.available || (!teachesClasses && !data.connected)) return null;

  return (
    <div className={cn('card flex items-center gap-4 flex-wrap',
      data.connected ? 'border border-green-100' : 'border border-amber-200 bg-amber-50/40')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        data.connected ? 'bg-green-50' : 'bg-amber-100')}>
        {data.connected ? <CheckCircle2 size={18} className="text-green-600" /> : <Link2 size={18} className="text-amber-700" />}
      </div>
      <div className="flex-1 min-w-0">
        {data.connected ? (
          <>
            <p className="text-sm font-semibold text-gray-800">حساب Zoho مربوط</p>
            <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{data.email}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800">اربط حساب Zoho الخاص بك</p>
            <p className="text-xs text-gray-600 mt-0.5">
              حتى تُنشأ حصص فصولك بحسابك وتبدأها كمضيف. سجّل الدخول بنفس إيميلك في المنصة.
              قبل الربط تُنشأ بحساب المركز.
            </p>
          </>
        )}
      </div>
      {data.connected ? (
        <button
          onClick={() => { if (confirm('إلغاء ربط حساب Zoho؟ الحصص الجديدة ستُنشأ بحساب المركز.')) disconnectMutation.mutate(); }}
          disabled={disconnectMutation.isPending}
          className="btn-secondary text-xs py-1.5"
        >
          إلغاء الربط
        </button>
      ) : (
        <button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending} className="btn-primary text-sm">
          <Link2 size={14}/> {connectMutation.isPending ? 'جارٍ التحويل...' : 'ربط حساب Zoho'}
        </button>
      )}
    </div>
  );
}


// ── Main page ──────────────────────────────────────────────────────────────────
type Tab = 'upcoming' | 'past' | 'import';

export default function VirtualClassesPage() {
  const user        = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const [tab, setTab]                 = useState<Tab>('upcoming');
  const [classroomFilter, setFilter]  = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState<VirtualSession | null>(null);
  const [cancelTarget, setCancel]     = useState<VirtualSession | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<VirtualSession | null>(null);
  const [playing, setPlaying]         = useState<{ session: VirtualSession; recording: SessionRecording } | null>(null);

  const perm = (k: 'can_view' | 'can_edit' | 'can_import') =>
    user?.is_admin || user?.permissions?.some(p => p.module === 'virtual_classes' && p[k]);

  const { data: classrooms = [] } = useQuery<Classroom[]>({
    queryKey: ['classrooms'],
    queryFn:  () => classroomsApi.list().then(r => listOf<Classroom>(r.data)),
  });

  // معلم/ة الفصل يدير فصله حتى بدون صلاحية الموديول
  const manageable = classrooms.filter(c => perm('can_edit') || c.teacher === user?.id);
  const canManage  = (s: VirtualSession) => perm('can_edit') || classrooms.some(c => c.id === s.classroom && c.teacher === user?.id);

  const { data: sessions = [], isLoading } = useQuery<VirtualSession[]>({
    queryKey: ['virtual-sessions', tab, classroomFilter],
    queryFn:  () => virtualClassesApi.list({
      when: tab, page_size: 100, ...(classroomFilter ? { classroom: classroomFilter } : {}),
    }).then(r => listOf<VirtualSession>(r.data)),
    enabled: tab !== 'import',
    // الحالات (قادمة/مباشرة/منتهية) والتسجيلات تتغير مع الوقت
    refetchInterval: 60_000,
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => virtualClassesApi.start(id).then(r => r.data),
    onSuccess:  (d: { start_url: string }) => window.open(d.start_url, '_blank', 'noopener'),
    onError:    (e) => toast.error(errMsg(e, 'تعذّر بدء الحصة')),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => virtualClassesApi.cancel(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] }); setCancel(null); toast.success('تم إلغاء الحصة'); },
    onError:    (e) => toast.error(errMsg(e, 'تعذّر الإلغاء')),
  });

  const syncMutation = useMutation({
    mutationFn: (id: number) => virtualClassesApi.sync(id).then(r => r.data),
    onSuccess:  (d: { found: number; archiving: number }) => {
      queryClient.invalidateQueries({ queryKey: ['virtual-sessions'] });
      toast.success(d.found ? `وُجد ${d.found} تسجيل${d.archiving ? ' — جارٍ الأرشفة' : ''}` : 'لم يجهز التسجيل في Zoho بعد، حاول بعد دقائق');
    },
    onError: (e) => toast.error(errMsg(e, 'تعذّر فحص التسجيلات')),
  });

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success('تم النسخ'); };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: 'القادمة والمباشرة' },
    { key: 'past',     label: 'السابقة والتسجيلات' },
    ...(perm('can_import') ? [{ key: 'import' as Tab, label: 'استيراد من Zoho' }] : []),
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <Header title="الفصول الافتراضية" subtitle="حصص أونلاين عبر Zoho Meeting — مسجّلة ومؤرشفة تلقائيًا" />

      <ZohoAccountCard teachesClasses={classrooms.some(c => c.teacher === user?.id)} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab !== 'import' && classrooms.length > 1 && (
            <select className="form-input py-2 text-sm w-48" value={classroomFilter} onChange={e => setFilter(e.target.value)}>
              <option value="">كل الفصول</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {manageable.length > 0 && (
            <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={15}/> جدولة حصة
            </button>
          )}
        </div>
      </div>

      {tab === 'import' ? (
        <ImportPanel classrooms={manageable} />
      ) : (
        <div className="card">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <Video size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{tab === 'upcoming' ? 'لا توجد حصص قادمة' : 'لا توجد حصص سابقة'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map(s => {
                const badge = STATE_BADGE[s.live_state];
                const manage = canManage(s);
                const active = s.live_state === 'live' || s.live_state === 'upcoming';
                return (
                  <div key={s.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      s.live_state === 'live' ? 'bg-red-50' : 'bg-primary-50')}>
                      {s.live_state === 'live'
                        ? <CircleDot size={16} className="text-red-600 animate-pulse" />
                        : <Video size={16} className="text-primary-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('font-semibold text-gray-800', s.status === 'cancelled' && 'line-through text-gray-400')}>{s.title}</p>
                        <span className={cn('badge text-xs', badge.cls)}>{badge.label}</span>
                      </div>
                      <div className="flex items-center gap-x-4 gap-y-1 mt-1 flex-wrap text-xs text-gray-500">
                        <span>{s.classroom_name} • {s.branch_name}</span>
                        <span>{formatDateTime(s.starts_at)} • {s.duration_minutes} دقيقة</span>
                        <span title="حساب Zoho المضيف">المضيف: <span dir="ltr">{s.host_email || 'حساب المركز'}</span></span>
                        {s.live_state !== 'upcoming' && s.status !== 'cancelled' && (
                          <span>الحضور: {s.attendance_count}/{s.student_count}</span>
                        )}
                        <RecordingChips session={s} onPlay={r => setPlaying({ session: s, recording: r })} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {manage && active && (
                        <button
                          onClick={() => startMutation.mutate(s.id)}
                          disabled={startMutation.isPending}
                          className={cn('flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors',
                            s.live_state === 'live' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}
                          title="يفتح Zoho كمضيف — شغّل التسجيل بعد البدء"
                        >
                          <ExternalLink size={13}/> ابدأ الحصة
                        </button>
                      )}
                      {manage && active && s.zoho_join_url && (
                        <button onClick={() => copy(s.zoho_join_url)} title="نسخ رابط الدخول (للزوار/المختصين)"
                          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><Copy size={14}/></button>
                      )}
                      {s.status !== 'cancelled' && s.live_state !== 'upcoming' && (
                        <button onClick={() => setAttendanceFor(s)} title="الحضور"
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50"><Users size={14}/></button>
                      )}
                      {manage && s.status !== 'cancelled' && (
                        <button onClick={() => syncMutation.mutate(s.id)} title="فحص التسجيلات الآن" disabled={syncMutation.isPending}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50">
                          <RefreshCw size={14} className={cn(syncMutation.isPending && syncMutation.variables === s.id && 'animate-spin')}/>
                        </button>
                      )}
                      {manage && s.live_state === 'upcoming' && (
                        <>
                          <button onClick={() => { setEditTarget(s); setModalOpen(true); }} title="تعديل"
                            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"><Pencil size={14}/></button>
                          <button onClick={() => setCancel(s)} title="إلغاء الحصة"
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Ban size={14}/></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <SessionModal
          session={editTarget}
          classrooms={manageable}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
      {attendanceFor && <AttendanceModal session={attendanceFor} onClose={() => setAttendanceFor(null)} />}
      {playing && <PlayerModal {...playing} onClose={() => setPlaying(null)} />}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center" dir="rtl">
            <Ban size={36} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">إلغاء الحصة</h3>
            <p className="text-sm text-gray-500 mb-5">
              سيُحذف اجتماع Zoho وتختفي الحصة من تطبيق أولياء الأمور. متأكد من إلغاء «{cancelTarget.title}»؟
            </p>
            <div className="flex gap-3">
              <button className="flex-1 btn-secondary" onClick={() => setCancel(null)}>تراجع</button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                onClick={() => cancelMutation.mutate(cancelTarget.id)}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? 'جارٍ الإلغاء...' : 'إلغاء الحصة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
