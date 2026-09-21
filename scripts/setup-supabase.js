const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected to Supabase PostgreSQL successfully!');

    // 1. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id text PRIMARY KEY,
        phone text UNIQUE NOT NULL,
        name text NOT NULL,
        password_hash text NOT NULL,
        role text DEFAULT 'user',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('Table "users" created.');

    // 2. Create accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.accounts (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        label text NOT NULL,
        username text NOT NULL,
        password text,
        balance text DEFAULT '0.00 GB',
        expiry text,
        status text DEFAULT 'نشط 🟢',
        type text DEFAULT 'ADSL',
        speed text DEFAULT '8 Mbps',
        ip text DEFAULT '10.140.22.8',
        last_synced timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('Table "accounts" created.');

    // 3. Create daily_usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.daily_usage (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
        date date NOT NULL,
        display_date text,
        balance_gb numeric(10, 2) DEFAULT 0,
        usage_gb numeric(10, 2) DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('Table "daily_usage" created.');

    // 4. Create user_settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id text PRIMARY KEY,
        email_alerts boolean DEFAULT true,
        sms_alerts boolean DEFAULT true,
        expiry_warning_days integer DEFAULT 3,
        balance_warning_gb integer DEFAULT 5,
        theme text DEFAULT 'dark',
        auto_sync boolean DEFAULT true,
        sync_interval_hours integer DEFAULT 6,
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log('Table "user_settings" created.');

    // 5. Create activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.activity_logs (
        id serial PRIMARY KEY,
        user_id text NOT NULL,
        account_id text,
        title text NOT NULL,
        details text,
        type text DEFAULT 'info',
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('Table "activity_logs" created.');

    // 6. Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        type text DEFAULT 'info',
        read boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log('Table "notifications" created.');

    // 7. Enable RLS and create public policies
    await client.query(`
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

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

      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    `);
    console.log('Row Level Security & policies configured for anon/authenticated access.');

    console.log('ALL TABLES CREATED SUCCESSFULLY WITHOUT ANY DATA!');
  } catch (err) {
    console.error('Error setting up Supabase:', err);
  } finally {
    await client.end();
  }
}

run();
