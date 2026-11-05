'use client';

import { useQuery } from '@tanstack/react-query';
import { Bus as BusIcon, MapPin, Users, Building2 } from 'lucide-react';
import { busesApi } from '@/lib/api';
import Header from '@/components/layout/Header';
import type { MyBusShift } from '@/types';

// «باصي» — السائق/مشرف الباص يرى فتراته وأسماء طلابها وعناوينهم فقط
export default function MyBusPage() {
  const { data: shifts = [], isLoading, isError } = useQuery<MyBusShift[]>({
    queryKey: ['buses', 'mine'],
    queryFn: () => busesApi.mine().then(r => r.data),
  });

  return (
    <div className="space-y-5">
      <Header title="باصي" subtitle="طلاب خط السير في فتراتك" />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : isError ? (
        <p className="card text-sm text-gray-400 text-center py-8">تعذّر تحميل بيانات الباص</p>
      ) : shifts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <BusIcon size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">لم تُسنَد لك أي فترة باص بعد</p>
          <p className="text-xs mt-1">تظهر هنا الفترات المحدد فيها كسائق أو مشرف/ة في صفحة الباصات</p>
        </div>
      ) : (
        shifts.map(s => (
          <div key={s.id} className="card space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <BusIcon size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{s.bus.brand} — {s.bus.plate_number}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 size={11} /> {s.bus.branch_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge bg-primary-50 text-primary-700 text-xs">الفترة {s.shift_display === 'صباحي' ? 'الصباحية' : 'المسائية'}</span>
                <span className="badge bg-gray-100 text-gray-600 text-xs">أنت: {s.my_role}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              السائق: {s.driver_name || '—'} · المشرف/ة: {s.supervisor_name || '—'}
            </p>

            <div>
              <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                <Users size={14} className="text-primary-600" /> الطلاب ({s.students.length})
              </p>
              {s.students.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">لا يوجد طلاب مسجّلون على هذه الفترة</p>
              ) : (
                <ol className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                  {s.students.map((st, i) => (
                    <li key={st.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span className="text-xs text-gray-400 w-5 pt-0.5 flex-shrink-0">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{st.full_name}</p>
                        {st.residence_address && (
                          <p className="text-xs text-gray-500 flex items-start gap-1 mt-0.5">
                            <MapPin size={11} className="mt-0.5 flex-shrink-0" /> {st.residence_address}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
