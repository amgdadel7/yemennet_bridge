'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../lib/context/AuthContext';
import { useToast } from '../../../../lib/context/ToastContext';
import { supabase } from '../../../../lib/supabase';
import { INITIAL_ACCOUNTS } from '../../../../lib/demoData';

export default function NewAccountPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create new account object
      const newAcc = {
        id: Date.now().toString(),
        user_id: user?.id || 'demo_user',
        label: label.trim(),
        username: username.trim(),
        balance: '50.00 GB',
        expiry: '30/11/2026',
        status: 'نشط 🟢',
        type: username.startsWith('7') ? '4G' : 'ADSL',
        speed: username.startsWith('7') ? '25 Mbps' : '8 Mbps',
        ip: '10.140.22.8',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert directly into Supabase database
      const { error: insertErr } = await supabase.from('accounts').insert({
        id: newAcc.id,
        user_id: user?.id || 'usr_default',
        label: newAcc.label,
        username: newAcc.username,
        password: password,
        balance: newAcc.balance,
        expiry: newAcc.expiry,
        status: newAcc.status,
        type: newAcc.type,
        speed: newAcc.speed,
        ip: newAcc.ip,
      });

      if (insertErr) {
        throw new Error(insertErr.message || 'فشل حفظ الحساب في قاعدة البيانات');
      }

      // Record in activity_logs in database
      try {
        await supabase.from('activity_logs').insert({
          user_id: user?.id || 'usr_default',
          account_id: newAcc.id,
          title: 'إضافة اشتراك جديد',
          details: `تمت إضافة الاشتراك (${newAcc.label} - ${newAcc.username}) بنجاح`,
          type: 'info',
        });
      } catch (logErr) {}

      setIsSuccess(true);
      addToast('success', 'تم إضافة الحساب بنجاح');
      setTimeout(() => {
        router.push('/dashboard/accounts');
      }, 2000);
    } catch (err) {
      setError('فشل إضافة الحساب، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-12 animate-fade-in">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            تم إضافة الحساب بنجاح! 🎉
          </h1>
          <p className="text-gray-500 dark:text-gray-400">جاري التحويل لقائمة الحسابات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">إضافة حساب يمن نت</h1>
        <p className="text-gray-500 dark:text-gray-400">أدخل بيانات حسابك لبدء المتابعة</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-8 shadow-sm">
        {error && (
          <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              اسم الحساب (تسمية توضيحية)
            </label>
            <input
              type="text"
              placeholder="مثال: راوتر المنزل، محل التقنية..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              اسم المستخدم (رقم الخط)
            </label>
            <input
              type="text"
              placeholder="01xxxxxx أو 77xxxxxxx"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              dir="ltr"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              كلمة المرور الخاصة باشتراك يمن نت
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <Link
              href="/dashboard/accounts"
              className="px-6 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 text-center"
            >
              {isLoading ? 'جاري الإضافة...' : 'حفظ ومتابعة الحساب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
