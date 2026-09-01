'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { branchesApi, siteSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Branch, SiteSettings } from '@/types';
import Header from '@/components/layout/Header';
import {
  Plus, Pencil, Trash2, MapPin, Phone, X, Save, Upload,
  Building2, ShieldAlert, Users, Info, Mail, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Site Settings Card ──────────────────────────────────────────────────────────
function SiteSettingsCard() {
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    center_name_ar: '', center_name_en: '', phone: '', email: '', website: '', address: '',
  });

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn:  () => siteSettingsApi.get().then(r => r.data),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        center_name_ar: settings.center_name_ar || '',
        center_name_en: settings.center_name_en || '',
        phone:          settings.phone || '',
        email:          settings.email || '',
        website:        settings.website || '',
        address:        settings.address || '',
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (logoFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        fd.append('logo', logoFile);
        return siteSettingsApi.update(fd);
      }
      return siteSettingsApi.update(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setLogoFile(null);
      toast.success('تم حفظ معلومات المركز');
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const currentLogo = logoPreview || (settings?.logo ? `${process.env.NEXT_PUBLIC_MEDIA_URL}${settings.logo}` : null);

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
          <Info size={18} className="text-primary-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-800">معلومات المركز</h2>
          <p className="text-xs text-gray-400">تظهر هذه المعلومات في المستندات الرسمية مثل إشعار القبول</p>
        </div>
      </div>

      <div className="flex items-start gap-5 mb-5">
        <div
          className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary-400 transition-colors flex-shrink-0"
          onClick={() => logoRef.current?.click()}
        >
          {currentLogo
            ? <img src={currentLogo} alt="الشعار" className="w-full h-full object-cover" />
            : <Upload size={20} className="text-gray-400" />}
        </div>
        <input
          ref={logoRef} type="file" accept="image/*" className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (!f) return;
            setLogoFile(f);
            setLogoPreview(URL.createObjectURL(f));
          }}
        />
        <div className="pt-1">
          <button type="button" onClick={() => logoRef.current?.click()} className="btn-secondary text-xs py-1">
            رفع شعار المركز
          </button>
          <p className="text-xs text-gray-400 mt-1">JPG، PNG — حد أقصى 5 ميجا</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">اسم المركز (عربي)</label>
          <input className="form-input" value={form.center_name_ar}
            onChange={e => setForm(f => ({ ...f, center_name_ar: e.target.value }))} />
        </div>
        <div>
          <label className="form-label">اسم المركز (إنجليزي)</label>
          <input className="form-input" dir="ltr" value={form.center_name_en}
            onChange={e => setForm(f => ({ ...f, center_name_en: e.target.value }))} />
        </div>
        <div>
          <label className="form-label flex items-center gap-1"><Phone size={12}/> رقم التواصل</label>
          <input className="form-input" dir="ltr" value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="011XXXXXXX" />
        </div>
        <div>
          <label className="form-label flex items-center gap-1"><Mail size={12}/> البريد الإلكتروني</label>
          <input className="form-input" dir="ltr" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="form-label flex items-center gap-1"><Globe size={12}/> الموقع الإلكتروني</label>
          <input className="form-input" dir="ltr" value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.example.com" />
        </div>
        <div>
          <label className="form-label flex items-center gap-1"><MapPin size={12}/> العنوان</label>
          <input className="form-input" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn-primary px-6"
        >
          {saveMutation.isPending
            ? 'جارٍ الحفظ...'
            : <span className="flex items-center gap-1.5"><Save size={14}/> حفظ</span>
          }
        </button>
      </div>
    </div>
  );
}

// ── Branch Form Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  branch?: Branch | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}

function BranchModal({ branch, onClose, onSave, loading }: ModalProps) {
  const [form, setForm] = useState({
    name:      branch?.name      || '',
    city:      branch?.city      || '',
    location:  branch?.location  || '',
    phone:     branch?.phone     || '',
    is_active: branch?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'اسم الفرع مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" dir="rtl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {branch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="form-label">اسم الفرع <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.name ? 'border-red-400' : ''}`}
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
              placeholder="مثال: الفرع الرئيسي"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="form-label">المدينة</label>
            <input
              className="form-input"
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="مثال: الرياض"
            />
          </div>

          <div>
            <label className="form-label">الموقع / العنوان</label>
            <input
              className="form-input"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="مثال: حي العليا، شارع الملك فهد"
            />
          </div>

          <div>
            <label className="form-label">رقم هاتف الفرع</label>
            <input
              className="form-input"
              dir="ltr"
              inputMode="numeric"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
              placeholder="011XXXXXXX"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active_branch"
              type="checkbox"
              className="w-4 h-4 accent-primary-600"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
            />
            <label htmlFor="is_active_branch" className="text-sm text-gray-700 cursor-pointer">فرع نشط</label>
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
export default function SettingsPage() {
  const user        = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => branchesApi.create(d),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); closeModal(); toast.success('تم إضافة الفرع'); },
    onError:    () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Record<string, unknown> }) => branchesApi.update(id, d),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); closeModal(); toast.success('تم تحديث الفرع'); },
    onError:    () => toast.error('حدث خطأ أثناء التحديث'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => branchesApi.delete(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); setDeleteId(null); toast.success('تم حذف الفرع'); },
    onError:    () => toast.error('لا يمكن حذف فرع يحتوي على طلاب'),
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
        title="الإعدادات"
        subtitle="إدارة إعدادات النظام"
      />

      <SiteSettingsCard />

      {/* Branches section */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 size={18} className="text-primary-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">إدارة الفروع</h2>
              <p className="text-xs text-gray-400">تعريف فروع المركز وإدارتها</p>
            </div>
          </div>
          <button
            onClick={() => { setEditTarget(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} /> إضافة فرع
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <Building2 size={36} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لم يتم إضافة أي فرع بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {branches.map((b) => (
              <div key={b.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-primary-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800">{b.name}</p>
                    <span className={`badge text-xs ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {b.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={11}/> {b.location}
                      </span>
                    )}
                    {b.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone size={11}/> {b.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                      <Users size={11}/> {b.student_count} طالب
                    </span>
                  </div>
                </div>

                {/* Actions */}
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
                    disabled={b.student_count > 0}
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Branch Modal */}
      {modalOpen && (
        <BranchModal
          branch={editTarget}
          onClose={closeModal}
          loading={createMutation.isPending || updateMutation.isPending}
          onSave={d => {
            if (editTarget) updateMutation.mutate({ id: editTarget.id, d });
            else createMutation.mutate(d);
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center" dir="rtl">
            <Trash2 size={36} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-5">هل أنت متأكد من حذف هذا الفرع؟</p>
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
