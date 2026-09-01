'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Edit, Trash2, Plus, Phone, Mail, MapPin,
  User, Users, Home, Paperclip, AlertCircle, Upload, FileText, X, CheckCircle,
  CalendarDays, Clock, XCircle, RotateCcw, CalendarClock, Stethoscope, Pill, ClipboardCheck, ListChecks,
} from 'lucide-react';
import { studentsApi, guardiansApi, familyApi, attachmentsApi, attendanceApi, scheduleApi, medicalApi, assessmentsApi, studentAssessmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatDate, STATUS_COLORS } from '@/lib/utils';
import { SCHEDULE_DAYS, SCHEDULE_TIME_SLOTS } from '@/types';
import type {
  Student, Guardian, FamilyInfo, GuardianFormData, FamilyFormData, Attendance, AttendanceFormData,
  ScheduleSlot, ScheduleSlotFormData, ScheduleDay,
  StudentMedicalProfile, Medication, MedicalVisit,
  AssessmentListItem, StudentAssessment,
} from '@/types';
import Header from '@/components/layout/Header';
import GuardianModal from '@/components/students/GuardianModal';
import FamilyModal from '@/components/students/FamilyModal';
import AttendanceModal from '@/components/students/AttendanceModal';
import ScheduleSlotModal from '@/components/students/ScheduleSlotModal';
import MedicalProfileModal from '@/components/students/MedicalProfileModal';
import MedicationModal from '@/components/students/MedicationModal';
import MedicalVisitModal from '@/components/students/MedicalVisitModal';
import AcceptanceLetterModal from '@/components/students/AcceptanceLetterModal';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [guardianModal, setGuardianModal] = useState<{ open: boolean; guardian?: Guardian }>({ open: false });
  const [familyModal, setFamilyModal] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState<{ open: boolean; record?: Attendance }>({ open: false });
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; day: ScheduleDay; startTime: string; slot?: ScheduleSlot }>(
    { open: false, day: 'sunday', startTime: '' }
  );
  const [medicalProfileModal, setMedicalProfileModal] = useState(false);
  const [medicationModal, setMedicationModal] = useState<{ open: boolean; medication?: Medication }>({ open: false });
  const [visitModal, setVisitModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acceptanceLetterOpen, setAcceptanceLetterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'guardians' | 'family' | 'attachments' | 'attendance' | 'schedule' | 'medical' | 'assessments'>('info');
  const [startAssessmentId, setStartAssessmentId] = useState('');

  const canViewMedical = user?.is_admin || user?.permissions?.some((p) => p.module === 'medical_file' && p.can_view);
  const canEditMedical = user?.is_admin || user?.permissions?.some((p) => p.module === 'medical_file' && p.can_edit);
  const canViewAssessments = user?.is_admin || user?.permissions?.some((p) => p.module === 'assessments' && p.can_view);
  const canEditAssessments = user?.is_admin || user?.permissions?.some((p) => p.module === 'assessments' && p.can_edit);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachType, setAttachType] = useState('');
  const [attachName, setAttachName] = useState('');

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => studentsApi.detail(Number(id)).then((r) => r.data),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => studentsApi.reject(Number(id), reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم رفض الطالب');
      setRejectModal(false);
      setRejectReason('');
    },
    onError: () => toast.error('فشل رفض الطالب'),
  });

  const restoreMutation = useMutation({
    mutationFn: () => studentsApi.restore(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تمت استعادة الطالب إلى قائمة الانتظار');
    },
    onError: () => toast.error('فشل استعادة الطالب'),
  });

  const acceptMutation = useMutation({
    mutationFn: () => studentsApi.accept(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم قبول الطالب وتفعيل ملفه');
      setAcceptanceLetterOpen(true);
    },
    onError: () => toast.error('فشل قبول الطالب'),
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

  const { data: attendances = [] } = useQuery<Attendance[]>({
    queryKey: ['attendance', id],
    queryFn: () => attendanceApi.list(Number(id)).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: activeTab === 'attendance',
  });

  const attendanceCreateMutation = useMutation({
    mutationFn: (data: AttendanceFormData) => attendanceApi.create(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', id] });
      setAttendanceModal({ open: false });
      toast.success('تم تسجيل الحضور');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { non_field_errors?: string[] } } })
        ?.response?.data?.non_field_errors?.[0];
      toast.error(msg || 'حدث خطأ في الحفظ');
    },
  });

  const attendanceUpdateMutation = useMutation({
    mutationFn: ({ recId, data }: { recId: number; data: AttendanceFormData }) =>
      attendanceApi.update(Number(id), recId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', id] });
      setAttendanceModal({ open: false });
      toast.success('تم تحديث السجل');
    },
    onError: () => toast.error('حدث خطأ في التحديث'),
  });

  const attendanceDeleteMutation = useMutation({
    mutationFn: (recId: number) => attendanceApi.delete(Number(id), recId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', id] });
      toast.success('تم حذف السجل');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const { data: scheduleSlots = [] } = useQuery<ScheduleSlot[]>({
    queryKey: ['schedule', id],
    queryFn: () => scheduleApi.list(Number(id)).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: activeTab === 'schedule',
  });

  const scheduleCreateMutation = useMutation({
    mutationFn: (data: ScheduleSlotFormData) => scheduleApi.create(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      setScheduleModal(s => ({ ...s, open: false }));
      toast.success('تمت إضافة الحصة');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { non_field_errors?: string[] } } })
        ?.response?.data?.non_field_errors?.[0];
      toast.error(msg || 'حدث خطأ في الحفظ');
    },
  });

  const scheduleUpdateMutation = useMutation({
    mutationFn: ({ slotId, data }: { slotId: number; data: ScheduleSlotFormData }) =>
      scheduleApi.update(Number(id), slotId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      setScheduleModal(s => ({ ...s, open: false }));
      toast.success('تم تحديث الحصة');
    },
    onError: () => toast.error('حدث خطأ في التحديث'),
  });

  const scheduleDeleteMutation = useMutation({
    mutationFn: (slotId: number) => scheduleApi.delete(Number(id), slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      setScheduleModal(s => ({ ...s, open: false }));
      toast.success('تم حذف الحصة');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  // ── المقاييس والخطط الدراسية ─────────────────────────────────────────────
  const assessmentsEnabled = activeTab === 'assessments' && !!canViewAssessments;

  const { data: studentAssessments = [] } = useQuery<StudentAssessment[]>({
    queryKey: ['student-assessments', id],
    queryFn: () => studentAssessmentsApi.list(Number(id)).then((r) => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: assessmentsEnabled,
  });

  const { data: assessmentLibrary = [] } = useQuery<AssessmentListItem[]>({
    queryKey: ['assessments-library'],
    queryFn: () => assessmentsApi.list().then((r) => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: assessmentsEnabled && !!canEditAssessments,
  });

  const startAssessmentMutation = useMutation({
    mutationFn: (assessmentId: number) =>
      studentAssessmentsApi.create(Number(id), {
        assessment: assessmentId,
        started_at: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['student-assessments', id] });
      router.push(`/students/${id}/assessments/${res.data.id}`);
    },
    onError: () => toast.error('حدث خطأ أثناء بدء التقييم'),
  });

  // ── الملف الطبي ──────────────────────────────────────────────────────────
  const medicalEnabled = activeTab === 'medical' && !!canViewMedical;

  const { data: medicalProfile } = useQuery<StudentMedicalProfile | null>({
    queryKey: ['medical-profile', id],
    queryFn: () => medicalApi.getProfile(Number(id)).then(r => r.data).catch((err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw err;
    }),
    enabled: medicalEnabled,
  });

  const { data: medications = [] } = useQuery<Medication[]>({
    queryKey: ['medications', id],
    queryFn: () => medicalApi.medications.list(Number(id)).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: medicalEnabled,
  });

  const { data: medicalVisits = [] } = useQuery<MedicalVisit[]>({
    queryKey: ['medical-visits', id],
    queryFn: () => medicalApi.visits.list(Number(id)).then(r => { const d = r.data; return Array.isArray(d) ? d : (d.results ?? []); }),
    enabled: medicalEnabled,
  });

  const medicalProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      medicalProfile ? medicalApi.updateProfile(Number(id), data) : medicalApi.createProfile(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-profile', id] });
      setMedicalProfileModal(false);
      toast.success('تم حفظ الملف الطبي');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  const medicationSaveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      medicationModal.medication
        ? medicalApi.medications.update(Number(id), medicationModal.medication.id, data)
        : medicalApi.medications.create(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', id] });
      setMedicationModal({ open: false });
      toast.success('تم حفظ الدواء');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  const medicationDeleteMutation = useMutation({
    mutationFn: (medId: number) => medicalApi.medications.delete(Number(id), medId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', id] });
      toast.success('تم حذف الدواء');
    },
    onError: () => toast.error('فشل الحذف'),
  });

  const visitCreateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => medicalApi.visits.create(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-visits', id] });
      setVisitModal(false);
      toast.success('تمت إضافة الزيارة');
    },
    onError: () => toast.error('حدث خطأ في الحفظ'),
  });

  const visitDeleteMutation = useMutation({
    mutationFn: (visitId: number) => medicalApi.visits.delete(Number(id), visitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-visits', id] });
      toast.success('تم حذف الزيارة');
    },
    onError: () => toast.error('فشل الحذف'),
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

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      toast.error('يرجى كتابة سبب الرفض');
      return;
    }
    rejectMutation.mutate(rejectReason.trim());
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Header
        title={student.full_name}
        subtitle={`رقم الملف: ${student.file_number}`}
        actions={
          <div className="flex gap-2">
            <Link href="/students" className="btn-secondary">
              <ArrowLeft size={16} /> العودة
            </Link>
            {user?.can_delete && student?.status === 'pending' && (
              <button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                <CheckCircle size={16} /> قبول الطالب
              </button>
            )}
            {student?.status === 'active' && (
              <button
                onClick={() => setAcceptanceLetterOpen(true)}
                className="flex items-center gap-1.5 bg-[#0F2A47] hover:bg-[#1a3d66] text-white font-medium py-2 px-4 rounded-xl transition-colors"
              >
                <FileText size={16} /> إشعار القبول
              </button>
            )}
            {user?.can_write && (
              <Link href={`/students/${id}/edit`} className="btn-secondary">
                <Edit size={16} /> تعديل
              </Link>
            )}
            {user?.can_delete && student?.status !== 'rejected' && (
              <button
                onClick={() => { setRejectReason(''); setRejectModal(true); }}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-4 rounded-xl transition-colors"
              >
                <XCircle size={16} /> رفض
              </button>
            )}
            {user?.can_delete && student?.status === 'rejected' && (
              <button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                <RotateCcw size={16} /> استعادة
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
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'info', label: 'البيانات الأساسية', icon: User },
          { key: 'guardians', label: `أولياء الأمور (${student.guardians?.length || 0})`, icon: Users },
          { key: 'family', label: 'الأسرة', icon: Home },
          { key: 'attachments', label: `المرفقات (${student.attachments?.length || 0})`, icon: Paperclip },
          { key: 'attendance', label: 'الحضور والغياب', icon: CalendarDays },
          { key: 'schedule', label: 'الجدول الدراسي', icon: CalendarClock },
          ...(canViewMedical ? [{ key: 'medical', label: 'الملف الطبي', icon: Stethoscope }] : []),
          ...(canViewAssessments ? [{ key: 'assessments', label: 'المقاييس والخطط الدراسية', icon: ListChecks }] : []),
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
              <InfoRow label="الفرع"                   value={student.branch_name || '—'} />
              <InfoRow label="الباص"                   value={student.bus_display || '—'} />
              <InfoRow label="الحالة"                  value={student.status_display} />
              <InfoRow label="تاريخ التسجيل"          value={formatDate(student.registration_date)} />
            </div>
          </div>

          {/* الإعاقة والتشخيص */}
          <div className="card">
            <h3 className="section-title">الإعاقة والتشخيص</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <InfoRow label="نوع الإعاقة ودرجتها" value={student.disability_type_display || '—'} />
              </div>
              <InfoRow label="درجة الذكاء"    value={student.iq_score != null ? String(student.iq_score) : '—'} />
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

          {/* سبب الرفض */}
          {student.status === 'rejected' && student.rejection_reason && (
            <div className="card border border-rose-200 bg-rose-50">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={18} className="text-rose-600 flex-shrink-0" />
                <h3 className="font-semibold text-rose-700">سبب الرفض</h3>
              </div>
              <p className="text-sm text-rose-800 leading-relaxed whitespace-pre-wrap">
                {student.rejection_reason}
              </p>
              <p className="text-xs text-rose-400 mt-2">
                تاريخ الرفض: {formatDate(student.updated_at)}
              </p>
            </div>
          )}

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

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {user?.can_write && (
            <button
              onClick={() => setAttendanceModal({ open: true })}
              className="btn-primary"
            >
              <Plus size={16} /> تسجيل حضور / غياب
            </button>
          )}

          {attendances.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              لا توجد سجلات حضور بعد
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-right py-3 px-4 font-medium text-gray-600">التاريخ</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الحالة</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">الحضور / الانصراف</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">ولي الأمر</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">ملاحظات</th>
                    {user?.can_write && (
                      <th className="py-3 px-4" />
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendances.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {formatDate(rec.attendance_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs px-2 py-0.5 ${ATTENDANCE_COLORS[rec.status]}`}>
                          {rec.status_display}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {rec.check_in_time || rec.check_out_time ? (
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-gray-400" />
                            {rec.check_in_time && <span>{rec.check_in_time.slice(0,5)}</span>}
                            {rec.check_in_time && rec.check_out_time && <span className="text-gray-300">—</span>}
                            {rec.check_out_time && <span>{rec.check_out_time.slice(0,5)}</span>}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {rec.guardian_notified ? (
                          <span className="badge bg-green-100 text-green-700 text-xs">تم الإخطار</span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 max-w-[180px] truncate">
                        {rec.absence_reason || rec.late_reason || rec.early_leave_reason || rec.notes || '—'}
                      </td>
                      {user?.can_write && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setAttendanceModal({ open: true, record: rec })}
                              className="btn-secondary py-1 px-2"
                            >
                              <Edit size={13} />
                            </button>
                            {user?.can_delete && (
                              <button
                                onClick={() => {
                                  if (confirm('حذف هذا السجل؟')) attendanceDeleteMutation.mutate(rec.id);
                                }}
                                className="btn-danger py-1 px-2"
                                disabled={attendanceDeleteMutation.isPending}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="card p-0 overflow-x-auto">
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
              {SCHEDULE_TIME_SLOTS.map((slot) => (
                <tr key={slot.start}>
                  <td className="text-center py-2 px-3 text-xs text-gray-400 font-mono whitespace-nowrap border-l border-gray-50" dir="ltr">
                    {slot.label}
                  </td>
                  {SCHEDULE_DAYS.map((d) => {
                    const cell = scheduleSlots.find((s) => s.day === d.value && s.start_time === slot.start);
                    return (
                      <td key={d.value} className="p-1.5 border-l border-gray-50 last:border-l-0">
                        {cell ? (
                          <button
                            onClick={() => setScheduleModal({ open: true, day: d.value, startTime: slot.start, slot: cell })}
                            className="w-full text-right bg-primary-50 hover:bg-primary-100 border border-primary-100 rounded-lg px-2.5 py-1.5 transition-colors"
                          >
                            <p className="text-xs font-semibold text-primary-800 truncate">{cell.subject}</p>
                            {cell.specialist_name && (
                              <p className="text-[11px] text-primary-500 truncate mt-0.5">{cell.specialist_name}</p>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => setScheduleModal({ open: true, day: d.value, startTime: slot.start })}
                            className="w-full h-10 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300 hover:border-primary-300 hover:text-primary-400 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'medical' && canViewMedical && (
        <div className="space-y-5">
          {/* الملف الطبي الثابت */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-primary-600" />
                <h3 className="section-title mb-0">الملف الطبي</h3>
              </div>
              {canEditMedical && (
                <button onClick={() => setMedicalProfileModal(true)} className="btn-secondary py-1 px-3 text-xs">
                  <Edit size={13} /> {medicalProfile ? 'تعديل' : 'إنشاء ملف طبي'}
                </button>
              )}
            </div>

            {!medicalProfile ? (
              <p className="text-gray-400 text-sm text-center py-6">لا يوجد ملف طبي لهذا الطالب بعد</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="الطول" value={medicalProfile.height_cm != null ? `${medicalProfile.height_cm} سم` : '—'} />
                <InfoRow label="الوزن" value={medicalProfile.weight_kg != null ? `${medicalProfile.weight_kg} كجم` : '—'} />
                <InfoRow label="الأمراض المزمنة" value={medicalProfile.chronic_disease || '—'} />
                <InfoRow label="الحساسية الطبية" value={medicalProfile.medical_allergy || '—'} />
                <InfoRow label="الحساسية الغذائية" value={medicalProfile.food_allergy || '—'} />
                <div className="flex items-center gap-4">
                  <span className={`badge text-xs ${medicalProfile.has_seizures ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                    {medicalProfile.has_seizures ? 'يعاني من تشنجات' : 'لا يعاني من تشنجات'}
                  </span>
                  <span className={`badge text-xs ${medicalProfile.uses_nebulizer ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {medicalProfile.uses_nebulizer ? 'يستخدم جهاز استنشاق' : 'لا يستخدم جهاز استنشاق'}
                  </span>
                </div>
                {medicalProfile.notes && (
                  <div className="sm:col-span-2">
                    <InfoRow label="ملاحظات إضافية" value={medicalProfile.notes} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* الأدوية */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-primary-600" />
                <h3 className="section-title mb-0">الأدوية</h3>
              </div>
              {canEditMedical && (
                <button onClick={() => setMedicationModal({ open: true })} className="btn-secondary py-1 px-3 text-xs">
                  <Plus size={13} /> إضافة دواء
                </button>
              )}
            </div>
            {medications.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">لا توجد أدوية مسجّلة</p>
            ) : (
              <div className="space-y-2">
                {medications.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 text-sm">{m.name}</p>
                        {!m.is_active && <span className="badge text-xs bg-gray-100 text-gray-400">غير نشط</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{[m.dose, m.frequency].filter(Boolean).join(' — ') || '—'}</p>
                    </div>
                    {canEditMedical && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => setMedicationModal({ open: true, medication: m })} className="btn-secondary py-1 px-2">
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`حذف دواء "${m.name}"؟`)) medicationDeleteMutation.mutate(m.id); }}
                          className="btn-danger py-1 px-2"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* زيارات التقييم */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-primary-600" />
                <h3 className="section-title mb-0">زيارات التقييم</h3>
              </div>
              {canEditMedical && (
                <button onClick={() => setVisitModal(true)} className="btn-secondary py-1 px-3 text-xs">
                  <Plus size={13} /> إضافة زيارة
                </button>
              )}
            </div>
            {medicalVisits.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">لا توجد زيارات مسجّلة</p>
            ) : (
              <div className="space-y-2">
                {medicalVisits.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 text-sm">{formatDate(v.visit_date)}</p>
                        <span className={`badge text-xs ${v.status === 'stable' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {v.status_display}
                        </span>
                      </div>
                      {v.notes && <p className="text-xs text-gray-500 mt-0.5">{v.notes}</p>}
                      {v.evaluated_by_name && <p className="text-xs text-gray-400 mt-0.5">بواسطة: {v.evaluated_by_name}</p>}
                    </div>
                    {canEditMedical && (
                      <button
                        onClick={() => { if (confirm('حذف هذه الزيارة؟')) visitDeleteMutation.mutate(v.id); }}
                        className="btn-danger py-1 px-2 flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assessments' && canViewAssessments && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ListChecks size={16} className="text-primary-600" />
              <h3 className="section-title mb-0">المقاييس والخطط الدراسية</h3>
            </div>
            {canEditAssessments && (
              <div className="flex items-center gap-2">
                <select
                  className="form-input py-1.5 text-xs w-56"
                  value={startAssessmentId}
                  onChange={(e) => setStartAssessmentId(e.target.value)}
                >
                  <option value="">-- اختر مقياسًا لبدء تقييم جديد --</option>
                  {assessmentLibrary.filter((a) => a.is_active).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.question_count} سؤال)</option>
                  ))}
                </select>
                <button
                  className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50"
                  disabled={!startAssessmentId || startAssessmentMutation.isPending}
                  onClick={() => startAssessmentMutation.mutate(Number(startAssessmentId))}
                >
                  {startAssessmentMutation.isPending ? 'جارٍ البدء...' : <><Plus size={13} /> بدء تقييم</>}
                </button>
              </div>
            )}
          </div>

          {studentAssessments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <ListChecks size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm">لا توجد تقييمات مسجّلة لهذا الطالب بعد</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {studentAssessments.map((sa) => (
                <Link
                  key={sa.id}
                  href={`/students/${id}/assessments/${sa.id}`}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">{sa.assessment_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      بدأ في {formatDate(sa.started_at)}
                      {sa.started_by_name && ` — بواسطة ${sa.started_by_name}`}
                    </p>
                  </div>
                  <span className="badge text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                    {sa.answers.length} إجابة مسجّلة
                  </span>
                </Link>
              ))}
            </div>
          )}
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

      {attendanceModal.open && (
        <AttendanceModal
          record={attendanceModal.record}
          onClose={() => setAttendanceModal({ open: false })}
          onSave={(data) => {
            if (attendanceModal.record) {
              attendanceUpdateMutation.mutate({ recId: attendanceModal.record.id, data });
            } else {
              attendanceCreateMutation.mutate(data);
            }
          }}
          loading={attendanceCreateMutation.isPending || attendanceUpdateMutation.isPending}
        />
      )}

      {scheduleModal.open && (
        <ScheduleSlotModal
          day={scheduleModal.day}
          startTime={scheduleModal.startTime}
          slot={scheduleModal.slot}
          onClose={() => setScheduleModal(s => ({ ...s, open: false }))}
          onSave={(data) => {
            if (scheduleModal.slot) {
              scheduleUpdateMutation.mutate({ slotId: scheduleModal.slot.id, data });
            } else {
              scheduleCreateMutation.mutate(data);
            }
          }}
          onDelete={scheduleModal.slot ? () => {
            if (scheduleModal.slot && confirm('حذف هذه الحصة؟')) scheduleDeleteMutation.mutate(scheduleModal.slot.id);
          } : undefined}
          loading={scheduleCreateMutation.isPending || scheduleUpdateMutation.isPending || scheduleDeleteMutation.isPending}
        />
      )}

      {medicalProfileModal && (
        <MedicalProfileModal
          profile={medicalProfile || undefined}
          onClose={() => setMedicalProfileModal(false)}
          onSave={(data) => medicalProfileMutation.mutate(data)}
          loading={medicalProfileMutation.isPending}
        />
      )}

      {medicationModal.open && (
        <MedicationModal
          medication={medicationModal.medication}
          onClose={() => setMedicationModal({ open: false })}
          onSave={(data) => medicationSaveMutation.mutate(data)}
          loading={medicationSaveMutation.isPending}
        />
      )}

      {visitModal && (
        <MedicalVisitModal
          onClose={() => setVisitModal(false)}
          onSave={(data) => visitCreateMutation.mutate(data)}
          loading={visitCreateMutation.isPending}
        />
      )}

      {/* Acceptance Letter Modal */}
      {acceptanceLetterOpen && (
        <AcceptanceLetterModal
          student={student}
          onClose={() => setAcceptanceLetterOpen(false)}
        />
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-rose-600" />
                <h2 className="text-lg font-bold text-gray-800">رفض الطالب</h2>
              </div>
              <button onClick={() => setRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                سيتم تغيير حالة الطالب <strong>{student.full_name}</strong> إلى «مرفوض».
              </p>
              <label className="form-label">
                سبب الرفض <span className="text-red-500">*</span>
              </label>
              <textarea
                className="form-input min-h-[100px] resize-none"
                placeholder="اكتب سبب رفض الطالب بوضوح..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setRejectModal(false)} className="btn-secondary">
                إلغاء
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 px-5 rounded-xl transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    جارٍ الرفض...
                  </>
                ) : (
                  <><XCircle size={15} /> تأكيد الرفض</>
                )}
              </button>
            </div>
          </div>
        </div>
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

const ATTENDANCE_COLORS: Record<string, string> = {
  present:         'bg-green-100 text-green-700',
  absent:          'bg-red-100 text-red-700',
  late:            'bg-yellow-100 text-yellow-700',
  excused_absence: 'bg-blue-100 text-blue-700',
  early_leave:     'bg-orange-100 text-orange-700',
};
