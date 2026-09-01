// ============================================
// Djuniors - TypeScript Types
// ============================================

export interface Bindings {
    DB: D1Database;
    R2: R2Bucket;
    KV: KVNamespace;
    WA_FONNTE_TOKEN?: string;
    JWT_SECRET?: string;
    TURNSTILE_SECRET: string;
    TURNSTILE_SITE_KEY: string;
    ENVIRONMENT: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: 'student' | 'parent' | 'admin' | 'teacher';
    avatar_url?: string;
    created_at: string;
}

export interface Student {
    id: string;
    user_id: string;
    full_name: string;
    birth_date?: string;
    grade?: string;
    school?: string;
    notes?: string;
    created_at: string;
}

export interface ScheduleSlot {
    day: string;
    start?: string;
    end?: string;
    start_time?: string;
    end_time?: string;
}

export interface Class {
    id: string;
    name: string;
    description?: string;
    level_id?: string;
    level_name?: string;
    price: number;
    max_students: number;
    schedule_slots?: ScheduleSlot[] | string;
    is_active: boolean;
    created_at: string;
}

export interface Level {
    id: string;
    name: string;
    description?: string;
    min_age?: number;
    max_age?: number;
    grade_range?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export interface RegistrationChild {
    name: string;
    age_or_class?: string;
    age?: number | string;
    grade?: string;
    [key: string]: any;
}

export interface Registration {
    id: string;
    registration_number: string;
    parent_name: string;
    parent_phone: string;
    parent_email?: string;
    parent_city?: string;
    class_id: string;
    class_name?: string;
    schedule_slot: string;
    children: RegistrationChild[] | string;
    total_amount: number;
    discount_amount: number;
    final_amount: number;
    promo_code?: string;
    payment_method?: 'bank_transfer' | 'ewallet' | 'qris' | string;
    payment_proof_url?: string;
    status: 'pending' | 'confirmed' | 'rejected';
    payment_status: 'unpaid' | 'paid' | 'rejected';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface PaymentTracking {
    id: string;
    registration_id: string;
    registration_number: string;
    parent_phone: string;
    amount: number;
    payment_method?: string;
    proof_url?: string;
    status: 'pending' | 'confirmed' | 'rejected';
    confirmed_by?: string;
    confirmed_at?: string;
    notes?: string;
    created_at: string;
}

export interface Enrollment {
    id: string;
    student_id: string;
    class_id: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    payment_status: 'unpaid' | 'paid' | 'refunded';
    payment_method?: string;
    payment_proof_url?: string;
    enrolled_at: string;
    expires_at?: string;
}

export interface Payment {
    id: string;
    enrollment_id: string;
    amount: number;
    method: string;
    status: 'pending' | 'success' | 'failed' | 'refunded';
    proof_url?: string;
    notes?: string;
    created_at: string;
}

export interface Promo {
    id: string;
    code: string;
    description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_purchase: number;
    max_uses?: number;
    used_count: number;
    start_date?: string;
    end_date?: string;
    is_active: boolean;
    created_at: string;
}

export interface AdminAccount {
    id: string;
    username: string;
    password_hash: string;
    name: string;
    role: 'admin' | 'super_admin';
    is_active: boolean;
    last_login?: string;
    created_at: string;
}

export interface BankAccount {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    is_active: boolean;
    created_at: string;
}

export interface JWTPayload {
    userId: string;
    email?: string;
    username?: string;
    role: string;
    type: 'user' | 'admin';
    exp: number;
}

export interface Variables {
    jwtPayload: JWTPayload;
}

export interface Notification {
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
    updated_at: string;
}

export interface CustomForm {
    id: string;
    name: string;
    description?: string;
    fields: FormField[];
    is_active: boolean;
    created_at: string;
}

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'radio' | 'checkbox';
    required: boolean;
    options?: string[];
    placeholder?: string;
}

export interface CMSContent {
    id: string;
    section: string;
    key: string;
    value: string;
    type?: 'text' | 'html' | 'image' | 'json' | 'color' | string;
    updated_at?: string;
}

export interface CMSSetting {
    id: string;
    key: string;
    value: string;
    category?: 'general' | 'style' | 'seo' | 'social' | string;
    updated_at?: string;
}

export interface CMSFile {
    id: string;
    name: string;
    original_name?: string;
    file_type: 'logo' | 'favicon' | 'hero_image' | 'hero' | 'class_image' | 'general' | string;
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


