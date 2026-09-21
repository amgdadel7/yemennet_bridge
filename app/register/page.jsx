'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/context/AuthContext';
import { useToast } from '../../lib/context/ToastContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { register } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة، يرجى التأكد وإعادة المحاولة');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 خانات');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register(phone.trim(), password, name.trim());
      if (res.success) {
        addToast('success', 'تم إنشاء الحساب في قاعدة البيانات بنجاح!');
        router.push('/dashboard');
      } else {
        setError(res.error || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالخادم');
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

      <div className="max-w-md w-full relative z-10 py-8">
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
          <h1 className="text-3xl font-black text-white">إنشاء حساب جديد</h1>
          <p className="text-blue-200 mt-2">انضم لمنصة مراقبة اشتراكات يمن نت الذكية</p>
        </div>

        {/* Card Form */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-blue-100 mb-1.5">
                الاسم الكامل
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:border-sky-400 focus:bg-white/20 transition-all"
                placeholder="أحمد محمد"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-blue-100 mb-1.5">
                رقم الهاتف / اسم المستخدم
              </label>
              <input
                type="tel"
                id="phone"
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:border-sky-400 focus:bg-white/20 transition-all"
                placeholder="77xxxxxxx"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-blue-100 mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:border-sky-400 focus:bg-white/20 transition-all"
                placeholder="لا تقل عن 6 خانات"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-blue-100 mb-1.5">
                تأكيد كلمة المرور
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-blue-200/50 focus:outline-none focus:border-sky-400 focus:bg-white/20 transition-all"
                placeholder="أعد كتابة كلمة المرور"
                required
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب الآن'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <p className="text-sm text-blue-200">
              لديك حساب بالفعل؟{' '}
              <Link href="/login" className="text-sky-400 hover:text-sky-300 font-bold transition-colors">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-blue-300/50 text-xs mt-6">
          © 2026 Al-Naqib Soft - جميع الحقوق محفوظة
        </p>
      </div>
    </main>
  );
}
