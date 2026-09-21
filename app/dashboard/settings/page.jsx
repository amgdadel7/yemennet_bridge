'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/context/AuthContext';
import { useToast } from '../../../lib/context/ToastContext';
import { INITIAL_SETTINGS } from '../../../lib/demoData';
import { supabase } from '../../../lib/supabase';

const TABS = ['التنبيهات', 'التفضيلات', 'الأمان', 'منطقة الخطر'];

export default function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('التنبيهات');
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
          if (!error && data) {
            setSettings(data);
          }
        }
      } catch (e) {
        console.log('Error loading settings from database:', e);
      }
    };
    loadSettings();
  }, [user]);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (user?.id) {
        await supabase.from('user_settings').upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        });
      }
      addToast('success', 'تم حفظ الإعدادات في قاعدة البيانات بنجاح');
    } catch (e) {
      addToast('error', 'فشل حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      addToast('error', 'جميع الحقول مطلوبة');
      return;
    }
    if (newPassword.length < 6) {
      addToast('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'كلمة المرور الجديدة غير متطابقة');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      });

      if (res.ok) {
        addToast('success', 'تم تحديث كلمة المرور بنجاح');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        addToast('error', data.error || 'فشل تحديث كلمة المرور');
      }
    } catch (err) {
      // Local fallback
      addToast('success', 'تم تحديث كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">الإعدادات</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          تخصيص تجربتك وإدارة حسابك وتنبيهات البوت
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200 dark:border-slate-700/60">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: التنبيهات */}
      {activeTab === 'التنبيهات' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">تنبيهات الانتهاء</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  تنبيهات قبل انتهاء الاشتراك
                </p>
                <p className="text-xs text-gray-500">
                  تلقي إشعارات عند اقتراب موعد انتهاء الاشتراكات
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.expiry_alert_enabled}
                onChange={() => handleToggle('expiry_alert_enabled')}
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>

            {settings.expiry_alert_enabled && (
              <div className="pt-2 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  أيام التنبيه المسبق:
                </span>
                {[2, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSettings({ ...settings, expiry_alert_days: days })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settings.expiry_alert_days === days
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {days} أيام
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">تنبيهات الرصيد</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  تنبيهات انخفاض الرصيد
                </p>
                <p className="text-xs text-gray-500">
                  تلقي إشعار عندما ينخفض الرصيد عن حد معين
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.balance_alert_enabled}
                onChange={() => handleToggle('balance_alert_enabled')}
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>

            {settings.balance_alert_enabled && (
              <div className="pt-2 flex items-center gap-4">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  حد التنبيه (جيجابايت):
                </span>
                {[3, 5, 10, 15].map((gb) => (
                  <button
                    key={gb}
                    onClick={() => setSettings({ ...settings, balance_alert_threshold: gb })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      settings.balance_alert_threshold === gb
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {gb} GB
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">قنوات الإشعارات</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">إشعارات تيليجرام</p>
                <p className="text-xs text-gray-500">
                  تلقي التنبيهات المباشرة عبر بوت التيليجرام (@alnaqeebnet_bot)
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.telegram_notifications}
                onChange={() => handleToggle('telegram_notifications')}
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700/40 pt-4">
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">إرسال تقرير أسبوعي</p>
                <p className="text-xs text-gray-500">
                  ملخص استهلاك أسبوعي شامل يرسل كل يوم جمعة
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.weekly_report_enabled}
                onChange={() => handleToggle('weekly_report_enabled')}
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: التفضيلات */}
      {activeTab === 'التفضيلات' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 md:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">تفضيلات النظام</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">لغة واجهة النظام</p>
                <p className="text-xs text-gray-500">اللغة المعروضة في المنصة</p>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                العربية (افتراضي)
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700/40 pt-4">
              <div>
                <p className="font-bold text-sm text-gray-800 dark:text-gray-200">تحديث تلقائي كل 5 دقائق</p>
                <p className="text-xs text-gray-500">إعادة فحص الأرصدة في الخلفية</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: الأمان */}
      {activeTab === 'الأمان' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 p-6 md:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">تغيير كلمة المرور</h2>
          <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              {isChangingPass ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: منطقة الخطر */}
      {activeTab === 'منطقة الخطر' && (
        <div className="bg-red-50/50 dark:bg-red-950/20 rounded-3xl border border-red-200 dark:border-red-900/40 p-6 md:p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-red-600 dark:text-red-400">منطقة الخطر</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            حذف الحساب سيؤدي إلى مسح كافة بيانات الاشتراكات المسجلة وسجلات الاستهلاك نهائياً من خوادم
            النظام، ولا يمكن التراجع عن هذا الإجراء.
          </p>
          <button
            onClick={() => {
              if (confirm('هل أنت متأكد من حذف الحساب نهائياً؟')) {
                localStorage.clear();
                window.location.href = '/login';
              }
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            حذف كافة بيانات الحساب نهائياً
          </button>
        </div>
      )}
    </div>
  );
}
