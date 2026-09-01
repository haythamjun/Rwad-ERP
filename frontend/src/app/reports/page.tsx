'use client';

import Link from 'next/link';
import { CalendarDays, Stethoscope, ListChecks, Users, ShieldAlert, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/layout/Header';

const CARDS = [
  {
    href: '/reports/attendance',
    label: 'تقرير الحضور والانصراف',
    description: 'إحصائيات الحضور والغياب لكل طالب عبر مدى تاريخي',
    icon: CalendarDays,
    active: true,
  },
  {
    href: '#',
    label: 'التقرير الطبي',
    description: 'ملخص الحالة الطبية والتشيك إن اليومي',
    icon: Stethoscope,
    active: false,
  },
  {
    href: '#',
    label: 'تقرير المقاييس والخطط الدراسية',
    description: 'تقدّم الطلاب في المقاييس والخطط الفردية',
    icon: ListChecks,
    active: false,
  },
  {
    href: '#',
    label: 'تقرير الطلاب العام',
    description: 'إحصائيات شاملة عن المستفيدين والفروع',
    icon: Users,
    active: false,
  },
];

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const canView = user?.is_admin || user?.permissions?.some((p) => p.module === 'reports' && p.can_view);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="التقارير" subtitle="اختر تقريرًا لعرضه" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map(({ href, label, description, icon: Icon, active }) => {
          const content = (
            <div
              className={`card h-full transition-all ${
                active ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                  <Icon size={20} className="text-primary-600" />
                </div>
                {!active && (
                  <span className="flex items-center gap-1 badge text-xs bg-gray-100 text-gray-500">
                    <Lock size={10} /> قريبًا
                  </span>
                )}
              </div>
              <h3 className="font-bold text-gray-800 mb-1">{label}</h3>
              <p className="text-xs text-gray-400">{description}</p>
            </div>
          );

          return active ? (
            <Link key={label} href={href}>{content}</Link>
          ) : (
            <div key={label}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
