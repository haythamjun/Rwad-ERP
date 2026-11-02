'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import { SCHEDULE_DAYS, SCHEDULE_TIME_SLOTS } from '@/types';
import type { ScheduleSlot } from '@/types';

interface Props {
  specialistId: number;
  isOwn: boolean;
}

// «جدولي» — يُبنى من خانة «الأخصائي المسؤول» بجداول الطلاب، فلا إدخال منفصل هنا
export default function SpecialistScheduleCard({ specialistId, isOwn }: Props) {
  const { data: slots = [], isLoading, isError } = useQuery<ScheduleSlot[]>({
    queryKey: ['schedule', 'specialist', specialistId],
    queryFn: () => scheduleApi.specialist(specialistId).then(r => r.data),
  });

  // الحصة الجماعية = نفس المادة بنفس اليوم والوقت لعدة طلاب — تُعرض كبطاقة واحدة
  const cellGroups = (day: string, start: string) => {
    const groups = new Map<string, ScheduleSlot[]>();
    for (const s of slots) {
      if (s.day !== day || s.start_time !== start) continue;
      groups.set(s.subject, [...(groups.get(s.subject) || []), s]);
    }
    return Array.from(groups.entries());
  };

  const sessionCount = new Set(slots.map(s => `${s.day}|${s.start_time}|${s.subject}`)).size;
  const studentCount = new Set(slots.map(s => s.student)).size;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary-600" />
          <h3 className="section-title mb-0">{isOwn ? 'جدولي' : 'جدول المختص'}</h3>
        </div>
        {slots.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="badge bg-primary-50 text-primary-700">{sessionCount} حصة أسبوعيًا</span>
            <span className="badge bg-gray-100 text-gray-600">{studentCount} مستفيد</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-gray-400 text-center py-6">تعذّر تحميل الجدول</p>
      ) : slots.length === 0 ? (
        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <CalendarClock size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لا توجد حصص مسندة بعد</p>
          <p className="text-xs mt-1">تظهر هنا الحصص المحدد فيها هذا المختص كـ«الأخصائي المسؤول» بجداول الطلاب</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs w-28">الوقت</th>
                {SCHEDULE_DAYS.map((d) => (
                  <th key={d.value} className="text-center py-3 px-3 font-medium text-gray-600 min-w-[140px]">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {SCHEDULE_TIME_SLOTS.map((t) => (
                <tr key={t.start}>
                  <td className="text-center py-2 px-3 text-xs text-gray-400 font-mono whitespace-nowrap border-l border-gray-50" dir="ltr">
                    {t.label}
                  </td>
                  {SCHEDULE_DAYS.map((d) => (
                    <td key={d.value} className="p-1.5 border-l border-gray-50 last:border-l-0 align-top">
                      <div className="space-y-1">
                        {cellGroups(d.value, t.start).map(([subject, group]) => (
                          <div key={subject} className="bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-semibold text-primary-800 truncate">{subject}</p>
                            {group.map(s => (
                              <Link
                                key={s.id}
                                href={`/students/${s.student}?tab=schedule`}
                                className="block text-[11px] text-primary-600 hover:underline truncate mt-0.5"
                              >
                                {s.student_name}
                              </Link>
                            ))}
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
