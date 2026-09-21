-- ============================================================
-- SQL Schema for Yemen Net Monitor (Supabase / PostgreSQL)
-- Project: https://glshrlfjnlhcjzqvijsx.supabase.co
-- ============================================================

-- 1. جدول المستخدمين (users)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول الحسابات والاشتراكات (accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT,
    balance TEXT DEFAULT '0.00 GB',
    expiry TEXT,
    status TEXT DEFAULT 'نشط 🟢',
    type TEXT DEFAULT 'ADSL',
    speed TEXT DEFAULT '8 Mbps',
    ip TEXT DEFAULT '10.140.22.8',
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الاستهلاك اليومي والتاريخي (daily_usage)
CREATE TABLE IF NOT EXISTS public.daily_usage (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    display_date TEXT,
    balance_gb NUMERIC(10, 2) DEFAULT 0,
    usage_gb NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول إعدادات التنبيهات (user_settings)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id TEXT PRIMARY KEY,
    email_alerts BOOLEAN DEFAULT TRUE,
    sms_alerts BOOLEAN DEFAULT TRUE,
    expiry_warning_days INTEGER DEFAULT 3,
    balance_warning_gb INTEGER DEFAULT 5,
    theme TEXT DEFAULT 'dark',
    auto_sync BOOLEAN DEFAULT TRUE,
    sync_interval_hours INTEGER DEFAULT 6,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول سجل النشاطات (activity_logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT,
    title TEXT NOT NULL,
    details TEXT,
    type TEXT DEFAULT 'info',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. جدول الإشعارات والتنبيهات (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- تفعيل سياسات الأمان (Row Level Security - RLS)
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول الشاملة للمفاتيح (anon / authenticated / service_role)
DROP POLICY IF EXISTS "Public access users" ON public.users;
CREATE POLICY "Public access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access accounts" ON public.accounts;
CREATE POLICY "Public access accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access daily_usage" ON public.daily_usage;
CREATE POLICY "Public access daily_usage" ON public.daily_usage FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access user_settings" ON public.user_settings;
CREATE POLICY "Public access user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access activity_logs" ON public.activity_logs;
CREATE POLICY "Public access activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access notifications" ON public.notifications;
CREATE POLICY "Public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- منح الصلاحيات
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================
-- بيانات أولية افتراضية (Seed Data)
-- ============================================================

-- المستخدم الافتراضي
INSERT INTO public.users (id, phone, name, password_hash, role)
VALUES ('usr_777000111', '777000111', 'النقيب للمعلومات', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'admin')
ON CONFLICT (phone) DO NOTHING;

-- الحسابات الافتراضية
INSERT INTO public.accounts (id, user_id, label, username, balance, expiry, status, type, speed, ip)
VALUES
  ('1', 'usr_777000111', 'المنزل الرئيسي - ADSL', '01234567', '65.40 GB', '25/10/2026', 'نشط 🟢', 'ADSL', '8 Mbps', '10.120.45.18'),
  ('2', 'usr_777000111', 'المكتب - يمن فورجي 4G', '712345678', '118.25 GB', '05/11/2026', 'نشط 🟢', '4G', '30 Mbps', '10.88.12.9'),
  ('3', 'usr_777000111', 'معرض التقنية - ADSL', '01889900', '6.50 GB', '24/09/2026', 'تحذير 🟡', 'ADSL', '4 Mbps', '10.110.33.2'),
  ('4', 'usr_777000111', 'المستودع - ADSL', '01554433', '0.00 GB', '12/09/2026', 'منتهي 🔴', 'ADSL', '2 Mbps', 'غير متصل')
ON CONFLICT (id) DO NOTHING;
