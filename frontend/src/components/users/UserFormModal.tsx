'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import { branchesApi } from '@/lib/api';
import type { Branch, User, ModulePermission, ModuleKey } from '@/types';

// ── Module definitions ────────────────────────────────────────────────────────
const MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'students',   label: 'ملفات الطلاب' },
  { key: 'reports',    label: 'التقارير' },
  { key: 'audit_logs', label: 'سجل العمليات' },
  { key: 'users',      label: 'المستخدمون' },
  { key: 'settings',   label: 'الإعدادات' },
];

type PermMap = Record<ModuleKey, { can_view: boolean; can_edit: boolean; can_export: boolean; can_import: boolean }>;

const defaultPerms = (): PermMap =>
  Object.fromEntries(
    MODULES.map(({ key }) => [key, { can_view: false, can_edit: false, can_export: false, can_import: false }])
  ) as PermMap;

function permsFromList(list: ModulePermission[]): PermMap {
  const map = defaultPerms();
  list.forEach(({ module, can_view, can_edit, can_export, can_import }) => {
    map[module] = { can_view, can_edit, can_export: can_export ?? false, can_import: can_import ?? false };
  });
  return map;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  user?: User | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  loading: boolean;
}

type ScopeType = 'all' | 'city' | 'branch';

// ─────────────────────────────────────────────────────────────────────────────
export default function UserFormModal({ user, onClose, onSave, loading }: Props) {
  const isEdit = !!user;

  const [form, setForm] = useState({
    username:        user?.username        || '',
    password:        '',
    first_name:      user?.first_name      || '',
    last_name:       user?.last_name       || '',
    email:           user?.email           || '',
    phone:           user?.phone           || '',
    role:            user?.role            || 'viewer',
    is_active:       user?.is_active       ?? true,
    assigned_branch: user?.assigned_branch ? String(user.assigned_branch) : '',
    assigned_city:   user?.assigned_city   || '',
  });
  const [scopeType, setScopeType] = useState<ScopeType>(() => {
    if (user?.assigned_branch) return 'branch';
    if (user?.assigned_city)   return 'city';
    return 'all';
  });
  const [showPw, setShowPw]   = useState(false);
  const [perms, setPerms]     = useState<PermMap>(() =>
    permsFromList(user?.permissions || [])
  );
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list().then((r) => {
      const d = r.data as Branch[] | { results: Branch[] };
      return Array.isArray(d) ? d : (d.results ?? []);
    }),
    staleTime: 60_000,
  });

  const cities = [...new Set(branches.map((b) => b.city).filter(Boolean))];

  // Reset when user prop changes (e.g. modal re-opened for different user)
  useEffect(() => {
    setForm({
      username:        user?.username        || '',
      password:        '',
      first_name:      user?.first_name      || '',
      last_name:       user?.last_name       || '',
      email:           user?.email           || '',
      phone:           user?.phone           || '',
      role:            user?.role            || 'viewer',
      is_active:       user?.is_active       ?? true,
      assigned_branch: user?.assigned_branch ? String(user.assigned_branch) : '',
      assigned_city:   user?.assigned_city   || '',
    });
    setScopeType(user?.assigned_branch ? 'branch' : user?.assigned_city ? 'city' : 'all');
    setPerms(permsFromList(user?.permissions || []));
    setErrors({});
  }, [user]);

  const set = (k: string, v: unknown) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const togglePerm = (module: ModuleKey, field: 'can_view' | 'can_edit' | 'can_export' | 'can_import') => {
    setPerms((prev) => {
      const updated = { ...prev[module], [field]: !prev[module][field] };
      // can_edit requires can_view
      if (field === 'can_edit' && updated.can_edit) updated.can_view = true;
      // can_export requires can_view
      if (field === 'can_export' && updated.can_export) updated.can_view = true;
      // can_import requires can_view + can_edit + can_export
      if (field === 'can_import' && updated.can_import) {
        updated.can_view = true;
        updated.can_edit = true;
        updated.can_export = true;
      }
      // unchecking can_view clears everything
      if (field === 'can_view' && !updated.can_view) {
        updated.can_edit = false;
        updated.can_export = false;
        updated.can_import = false;
      }
      // unchecking can_export clears can_import
      if (field === 'can_export' && !updated.can_export) updated.can_import = false;
      return { ...prev, [module]: updated };
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.username.trim())   e.username   = 'اسم المستخدم مطلوب';
    if (!isEdit && !form.password) e.password = 'كلمة المرور مطلوبة';
    if (form.password && form.password.length < 8) e.password = 'كلمة المرور 8 أحرف على الأقل';
    if (!form.first_name.trim()) e.first_name = 'الاسم الأول مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const permissions = MODULES.map(({ key }) => ({
      module:     key,
      can_view:   perms[key].can_view,
      can_edit:   perms[key].can_edit,
      can_export: perms[key].can_export,
      can_import: perms[key].can_import,
    }));
    const data: Record<string, unknown> = {
      ...form,
      permissions,
      assigned_branch: scopeType === 'branch' && form.assigned_branch ? Number(form.assigned_branch) : null,
      assigned_city:   scopeType === 'city'   ? form.assigned_city    : '',
    };
    if (!data.password) delete data.password;
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* ── Section 1: User details ─────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
              بيانات المستخدم
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="form-label">اسم المستخدم <span className="text-red-500">*</span></label>
                <input
                  className={`form-input ${errors.username ? 'border-red-400' : ''}`}
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  disabled={isEdit}
                  dir="ltr"
                  placeholder="example_user"
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
              </div>

              <div>
                <label className="form-label">
                  كلمة المرور {!isEdit && <span className="text-red-500">*</span>}
                  {isEdit && <span className="text-gray-400 text-xs"> (اتركها فارغة للإبقاء على الحالية)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`form-input pl-10 ${errors.password ? 'border-red-400' : ''}`}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    dir="ltr"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="form-label">الاسم الأول <span className="text-red-500">*</span></label>
                <input
                  className={`form-input ${errors.first_name ? 'border-red-400' : ''}`}
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <label className="form-label">الاسم الأخير</label>
                <input
                  className="form-input"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">البريد الإلكتروني</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="form-label">رقم الجوال</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  dir="ltr"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="form-label">الدور الوظيفي</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                >
                  <option value="admin">مدير النظام</option>
                  <option value="manager">مدير</option>
                  <option value="specialist">أخصائي</option>
                  <option value="reception">استقبال</option>
                  <option value="viewer">مشاهد</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  id="is_active"
                  type="checkbox"
                  className="w-4 h-4 accent-primary-600"
                  checked={form.is_active}
                  onChange={(e) => set('is_active', e.target.checked)}
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">
                  حساب نشط
                </label>
              </div>

            </div>
          </div>

          {/* ── Section 2: Work scope ──────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
              نطاق العمل
            </h3>
            <div className="flex flex-wrap gap-4 mb-4">
              {(['all', 'city', 'branch'] as ScopeType[]).map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="accent-primary-600"
                    checked={scopeType === type}
                    onChange={() => setScopeType(type)}
                  />
                  <span className="text-sm text-gray-700">
                    {type === 'all' ? 'بدون تقييد (يرى الكل)' : type === 'city' ? 'مدينة محددة' : 'فرع محدد'}
                  </span>
                </label>
              ))}
            </div>

            {scopeType === 'city' && (
              <div>
                <label className="form-label">المدينة</label>
                {cities.length > 0 ? (
                  <select
                    className="form-input"
                    value={form.assigned_city}
                    onChange={(e) => set('assigned_city', e.target.value)}
                  >
                    <option value="">— اختر مدينة —</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="form-input"
                    placeholder="أدخل اسم المدينة"
                    value={form.assigned_city}
                    onChange={(e) => set('assigned_city', e.target.value)}
                  />
                )}
                <p className="text-xs text-gray-400 mt-1">سيرى المستخدم طلاب جميع فروع هذه المدينة</p>
              </div>
            )}

            {scopeType === 'branch' && (
              <div>
                <label className="form-label">الفرع</label>
                <select
                  className="form-input"
                  value={form.assigned_branch}
                  onChange={(e) => set('assigned_branch', e.target.value)}
                >
                  <option value="">— اختر فرع —</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}{b.city ? ` — ${b.city}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">سيرى المستخدم طلاب هذا الفرع فقط</p>
              </div>
            )}
          </div>

          {/* ── Section 3: Module permissions matrix ─────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4 pb-2 border-b border-gray-100">
              صلاحيات الوحدات
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">الوحدة</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                        عرض
                      </span>
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                        تعديل
                      </span>
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                        تصدير
                      </span>
                    </th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600">
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                        استيراد
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODULES.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-700">{label}</td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-500 cursor-pointer"
                          checked={perms[key].can_view}
                          onChange={() => togglePerm(key, 'can_view')}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-green-500 cursor-pointer"
                          checked={perms[key].can_edit}
                          onChange={() => togglePerm(key, 'can_edit')}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-orange-500 cursor-pointer"
                          checked={perms[key].can_export}
                          onChange={() => togglePerm(key, 'can_export')}
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-purple-500 cursor-pointer"
                          checked={perms[key].can_import}
                          onChange={() => togglePerm(key, 'can_import')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ملاحظة: «استيراد» يفعّل عرض + تعديل + تصدير تلقائياً. «تصدير» يفعّل عرض. مدير النظام لديه صلاحية كاملة دائماً.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary px-6">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                جارٍ الحفظ...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Save size={15}/> حفظ</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
