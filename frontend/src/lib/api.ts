import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = Cookies.get('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
          refresh,
        });
        Cookies.set('access_token', data.access, { expires: 1 });
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),
  profile: () => api.get('/auth/profile/'),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password/', { old_password, new_password }),
  users: () => api.get('/auth/users/'),
  createUser: (data: unknown) => api.post('/auth/users/', data),
  updateUser: (id: number, data: unknown) => api.patch(`/auth/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}/`),
};

// ─────────────────────────────────────────────
// Students
// ─────────────────────────────────────────────
export const studentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/students/', { params }),
  detail: (id: number) => api.get(`/students/${id}/`),
  create: (data: FormData) =>
    api.post('/students/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, data: FormData | Record<string, unknown>) => {
    const isFormData = data instanceof FormData;
    return api.patch(`/students/${id}/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
  },
  delete: (id: number) => api.delete(`/students/${id}/`),
  accept: (id: number) =>
    api.post(`/students/${id}/accept/`),
  reject: (id: number, reason: string) =>
    api.post(`/students/${id}/reject/`, { reason }),
  restore: (id: number) =>
    api.post(`/students/${id}/restore/`),
  export: () =>
    api.get('/students/export/', { responseType: 'blob' }),
  exportCsv: () =>
    api.get('/students/export/csv/', { responseType: 'blob' }),
  importExcel: (data: FormData) =>
    api.post('/students/import/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importTemplate: () =>
    api.get('/students/import/template/', { responseType: 'blob' }),
  importCsv: (data: FormData) =>
    api.post('/students/import/csv/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importCsvTemplate: () =>
    api.get('/students/import/csv/template/', { responseType: 'blob' }),
};

// ─────────────────────────────────────────────
// Guardians
// ─────────────────────────────────────────────
export const guardiansApi = {
  list: (studentId: number) => api.get(`/students/${studentId}/guardians/`),
  create: (studentId: number, data: unknown) =>
    api.post(`/students/${studentId}/guardians/`, data),
  update: (studentId: number, id: number, data: unknown) =>
    api.patch(`/students/${studentId}/guardians/${id}/`, data),
  delete: (studentId: number, id: number) =>
    api.delete(`/students/${studentId}/guardians/${id}/`),
};

// ─────────────────────────────────────────────
// Family
// ─────────────────────────────────────────────
export const familyApi = {
  get: (studentId: number) => api.get(`/students/${studentId}/family/`),
  create: (studentId: number, data: unknown) =>
    api.post(`/students/${studentId}/family/`, data),
  update: (studentId: number, data: unknown) =>
    api.put(`/students/${studentId}/family/`, data),
};

// ─────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────
export const branchesApi = {
  list:   ()                              => api.get('/branches/'),
  create: (data: Record<string, unknown>) => api.post('/branches/', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/branches/${id}/`, data),
  delete: (id: number)                    => api.delete(`/branches/${id}/`),
};

