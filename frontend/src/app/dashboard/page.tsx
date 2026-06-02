'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, Clock, UserX, TrendingUp, FileText } from 'lucide-react';
import { studentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { PaginatedResponse, Student } from '@/types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function StatCard({ title, value, icon, color, bg }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: studentsData } = useQuery<PaginatedResponse<Student>>({
    queryKey: ['students', 'all'],
    queryFn: () => studentsApi.list({ page_size: 1000 }).then((r) => r.data),
  });

  const students = studentsData?.results || [];
  const total = studentsData?.count || 0;

  const active = students.filter((s) => s.status === 'active').length;
  const pending = students.filter((s) => s.status === 'pending').length;
  const graduated = students.filter((s) => s.status === 'graduated').length;
  const inactive = students.filter((s) => s.status === 'inactive').length;

  const recent = students
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card bg-gradient-to-r from-brand to-brand-light text-white border-0">
        <h2 className="text-lg font-semibold">
          مرحباً، {user?.full_name} 👋
        </h2>
        <p className="text-white/80 text-sm mt-1">
          نظام Roya - رؤية | مركز التأهيل — {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="xl:col-span-1">
          <StatCard title="إجمالي الطلاب" value={total} icon={<Users size={22} />} color="text-primary-600" bg="bg-primary-50" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="نشط" value={active} icon={<UserCheck size={22} />} color="text-green-600" bg="bg-green-50" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="في الانتظار" value={pending} icon={<Clock size={22} />} color="text-yellow-600" bg="bg-yellow-50" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="خرّيج" value={graduated} icon={<TrendingUp size={22} />} color="text-blue-600" bg="bg-blue-50" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="غير نشط" value={inactive} icon={<UserX size={22} />} color="text-gray-600" bg="bg-gray-100" />
        </div>
        <div className="xl:col-span-1">
          <StatCard title="إجمالي الملفات" value={total} icon={<FileText size={22} />} color="text-purple-600" bg="bg-purple-50" />
        </div>
      </div>

      {/* Recent students */}
      <div className="card">
        <h3 className="section-title">آخر الطلاب المضافين</h3>
        {recent.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">لا توجد بيانات بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 font-medium text-gray-500">رقم الملف</th>
                  <th className="text-right py-2 font-medium text-gray-500">الاسم</th>
                  <th className="text-right py-2 font-medium text-gray-500">الجنسية</th>
                  <th className="text-right py-2 font-medium text-gray-500">الحالة</th>
                  <th className="text-right py-2 font-medium text-gray-500">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-gray-600">{s.file_number}</td>
                    <td className="py-2.5 font-medium text-gray-800">{s.full_name}</td>
                    <td className="py-2.5 text-gray-600">{s.nationality}</td>
                    <td className="py-2.5">
                      <StatusBadge status={s.status} label={s.status_display} />
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">{s.registration_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, string> = {
    active:      'badge bg-green-100 text-green-700',
    inactive:    'badge bg-gray-100 text-gray-600',
    pending:     'badge bg-yellow-100 text-yellow-700',
    graduated:   'badge bg-blue-100 text-blue-700',
    suspended:   'badge bg-red-100 text-red-700',
    transferred: 'badge bg-purple-100 text-purple-700',
  };
  return <span className={map[status] || 'badge bg-gray-100 text-gray-600'}>{label}</span>;
}
