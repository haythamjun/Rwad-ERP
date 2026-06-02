'use client';

import { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentsApi } from '@/lib/api';
import { downloadBlob } from '@/lib/utils';

interface ImportError {
  row: number;
  name: string;
  errors: string[];
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportError[];
}

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export default function ImportModal({ onClose, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await studentsApi.importTemplate();
      downloadBlob(res.data, 'import_template_roya.xlsx');
      toast.success('تم تحميل القالب');
    } catch {
      toast.error('فشل تحميل القالب');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف Excel');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await studentsApi.importExcel(formData);
      setResult(res.data);
      if (res.data.created > 0) {
        onDone();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'فشل الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary-600" />
            <h3 className="font-semibold text-gray-800">استيراد بيانات من Excel</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* الخطوات */}
          {!result && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
              <p className="font-semibold mb-2">كيفية الاستيراد:</p>
              <p>١. حمّل القالب وافتحه في Excel</p>
              <p>٢. أضف بيانات الطلاب ابتداءً من الصف الثاني</p>
              <p>٣. احفظ الملف واستورده هنا</p>
              <p className="text-blue-600 mt-1">الحقول المطلوبة: الاسم، رقم الهوية، تاريخ الميلاد، الجنس، الجنسية</p>
            </div>
          )}

          {/* تحميل القالب */}
          {!result && (
            <button
              onClick={handleTemplate}
              disabled={downloadingTemplate}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-primary-300 rounded-xl text-primary-700 hover:bg-primary-50 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              {downloadingTemplate ? 'جارٍ التحميل...' : 'تحميل قالب Excel الجاهز'}
            </button>
          )}

          {/* اختيار الملف */}
          {!result && (
            <div>
              <label className="form-label">ملف Excel <span className="text-red-500">*</span></label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-gray-50 transition-colors"
              >
                <Upload size={28} className="text-gray-300" />
                {file ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">انقر لاختيار الملف</p>
                    <p className="text-xs text-gray-400 mt-0.5">xlsx, xls</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          )}

          {/* نتيجة الاستيراد */}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                  <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{result.created}</p>
                    <p className="text-xs text-green-600">طالب تم استيراده</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                  <AlertCircle size={22} className="text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-red-500">{result.skipped}</p>
                    <p className="text-xs text-red-400">صف تم تخطيه</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">تفاصيل الأخطاء:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.errors.map((e) => (
                      <div key={e.row} className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs font-semibold text-red-700">
                          الصف {e.row} — {e.name}
                        </p>
                        {e.errors.map((msg, i) => (
                          <p key={i} className="text-xs text-red-500 mt-0.5">• {msg}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary">
            {result ? 'إغلاق' : 'إلغاء'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={loading || !file}
              className="btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  جارٍ الاستيراد...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload size={15} /> بدء الاستيراد
                </span>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
