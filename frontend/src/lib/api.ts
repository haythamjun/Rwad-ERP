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
  export: () =>
    api.get('/students/export/', { responseType: 'blob' }),
  importExcel: (data: FormData) =>
    api.post('/students/import/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  importTemplate: () =>
    api.get('/students/import/template/', { responseType: 'blob' }),
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
  list:   ()                              => api.get('/core/branches/'),
  create: (data: Record<string, unknown>) => api.post('/core/branches/', data),
  update: (id: number, data: Record<string, unknown>) => api.patch(`/core/branches/${id}/`, data),
  delete: (id: number)                    => api.delete(`/core/branches/${id}/`),
};

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/core/dashboard/stats/'),
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
};

// ─────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────
export const auditLogsApi = {
  list: (params?: Record<string, unknown>) => api.get('/core/audit-logs/', { params }),
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
