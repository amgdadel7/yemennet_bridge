'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/context/AuthContext';
import { useToast } from '../../../lib/context/ToastContext';
import { INITIAL_ACCOUNTS } from '../../../lib/demoData';
import { supabase } from '../../../lib/supabase';

export default function AccountsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [filter, setFilter] = useState('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('الأحدث أولاً');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*');

      if (!error && data) {
        setAccounts(data);
        return;
      }
    } catch (e) {
      console.log('Database accounts fetch failed:', e);
    }
    setAccounts([]);
  };

  useEffect(() => {
    loadAccounts().finally(() => setIsLoading(false));
  }, [user]);

  const handleDelete = async (id, e) => {
    e.preventDefault();
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الحساب نهائياً من قاعدة البيانات؟')) return;

    setDeletingId(id);
    try {
      await supabase.from('accounts').delete().eq('id', id);
      const updated = accounts.filter((a) => a.id !== id);
      setAccounts(updated);
      addToast('success', 'تم حذف الحساب من قاعدة البيانات بنجاح');
    } catch (err) {
      addToast('error', 'فشل حذف الحساب من قاعدة البيانات');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search
  const filtered = accounts.filter((acc) => {
    const matchesSearch =
      acc.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.username?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filter === 'الكل') return true;
    if (filter === 'نشطة') return acc.status?.includes('نشط') || acc.status === 'active';
    if (filter === 'تحذير') return acc.status?.includes('تحذير');
    if (filter === 'حرجة') {
      const num = parseFloat(acc.balance?.replace(/[^\d.]/g, '') || '0');
      return num > 0 && num < 5;
    }
    if (filter === 'منتهية') return acc.status?.includes('منتهي') || acc.balance === '0.00 GB';
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'حسب الاسم') return (a.label || '').localeCompare(b.label || '');
    if (sortBy === 'حسب الرصيد') {
      const numA = parseFloat(a.balance?.replace(/[^\d.]/g, '') || '0');
      const numB = parseFloat(b.balance?.replace(/[^\d.]/g, '') || '0');
      return numB - numA;
    }
    return 0; // Default: 'الأحدث أولاً'
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">جاري تحميل الحسابات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">إدارة الحسابات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            إدارة ومتابعة جميع اشتراكات يمن نت الخاصة بك
          </p>
        </div>

        <Link
          href="/dashboard/accounts/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>إضافة حساب جديد</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['الكل', 'نشطة', 'تحذير', 'حرجة', 'منتهية'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              filter === tab
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ابحث بالاسم أو رقم الخط..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
          />
          <svg
            className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="الأحدث أولاً">الأحدث أولاً</option>
            <option value="حسب الاسم">حسب الاسم</option>
            <option value="حسب الرصيد">حسب الرصيد</option>
          </select>

          {/* Grid / Table Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="عرض شبكة"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="عرض جدول"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Account Results */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-8 space-y-4">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            {searchTerm ? 'لا توجد نتائج' : 'لا توجد حسابات'}
          </h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {searchTerm
              ? 'جرب تغيير معايير البحث أو الفلترة'
              : 'ابدأ بإضافة حسابات يمن نت الخاصة بك لمتابعة الرصيد والاشتراك تلقائياً'}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/accounts/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700"
            >
              إضافة أول حساب
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((acc) => {
            const num = parseFloat(acc.balance?.replace(/[^\d.]/g, '') || '0');
            const percent = Math.min(100, Math.max(0, (num / 150) * 100));

            return (
              <div
                key={acc.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
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

                  <div className="space-y-1.5 my-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-500 dark:text-gray-400">الرصيد المتاح:</span>
                      <span className="text-blue-600 dark:text-sky-400 font-mono">{acc.balance}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                    <p>ينتهي في: {acc.expiry || 'غير محدد'}</p>
                    <p>السرعة: {acc.speed || '8 Mbps'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-700/40 flex items-center justify-between">
                  <Link
                    href={`/dashboard/accounts/${acc.id}`}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700"
                  >
                    عرض التفاصيل ←
                  </Link>
                  <button
                    onClick={(e) => handleDelete(acc.id, e)}
                    disabled={deletingId === acc.id}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="حذف الحساب"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/60 overflow-x-auto shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700/60 text-xs font-bold text-gray-500 dark:text-gray-400">
              <tr>
                <th className="p-4">الحساب</th>
                <th className="p-4">رقم الخط</th>
                <th className="p-4">الرصيد</th>
                <th className="p-4">الانتهاء</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
              {sorted.map((acc) => (
                <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                  <td className="p-4 font-bold text-gray-900 dark:text-white">{acc.label}</td>
                  <td className="p-4 font-mono text-gray-500" dir="ltr">
                    {acc.username}
                  </td>
                  <td className="p-4 font-bold text-blue-600 dark:text-sky-400 font-mono">
                    {acc.balance}
                  </td>
                  <td className="p-4 text-gray-500">{acc.expiry || '-'}</td>
                  <td className="p-4">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        acc.status?.includes('نشط')
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                      }`}
                    >
                      {acc.status}
                    </span>
                  </td>
                  <td className="p-4 text-center space-x-2 space-x-reverse">
                    <Link
                      href={`/dashboard/accounts/${acc.id}`}
                      className="text-xs font-bold text-blue-600 hover:underline px-2 py-1"
                    >
                      تفاصيل
                    </Link>
                    <button
                      onClick={(e) => handleDelete(acc.id, e)}
                      className="text-xs text-red-500 hover:underline px-2 py-1"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
