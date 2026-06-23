// ─────────────────────────────────────────────
// Branch
// ─────────────────────────────────────────────
export interface Branch {
  id: number;
  name: string;
  location: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  student_count: number;
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export type ModuleKey = 'students' | 'reports' | 'audit_logs' | 'users' | 'settings';

export interface ModulePermission {
  module: ModuleKey;
  can_view: boolean;
  can_edit: boolean;
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
}

export interface AuthTokens { access: string; refresh: string; }
export interface LoginResponse extends AuthTokens { user: User; }

// ─────────────────────────────────────────────
// Student
// ─────────────────────────────────────────────
export type StudentStatus =
  | 'pending' | 'active' | 'inactive'
  | 'graduated' | 'suspended' | 'transferred';

export type Gender = 'male' | 'female';

export type DisabilityType =
  | 'intellectual' | 'autism' | 'down' | 'physical'
  | 'hearing' | 'visual' | 'speech' | 'learning'
  | 'behavioral' | 'multiple' | 'other' | '';

export type DisabilityDegree = 'mild' | 'moderate' | 'severe' | 'profound' | '';
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
  disability_type?: DisabilityType;
  disability_type_display?: string;
  disability_degree?: DisabilityDegree;
  disability_degree_display?: string;
  diagnosis?: string;
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
  disability_type?: DisabilityType;
  disability_degree?: DisabilityDegree;
  diagnosis?: string;
  // تعليم
  educational_level?: EducationalLevel;
  school_name?: string;
  grade?: string;
  // إحالة
  referral_source?: ReferralSource;
  referral_source_detail?: string;
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