export const siteSettingsApi = {
  get:    () => api.get('/settings/'),
  update: (data: FormData | Record<string, unknown>) => {
    const isFormData = data instanceof FormData;
    return api.patch('/settings/', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
  },
};

export const busesApi = {
  list:   (params?: Record<string, unknown>) => api.get('/buses/', { params }),
  create: (data: Record<string, unknown>)    => api.post('/buses/', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/buses/${id}/`, data),
  delete: (id: number)                       => api.delete(`/buses/${id}/`),
};

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats/'),
};

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────
export const attendanceApi = {
  list: (studentId: number, params?: Record<string, unknown>) =>
    api.get(`/students/${studentId}/attendance/`, { params }),
  create: (studentId: number, data: unknown) =>
    api.post(`/students/${studentId}/attendance/`, data),
  update: (studentId: number, id: number, data: unknown) =>
    api.patch(`/students/${studentId}/attendance/${id}/`, data),
  delete: (studentId: number, id: number) =>
    api.delete(`/students/${studentId}/attendance/${id}/`),
  // Daily attendance sheet — all active students + their record for a date
  sheet: (params: { date: string; branch?: string; search?: string }) =>
    api.get('/attendance/sheet/', { params }),
};

// ─────────────────────────────────────────────
// الجدول الدراسي
// ─────────────────────────────────────────────
export const scheduleApi = {
  list: (studentId: number) =>
    api.get(`/students/${studentId}/schedule/`),
  create: (studentId: number, data: unknown) =>
    api.post(`/students/${studentId}/schedule/`, data),
  update: (studentId: number, id: number, data: unknown) =>
    api.patch(`/students/${studentId}/schedule/${id}/`, data),
  delete: (studentId: number, id: number) =>
    api.delete(`/students/${studentId}/schedule/${id}/`),
  // حصص جماعية — عدة طلاب دفعة واحدة
  bulkCreate: (data: unknown) => api.post('/schedule/bulk/', data),
  classes:    (branchId: number) => api.get('/schedule/classes/', { params: { branch: branchId } }),
};

// ─────────────────────────────────────────────
// الملف الطبي
// ─────────────────────────────────────────────
export const medicalApi = {
  getProfile:    (studentId: number) => api.get(`/students/${studentId}/medical-profile/`),
  createProfile: (studentId: number, data: unknown) => api.post(`/students/${studentId}/medical-profile/`, data),
  updateProfile: (studentId: number, data: unknown) => api.put(`/students/${studentId}/medical-profile/`, data),

  visits: {
    list:   (studentId: number) => api.get(`/students/${studentId}/medical-visits/`),
    create: (studentId: number, data: unknown) => api.post(`/students/${studentId}/medical-visits/`, data),
    delete: (studentId: number, id: number) => api.delete(`/students/${studentId}/medical-visits/${id}/`),
  },
  medications: {
    list:   (studentId: number) => api.get(`/students/${studentId}/medications/`),
    create: (studentId: number, data: unknown) => api.post(`/students/${studentId}/medications/`, data),
    update: (studentId: number, id: number, data: unknown) => api.patch(`/students/${studentId}/medications/${id}/`, data),
    delete: (studentId: number, id: number) => api.delete(`/students/${studentId}/medications/${id}/`),
  },
  checkins: {
    list:   (studentId: number) => api.get(`/students/${studentId}/medical-checkins/`),
    create: (studentId: number, data: unknown) => api.post(`/students/${studentId}/medical-checkins/`, data),
    update: (studentId: number, id: number, data: unknown) => api.patch(`/students/${studentId}/medical-checkins/${id}/`, data),
  },
  sheet: (params: { date: string; branch: number; search?: string }) => api.get('/medical/sheet/', { params }),
};

// ─────────────────────────────────────────────
// المقاييس والخطط الدراسية
// ─────────────────────────────────────────────
export const assessmentsApi = {
  // مكتبة المقاييس
  list:    () => api.get('/assessments/'),
  detail:  (id: number) => api.get(`/assessments/${id}/`),
  create:  (data: unknown) => api.post('/assessments/', data),
  update:  (id: number, data: unknown) => api.patch(`/assessments/${id}/`, data),
  delete:  (id: number) => api.delete(`/assessments/${id}/`),
};

export const studentAssessmentsApi = {
  list:   (studentId: number) => api.get(`/students/${studentId}/assessments/`),
  detail: (studentId: number, id: number) => api.get(`/students/${studentId}/assessments/${id}/`),
  create: (studentId: number, data: unknown) => api.post(`/students/${studentId}/assessments/`, data),
  update: (studentId: number, id: number, data: unknown) => api.patch(`/students/${studentId}/assessments/${id}/`, data),
  delete: (studentId: number, id: number) => api.delete(`/students/${studentId}/assessments/${id}/`),
};

// ─────────────────────────────────────────────
// التقارير
// ─────────────────────────────────────────────
export const reportsApi = {
  attendance: (params: { date_from: string; date_to: string; branch?: string; student?: string }) =>
    api.get('/reports/attendance/', { params }),
  attendanceExport: (params: { date_from: string; date_to: string; branch?: string; student?: string }) =>
    api.get('/reports/attendance/export/', { params, responseType: 'blob' }),
};

// ─────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────
export const auditLogsApi = {
  list: (params?: Record<string, unknown>) => api.get('/audit-logs/', { params }),
};

// ─────────────────────────────────────────────
// Attachments
// ─────────────────────────────────────────────
export const attachmentsApi = {
  list: (studentId: number) => api.get(`/students/${studentId}/attachments/`),
  upload: (studentId: number, data: FormData) =>
    api.post(`/students/${studentId}/attachments/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (studentId: number, id: number) =>
    api.delete(`/students/${studentId}/attachments/${id}/`),
};
