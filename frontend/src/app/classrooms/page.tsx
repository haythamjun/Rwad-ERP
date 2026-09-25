'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classroomsApi, branchesApi, studentsApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Classroom, Branch, Student, User } from '@/types';
import Header from '@/components/layout/Header';
import {
  Plus, Pencil, Trash2, X, Save, Users,
  GraduationCap, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Classroom Form Modal ────────────────────────────────────────────────────────
interface ModalProps {
  classroom?: Classroom | null;
  branches: Branch[];
  teachers: User[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}

function ClassroomModal({ classroom, branches, teachers, onClose, onSave, loading }: ModalProps) {
  const [form, setForm] = useState({
    name:    classroom?.name || '',
    branch:  classroom?.branch ? String(classroom.branch) : '',
    teacher: classroom?.teacher ? String(classroom.teacher) : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'اسم الفصل مطلوب';
    if (!form.branch)      e.branch = 'الفرع مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {classroom ? 'تعديل الفصل' : 'إضافة فصل جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="form-label">اسم الفصل <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.name ? 'border-red-400' : ''}`}
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
              placeholder="مثال: الفصل الأول"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="form-label">الفرع <span className="text-red-500">*</span></label>
            <select
              className={`form-input ${errors.branch ? 'border-red-400' : ''}`}
              value={form.branch}
              onChange={e => { setForm(f => ({ ...f, branch: e.target.value })); setErrors({}); }}
            >
              <option value="">-- اختر --</option>
              {branches.filter(b => b.is_active).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch}</p>}
          </div>

          <div>
            <label className="form-label">المعلم/ة</label>
            <select
              className="form-input"
              value={form.teacher}
              onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
            >
              <option value="">-- بدون معلم/ة --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button
            disabled={loading}
            onClick={() => { if (validate()) onSave(form); }}
            className="btn-primary px-6"
          >
            {loading
              ? 'جارٍ الحفظ...'
              : <span className="flex items-center gap-1.5"><Save size={14}/> حفظ</span>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Classroom Roster Modal ───────────────────────────────────────────────────────
function ClassroomStudentsModal({ classroom, onClose }: { classroom: Classroom; onClose: () => void }) {
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['classroom-roster', classroom.id],
    queryFn: () => studentsApi.list({ classroom: classroom.id, page_size: 200 }).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">طلاب الفصل — {classroom.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{students.length} طالب مسند</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">لا يوجد طلاب مسندون لهذا الفصل</p>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="font-medium text-gray-800 text-sm">{s.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.file_number}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClassroomsPage() {
  const user        = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Classroom | null>(null);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);
  const [rosterClassroom, setRosterClassroom] = useState<Classroom | null>(null);

  const { data: classrooms = [], isLoading } = useQuery<Classroom[]>({
    queryKey: ['classrooms'],
    queryFn:  () => classroomsApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: teachers = [] } = useQuery<User[]>({
    queryKey: ['users-for-classrooms'],
    queryFn: () => authApi.users().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => classroomsApi.create(d),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['classrooms'] }); closeModal(); toast.success('تم إضافة الفصل'); },
    onError:    () => toast.error('حدث خطأ أثناء الحفظ — تأكد أن اسم الفصل غير مكرر بنفس الفرع'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, unknown> }) => classroomsApi.update(id, d),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['classrooms'] }); closeModal(); toast.success('تم تحديث الفصل'); },
    onError:    () => toast.error('حدث خطأ أثناء التحديث'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => classroomsApi.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDeleteId(null);
      toast.success('تم حذف الفصل');
    },
    onError: () => toast.error('حدث خطأ أثناء الحذف'),
  });

  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const canWrite = user?.is_admin || user?.permissions?.some(p => p.module === 'classrooms' && p.can_edit);

  return (
    <div className="space-y-6 max-w-4xl">
      <Header
        title="الفصول"
        subtitle="تصنيف الطلاب بفصول دراسية وربطها بمعلم/ة ثابت"
      />

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <GraduationCap size={18} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">إدارة الفصول</h2>
              <p className="text-xs text-gray-400">فصول دراسية وربطها بفروع المركز ومعلميها</p>
            </div>
          </div>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} /> إضافة فصل
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : classrooms.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <GraduationCap size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لم يتم إضافة أي فصل بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {classrooms.map((c) => (
              <div key={c.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={16} className="text-primary-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{c.name}</p>
                    <span className="badge text-xs bg-gray-100 text-gray-600">{c.student_count} طالب</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Building2 size={11}/> {c.branch_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      المعلم/ة: {c.teacher_name || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setRosterClassroom(c)}
                    className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="عرض الطلاب"
                  >
                    <Users size={14}/>
                  </button>
                  {canWrite && (
                    <button
                      onClick={() => { setEditTarget(c); setModalOpen(true); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="تعديل"
                    >
                      <Pencil size={14}/>
                    </button>
                  )}
                  {canWrite && (
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ClassroomModal
          classroom={editTarget}
          branches={branches}
          teachers={teachers}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={closeModal}
          onSave={d => {
            if (editTarget) updateMutation.mutate({ id: editTarget.id, d });
            else createMutation.mutate(d);
          }}
        />
      )}

      {rosterClassroom && <ClassroomStudentsModal classroom={rosterClassroom} onClose={() => setRosterClassroom(null)} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center" dir="rtl">
            <Trash2 size={36} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-5">
              هل أنت متأكد من حذف هذا الفصل؟ سيُلغى ربطه بأي طلاب مسجّلين عليه.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 btn-secondary" onClick={() => setDeleteId(null)}>إلغاء</button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
