'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Award, Users2, Plus, Trash2, Paperclip, ShieldAlert } from 'lucide-react';
import { authApi, certificatesApi, studentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate, mediaUrl } from '@/lib/utils';
import { DEPARTMENTS } from '@/types';
import type { User, SpecialistCertificate, Student, PaginatedResponse } from '@/types';
import Header from '@/components/layout/Header';
import CertificateModal from '@/components/users/CertificateModal';

export default function SpecialistDashboardPage() {
  const { slug, specialistId } = useParams<{ slug: string; specialistId: string }>();
  const currentUser = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [certModalOpen, setCertModalOpen] = useState(false);

  const dept = DEPARTMENTS.find(d => d.value === slug);
  const canEdit = !!currentUser && (currentUser.is_admin || currentUser.id === Number(specialistId));

  const { data: directory = [] } = useQuery<User[]>({
    queryKey: ['users', 'department', slug],
    queryFn: () => authApi.users({ department: slug }).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: !!dept,
  });
  const specialist = directory.find(u => u.id === Number(specialistId));

  const { data: certificates = [], isLoading: certsLoading } = useQuery<SpecialistCertificate[]>({
    queryKey: ['certificates', specialistId],
    queryFn: () => certificatesApi.list({ specialist: specialistId }).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: beneficiaries, isError: beneficiariesForbidden, isLoading: beneficiariesLoading } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students', 'caseload', specialistId, slug],
    queryFn: () => studentsApi.list({ specialist: specialistId, department: slug }).then(r => r.data),
    retry: false,
  });

  const createCertMutation = useMutation({
    mutationFn: (data: FormData) => certificatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates', specialistId] });
      setCertModalOpen(false);
      toast.success('تمت إضافة الشهادة');
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const deleteCertMutation = useMutation({
    mutationFn: (id: number) => certificatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates', specialistId] });
      toast.success('تم حذف الشهادة');
    },
  });

  if (!dept) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">قسم غير معروف</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title={specialist?.full_name || specialist?.username || 'لوحة المختص'}
        subtitle={`${dept.label} — ${specialist?.role_display || ''}`}
      />

      {/* ملف الإنجاز المهني */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-primary-600" />
            <h3 className="section-title mb-0">ملف الإنجاز المهني</h3>
          </div>
          {canEdit && (
            <button className="btn-primary py-1.5 px-3 text-xs" onClick={() => setCertModalOpen(true)}>
              <Plus size={13} /> إضافة شهادة
            </button>
          )}
        </div>

        {certsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : certificates.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <Award size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لا توجد شهادات أو دورات مسجّلة بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {certificates.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{c.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.issuing_body && `${c.issuing_body} — `}
                    {c.date ? formatDate(c.date) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={mediaUrl(c.file) || '#'} target="_blank" rel="noopener noreferrer" className="btn-secondary py-1 px-2">
                    <Paperclip size={14} />
                  </a>
                  {canEdit && (
                    <button
                      onClick={() => confirm('حذف هذه الشهادة؟') && deleteCertMutation.mutate(c.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* قائمة المستفيدين */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Users2 size={18} className="text-primary-600" />
          <h3 className="section-title mb-0">المستفيدون المسندون</h3>
        </div>

        {beneficiariesForbidden ? (
          <p className="text-sm text-gray-400 text-center py-6">لا تملك صلاحية عرض عهدة هذا المختص</p>
        ) : beneficiariesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : (beneficiaries?.results || []).length === 0 ? (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <Users2 size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لا يوجد مستفيدون مسندون بهذا القسم بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(beneficiaries?.results || []).map(s => (
              <Link
                key={s.id}
                href={`/students/${s.id}?tab=quarterly_plans`}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <p className="font-semibold text-gray-800">{s.full_name}</p>
                <span className="badge text-xs bg-gray-100 text-gray-600">{s.file_number}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {certModalOpen && (
        <CertificateModal
          onClose={() => setCertModalOpen(false)}
          onSave={(data) => {
            data.append('specialist', specialistId);
            createCertMutation.mutate(data);
          }}
          loading={createCertMutation.isPending}
        />
      )}
    </div>
  );
}
