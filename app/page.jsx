'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Background Animated Orbs & Grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -right-40 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div
          style={{ animationDelay: '1s' }}
          className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse"
        ></div>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]"></div>

        {/* Floating dust particles */}
        {mounted && (
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                style={{
                  left: `${(i * 19) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  animationDelay: `${(i * 0.7) % 5}s`,
                  animationDuration: `${7 + (i % 6)}s`,
                }}
                className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-float"
              ></div>
            ))}
          </div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f08_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation Header */}
        <header className="p-4 md:p-6 sticky top-0 z-50 backdrop-blur-xl bg-slate-950/50 border-b border-white/5">
          <nav className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="drop-shadow-lg group-hover:scale-105 transition-transform"
              />
              <span
                style={{ fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}
                className="text-lg font-bold text-white tracking-tight hidden sm:block"
              >
                النقيب سوفت
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-blue-200 hover:text-white transition-colors font-medium px-4 py-2 rounded-xl hover:bg-white/5"
              >
                تسجيل الدخول
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 py-12 md:py-0">
          <div className="max-w-5xl mx-auto text-center">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-400/20 rounded-full mb-8 backdrop-blur">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-blue-200 text-sm font-medium">متاح الآن مجاناً للجميع</span>
            </div>

            {/* Central Logo */}
            <div className="mb-8 flex justify-center">
              <Image
                src="/logo.png"
                alt="Al-Naqib Soft"
                width={120}
                height={120}
                priority
                className="drop-shadow-xl"
              />
            </div>

            {/* Heading */}
            <h1
              style={{ fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
            >
              راقب اشتراكاتك
              <br />
              <span
                style={{ fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}
                className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent"
              >
                بذكاء وسهولة
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              نظام متكامل لمتابعة اشتراكات يمن نت وإدارتها بشكل آلي.
              <span className="text-cyan-300"> تنبيهات فورية</span>،
              <span className="text-blue-300"> تقارير شاملة</span>، ومتابعة ذكية للرصيد.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/login"
                className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-400/50 transition-all flex items-center justify-center gap-3 hover:scale-105"
              >
                <span>ابدأ الآن مجاناً</span>
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 group-hover:-translate-x-1 transition-transform"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="https://t.me/alnaqeebnet_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-3"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-400">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.534.26l.193-2.98 5.46-4.93c.24-.213-.054-.334-.373-.121l-6.74 4.244-2.9-.918c-.632-.2-.654-.632.132-.936l11.32-4.362c.527-.2.99.128.82.93z" />
                </svg>
                <span>جرّب البوت</span>
              </a>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto mb-16">
              <div className="text-center p-4 bg-white/5 backdrop-blur rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">500+</div>
                <div className="text-xs md:text-sm text-blue-200/60">مستخدم نشط</div>
              </div>
              <div className="text-center p-4 bg-white/5 backdrop-blur rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">24/7</div>
                <div className="text-xs md:text-sm text-blue-200/60">مراقبة مستمرة</div>
              </div>
              <div className="text-center p-4 bg-white/5 backdrop-blur rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="text-2xl md:text-3xl font-black text-white mb-1">99%</div>
                <div className="text-xs md:text-sm text-blue-200/60">دقة التنبيهات</div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="group p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-7 h-7 text-white">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">تنبيهات فورية</h3>
                <p className="text-blue-100/60 text-sm leading-relaxed">
                  إشعارات تلقائية عند اقتراب انتهاء الاشتراك أو نفاد الرصيد
                </p>
              </div>

              <div className="group p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-400 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-7 h-7 text-white">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">تقارير شاملة</h3>
                <p className="text-blue-100/60 text-sm leading-relaxed">
                  إحصائيات تفصيلية وتقارير PDF قابلة للتحميل
                </p>
              </div>

              <div className="group p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl hover:border-white/20 hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-7 h-7 text-white">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">آمن وموثوق</h3>
                <p className="text-blue-100/60 text-sm leading-relaxed">
                  بياناتك محمية ومشفرة بأعلى معايير الأمان
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 text-center border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-blue-200/40 text-sm">© 2026 Al-Naqib Soft - جميع الحقوق محفوظة</p>
            <div className="flex items-center gap-6">
              <a
                href="https://t.me/alnaqeebnet_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200/40 hover:text-blue-200 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.534.26l.193-2.98 5.46-4.93c.24-.213-.054-.334-.373-.121l-6.74 4.244-2.9-.918c-.632-.2-.654-.632.132-.936l11.32-4.362c.527-.2.99.128.82.93z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
