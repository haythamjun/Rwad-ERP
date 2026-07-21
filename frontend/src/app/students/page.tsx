'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Download, Filter, ChevronRight, ChevronLeft, Upload, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { downloadBlob, STATUS_COLORS } from '@/lib/utils';
import type { PaginatedResponse, Student, StudentFilters } from '@/types';
import Header from '@/components/layout/Header';
import ImportModal from '@/components/students/ImportModal';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'في الانتظار' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'graduated', label: 'خرّيج' },
  { value: 'suspended', label: 'موقوف' },
  { value: 'transferred', label: 'محوّل' },
  { value: 'rejected', label: 'مرفوض' },
];

const DISABILITY_OPTIONS = [
  { value: '',             label: 'كل الإعاقات' },
  { value: 'intellectual', label: 'إعاقة ذهنية' },
  { value: 'autism',       label: 'طيف التوحد' },
  { value: 'down',         label: 'متلازمة داون' },
  { value: 'physical',     label: 'إعاقة حركية' },
  { value: 'hearing',      label: 'إعاقة سمعية' },
  { value: 'visual',       label: 'إعاقة بصرية' },
  { value: 'speech',       label: 'لغوية / نطقية' },
  { value: 'learning',     label: 'صعوبات تعلم' },
  { value: 'behavioral',   label: 'اضطراب سلوكي' },
  { value: 'multiple',     label: 'إعاقة مركّبة' },
  { value: 'other',        label: 'أخرى' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'الجنس' },
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
];

export default function StudentsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<StudentFilters>({ page: 1 });
  const [exporting, setExporting] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<'excel' | 'csv'>('excel');

  const studentsPerm = user?.permissions?.find((p) => p.module === 'students');
  const canExport = user?.is_admin || studentsPerm?.can_export === true;
  const canImport = user?.is_admin || studentsPerm?.can_import === true;

  const { data, isLoading } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students', filters],
    queryFn: () =>
      studentsApi
        .list({
          search: filters.search || undefined,
          status:          filters.status          || undefined,
          gender:          filters.gender          || undefined,
          disability_type: filters.disability_type || undefined,
          page: filters.page,
        })
        .then((r) => r.data),
  });

  const students = data?.results || [];
  const totalPages = Math.ceil((data?.count || 0) / 20);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await studentsApi.export();
      downloadBlob(res.data, `students_${Date.now()}.xlsx`);
      toast.success('تم تصدير الملف بنجاح');
    } catch {
      toast.error('حدث خطأ في التصدير');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await studentsApi.exportCsv();
      downloadBlob(res.data, `students_${Date.now()}.csv`);
      toast.success('تم تصدير ملف CSV بنجاح');
    } catch {
      toast.error('حدث خطأ في التصدير');
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="ملفات الطلاب"
        subtitle={`إجمالي ${data?.count ?? 0} طالب`}
        actions={
          <>
            {canExport && (
              <>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="btn-secondary"
                >
                  <Download size={16} />
                  {exporting ? 'جارٍ التصدير...' : 'تصدير Excel'}
                </button>
                <button
                  onClick={handleExportCsv}
                  disabled={exportingCsv}
                  className="btn-secondary"
                >
                  <Download size={16} />
                  {exportingCsv ? 'جارٍ التصدير...' : 'تصدير CSV'}
                </button>
              </>
            )}
            {canImport && (
              <>
                <button
                  onClick={() => { setImportFormat('excel'); setImportOpen(true); }}
                  className="btn-secondary"
                >
                  <Upload size={16} />
                  استيراد Excel
                </button>
                <button
                  onClick={() => { setImportFormat('csv'); setImportOpen(true); }}
                  className="btn-secondary"
                >
                  <Upload size={16} />
                  استيراد CSV
                </button>
              </>
            )}
            {user?.can_delete && (
              <Link href="/students/rejected" className="btn-secondary text-rose-600 border-rose-200 hover:bg-rose-50">
                <XCircle size={16} />
                المرفوضون
              </Link>
            )}
            {user?.can_write && (
              <Link href="/students/new" className="btn-primary">
                <Plus size={16} />
                إضافة طالب
              </Link>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهوية أو رقم الملف..."
              className="form-input pr-9"
              value={filters.search || ''}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value, page: 1 })
              }
            />
          </div>
          <select
            className="form-input w-40"
            value={filters.status || ''}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value as StudentFilters['status'], page: 1 })
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="form-input w-44"
            value={filters.disability_type || ''}
            onChange={(e) =>
              setFilters({ ...filters, disability_type: e.target.value as StudentFilters['disability_type'], page: 1 })
            }
          >
            {DISABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className="form-input w-32"
            value={filters.gender || ''}
            onChange={(e) =>
              setFilters({ ...filters, gender: e.target.value as StudentFilters['gender'], page: 1 })
            }
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(filters.search || filters.status || filters.gender) && (
            <button
              className="btn-secondary"
              onClick={() => setFilters({ page: 1 })}
            >
              <Filter size={14} />
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">لا توجد نتائج مطابقة</p>
            {user?.can_write && (
              <Link href="/students/new" className="btn-primary mt-4 inline-flex">
                <Plus size={16} /> إضافة أول طالب
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['رقم الملف', 'الاسم الكامل', 'رقم الهوية', 'الجنسية', 'الحالة', 'تاريخ التسجيل', 'ولي الأمر', ''].map(
                    (h) => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {student.file_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">
                          {student.full_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.full_name}</p>
                          <p className="text-xs text-gray-400">{student.gender_display} — {student.age} سنة</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.national_id}</td>
                    <td className="px-4 py-3 text-gray-600">{student.nationality}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_COLORS[student.status] || 'bg-gray-100 text-gray-600'}`}>
                        {student.status_display}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{student.registration_date}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {student.primary_guardian ? (
                        <div>
                          <p>{student.primary_guardian.name}</p>
                          <p className="text-gray-400">{student.primary_guardian.phone}</p>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${student.id}`}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Import Modal */}
        {importOpen && (
          <ImportModal
            format={importFormat}
            onClose={() => setImportOpen(false)}
            onDone={() => {
              queryClient.invalidateQueries({ queryKey: ['students'] });
              setImportOpen(false);
            }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              صفحة {filters.page} من {totalPages} — {data?.count} طالب
            </p>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary py-1 px-2 text-xs"
                disabled={(filters.page || 1) <= 1}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              >
                <ChevronRight size={14} />
              </button>
              <button
                className="btn-secondary py-1 px-2 text-xs"
                disabled={(filters.page || 1) >= totalPages}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
