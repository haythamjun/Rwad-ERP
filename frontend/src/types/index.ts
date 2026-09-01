// ─────────────────────────────────────────────
// Branch
// ─────────────────────────────────────────────
export interface Branch {
  id: number;
  name: string;
  city: string;
  location: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  student_count: number;
}

// ─────────────────────────────────────────────
// إعدادات المركز
// ─────────────────────────────────────────────
export type WeekDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export const WEEK_DAYS: { value: WeekDay; label: string }[] = [
  { value: 'sunday',    label: 'الأحد' },
  { value: 'monday',    label: 'الاثنين' },
  { value: 'tuesday',   label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday',  label: 'الخميس' },
  { value: 'friday',    label: 'الجمعة' },
  { value: 'saturday',  label: 'السبت' },
];

export interface SiteSettings {
  center_name_ar: string;
  center_name_en: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo: string | null;
  weekly_off_days: WeekDay[];
  updated_at: string;
}

// فصل دراسي وعطلة رسمية — لاحتساب أيام الدراسة المتوقعة بتقرير الحضور بشكل صحيح
export interface AcademicTerm {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface Bus {
  id: number;
  chassis_number: string;
  plate_number: string;
  brand: string;
  manufacture_year: number;
  serial_number: string;
  branch: number;
  branch_name: string;
  registration_expiry: string;
  inspection_expiry: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export type ModuleKey = 'students' | 'medical_file' | 'assessments' | 'reports';

export interface ModulePermission {
  module: ModuleKey;
  can_view: boolean;
  can_edit: boolean;
  can_export: boolean;
  can_import: boolean;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'specialist' | 'reception' | 'viewer';
  role_display: string;
  can_write: boolean;
  can_delete: boolean;
  is_admin: boolean;
  phone?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  permissions?: ModulePermission[];
  assigned_branch?: number | null;
  assigned_branch_name?: string | null;
  assigned_city?: string;
}

export interface AuthTokens { access: string; refresh: string; }
export interface LoginResponse extends AuthTokens { user: User; }

// ─────────────────────────────────────────────
// Student
// ─────────────────────────────────────────────
export type StudentStatus =
  | 'pending' | 'active' | 'inactive'
  | 'graduated' | 'suspended' | 'transferred' | 'rejected';

export type Gender = 'male' | 'female';

export type DisabilityType =
  | 'intellectual' | 'autism' | 'down' | 'physical'
  | 'hearing' | 'visual' | 'speech' | 'learning'
  | 'behavioral' | 'multiple' | 'other' | '';

export type DisabilityDegree = 'mild' | 'moderate' | 'severe' | 'profound' | '';

// كل نوع إعاقة له درجته الخاصة (بدل درجة واحدة عامة تنطبق على كل الأنواع)
export interface DisabilityEntry {
  type: string;
  degree?: DisabilityDegree | string;
}

export type EducationalLevel =
  | 'none' | 'kindergarten' | 'elementary' | 'intermediate'
  | 'secondary' | 'university' | 'special' | '';

export type ReferralSource =
  | 'hospital' | 'school' | 'family' | 'ngo'
  | 'ministry' | 'specialist' | 'other' | '';

export interface Student {
  id: number;
  file_number: string;
  branch?: number | null;
  branch_name?: string | null;
  bus?: number | null;
  bus_display?: string | null;
  first_name: string;
  middle_name: string;
  grandfather_name: string;
  family_name: string;
  full_name: string;
  national_id: string;
  date_of_birth: string;
  age: number;
  gender: Gender;
  gender_display: string;
  nationality: string;
  photo?: string | null;
  // إعاقة
  disability_type?: DisabilityEntry[];
  disability_type_display?: string;
  diagnosis?: string;
  iq_score?: number | null;
  // تعليم
  educational_level?: EducationalLevel;
  educational_level_display?: string;
  school_name?: string;
  grade?: string;
  // إحالة
  referral_source?: ReferralSource;
  referral_source_display?: string;
  referral_source_detail?: string;
  // حالة
  status: StudentStatus;
  status_display: string;
  registration_date: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  created_by?: number | null;
  created_by_name?: string;
  primary_guardian?: { name: string; phone: string } | null;
  // Nested (detail only)
  guardians?: Guardian[];
  family_info?: FamilyInfo | null;
  attachments?: StudentAttachment[];
}

export interface StudentFormData {
  first_name: string;
  middle_name: string;
  grandfather_name: string;
  family_name: string;
  national_id: string;
  date_of_birth: string;
  gender: Gender | '';
  nationality: string;
  photo?: File | null;
  // إعاقة
  disability_type?: DisabilityEntry[];
  diagnosis?: string;
  iq_score?: number | string;
  // تعليم
  educational_level?: EducationalLevel;
  school_name?: string;
  grade?: string;
  // إحالة
  referral_source?: ReferralSource;
  referral_source_detail?: string;
  // نقل
  bus?: number | string;
  // حالة
  status: StudentStatus;
  registration_date: string;
  notes?: string;
}

// ─────────────────────────────────────────────
// Guardian
// ─────────────────────────────────────────────
export type Relationship =
  | 'father' | 'mother' | 'brother' | 'sister'
  | 'grandfather' | 'grandmother' | 'uncle' | 'aunt' | 'other';

export interface Guardian {
  id: number;
  student: number;
  full_name: string;
  relationship: Relationship;
  relationship_display: string;
  national_id?: string;
  phone: string;
  phone_alt?: string;
  email?: string;
  address?: string;
  is_primary_contact: boolean;
  notes?: string;
  created_at: string;
}

export interface GuardianFormData {
  full_name: string;
  relationship: Relationship | '';
  national_id?: string;
  phone: string;
  phone_alt?: string;
  email?: string;
  address?: string;
  is_primary_contact: boolean;
  notes?: string;
}

// ─────────────────────────────────────────────
// Family Info
// ─────────────────────────────────────────────
export interface FamilyInfo {
  id: number;
  student: number;
  family_size: number;
  sibling_order: number;
  parents_status: string;
  parents_status_display: string;
  income_range?: string;
  income_range_display?: string;
  monthly_income?: number | null;
  housing_type?: string;
  housing_type_display?: string;
  other_special_needs: boolean;
  social_notes?: string;
  created_at: string;
}

export interface FamilyFormData {
  family_size: number | '';
  sibling_order: number | '';
  parents_status: string;
  income_range?: string;
  monthly_income?: number | '';
  housing_type?: string;
  other_special_needs?: boolean;
  social_notes?: string;
}

// ─────────────────────────────────────────────
// Attachment
// ─────────────────────────────────────────────
export interface StudentAttachment {
  id: number;
  student: number;
  attachment_type: string;
  attachment_type_display: string;
  file: string;
  name: string;
  uploaded_by?: number;
  uploaded_by_name?: string;
  created_at: string;
}

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────
export type AttendanceStatus =
  | 'present' | 'absent' | 'late' | 'excused_absence' | 'early_leave';

export interface Attendance {
  id: number;
  student: number;
  student_name: string;
  branch?: number | null;
  branch_name?: string | null;
  attendance_date: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: AttendanceStatus;
  status_display: string;
  absence_reason?: string;
  late_reason?: string;
  early_leave_reason?: string;
  guardian_notified: boolean;
  notification_notes?: string;
  notes?: string;
  recorded_by?: number | null;
  recorded_by_name?: string | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

// Row returned by GET /api/attendance/sheet/
export interface AttendanceSheetRow {
  student_id: number;
  student_name: string;
  file_number: string;
  branch_id: number | null;
  branch_name: string | null;
  attendance: Attendance | null;
}

export interface AttendanceFormData {
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time?: string;
  check_out_time?: string;
  absence_reason?: string;
  late_reason?: string;
  early_leave_reason?: string;
  guardian_notified?: boolean;
  notification_notes?: string;
  notes?: string;
  branch?: number | null;
}

// ─────────────────────────────────────────────
// الجدول الدراسي
// ─────────────────────────────────────────────
export type ScheduleDay = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';

export const SCHEDULE_DAYS: { value: ScheduleDay; label: string }[] = [
  { value: 'sunday',    label: 'الأحد' },
  { value: 'monday',    label: 'الاثنين' },
  { value: 'tuesday',   label: 'الثلاثاء' },
  { value: 'wednesday', label: 'الأربعاء' },
  { value: 'thursday',  label: 'الخميس' },
];

// 8 فترات نصف ساعة ثابتة، من 7:30 حتى 11:30 — يجب أن تطابق SCHEDULE_TIME_SLOTS في models.py
export const SCHEDULE_TIME_SLOTS: { start: string; label: string }[] = [
  { start: '07:30:00', label: '7:30 – 8:00' },
  { start: '08:00:00', label: '8:00 – 8:30' },
  { start: '08:30:00', label: '8:30 – 9:00' },
  { start: '09:00:00', label: '9:00 – 9:30' },
  { start: '09:30:00', label: '9:30 – 10:00' },
  { start: '10:00:00', label: '10:00 – 10:30' },
  { start: '10:30:00', label: '10:30 – 11:00' },
  { start: '11:00:00', label: '11:00 – 11:30' },
];

export interface ScheduleSlot {
  id: number;
  student: number;
  student_name: string;
  day: ScheduleDay;
  day_display: string;
  start_time: string;
  subject: string;
  specialist?: number | null;
  specialist_name?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSlotFormData {
  day: ScheduleDay;
  start_time: string;
  subject: string;
  specialist?: number | null;
  notes?: string;
}

// حصة جماعية — تجميع سجلات الجدول الفردية حسب (اليوم، الوقت، المادة، الأخصائي)
export interface ScheduleClassMember {
  slot_id: number;
  student_id: number;
  student_name: string;
}

export interface ScheduleClassGroup {
  day: ScheduleDay;
  day_display: string;
  start_time: string;
  subject: string;
  specialist?: number | null;
  specialist_name?: string | null;
  students: ScheduleClassMember[];
  student_count: number;
}

export interface ScheduleBulkCreateData {
  student_ids: number[];
  day: ScheduleDay;
  start_time: string;
  subject: string;
  specialist?: number | null;
  notes?: string;
}

export interface ScheduleBulkCreateResult {
  created: number;
  skipped: number;
  errors: { student_id: number; student_name: string; reason: string }[];
}

// ─────────────────────────────────────────────
// الملف الطبي
// ─────────────────────────────────────────────
export interface StudentMedicalProfile {
  id: number;
  student: number;
  height_cm: number | null;
  weight_kg: number | null;
  chronic_disease: string;
  medical_allergy: string;
  food_allergy: string;
  has_seizures: boolean;
  uses_nebulizer: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type MedicalVisitStatus = 'stable' | 'unstable';

export interface MedicalVisit {
  id: number;
  student: number;
  visit_date: string;
  status: MedicalVisitStatus;
  status_display: string;
  notes?: string;
  evaluated_by?: number | null;
  evaluated_by_name?: string | null;
  created_at: string;
}

export interface Medication {
  id: number;
  student: number;
  name: string;
  dose?: string;
  frequency?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface MedicationAdministration {
  id: number;
  medication: number;
  medication_name: string;
  dose: string;
  given: boolean;
  given_at?: string | null;
  notes?: string;
}

export interface DailyMedicalCheckIn {
  id: number;
  student: number;
  student_name: string;
  check_date: string;
  check_time: string | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  blood_sugar?: number | null;
  weight_kg?: number | null;
  temperature?: number | null;
  pulse?: number | null;
  notes?: string;
  checked_by?: number | null;
  checked_by_name?: string | null;
  medication_records: MedicationAdministration[];
  created_at: string;
  updated_at: string;
}

export interface MedicalSheetRow {
  student_id: number;
  student_name: string;
  file_number: string;
  active_medications_count: number;
  checkin: DailyMedicalCheckIn | null;
}

// ─────────────────────────────────────────────
// المقاييس والخطط الدراسية
// ─────────────────────────────────────────────
export type ScaleOptionKind = 'pre' | 'post';

export interface AssessmentScaleOption {
  id: number;
  kind: ScaleOptionKind;
  label: string;
  order: number;
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  order: number;
}

export interface AssessmentSection {
  id: number;
  name: string;
  order: number;
  questions: AssessmentQuestion[];
}

// قائمة مكتبة المقاييس (خفيف)
export interface AssessmentListItem {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  section_count: number;
  question_count: number;
  created_at: string;
}

// قراءة كاملة لمقياس — لعرض/تعبئة نموذج التقييم
export interface AssessmentDetail {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  sections: AssessmentSection[];
  questions: AssessmentQuestion[]; // أسئلة بلا قسم
  pre_options: AssessmentScaleOption[];
  post_options: AssessmentScaleOption[];
}

// بناء/تعديل مقياس (مدير فقط) — نفس بنية القراءة تقريبًا لكن قابلة للإرسال
export interface AssessmentBuilderData {
  id?: number;
  name: string;
  description: string;
  is_active: boolean;
  sections: {
    id?: number;
    name: string;
    order: number;
    questions: { id?: number; text: string; order: number }[];
  }[];
  scale_options: { id?: number; kind: ScaleOptionKind; label: string; order: number }[];
}

export interface StudentAssessmentAnswer {
  id: number;
  question: number;
  question_text: string;
  pre_rating: number | null;
  pre_rating_label: string | null;
  plan_text: string;
  post_rating: number | null;
  post_rating_label: string | null;
  updated_at: string;
}

export interface StudentAssessment {
  id: number;
  student: number;
  student_name: string;
  assessment: number;
  assessment_name: string;
  started_by?: number | null;
  started_by_name?: string | null;
  started_at: string;
  notes?: string;
  answers: StudentAssessmentAnswer[];
  created_at: string;
  updated_at: string;
}

export interface StudentAssessmentAnswerInput {
  question: number;
  pre_rating?: number | null;
  plan_text?: string;
  post_rating?: number | null;
}

export interface StudentAssessmentFormData {
  assessment: number;
  started_at: string;
  notes?: string;
  answers?: StudentAssessmentAnswerInput[];
}

// ─────────────────────────────────────────────
// التقارير
// ─────────────────────────────────────────────
export interface AttendanceReportSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused_absence: number;
  early_leave: number;
  attendance_rate: number;
  student_count: number;
  expected_days: number;
}

export interface AttendanceReportStudentRow {
  student_id: number;
  student_name: string;
  file_number: string;
  branch_name: string | null;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused_absence: number;
  early_leave: number;
  attendance_rate: number;
}

export interface AttendanceReport {
  date_from: string;
  date_to: string;
  summary: AttendanceReportSummary;
  by_student: AttendanceReportStudentRow[];
}

// ─────────────────────────────────────────────
// API Pagination
// ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────
export interface StudentFilters {
  search?: string;
  status?: StudentStatus | '';
  gender?: Gender | '';
  disability_type?: DisabilityType;
  nationality?: string;
  registration_from?: string;
  registration_to?: string;
  page?: number;
  ordering?: string;
}
