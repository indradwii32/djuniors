// ============================================
// Djuniors Dashboard - API Utility & Client
// ============================================
// API base URL strategy (Task A):
//   - Production dev: read from `import.meta.env.VITE_API_BASE` injected at
//     build time (e.g. `VITE_API_BASE=https://api.djuniors.id`).
//   - Production with same-origin (CF Pages + custom domain configured for
//     cross-origin routing): `VITE_API_BASE=""` makes requests relative.
//   - Local dev: `/api` — Vite dev server proxies to wrangler on :8787.

const API_BASE = (() => {
    // Vite sets `import.meta.env.DEV = true` in dev mode.
    if (import.meta.env.DEV) {
        return '/api'; // Vite dev proxy → http://localhost:8787 (see vite.config.ts)
    }
    // Production: read env var injected at build time.
    const fromEnv = (import.meta.env.VITE_API_BASE ?? '').toString();
    return fromEnv || '/api';
})();
const TOKEN_STORAGE_KEY = 'djuniors_admin_token';
const ADMIN_USER_KEY = 'djuniors_admin_user';

// Types
export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'admin' | string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  admin?: AdminUser;
  error?: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalRegistrations?: number;
  activeClasses: number;
  totalRevenue: number;
  pendingPayments: number;
}

export interface ChartDataItem {
  month: string;
  pendapatan: number;
  siswa: number;
}

export interface LevelDistributionItem {
  name: string;
  value: number;
}

export interface DashboardChartData {
  chartData: ChartDataItem[];
  levelDistribution: LevelDistributionItem[];
}

export interface RegistrationChild {
  name: string;
  age_or_class?: string;
  age?: number | string;
  grade?: string;
  [key: string]: any;
}

export interface RegistrationItem {
  id: string;
  registration_number: string;
  parent_name: string;
  parent_phone: string;
  parent_email?: string;
  parent_city?: string;
  class_id: string;
  class_name?: string;
  class_price?: number;
  schedule_slot: string;
  children: RegistrationChild[] | string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  promo_code?: string;
  payment_method?: string;
  payment_proof_url?: string;
  status: 'pending' | 'confirmed' | 'rejected' | string;
  payment_status: 'unpaid' | 'paid' | 'rejected' | string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  tracking?: any[];
}

export interface Student {
  id: string;
  user_id?: string;
  full_name: string;
  birth_date?: string;
  grade?: string;
  school?: string;
  notes?: string;
  created_at: string;
}

export interface ScheduleSlot {
  day: string;
  start_time: string;
  end_time: string;
}

export interface ClassItem {
  id: string;
  name: string;
  icon?: string;
  image_url?: string | null;
  description?: string;
  level_id?: string;
  level_name?: string;
  level_grade_range?: string;
  price: number;
  max_students: number;
  schedule_slots?: ScheduleSlot[] | string;
  is_active: boolean | number;
  created_at: string;
}

export interface EnrollmentItem {
  id: string;
  student_id?: string;
  student_name?: string;
  class_id?: string;
  class_name?: string;
  parent_name?: string;
  parent_phone?: string;
  registration_number?: string;
  children?: RegistrationChild[] | string;
  schedule_slot?: string;
  amount?: number;
  final_amount?: number;
  status: 'pending' | 'active' | 'confirmed' | 'completed' | 'cancelled' | 'rejected' | string;
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'rejected' | string;
  payment_method?: string;
  payment_proof_url?: string;
  enrolled_at?: string;
  created_at?: string;
  expires_at?: string;
  notes?: string;
}

export interface PaymentItem {
  id: string;
  enrollment_id: string;
  student_id?: string;
  student_name?: string;
  class_name?: string;
  amount: number;
  method: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  proof_url?: string;
  notes?: string;
  created_at: string;
}

export interface PromoItem {
  id: string;
  code: string;
  icon?: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase: number;
  max_uses?: number;
  used_count: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean | number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id?: string;
  type: string;
  channel: string;
  title?: string;
  message?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_at: string;
}

