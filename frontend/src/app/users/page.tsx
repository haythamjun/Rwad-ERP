'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';
import Header from '@/components/layout/Header';
import UserFormModal from '@/components/users/UserFormModal';
import { ShieldAlert, UserPlus, Pencil, Trash2, Check, Shield } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-red-100 text-red-700',
  manager:    'bg-orange-100 text-orange-700',
  specialist: 'bg-blue-100 text-blue-700',
  reception:  'bg-green-100 text-green-700',
  viewer:     'bg-gray-100 text-gray-600',
};

export default function UsersPage() {
  const currentUser  = useAuthStore((s) => s.user);
  const queryClient  = useQueryClient();

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<User | null>(null);
  const [deleteId,    setDeleteId]    = useState<number | null>(null);
  const [apiError,    setApiError]    = useState('');

  // ── Queries / Mutations ───────────────────────────────────────────────────
  const { data, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => authApi.users().then((r) => r.data.results || r.data),
    enabled: !!currentUser?.is_admin,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => authApi.createUser(body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError:   (err: unknown) => setApiError(extractError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      authApi.updateUser(id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError:   (err: unknown) => setApiError(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => authApi.deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null); },
    onError:   (err: unknown) => setApiError(extractError(err)),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function extractError(err: unknown): string {
    if (err && typeof err === 'object' && 'response' in err) {
      const resp = (err as { response?: { data?: Record<string, unknown> } }).response;
      if (resp?.data) {
        const msgs = Object.values(resp.data).flat();
        return msgs.join(' | ');
      }
    }
    return 'حدث خطأ، يرجى المحاولة مجدداً';
  }

  function openAdd() {
    setEditTarget(null);
    setApiError('');
    setModalOpen(true);
  }
  function openEdit(u: User) {
    setEditTarget(u);
    setApiError('');
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setApiError('');
  }

  function handleSave(data: Record<string, unknown>) {
    setApiError('');
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Access guard ──────────────────────────────────────────────────────────
  if (!currentUser?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Header
        title="إدارة المستخدمين"
        subtitle="قائمة جميع مستخدمي النظام"
        actions={
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} />
            إضافة مستخدم
          </button>
        }
      />

      {/* Global API error banner */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {apiError}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['المستخدم', 'الدور', 'البريد', 'الجوال', 'الصلاحيات', 'الحالة', 'تاريخ الإنشاء', 'إجراءات'].map((h) => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data || []).map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs">
                          {u.full_name?.[0] || u.username[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.full_name || u.username}</p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role_display}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>

                    {/* Permissions summary */}
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <Shield size={12} /> كامل
                        </span>
                      ) : (u.permissions?.filter((p) => p.can_view || p.can_edit).length ?? 0) > 0 ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <Check size={12} />
                          {u.permissions!.filter((p) => p.can_view || p.can_edit).length} وحدات
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">لا صلاحيات</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? 'نشط' : 'معطّل'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(u.created_at)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="تعديل"
                        >
                          <Pencil size={14} />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data || []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      لا يوجد مستخدمون
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <UserFormModal
          user={editTarget}
          onClose={closeModal}
          onSave={handleSave}
          loading={isSaving}
        />
      )}

      {/* Delete confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center" dir="rtl">
            <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">تأكيد الحذف</h3>
            <p className="text-sm text-gray-500 mb-6">هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع.</p>
            <div className="flex gap-3">
              <button
                className="flex-1 btn-secondary"
                onClick={() => setDeleteId(null)}
              >
                إلغاء
              </button>
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
