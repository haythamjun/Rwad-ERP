'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowRight, Edit, Trash2, Plus, Phone, Mail, MapPin,
  User, Users, Home, Paperclip, AlertCircle, Upload, FileText, X,
} from 'lucide-react';
import { studentsApi, guardiansApi, familyApi, attachmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate, STATUS_COLORS } from '@/lib/utils';
import type { Student, Guardian, FamilyInfo, GuardianFormData, FamilyFormData } from '@/types';
import Header from '@/components/layout/Header';
import GuardianModal from '@/components/students/GuardianModal';
import FamilyModal from '@/components/students/FamilyModal';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [guardianModal, setGuardianModal] = useState<{ open: boolean; guardian?: Guardian }>({ open: false });
  const [familyModal, setFamilyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'guardians' | 'family' | 'attachments'>('info');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachType, setAttachType] = useState('');
  const [attachName, setAttachName] = useState('');

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => studentsApi.detail(Number(id)).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => studentsApi.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم حذف الطالب');
      router.replace('/students');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const guardianDeleteMutation = useMutation({
    mutationFn: (gId: number) => guardiansApi.delete(Number(id), gId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      toast.success('تم حذف ولي الأمر');
    },
  });

  const guardianSaveMutation = useMutation({
    mutationFn: (data: { id?: number; payload: GuardianFormData }) =>
      data.id
        ? guardiansApi.update(Number(id), data.id, data.payload)
        : guardiansApi.create(Number(id), data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setGuardianModal({ open: false });
      toast.success('تم الحفظ');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  const familySaveMutation = useMutation({
    mutationFn: (data: FamilyFormData) =>
      student?.family_info
        ? familyApi.update(Number(id), data)
        : familyApi.create(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setFamilyModal(false);
      toast.success('تم حفظ بيانات الأسرة');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  const attachUploadMutation = useMutation({
    mutationFn: (formData: FormData) => attachmentsApi.upload(Number(id), formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      setAttachFile(null);
      setAttachType('');
      setAttachName('');
      toast.success('تم رفع المرفق بنجاح');
    },
    onError: () => toast.error('فشل رفع المرفق'),
  });

  const attachDeleteMutation = useMutation({
    mutationFn: (attId: number) => attachmentsApi.delete(Number(id), attId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      toast.success('تم حذف المرفق');
    },
    onError: () => toast.error('فشل حذف المرفق'),
  });

  const handleAttachUpload = () => {
    if (!attachFile || !attachType || !attachName.trim()) {
      toast.error('يرجى تعبئة جميع الحقول واختيار ملف');
      return;
    }
    const formData = new FormData();
    formData.append('file', attachFile);
    formData.append('attachment_type', attachType);
    formData.append('name', attachName.trim());
    attachUploadMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
        <p className="text-gray-500">لم يتم العثور على الطالب</p>
        <Link href="/students" className="btn-primary mt-4 inline-flex">العودة</Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirm(`هل أنت متأكد من حذف طالب ${student.full_name}؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Header
        title={student.full_name}
        subtitle={`رقم الملف: ${student.file_number}`}
        actions={
          <div className="flex gap-2">
            <Link href="/students" className="btn-secondary">
              <ArrowRight size={16} /> العودة
            </Link>
            {user?.can_write && (
              <Link href={`/students/${id}/edit`} className="btn-secondary">
                <Edit size={16} /> تعديل
              </Link>
            )}
            {user?.can_delete && (
              <button onClick={handleDelete} className="btn-danger" disabled={deleteMutation.isPending}>
                <Trash2 size={16} /> حذف
              </button>
            )}
          </div>
        }
      />

      {/* Header Card */}
      <div className="card flex flex-wrap items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0 overflow-hidden">
          {student.photo ? (
            <img src={`${process.env.NEXT_PUBLIC_MEDIA_URL}${student.photo}`} alt={student.full_name} className="w-full h-full object-cover" />
          ) : (
            student.full_name[0]
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{student.full_name}</h2>
          <p className="text-gray-500 text-sm">{student.national_id} — {student.nationality}</p>
          <p className="text-gray-500 text-sm mt-0.5">{student.gender_display} — {student.age} سنة</p>
        </div>
        <div className="text-left">
          <span className={`badge text-sm px-3 py-1 ${STATUS_COLORS[student.status] || 'bg-gray-100 text-gray-600'}`}>
            {student.status_display}
          </span>
          <p className="text-xs text-gray-400 mt-1">تسجيل: {formatDate(student.registration_date)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'info', label: 'البيانات الأساسية', icon: User },
          { key: 'guardians', label: `أولياء الأمور (${student.guardians?.length || 0})`, icon: Users },
          { key: 'family', label: 'الأسرة', icon: Home },
          { key: 'attachments', label: `المرفقات (${student.attachments?.length || 0})`, icon: Paperclip },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="space-y-4">

          {/* البيانات الشخصية */}
          <div className="card">
            <h3 className="section-title">البيانات الشخصية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="الاسم الأول"               value={student.first_name} />
              <InfoRow label="اسم الأب"                value={student.middle_name || '—'} />
              <InfoRow label="اسم الجد"                value={student.grandfather_name || '—'} />
              <InfoRow label="اسم العائلة"             value={student.family_name} />
              <InfoRow label="رقم الملف"               value={student.file_number} />
              <InfoRow label="رقم الهوية / الإقامة"   value={student.national_id} />
              <InfoRow label="تاريخ الميلاد"           value={`${formatDate(student.date_of_birth)} (${student.age} سنة)`} />
              <InfoRow label="الجنس"                   value={student.gender_display} />
              <InfoRow label="الجنسية"                 value={student.nationality} />
              <InfoRow label="الحالة"                  value={student.status_display} />
              <InfoRow label="تاريخ التسجيل"          value={formatDate(student.registration_date)} />
            </div>
          </div>

          {/* الإعاقة والتشخيص */}
          <div className="card">
            <h3 className="section-title">الإعاقة والتشخيص</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="نوع الإعاقة"    value={student.disability_type_display  || '—'} />
              <InfoRow label="درجة الإعاقة"   value={student.disability_degree_display || '—'} />
              {student.diagnosis && (
                <div className="md:col-span-2">
                  <InfoRow label="التشخيص التفصيلي" value={student.diagnosis} />
                </div>
              )}
            </div>
          </div>

          {/* المعلومات التعليمية */}
          <div className="card">
            <h3 className="section-title">المعلومات التعليمية</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label="المستوى التعليمي" value={student.educational_level_display || '—'} />
              <InfoRow label="اسم المدرسة"       value={student.school_name              || '—'} />
              <InfoRow label="الصف / المرحلة"    value={student.grade                    || '—'} />
            </div>
          </div>

          {/* جهة الإحالة */}
          <div className="card">
            <h3 className="section-title">جهة الإحالة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="جهة الإحالة"  value={student.referral_source_display  || '—'} />
              <InfoRow label="تفاصيل الإحالة" value={student.referral_source_detail || '—'} />
            </div>
          </div>

          {/* ملاحظات ونظام */}
          <div className="card">
            <h3 className="section-title">ملاحظات ومعلومات النظام</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.notes && (
                <div className="md:col-span-2">
                  <InfoRow label="ملاحظات" value={student.notes} />
                </div>
              )}
              <InfoRow label="أُضيف بواسطة" value={student.created_by_name || '—'} />
              <InfoRow label="تاريخ الإضافة" value={formatDate(student.created_at)} />
            </div>
          </div>

        </div>
      )}

      {activeTab === 'guardians' && (
        <div className="space-y-3">
          {user?.can_write && (
            <button
              onClick={() => setGuardianModal({ open: true })}
              className="btn-primary"
            >
              <Plus size={16} /> إضافة ولي أمر
            </button>
          )}
          {(student.guardians || []).length === 0 ? (
            <div className="card text-center py-10 text-gray-400">لا يوجد أولياء أمور مضافون</div>
          ) : (
            (student.guardians || []).map((g) => (
              <div key={g.id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-800">{g.full_name}</h4>
                      <span className="badge bg-gray-100 text-gray-600">{g.relationship_display}</span>
                      {g.is_primary_contact && (
                        <span className="badge bg-green-100 text-green-700">جهة التواصل الرئيسية</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2"><Phone size={14} /> {g.phone}</p>
                      {g.phone_alt && <p className="flex items-center gap-2"><Phone size={14} /> {g.phone_alt} (إضافي)</p>}
                      {g.email && <p className="flex items-center gap-2"><Mail size={14} /> {g.email}</p>}
                      {g.address && <p className="flex items-center gap-2"><MapPin size={14} /> {g.address}</p>}
                      {g.national_id && <p>رقم الهوية: {g.national_id}</p>}
                    </div>
                    {g.notes && <p className="text-xs text-gray-400 mt-2">{g.notes}</p>}
                  </div>
                  {user?.can_write && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setGuardianModal({ open: true, guardian: g })}
                        className="btn-secondary py-1 px-2"
                      >
                        <Edit size={14} />
                      </button>
                      {user?.can_delete && (
                        <button
                          onClick={() => {
                            if (confirm('حذف ولي الأمر؟')) guardianDeleteMutation.mutate(g.id);
                          }}
                          className="btn-danger py-1 px-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'family' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">بيانات الأسرة</h3>
            {user?.can_write && (
              <button onClick={() => setFamilyModal(true)} className="btn-secondary py-1 px-3 text-xs">
                <Edit size={13} /> {student.family_info ? 'تعديل' : 'إضافة'}
              </button>
            )}
          </div>
          {student.family_info ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="عدد أفراد الأسرة" value={String(student.family_info.family_size)} />
              <InfoRow label="ترتيب الطالب" value={`${student.family_info.sibling_order} من ${student.family_info.family_size}`} />
              <InfoRow label="حالة الوالدين" value={student.family_info.parents_status_display} />
              <InfoRow label="دخل الأسرة" value={student.family_info.income_range_display || '—'} />
              <InfoRow label="نوع السكن" value={student.family_info.housing_type_display || '—'} />
              {student.family_info.social_notes && (
                <div className="md:col-span-2">
                  <InfoRow label="ملاحظات اجتماعية" value={student.family_info.social_notes} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">لم يتم إضافة بيانات الأسرة بعد</p>
          )}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="space-y-4">

          {/* نموذج الرفع */}
          {user?.can_write && (
            <div className="card">
              <h3 className="section-title">رفع مرفق جديد</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="sm:col-span-2">
                  <label className="form-label">نوع المرفق <span className="text-red-500">*</span></label>
                  <select
                    className="form-input"
                    value={attachType}
                    onChange={(e) => setAttachType(e.target.value)}
                  >
                    <option value="">-- اختر نوع المرفق --</option>
                    <option value="national_id">صورة الهوية</option>
                    <option value="birth_certificate">شهادة الميلاد</option>
                    <option value="medical_report">تقرير طبي</option>
                    <option value="psychological_report">تقرير نفسي</option>
                    <option value="disability_card">بطاقة إعاقة</option>
                    <option value="referral_letter">خطاب إحالة</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">اسم المرفق <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: تقرير طبي من مستشفى الملك فهد"
                    value={attachName}
                    onChange={(e) => setAttachName(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">الملف <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 transition-colors bg-gray-50">
                      <Upload size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-500 truncate">
                        {attachFile ? attachFile.name : 'اختر ملف PDF أو صورة...'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setAttachFile(f);
                          if (f && !attachName) setAttachName(f.name.replace(/\.[^/.]+$/, ''));
                        }}
                      />
                    </label>
                    {attachFile && (
                      <button
                        type="button"
                        onClick={() => setAttachFile(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">PDF، JPG، PNG — حد أقصى 10 ميجا</p>
                </div>

              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleAttachUpload}
                  disabled={attachUploadMutation.isPending}
                  className="btn-primary"
                >
                  {attachUploadMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      جارٍ الرفع...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2"><Upload size={15}/> رفع المرفق</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* قائمة المرفقات */}
          <div className="card">
            <h3 className="section-title">المرفقات المضافة ({(student.attachments || []).length})</h3>
            {(student.attachments || []).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">لا توجد مرفقات</p>
            ) : (
              <div className="space-y-2">
                {student.attachments!.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText size={18} className="text-primary-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{att.name}</p>
                        <p className="text-xs text-gray-400">{att.attachment_type_display} — {formatDate(att.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`${process.env.NEXT_PUBLIC_MEDIA_URL}${att.file}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary py-1 px-2 text-xs"
                      >
                        تنزيل
                      </a>
                      {user?.can_delete && (
                        <button
                          onClick={() => {
                            if (confirm('حذف هذا المرفق؟')) attachDeleteMutation.mutate(att.id);
                          }}
                          className="btn-danger py-1 px-2"
                          disabled={attachDeleteMutation.isPending}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modals */}
      {guardianModal.open && (
        <GuardianModal
          guardian={guardianModal.guardian}
          onClose={() => setGuardianModal({ open: false })}
          onSave={(data) =>
            guardianSaveMutation.mutate({ id: guardianModal.guardian?.id, payload: data })
          }
          loading={guardianSaveMutation.isPending}
        />
      )}

      {familyModal && (
        <FamilyModal
          familyInfo={student.family_info || undefined}
          onClose={() => setFamilyModal(false)}
          onSave={(data) => familySaveMutation.mutate(data)}
          loading={familySaveMutation.isPending}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || '—'}</p>
    </div>
  );
}