export interface WATemplate {
  id: string;
  name: string;
  content: string;
  version?: number;
  updated_at?: string;
}

export interface FormItem {
  id: string;
  name: string;
  description?: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
  is_active: boolean | number;
  created_at: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean | number;
  created_at?: string;
}

export interface LevelItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  min_age?: number;
  max_age?: number;
  grade_range?: string;
  is_active: boolean | number;
  sort_order?: number;
  created_at?: string;
}

export interface CMSContentItem {
  id: string;
  section: string;
  key: string;
  value: string;
  type?: 'text' | 'html' | 'image' | 'json' | 'color' | string;
  updated_at?: string;
}

export interface CMSSettingItem {
  id: string;
  key: string;
  value: string;
  category?: 'general' | 'style' | 'seo' | 'social' | string;
  updated_at?: string;
}

export interface CMSFile {
  id: string;
  name: string;
  file_type: 'logo' | 'favicon' | 'hero_image' | 'class_image' | 'general' | string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  metadata?: Record<string, any> | string;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface CMSIcon {
  id: string;
  name: string;
  svg_code: string;
  category?: 'math' | 'kids' | 'education' | 'shapes' | 'general' | string;
  is_active: boolean | number;
  created_at?: string;
  updated_at?: string;
}




// Token Helpers
export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

export const getStoredAdminUser = (): AdminUser | null => {
  const json = localStorage.getItem(ADMIN_USER_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json) as AdminUser;
  } catch {
    return null;
  }
};

export const setStoredAdminUser = (user: AdminUser): void => {
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
};

// Generic Fetch Wrapper
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }


  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      (isJson && (data.error || data.message)) ||
      `HTTP error ${response.status}: ${response.statusText}`;

    // If unauthorized, clear storage token
    if (response.status === 401 && !endpoint.includes('/auth/admin/login')) {
      removeStoredToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    throw new Error(errorMessage);
  }

  return data as T;
}

// Auth Endpoints
export const authApi = {
  login: async (credentials: { username: string; password: string }): Promise<LoginResponse> => {
    const res = await apiRequest<LoginResponse>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.token && res.admin) {
      setStoredToken(res.token);
      setStoredAdminUser(res.admin);
    }
    return res;
  },

  logout: async (): Promise<{ success: boolean }> => {
    try {
      await apiRequest<{ success: boolean }>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // ignore server logout errors
    } finally {
      removeStoredToken();
    }
    return { success: true };
  },

  getMe: async (): Promise<AdminUser> => {
    const res = await apiRequest<AdminUser & { type: string }>('/auth/me');
    const admin: AdminUser = {
      id: res.id,
      username: res.username,
      name: res.name,
      role: res.role,
    };
    setStoredAdminUser(admin);
    return admin;
  },

  changePassword: async (data: { old_password: string; new_password: string }) => {
    return apiRequest<{ success: boolean; message: string }>('/auth/admin/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Dashboard Endpoints
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return apiRequest<DashboardStats>('/dashboard/stats');
  },
  getChartData: async (): Promise<DashboardChartData> => {
    return apiRequest<DashboardChartData>('/dashboard/chart-data');
  },
};

// Dashboard snapshot (pre-aggregated by daily cron — 1 small table read
// instead of GROUP BY over all registrations). `fresh: false` means no
// snapshot exists yet (fresh deploy); callers should fall back to live data.
export interface DashboardSnapshotsResponse {
  success: boolean;
  fresh: boolean;
  source: string;
  generated_at?: string;
  chartData?: ChartDataItem[];
  levelDistribution?: LevelDistributionItem[];
  current?: {
    revenue: number;
    students: number;
    registrations: number;
    pendingPayments: number;
  };
}

