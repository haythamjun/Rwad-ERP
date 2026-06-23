'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Search,
  Edit, Trash2, ClipboardList,
} from 'lucide-react';
import { attendanceApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { AttendanceSheetRow, AttendanceFormData, Branch, Attendance } from '@/types';
import Header from '@/components/layout/Header';
import AttendanceModal from '@/components/students/AttendanceModal';

const today = new Date().toISOString().split('T')[0];

const STATUS_COLORS: Record<string, string> = {
  present:         'bg-green-100 text-green-700',
  absent:          'bg-red-100 text-red-700',
  late:            'bg-yellow-100 text-yellow-700',
  excused_absence: 'bg-blue-100 text-blue-700',
  early_leave:     'bg-orange-100 text-orange-700',
};

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{
    open: boolean;
    studentId?: number;
    record?: Attendance;
  }>({ open: false });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list().then((r) => r.data),
  });

  const { data: rows = [], isLoading, refetch } = useQuery<AttendanceSheetRow[]>({
    queryKey: ['attendance-sheet', selectedDate, selectedBranch, search],
    queryFn: () =>
      attendanceApi
        .sheet({ date: selectedDate, branch: selectedBranch || undefined, search: search || undefined })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const quickMarkMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: string }) =>
      attendanceApi.create(studentId, { attendance_date: selectedDate, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      toast.success('تم التسجيل');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { non_field_errors?: string[] } } })
        ?.response?.data?.non_field_errors?.[0];
      toast.error(msg === 'The fields student, attendance_date must make a unique set.'
        ? 'تم تسجيل حضور هذا الطالب مسبقاً'
        : 'حدث خطأ في التسجيل');
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ studentId, recId, data }: { studentId: number; recId?: number; data: AttendanceFormData }) =>
      recId
        ? attendanceApi.update(studentId, recId, data)
        : attendanceApi.create(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      setModal({ open: false });
      toast.success('تم الحفظ');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ studentId, recId }: { studentId: number; recId: number }) =>
      attendanceApi.delete(studentId, recId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] });
      toast.success('تم الحذف');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // Summary counts
  const total       = rows.length;
  const present     = rows.filter((r) => r.attendance?.status === 'present').length;
  const absent      = rows.filter((r) => r.attendance?.status === 'absent').length;
  const late        = rows.filter((r) => r.attendance?.status === 'late').length;
  const earlyLeave  = rows.filter((r) => r.attendance?.status === 'early_leave').length;
  const excused     = rows.filter((r) => r.attendance?.status === 'excused_absence').length;
  const notRecorded = rows.filter((r) => !r.attendance).length;

  return (
    <div className="space-y-5">
      <Header
        title="الحضور والغياب"
        subtitle="كشف الحضور اليومي"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="form-input py-1.5 px-3 text-sm w-40"
            />
          </div>
        }
      />

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Branch filter — always visible */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="form-input py-1.5 text-sm w-48 flex-shrink-0"
          >
            <option value="">جميع الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الملف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pr-9 py-1.5 text-sm"
            />
          </div>

          {/* Active filter indicator */}
          {(selectedBranch || search) && (
            <button
              onClick={() => { setSelectedBranch(''); setSearch(''); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              مسح الفلتر ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'إجمالي',       value: total,       color: 'bg-gray-50   text-gray-700'   },
          { label: 'حاضر',         value: present,     color: 'bg-green-50  text-green-700'  },
          { label: 'غائب',         value: absent,      color: 'bg-red-50    text-red-700'    },
          { label: 'متأخر',        value: late,        color: 'bg-yellow-50 text-yellow-700' },
          { label: 'انصراف مبكر',  value: earlyLeave,  color: 'bg-orange-50 text-orange-700' },
          { label: 'غياب بعذر',   value: excused,     color: 'bg-blue-50   text-blue-700'   },
          { label: 'لم يُسجَّل',   value: notRecorded, color: 'bg-purple-50 text-purple-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl px-3 py-2 text-center ${color}`}>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p>لا يوجد طلاب نشطون بهذه المعايير</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right py-3 px-4 font-medium text-gray-600">الطالب</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">الفرع</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 hidden md:table-cell">الحضور / الانصراف</th>
                  {user?.can_write && (
                    <th className="py-3 px-4 text-center font-medium text-gray-600">إجراء</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.student_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{row.student_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{row.file_number}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-500 hidden sm:table-cell text-xs">
                      {row.branch_name || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {row.attendance ? (
                        <span className={`badge text-xs px-2 py-0.5 ${STATUS_COLORS[row.attendance.status]}`}>
                          {row.attendance.status_display}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">لم يُسجَّل</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
                      {row.attendance?.check_in_time || row.attendance?.check_out_time ? (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock size={12} className="text-gray-400" />
                          {row.attendance.check_in_time?.slice(0, 5)}
                          {row.attendance.check_in_time && row.attendance.check_out_time && ' — '}
                          {row.attendance.check_out_time?.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    {user?.can_write && (
                      <td className="py-3 px-4">
                        {row.attendance ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setModal({ open: true, studentId: row.student_id, record: row.attendance! })}
                              className="btn-secondary py-1 px-2"
                              title="تعديل"
                            >
                              <Edit size={13} />
                            </button>
                            {user?.can_delete && (
                              <button
                                onClick={() => {
                                  if (confirm('حذف هذا السجل؟'))
                                    deleteMutation.mutate({ studentId: row.student_id, recId: row.attendance!.id });
                                }}
                                className="btn-danger py-1 px-2"
                                title="حذف"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => quickMarkMutation.mutate({ studentId: row.student_id, status: 'present' })}
                              disabled={quickMarkMutation.isPending}
                              className="flex items-center gap-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg px-2 py-1 transition-colors"
                              title="حاضر"
                            >
                              <CheckCircle2 size={13} /> حاضر
                            </button>
                            <button
                              onClick={() => quickMarkMutation.mutate({ studentId: row.student_id, status: 'absent' })}
                              disabled={quickMarkMutation.isPending}
                              className="flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg px-2 py-1 transition-colors"
                              title="غائب"
                            >
                              <XCircle size={13} /> غائب
                            </button>
                            <button
                              onClick={() => setModal({ open: true, studentId: row.student_id })}
                              className="flex items-center gap-1 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg px-2 py-1 transition-colors"
                              title="تسجيل تفصيلي"
                            >
                              <CalendarDays size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal.open && modal.studentId && (
        <AttendanceModal
          record={modal.record}
          onClose={() => setModal({ open: false })}
          onSave={(data) =>
            saveMutation.mutate({
              studentId: modal.studentId!,
              recId:     modal.record?.id,
              data:      { ...data, attendance_date: data.attendance_date || selectedDate },
            })
          }
          loading={saveMutation.isPending}
        />
      )}
    </div>
  );
}
