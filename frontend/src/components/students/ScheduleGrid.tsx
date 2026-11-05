'use client';

import type { ReactNode } from 'react';
import { Coffee, Briefcase } from 'lucide-react';
import { SCHEDULE_DAYS, SCHEDULE_ROW_KIND_LABELS, shiftRows } from '@/types';
import type { BusShiftType, ScheduleDay } from '@/types';

interface Props {
  shift: BusShiftType;
  renderCell: (day: ScheduleDay, start: string) => ReactNode;
}

// جدول أسبوعي لفترة واحدة — البريك والأعمال المكتبية صفوف ثابتة بعرض الجدول، ما تنحجز
export default function ScheduleGrid({ shift, renderCell }: Props) {
  return (
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
        {shiftRows(shift).map((row) => (
          <tr key={row.start} className={row.kind === 'session' ? '' : 'bg-gray-50'}>
            <td className="text-center py-2 px-3 text-xs text-gray-400 font-mono whitespace-nowrap border-l border-gray-50" dir="ltr">
              {row.label}
            </td>
            {row.kind === 'session' ? (
              SCHEDULE_DAYS.map((d) => (
                <td key={d.value} className="p-1.5 border-l border-gray-50 last:border-l-0 align-top">
                  {renderCell(d.value, row.start)}
                </td>
              ))
            ) : (
              <td colSpan={SCHEDULE_DAYS.length} className="py-2 text-center text-xs font-semibold text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  {row.kind === 'break' ? <Coffee size={13} /> : <Briefcase size={13} />}
                  {SCHEDULE_ROW_KIND_LABELS[row.kind]}
                </span>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
