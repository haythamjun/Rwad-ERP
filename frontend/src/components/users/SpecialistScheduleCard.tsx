'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { scheduleApi } from '@/lib/api';
import { SCHEDULE_DAYS, SCHEDULE_SHIFTS, shiftSessions, scheduleTimeLabel } from '@/types';
import type { BusShiftType, ScheduleSlot } from '@/types';
import ScheduleGrid from '@/components/students/ScheduleGrid';

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

  // المختص قد يشتغل الفترتين — كل حصة تظهر بفترة وقتها
  const shiftOf = (start: string): BusShiftType | null =>
    SCHEDULE_SHIFTS.find(sh => shiftSessions(sh.value).some(r => r.start === start))?.value ?? null;
  const countIn = (shift: BusShiftType) => slots.filter(s => shiftOf(s.start_time) === shift).length;
  const outside = slots.filter(s => shiftOf(s.start_time) === null);

  const [shift, setShift] = useState<BusShiftType>('morning');
  useEffect(() => {
    // افتح الفترة اللي فيها حصص، لو الصباحية فاضية
    if (slots.length && countIn('morning') === 0 && countIn('evening') > 0) setShift('evening');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

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
        <div className="space-y-3">
          <div className="flex gap-2">
            {SCHEDULE_SHIFTS.map(sh => {
              const active = sh.value === shift;
              return (
                <button
                  key={sh.value}
                  onClick={() => setShift(sh.value)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                    active ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400'
                  }`}
                >
                  {sh.label} <span className={`text-xs ${active ? 'text-white/80' : 'text-gray-400'}`}>({countIn(sh.value)})</span>
                </button>
              );
            })}
          </div>
          <div className="overflow-x-auto -mx-2">
            <ScheduleGrid
              shift={shift}
              renderCell={(day, start) => (
                <div className="space-y-1">
                  {cellGroups(day, start).map(([subject, group]) => (
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
              )}
            />
          </div>
          {outside.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-sm font-semibold text-amber-800 mb-2">حصص خارج أوقات الحصص المعتمدة ({outside.length})</p>
              <div className="flex flex-wrap gap-2">
                {outside.map(s => (
                  <Link
                    key={s.id}
                    href={`/students/${s.student}?tab=schedule`}
                    className="bg-white border border-amber-200 hover:border-amber-400 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-gray-800">{s.subject}</span>
                    <span className="text-gray-500"> — {s.student_name} — {SCHEDULE_DAYS.find(d => d.value === s.day)?.label} </span>
                    <span className="font-mono text-gray-500" dir="ltr">{scheduleTimeLabel(s.start_time)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
