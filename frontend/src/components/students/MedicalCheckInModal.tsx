'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Save, Clock, HeartPulse } from 'lucide-react';
import { medicalApi } from '@/lib/api';
import type { Medication, DailyMedicalCheckIn } from '@/types';

interface Props {
  studentId: number;
  studentName: string;
  date: string;
  checkin?: DailyMedicalCheckIn | null;
  onClose: () => void;
  onSave: (data: {
    check_date: string; check_time: string;
    blood_pressure_systolic: number | null; blood_pressure_diastolic: number | null;
    blood_sugar: number | null; weight_kg: number | null; temperature: number | null; pulse: number | null;
    notes: string;
    medication_records: { medication: number; given: boolean; given_at: string | null; notes: string }[];
  }) => void;
  loading?: boolean;
}

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

export default function MedicalCheckInModal({ studentId, studentName, date, checkin, onClose, onSave, loading }: Props) {
  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: ['medications', studentId],
    queryFn: () => medicalApi.medications.list(studentId).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
  });
  const activeMeds = medications.filter(m => m.is_active);

  const [checkTime, setCheckTime] = useState(checkin?.check_time?.slice(0, 5) || nowTime());
  const [notes, setNotes] = useState(checkin?.notes || '');
  const [given, setGiven] = useState<Record<number, { given: boolean; given_at: string; notes: string }>>({});

  const [systolic, setSystolic]   = useState(checkin?.blood_pressure_systolic != null ? String(checkin.blood_pressure_systolic) : '');
  const [diastolic, setDiastolic] = useState(checkin?.blood_pressure_diastolic != null ? String(checkin.blood_pressure_diastolic) : '');
  const [bloodSugar, setBloodSugar] = useState(checkin?.blood_sugar != null ? String(checkin.blood_sugar) : '');
  const [weight, setWeight]       = useState(checkin?.weight_kg != null ? String(checkin.weight_kg) : '');
  const [temperature, setTemperature] = useState(checkin?.temperature != null ? String(checkin.temperature) : '');
  const [pulse, setPulse]         = useState(checkin?.pulse != null ? String(checkin.pulse) : '');

  useEffect(() => {
    const initial: Record<number, { given: boolean; given_at: string; notes: string }> = {};
    for (const m of activeMeds) {
      const existing = checkin?.medication_records.find(r => r.medication === m.id);
      initial[m.id] = {
        given: existing?.given ?? false,
        given_at: existing?.given_at?.slice(0, 5) || '',
        notes: existing?.notes || '',
      };
    }
    setGiven(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications.length, checkin]);

  const submit = () => {
    onSave({
      check_date: date,
      check_time: checkTime,
      blood_pressure_systolic:  numOrNull(systolic),
      blood_pressure_diastolic: numOrNull(diastolic),
      blood_sugar: numOrNull(bloodSugar),
      weight_kg:   numOrNull(weight),
      temperature: numOrNull(temperature),
      pulse:       numOrNull(pulse),
      notes,
      medication_records: activeMeds.map(m => ({
        medication: m.id,
        given: given[m.id]?.given ?? false,
        given_at: given[m.id]?.given_at || null,
        notes: given[m.id]?.notes || '',
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-800">{checkin ? 'تعديل التشيك إن الطبي' : 'تشيك إن طبي'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{studentName} — {date}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label flex items-center gap-1"><Clock size={12}/> وقت الوصول</label>
            <input type="time" dir="ltr" className="form-input max-w-[160px]" value={checkTime} onChange={e => setCheckTime(e.target.value)} />
          </div>

          {/* القياسات الأساسية */}
          <div>
            <label className="form-label flex items-center gap-1"><HeartPulse size={12}/> القياسات الأساسية</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ضغط الدم</label>
                <div className="flex items-center gap-1" dir="ltr">
                  <input type="number" min="0" className="form-input py-1.5 text-sm" placeholder="120" value={systolic} onChange={e => setSystolic(e.target.value)} />
                  <span className="text-gray-300">/</span>
                  <input type="number" min="0" className="form-input py-1.5 text-sm" placeholder="80" value={diastolic} onChange={e => setDiastolic(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">سكر الدم</label>
                <input type="number" min="0" dir="ltr" className="form-input py-1.5 text-sm" value={bloodSugar} onChange={e => setBloodSugar(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الوزن (كجم)</label>
                <input type="number" min="0" dir="ltr" className="form-input py-1.5 text-sm" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">درجة الحرارة</label>
                <input type="number" min="0" step="0.1" dir="ltr" className="form-input py-1.5 text-sm" value={temperature} onChange={e => setTemperature(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">النبض</label>
                <input type="number" min="0" dir="ltr" className="form-input py-1.5 text-sm" value={pulse} onChange={e => setPulse(e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">الأدوية</label>
            {activeMeds.length === 0 ? (
              <p className="text-gray-400 text-sm py-3">لا توجد أدوية نشطة مسجّلة لهذا الطالب</p>
            ) : (
              <div className="space-y-2">
                {activeMeds.map(m => (
                  <div key={m.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{m.name}</p>
                        <p className="text-xs text-gray-500">{[m.dose, m.frequency].filter(Boolean).join(' — ') || '—'}</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                        <span className="text-xs text-gray-600">أُعطي</span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary-600"
                          checked={given[m.id]?.given ?? false}
                          onChange={e => setGiven(g => ({ ...g, [m.id]: { ...g[m.id], given: e.target.checked } }))}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 flex-shrink-0" dir="ltr">
                        <Clock size={13} className="text-gray-400" />
                        <input
                          type="time"
                          className="form-input py-1.5 text-xs w-28"
                          value={given[m.id]?.given_at || ''}
                          onChange={e => setGiven(g => ({ ...g, [m.id]: { ...g[m.id], given_at: e.target.value } }))}
                        />
                      </div>
                      <input
                        className="form-input py-1.5 text-xs flex-1"
                        placeholder="ملاحظة (اختياري)"
                        value={given[m.id]?.notes || ''}
                        onChange={e => setGiven(g => ({ ...g, [m.id]: { ...g[m.id], notes: e.target.value } }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">ملاحظات عامة</label>
            <textarea rows={2} className="form-input resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="حالة الطالب عند الوصول..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="button" onClick={submit} disabled={loading} className="btn-primary">
              {loading ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
