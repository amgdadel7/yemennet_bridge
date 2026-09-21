'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/context/AuthContext';
import { useToast } from '../../lib/context/ToastContext';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(phone, password);
      if (res.success) {
        addToast('success', 'تم تسجيل الدخول بنجاح');
        router.push('/dashboard');
      } else {
        setError(res.error || 'بيانات الدخول غير صحيحة');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-sky-500/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <Image
                src="/logo.png"
                alt="Al-Naqib Soft"
                width={80}
                height={80}
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-white">مرحباً بعودتك</h1>
          <p className="text-blue-200 mt-2">سجّل دخولك للوصول للوحة التحكم</p>

          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-xl text-center">
            <p className="text-cyan-200 text-sm">
              💡 أدخل بيانات الدخول التي حصلت عليها من البوت عند إرسال أمر{' '}
              <code className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">/dashboard</code>
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          {error && (
            <div className="mb-5 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-blue-100 mb-2">
                اسم المستخدم
              </label>
              <input
                type="tel"
                id="phone"
                className="w-full px-4 py-3.5 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:border-sky-400 focus:bg-white/20 transition-all"
                placeholder="77xxxxxxx"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-blue-100 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-3.5 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:border-sky-400 focus:bg-white/20 transition-all"
                placeholder="••••••••"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/30 bg-white/10 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
                />
                <span className="mr-2 text-sm text-blue-200">تذكرني</span>
              </label>
              <button
                type="button"
                onClick={() => addToast('info', 'يرجى مراجعة البوت في تيليجرام لاستعادة كلمة المرور')}
                className="text-sm text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-sm text-blue-200">
              ليس لديك حساب بعد؟{' '}
              <Link href="/register" className="text-sky-400 hover:text-sky-300 font-bold transition-colors">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-blue-300/50 text-xs mt-8">
          © 2026 Al-Naqib Soft - جميع الحقوق محفوظة
        </p>
      </div>
    </main>
  );
}
