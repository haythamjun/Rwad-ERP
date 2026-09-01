'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowRight, Download, CalendarDays, Users, CheckCircle2, XCircle,
  Clock, ShieldAlert,
} from 'lucide-react';
import { reportsApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { downloadBlob } from '@/lib/utils';
import type { AttendanceReport, Branch } from '@/types';
import Header from '@/components/layout/Header';

const todayStr = () => new Date().toISOString().split('T')[0];
const monthStartStr = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: any; tone: string }) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}>
          <Icon size={16} />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800 leading-tight">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceReportPage() {
  const user = useAuthStore((s) => s.user);
  const canView = user?.is_admin || user?.permissions?.some((p) => p.module === 'reports' && p.can_view);

  const [dateFrom, setDateFrom] = useState(monthStartStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [branch, setBranch] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list().then((r) => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });

  const { data: report, isLoading } = useQuery<AttendanceReport>({
    queryKey: ['attendance-report', dateFrom, dateTo, branch],
    queryFn: () =>
      reportsApi
        .attendance({ date_from: dateFrom, date_to: dateTo, branch: branch || undefined })
        .then((r) => r.data),
    enabled: !!canView && !!dateFrom && !!dateTo,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.attendanceExport({ date_from: dateFrom, date_to: dateTo, branch: branch || undefined });
      downloadBlob(res.data, `attendance_report_${dateFrom}_${dateTo}.xlsx`);
      toast.success('تم تصدير التقرير بنجاح');
    } catch {
      toast.error('حدث خطأ في التصدير');
    } finally {
      setExporting(false);
    }
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  const s = report?.summary;

  return (
    <div className="space-y-6">
      <Header title="تقرير الحضور والانصراف" subtitle="إحصائيات مجمّعة عبر مدى تاريخي محدد" />

      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700">
        <ArrowRight size={15} /> العودة إلى التقارير
      </Link>

      <div className="card">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="form-label">من تاريخ</label>
            <input type="date" dir="ltr" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo} />
          </div>
          <div>
            <label className="form-label">إلى تاريخ</label>
            <input type="date" dir="ltr" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} max={todayStr()} />
          </div>
          <div className="min-w-[180px]">
            <label className="form-label">الفرع</label>
            <select className="form-input" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">كل الفروع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || isLoading || !report?.by_student.length}
            className="btn-secondary disabled:opacity-50"
          >
            {exporting ? 'جارٍ التصدير...' : <><Download size={14} /> تصدير Excel</>}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : !s || s.total === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <CalendarDays size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا توجد سجلات حضور في هذه الفترة</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="عدد الطلاب" value={s.student_count} icon={Users} tone="bg-primary-50 text-primary-600" />
            <StatCard label="نسبة الحضور" value={`${s.attendance_rate}%`} icon={CheckCircle2} tone="bg-green-50 text-green-600" />
            <StatCard label="حاضر" value={s.present} icon={CheckCircle2} tone="bg-green-50 text-green-600" />
            <StatCard label="غائب" value={s.absent} icon={XCircle} tone="bg-red-50 text-red-600" />
            <StatCard label="متأخر" value={s.late} icon={Clock} tone="bg-yellow-50 text-yellow-600" />
            <StatCard label="غياب بعذر / انصراف مبكر" value={s.excused_absence + s.early_leave} icon={CalendarDays} tone="bg-blue-50 text-blue-600" />
          </div>

          <div className="card overflow-x-auto">
            <h3 className="section-title">التفصيل حسب الطالب</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 px-2 font-medium">الطالب</th>
                  <th className="py-2 px-2 font-medium">الفرع</th>
                  <th className="py-2 px-2 font-medium text-center">حاضر</th>
                  <th className="py-2 px-2 font-medium text-center">غائب</th>
                  <th className="py-2 px-2 font-medium text-center">متأخر</th>
                  <th className="py-2 px-2 font-medium text-center">غياب بعذر</th>
                  <th className="py-2 px-2 font-medium text-center">انصراف مبكر</th>
                  <th className="py-2 px-2 font-medium text-center">الإجمالي</th>
                  <th className="py-2 px-2 font-medium text-center">نسبة الحضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report!.by_student.map((row) => (
                  <tr key={row.student_id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-2">
                      <Link href={`/students/${row.student_id}`} className="font-medium text-gray-800 hover:text-primary-600">
                        {row.student_name}
                      </Link>
                      <p className="text-xs text-gray-400">{row.file_number}</p>
                    </td>
                    <td className="py-2.5 px-2 text-gray-500">{row.branch_name || '—'}</td>
                    <td className="py-2.5 px-2 text-center text-green-600 font-medium">{row.present}</td>
                    <td className="py-2.5 px-2 text-center text-red-600 font-medium">{row.absent}</td>
                    <td className="py-2.5 px-2 text-center text-yellow-600 font-medium">{row.late}</td>
                    <td className="py-2.5 px-2 text-center text-blue-600">{row.excused_absence}</td>
                    <td className="py-2.5 px-2 text-center text-orange-600">{row.early_leave}</td>
                    <td className="py-2.5 px-2 text-center text-gray-600">{row.total}</td>
                    <td className="py-2.5 px-2 text-center font-semibold text-gray-800">{row.attendance_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