export const snapshotsApi = {
  get: async (): Promise<DashboardSnapshotsResponse> => {
    return apiRequest<DashboardSnapshotsResponse>('/dashboard/snapshots');
  },
  generate: async (): Promise<{ success: boolean; months_written: number }> => {
    return apiRequest<{ success: boolean; months_written: number }>('/dashboard/snapshots/generate', {
      method: 'POST',
    });
  },
};

// Students Endpoints
export const studentsApi = {
  getAll: async (): Promise<Student[]> => {
    return apiRequest<Student[]>('/students');
  },
  getById: async (id: string): Promise<Student> => {
    return apiRequest<Student>(`/students/${id}`);
  },
  create: async (data: Partial<Student>): Promise<{ success: boolean; id: string }> => {
    return apiRequest<{ success: boolean; id: string }>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<Student>): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/students/${id}`, {
      method: 'DELETE',
    });
  },
};

// Classes Endpoints
export const classesApi = {
  getAll: async (): Promise<ClassItem[]> => {
    return apiRequest<ClassItem[]>('/classes/all');
  },
  getById: async (id: string): Promise<ClassItem> => {
    return apiRequest<ClassItem>(`/classes/${id}`);
  },
  create: async (data: Partial<ClassItem>): Promise<{ success: boolean; id: string }> => {
    return apiRequest<{ success: boolean; id: string }>('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<ClassItem>): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/classes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Registrations Endpoints (Unified Registrations)
export interface PaginatedRegistrations {
  data: RegistrationItem[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    total_pages: number;
  };
}

export const registrationsApi = {
  getAll: async (params?: { status?: string; payment_status?: string; search?: string; limit?: number; page?: number; completed?: string }): Promise<PaginatedRegistrations> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.payment_status && params.payment_status !== 'all') query.append('payment_status', params.payment_status);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.page) query.append('page', String(params.page));
    if (params?.completed) query.append('completed', params.completed);
    const qs = query.toString() ? `?${query.toString()}` : '';
    // Server now returns { data: [...], pagination: {...} } instead of bare array.
    return apiRequest<PaginatedRegistrations>(`/registrations${qs}`);
  },
  getAllFlat: async (params?: { status?: string; payment_status?: string; search?: string; limit?: number; completed?: string }): Promise<RegistrationItem[]> => {
    // Convenience for callers (e.g. Enrollments fallback) that want the bare array.
    const res = await registrationsApi.getAll(params);
    return res.data;
  },
  getById: async (id: string): Promise<RegistrationItem> => {
    return apiRequest<RegistrationItem>(`/registrations/${id}`);
  },
  trackByNumber: async (regNumber: string): Promise<any> => {
    return apiRequest<any>(`/registrations/track/${encodeURIComponent(regNumber)}`);
  },
  updateStatus: async (
    id: string,
    data: { status?: string; payment_status?: string; notes?: string }
  ): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>(`/registrations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Enrollments Endpoints (Fallback and compatibility)
export const enrollmentsApi = {
  getAll: async (limit = 50, sort = 'recent'): Promise<EnrollmentItem[]> => {
    try {
      const regs = await registrationsApi.getAllFlat({ limit });
      if (Array.isArray(regs) && regs.length > 0) {
        return regs.map((r) => {
          let studentName = r.parent_name;
          if (r.children) {
            try {
              const parsed = typeof r.children === 'string' ? JSON.parse(r.children) : r.children;
              if (Array.isArray(parsed) && parsed[0]?.name) {
                studentName = parsed.map((c: any) => c.name).join(', ');
              }
            } catch {}
          }
          return {
            id: r.id,
            registration_number: r.registration_number,
            student_name: studentName,
            parent_name: r.parent_name,
            parent_phone: r.parent_phone,
            class_id: r.class_id,
            class_name: r.class_name,
            children: r.children,
            schedule_slot: r.schedule_slot,
            amount: r.final_amount || r.total_amount,
            final_amount: r.final_amount,
            status: r.status,
            payment_status: r.payment_status,
            payment_method: r.payment_method,
            payment_proof_url: r.payment_proof_url,
            enrolled_at: r.created_at,
            created_at: r.created_at,
            notes: r.notes,
          };
        });
      }
    } catch {}
    return apiRequest<EnrollmentItem[]>(`/enrollments?limit=${limit}&sort=${sort}`);
  },
  getById: async (id: string): Promise<EnrollmentItem> => {
    return apiRequest<EnrollmentItem>(`/enrollments/${id}`);
  },
  updateStatus: async (
    id: string,
    data: { status?: string; payment_status?: string; notes?: string }
  ): Promise<{ success: boolean }> => {
    try {
      return await registrationsApi.updateStatus(id, data);
    } catch {
      return apiRequest<{ success: boolean }>(`/enrollments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    }
  },
  cancel: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/enrollments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Payment Tracking Endpoints
export const paymentTrackingApi = {
  getAll: async (status?: string): Promise<any[]> => {
    const qs = status && status !== 'all' ? `?status=${status}` : '';
    return apiRequest<any[]>(`/payment-tracking${qs}`);
  },
  getByNumber: async (regNumber: string): Promise<any> => {
    return apiRequest<any>(`/payment-tracking/${encodeURIComponent(regNumber)}`);
  },
  confirm: async (
    id: string,
    status: 'confirmed' | 'rejected',
    notes?: string
  ): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>(`/payment-tracking/${id}/confirm`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },
};

// Payments Endpoints
export const paymentsApi = {
  getAll: async (): Promise<PaymentItem[]> => {
    return apiRequest<PaymentItem[]>('/payments');
  },
  getById: async (id: string): Promise<PaymentItem> => {
    return apiRequest<PaymentItem>(`/payments/${id}`);
  },
  verify: async (
    id: string,
    status: 'success' | 'failed' | 'refunded',
    notes?: string
  ): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/payments/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  },
  getBanks: async (): Promise<BankAccount[]> => {
    return apiRequest<BankAccount[]>('/payments/banks/list');
  },
};

// Promos Endpoints
export const promosApi = {
  getAll: async (): Promise<PromoItem[]> => {
    try {
      return await apiRequest<PromoItem[]>('/promo/all');
    } catch {
      return await apiRequest<PromoItem[]>('/promo');
    }
  },
  getById: async (id: string): Promise<PromoItem> => {
    return apiRequest<PromoItem>(`/promo/${id}`);
  },
  create: async (data: Partial<PromoItem>): Promise<{ success: boolean; id: string }> => {
    return apiRequest<{ success: boolean; id: string }>('/promo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<PromoItem>): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/promo/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/promo/${id}`, {
      method: 'DELETE',
    });
  },
};

// Custom Forms Endpoints
export const formsApi = {
  getAll: async (): Promise<FormItem[]> => {
    return apiRequest<FormItem[]>('/forms');
  },
  getById: async (id: string): Promise<FormItem> => {
    return apiRequest<FormItem>(`/forms/${id}`);
  },
  create: async (data: Partial<FormItem>): Promise<{ success: boolean; id: string }> => {
    return apiRequest<{ success: boolean; id: string }>('/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<FormItem>): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/forms/${id}`, {
      method: 'DELETE',
    });
  },
};

// Notifications Endpoints
export const notificationsApi = {
  getAll: async (): Promise<NotificationItem[]> => {
    return apiRequest<NotificationItem[]>('/notifications');
  },
  getTemplates: async (): Promise<WATemplate[]> => {
    return apiRequest<WATemplate[]>('/notifications/templates');
  },
  getTemplateById: async (id: string): Promise<WATemplate> => {
    return apiRequest<WATemplate>(`/notifications/templates/${encodeURIComponent(id)}`);
  },
  updateTemplate: async (
    id: string,
    data: { content: string; name?: string }
  ): Promise<{ success: boolean; template?: WATemplate }> => {
    return apiRequest<{ success: boolean; template?: WATemplate }>(
      `/notifications/templates/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  },
  getWaStatus: async (): Promise<{ connected: boolean; provider: string }> => {
    return apiRequest<{ connected: boolean; provider: string }>('/notifications/wa/status');
  },
  sendBulkPromo: async (
    promoId: string,
    message?: string
  ): Promise<{ sent: number; failed: number; total: number }> => {
    return apiRequest<{ sent: number; failed: number; total: number }>(
      '/notifications/wa/bulk-promo',
      {
        method: 'POST',
        body: JSON.stringify({ promoId, message }),
      }
    );
  },
  sendManual: async (data: {
    phone: string;
    message: string;
    template?: string;
    recipientName?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>('/notifications/wa', {
      method: 'POST',
      body: JSON.stringify({
        phone: data.phone,
        template: data.template || 'custom',
        data: {
          name: data.recipientName,
          message: data.message,
        },
      }),
    });
  },
  getFonnteToken: async (): Promise<{ token: string; isSet: boolean }> => {
    return apiRequest<{ token: string; isSet: boolean }>('/notifications/fonnte/token');
  },
  saveFonnteToken: async (token: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/notifications/fonnte/token', {
      method: 'PUT',
      body: JSON.stringify({ token }),
    });
  },
};

// Levels Endpoints
export const levelsApi = {
  getAll: async (): Promise<LevelItem[]> => {
    try {
      return await apiRequest<LevelItem[]>('/levels/all');
    } catch {
      return await apiRequest<LevelItem[]>('/levels');
    }
  },
  getActive: async (): Promise<LevelItem[]> => {
    return apiRequest<LevelItem[]>('/levels');
  },
  getById: async (id: string): Promise<LevelItem> => {
    return apiRequest<LevelItem>(`/levels/${id}`);
  },
  create: async (data: Partial<LevelItem>): Promise<{ success: boolean; id: string }> => {
    return apiRequest<{ success: boolean; id: string }>('/levels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<LevelItem>): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/levels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/levels/${id}`, {
      method: 'DELETE',
    });
  },
};

// CMS Endpoints
export const cmsApi = {
  getAll: async (): Promise<{ success: boolean; items: CMSContentItem[]; data: Record<string, any> }> => {
    return apiRequest<{ success: boolean; items: CMSContentItem[]; data: Record<string, any> }>('/cms');
  },
  getBySection: async (section: string): Promise<{ success: boolean; section: string; items: CMSContentItem[]; data: Record<string, any> }> => {
    return apiRequest<{ success: boolean; section: string; items: CMSContentItem[]; data: Record<string, any> }>(`/cms/${section}`);
  },
  create: async (data: Partial<CMSContentItem>): Promise<{ success: boolean; id?: string }> => {
    return apiRequest<{ success: boolean; id?: string }>('/cms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<CMSContentItem>): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/cms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/cms/${id}`, {
      method: 'DELETE',
    });
  },
  bulkUpdate: async (items: Array<{ id?: string; section: string; key: string; value: any; type?: string }>): Promise<{ success: boolean; count: number }> => {
    return apiRequest<{ success: boolean; count: number }>('/cms/bulk', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  },
  getSettings: async (): Promise<{ success: boolean; settings: CMSSettingItem[]; data: Record<string, string> }> => {
    return apiRequest<{ success: boolean; settings: CMSSettingItem[]; data: Record<string, string> }>('/cms/settings');
  },
  updateSetting: async (key: string, data: { value: string; category?: string }): Promise<{ success: boolean }> => {
    return apiRequest<{ success: boolean }>(`/cms/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  bulkUpdateSettings: async (settings: Array<{ key: string; value: string; category?: string }>): Promise<{ success: boolean; count: number }> => {
    return apiRequest<{ success: boolean; count: number }>('/cms/settings/bulk', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
  },
};

// CMS Files & Media Endpoints
export const cmsFilesApi = {
  getAll: async (params?: { type?: string; is_active?: boolean | number; search?: string }): Promise<{ success: boolean; count: number; files: CMSFile[] }> => {
    const query = new URLSearchParams();
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; files: CMSFile[] }>(`/cms/files${qs}`);
  },
  getByType: async (type: string): Promise<{ success: boolean; type: string; file: CMSFile | null; files: CMSFile[] }> => {
    return apiRequest<{ success: boolean; type: string; file: CMSFile | null; files: CMSFile[] }>(`/cms/files/${encodeURIComponent(type)}`);
  },
  upload: async (
    fileOrData: File | FormData | { file_url: string; name?: string; file_type?: string; metadata?: any; is_active?: boolean | number; class_id?: string },
    type?: string,
    metadata?: any
  ): Promise<{ success: boolean; id: string; file: CMSFile; message?: string }> => {
    if (typeof FormData !== 'undefined' && fileOrData instanceof FormData) {
      return apiRequest<{ success: boolean; id: string; file: CMSFile; message?: string }>('/cms/files/upload', {
        method: 'POST',
        body: fileOrData,
      });
    } else if (typeof File !== 'undefined' && (fileOrData instanceof File || fileOrData instanceof Blob)) {
      const formData = new FormData();
      formData.append('file', fileOrData);
      if (type) formData.append('file_type', type);
      if (fileOrData instanceof File && fileOrData.name) formData.append('name', fileOrData.name);
      if (metadata) {
        formData.append('metadata', typeof metadata === 'string' ? metadata : JSON.stringify(metadata));
        if (metadata.class_id) {
          formData.append('class_id', metadata.class_id);
        }
      }
      return apiRequest<{ success: boolean; id: string; file: CMSFile; message?: string }>('/cms/files/upload', {
        method: 'POST',
        body: formData,
      });
    } else {
      return apiRequest<{ success: boolean; id: string; file: CMSFile; message?: string }>('/cms/files/upload', {
        method: 'POST',
        body: JSON.stringify(fileOrData),
      });
    }
  },
  update: async (id: string, data: Partial<CMSFile>): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>(`/cms/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>(`/cms/files/${id}`, {
      method: 'DELETE',
    });
  },
};

// CMS SVG Icons Endpoints
export const cmsIconsApi = {
  getAll: async (params?: { category?: string; search?: string; is_active?: boolean | number }): Promise<{ success: boolean; count: number; categories: string[]; icons: CMSIcon[] }> => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'all') query.append('category', params.category);
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<{ success: boolean; count: number; categories: string[]; icons: CMSIcon[] }>(`/cms/icons${qs}`);
  },
  getByCategory: async (category: string): Promise<{ success: boolean; count: number; category: string; icons: CMSIcon[] }> => {
    return apiRequest<{ success: boolean; count: number; category: string; icons: CMSIcon[] }>(`/cms/icons/${encodeURIComponent(category)}`);
  },
  getById: async (id: string): Promise<{ success: boolean; icon: CMSIcon }> => {
    return apiRequest<{ success: boolean; icon: CMSIcon }>(`/cms/icons/${id}`);
  },
  create: async (data: { name: string; svg_code: string; category?: string; is_active?: boolean | number }): Promise<{ success: boolean; id: string; icon: CMSIcon; message?: string }> => {
    return apiRequest<{ success: boolean; id: string; icon: CMSIcon; message?: string }>('/cms/icons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: Partial<CMSIcon>): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>(`/cms/icons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string): Promise<{ success: boolean; message?: string }> => {
    return apiRequest<{ success: boolean; message?: string }>(`/cms/icons/${id}`, {
      method: 'DELETE',
    });
  },
};

// Health Check
export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  return apiRequest<{ status: string; service: string }>('/health');
};

