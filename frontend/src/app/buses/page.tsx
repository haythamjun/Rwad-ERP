'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { busesApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Bus as BusType, Branch } from '@/types';
import Header from '@/components/layout/Header';
import {
  Plus, Pencil, Trash2, X, Save,
  Bus as BusIcon, ShieldAlert, Building2, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1980 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);

function isExpired(dateStr: string) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// ── Bus Form Modal ──────────────────────────────────────────────────────────────
interface ModalProps {
  bus?: BusType | null;
  branches: Branch[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}

function BusModal({ bus, branches, onClose, onSave, loading }: ModalProps) {
  const [form, setForm] = useState({
    chassis_number:       bus?.chassis_number       || '',
    plate_number:         bus?.plate_number         || '',
    brand:                bus?.brand                || '',
    manufacture_year:     bus?.manufacture_year ? String(bus.manufacture_year) : '',
    serial_number:        bus?.serial_number        || '',
    branch:               bus?.branch ? String(bus.branch) : '',
    registration_expiry:  bus?.registration_expiry  || '',
    inspection_expiry:    bus?.inspection_expiry    || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.chassis_number.trim())      e.chassis_number = 'رقم الهيكل مطلوب';
    if (!form.plate_number.trim())        e.plate_number = 'رقم اللوحة مطلوب';
    if (!form.brand.trim())               e.brand = 'ماركة المركبة مطلوبة';
    if (!form.manufacture_year)           e.manufacture_year = 'سنة الصنع مطلوبة';
    if (!form.branch)                     e.branch = 'الفرع مطلوب';
    if (!form.registration_expiry)        e.registration_expiry = 'تاريخ انتهاء الاستمارة مطلوب';
    if (!form.inspection_expiry)          e.inspection_expiry = 'تاريخ انتهاء الفحص الدوري مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {bus ? 'تعديل الباص' : 'إضافة باص جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">رقم الهيكل <span className="text-red-500">*</span></label>
              <input
                className={`form-input font-mono ${errors.chassis_number ? 'border-red-400' : ''}`}
                dir="ltr"
                value={form.chassis_number}
                onChange={e => { setForm(f => ({ ...f, chassis_number: e.target.value })); setErrors({}); }}
              />
              {errors.chassis_number && <p className="text-red-500 text-xs mt-1">{errors.chassis_number}</p>}
            </div>
            <div>
              <label className="form-label">رقم اللوحة <span className="text-red-500">*</span></label>
              <input
                className={`form-input font-mono ${errors.plate_number ? 'border-red-400' : ''}`}
                dir="ltr"
                value={form.plate_number}
                onChange={e => { setForm(f => ({ ...f, plate_number: e.target.value })); setErrors({}); }}
              />
              {errors.plate_number && <p className="text-red-500 text-xs mt-1">{errors.plate_number}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">ماركة المركبة <span className="text-red-500">*</span></label>
              <input
                className={`form-input ${errors.brand ? 'border-red-400' : ''}`}
                value={form.brand}
                onChange={e => { setForm(f => ({ ...f, brand: e.target.value })); setErrors({}); }}
                placeholder="مثال: تويوتا هايس"
              />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
            </div>
            <div>
              <label className="form-label">سنة الصنع <span className="text-red-500">*</span></label>
              <select
                className={`form-input ${errors.manufacture_year ? 'border-red-400' : ''}`}
                value={form.manufacture_year}
                onChange={e => { setForm(f => ({ ...f, manufacture_year: e.target.value })); setErrors({}); }}
              >
                <option value="">-- اختر --</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {errors.manufacture_year && <p className="text-red-500 text-xs mt-1">{errors.manufacture_year}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">الرقم التسلسلي</label>
              <input
                className="form-input font-mono"
                dir="ltr"
                value={form.serial_number}
                onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
              />
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">تاريخ انتهاء الاستمارة <span className="text-red-500">*</span></label>
              <input
                type="date" dir="ltr"
                className={`form-input ${errors.registration_expiry ? 'border-red-400' : ''}`}
                value={form.registration_expiry}
                onChange={e => { setForm(f => ({ ...f, registration_expiry: e.target.value })); setErrors({}); }}
              />
              {errors.registration_expiry && <p className="text-red-500 text-xs mt-1">{errors.registration_expiry}</p>}
            </div>
            <div>
              <label className="form-label">تاريخ انتهاء الفحص الدوري <span className="text-red-500">*</span></label>
              <input
                type="date" dir="ltr"
                className={`form-input ${errors.inspection_expiry ? 'border-red-400' : ''}`}
                value={form.inspection_expiry}
                onChange={e => { setForm(f => ({ ...f, inspection_expiry: e.target.value })); setErrors({}); }}
              />
              {errors.inspection_expiry && <p className="text-red-500 text-xs mt-1">{errors.inspection_expiry}</p>}
            </div>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BusesPage() {
  const user        = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<BusType | null>(null);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const { data: buses = [], isLoading } = useQuery<BusType[]>({
    queryKey: ['buses'],
    queryFn:  () => busesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => busesApi.create(d),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['buses'] }); closeModal(); toast.success('تم إضافة الباص'); },
    onError:    () => toast.error('حدث خطأ أثناء الحفظ — تأكد أن رقم الهيكل واللوحة غير مكررين'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, unknown> }) => busesApi.update(id, d),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['buses'] }); closeModal(); toast.success('تم تحديث الباص'); },
    onError:    () => toast.error('حدث خطأ أثناء التحديث'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => busesApi.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['buses'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setDeleteId(null);
      toast.success('تم حذف الباص');
    },
    onError: () => toast.error('حدث خطأ أثناء الحذف'),
  });

  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Header
        title="الباصات"
        subtitle="إدارة باصات نقل الطلاب وربطها بالفروع"
      />

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <BusIcon size={18} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">إدارة الباصات</h2>
              <p className="text-xs text-gray-400">بيانات المركبات وربطها بفروع المركز</p>
            </div>
          </div>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} /> إضافة باص
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : buses.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <BusIcon size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لم يتم إضافة أي باص بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {buses.map((b) => {
              const regExpired  = isExpired(b.registration_expiry);
              const inspExpired = isExpired(b.inspection_expiry);
              return (
                <div key={b.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <BusIcon size={16} className="text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800">{b.brand} — {b.plate_number}</p>
                      <span className="badge text-xs bg-gray-100 text-gray-600">{b.manufacture_year}</span>
                      {(regExpired || inspExpired) && (
                        <span className="flex items-center gap-1 badge text-xs bg-red-100 text-red-700">
                          <AlertTriangle size={11}/> {regExpired && inspExpired ? 'الاستمارة والفحص منتهيان' : regExpired ? 'الاستمارة منتهية' : 'الفحص الدوري منتهٍ'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Building2 size={11}/> {b.branch_name}
                      </span>
                      <span className="text-xs text-gray-400 font-mono" dir="ltr">هيكل: {b.chassis_number}</span>
                      {b.serial_number && (
                        <span className="text-xs text-gray-400 font-mono" dir="ltr">تسلسلي: {b.serial_number}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditTarget(b); setModalOpen(true); }}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="تعديل"
                    >
                      <Pencil size={14}/>
                    </button>
                    <button
                      onClick={() => setDeleteId(b.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <BusModal
          bus={editTarget}
          branches={branches}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={closeModal}
          onSave={d => {
            if (editTarget) updateMutation.mutate({ id: editTarget.id, d });
            else createMutation.mutate(d);
          }}
        />
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center" dir="rtl">
            <Trash2 size={36} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-5">
              هل أنت متأكد من حذف هذا الباص؟ سيُلغى ربطه بأي طلاب مسجّلين عليه.
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
