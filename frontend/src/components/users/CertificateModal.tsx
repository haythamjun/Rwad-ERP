'use client';

import { useState } from 'react';
import { X, Save, Upload } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSave: (data: FormData) => void;
  loading?: boolean;
}

export default function CertificateModal({ onClose, onSave, loading }: Props) {
  const [title, setTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const submit = () => {
    if (!title.trim() || !file) return;
    const data = new FormData();
    data.append('title', title.trim());
    if (issuingBody.trim()) data.append('issuing_body', issuingBody.trim());
    if (date) data.append('date', date);
    data.append('file', file);
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">إضافة شهادة / دورة تدريبية</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">عنوان الشهادة / الدورة</label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="form-label">الجهة المانحة</label>
            <input className="form-input" value={issuingBody} onChange={e => setIssuingBody(e.target.value)} />
          </div>
          <div>
            <label className="form-label">التاريخ</label>
            <input type="date" dir="ltr" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">الملف</label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-primary-300 text-sm text-gray-500">
              <Upload size={16} />
              {file ? file.name : 'اختر ملف...'}
              <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
          <button type="button" disabled={loading || !title.trim() || !file} onClick={submit} className="btn-primary">
            {loading ? 'جارٍ الحفظ...' : <><Save size={15} /> حفظ</>}
          </button>
        </div>
      </div>
    </div>
  );
}
