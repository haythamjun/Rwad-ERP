'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, specialistAssignmentsApi } from '@/lib/api';
import { DEPARTMENTS } from '@/types';
import type { StudentSpecialistAssignment, User } from '@/types';

interface Props {
  studentId: number;
  assignments: StudentSpecialistAssignment[];
  canEdit: boolean;
}

export default function SpecialistAssignmentsCard({ studentId, assignments, canEdit }: Props) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const a of assignments) map[a.department] = String(a.specialist);
    setSelected(map);
  }, [assignments]);

  // فلترة القسم في الخادم تُرجع القائمة كاملة بلا ترقيم — بدونها نأخذ أول 20 مستخدم فقط
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users', 'by-department'],
    queryFn: () => Promise.all(
      DEPARTMENTS.map(d => authApi.users({ department: d.value })
        .then(r => { const data = r.data; return (Array.isArray(data) ? data : (data.results ?? [])) as User[]; })),
    ).then(lists => lists.flat()),
    enabled: canEdit,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, number | null> = {};
      for (const d of DEPARTMENTS) payload[d.value] = selected[d.value] ? Number(selected[d.value]) : null;
      return specialistAssignmentsApi.set(studentId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', String(studentId)] });
      toast.success('تم حفظ تكليفات الأخصائيين');
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  });

  const usersByDept = (dept: string) => users.filter(u => u.department === dept);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users2 size={16} className="text-primary-600" />
          <h3 className="section-title mb-0">تكليفات الأخصائيين</h3>
        </div>
        {canEdit && (
          <button
            className="btn-primary py-1.5 px-3 text-xs"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={13} /> {saveMutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEPARTMENTS.map((d) => {
          const current = assignments.find(a => a.department === d.value);
          if (!canEdit) {
            return (
              <div key={d.value}>
                <p className="text-xs text-gray-500 mb-1">{d.label}</p>
                <p className="text-sm font-medium text-gray-800">{current?.specialist_name || '—'}</p>
              </div>
            );
          }
          return (
            <div key={d.value}>
              <label className="form-label">{d.label}</label>
              <select
                className="form-input"
                value={selected[d.value] || ''}
                onChange={(e) => setSelected(s => ({ ...s, [d.value]: e.target.value }))}
              >
                <option value="">-- بدون مختص --</option>
                {usersByDept(d.value).map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
