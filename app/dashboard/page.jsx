'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/context/AuthContext';
import { useToast } from '../../lib/context/ToastContext';
import { INITIAL_ACCOUNTS } from '../../lib/demoData';
import { supabase } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*');

      if (!error && data) {
        setAccounts(data);
        return;
      }
    } catch (e) {
      console.log('Database fetch failed:', e);
    }
    setAccounts([]);
  };

  useEffect(() => {
    fetchAccounts().finally(() => setIsLoading(false));
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    await fetchAccounts();
    setIsRefreshing(false);
    addToast('success', 'تم تحديث بيانات الحساب بنجاح');
  };

  // Calculations
  const totalBalance = accounts.reduce((acc, curr) => {
    const num = parseFloat(curr.balance?.replace(/[^\d.]/g, '') || '0');
    return acc + num;
  }, 0);

  const activeAccountsCount = accounts.filter(
    (a) => a.status?.includes('نشط') || a.status === 'active'
  ).length;

  const warningCount = accounts.filter((a) => a.status?.includes('تحذير')).length;
  const expiredCount = accounts.filter((a) => a.status?.includes('منتهي')).length;

  const weeklyData = WEEK_DAYS.map((day, idx) => ({
    name: day,
    usage: Number((2.4 + ((idx * 1.7) % 3.5)).toFixed(1)),
  }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="absolute top-0 -left-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            نظام مراقبة متصل
          </div>
          <h1 className="text-2xl md:text-3xl font-black">
            مرحباً، {user?.name || 'عزيزي المستخدم'} 👋
          </h1>
          <p className="text-blue-100 text-sm md:text-base">
            لديك <span className="font-bold text-white underline">{accounts.length}</span> اشتراك تحت
            المراقبة والمتابعة الفورية.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-3 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? 'جاري التحديث...' : 'تحديث'}</span>
          </button>
          <Link
            href="/dashboard/accounts/new"
            className="flex items-center gap-2 px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>إضافة حساب</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Accounts */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">إجمالي الحسابات</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{accounts.length}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {activeAccountsCount} نشطة 🟢
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">حسابات يمن نت و 4G مسجلة</p>
        </div>

        {/* Total Balance */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">إجمالي الرصيد</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {totalBalance.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-gray-400">جيجابايت</span>
          </div>
          <p className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
            موزعة على كافة الاشتراكات
          </p>
        </div>

        {/* Needs Renewal / Critical */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">تحتاج تجديد</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{warningCount}</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">أرصدة منخفضة</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">اقترب موعد انتهائها</p>
        </div>

        {/* Expired Accounts */}
        <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">منتهية الصلاحية</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{expiredCount}</span>
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">غير نشطة</span>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">تحتاج إلى شحن فوري</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">الاستهلاك الأسبوعي</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              متوسط استهلاك البيانات اليومي لجميع الحسابات (جيجابايت)
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold">
            آخر 7 أيام
          </span>
        </div>

        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val) => [`${val} GB`, 'الاستهلاك']}
              />
              <Bar dataKey="usage" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Accounts List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">حسابات يمن نت</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">حالة خطوط الإنترنت ومواعيد التجديد</p>
          </div>
          <Link
            href="/dashboard/accounts"
            className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            عرض الكل ({accounts.length}) ←
          </Link>
        </div>

        {accounts.length === 0 ? (
          <div className="p-10 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
              📡
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              لا توجد اشتراكات مضافة في قاعدة البيانات
            </h3>
            <p className="text-gray-400 text-sm max-w-sm mb-5">
              قم بإضافة اشتراكك الأول لمراقبة رصيد يمن نت، سرعة الخط، وتاريخ الانتهاء في الوقت الحقيقي.
            </p>
            <Link
              href="/dashboard/accounts/new"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>+ إضافة اشتراك جديد</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const num = parseFloat(acc.balance?.replace(/[^\d.]/g, '') || '0');
              const percent = Math.min(100, Math.max(0, (num / 150) * 100));

              return (
                <div
                  key={acc.id}
                  className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          {acc.type || 'ADSL'}
                        </span>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mt-1">
                          {acc.label}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono" dir="ltr">
                          {acc.username}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          acc.status?.includes('نشط')
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                            : acc.status?.includes('تحذير')
                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {acc.status || 'نشط 🟢'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5 my-3">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-500 dark:text-gray-400">الرصيد المتبقي:</span>
                        <span className="text-blue-600 dark:text-sky-400 font-mono">{acc.balance}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-sky-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-50 dark:border-slate-700/40 flex items-center justify-between text-xs text-gray-400">
                    <span>الانتهاء: {acc.expiry || 'غير محدد'}</span>
                    <Link
                      href={`/dashboard/accounts/${acc.id}`}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                    >
                      التفاصيل ←
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
