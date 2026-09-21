import { NextResponse } from 'next/server';
import { AccountsDb, UsageDb, NotificationsDb, ActivityDb, SettingsDb } from '../../../../lib/server/db';

export async function GET(request) {
  try {
    const accounts = AccountsDb.getAll();
    const results = [];

    for (const acc of accounts) {
      // Simulate/calculate subtle daily usage if active
      let balNum = parseFloat(acc.balance?.replace(/[^\d.]/g, '') || '0');
      if (balNum > 0) {
        // Daily decrement
        const dailyBurn = parseFloat((0.8 + Math.random() * 1.2).toFixed(2));
        balNum = Math.max(0, parseFloat((balNum - dailyBurn).toFixed(2)));

        const newStatus = balNum === 0 ? 'منتهي 🔴' : balNum < 5 ? 'تحذير 🟡' : 'نشط 🟢';
        const updatedBalance = `${balNum.toFixed(2)} GB`;

        AccountsDb.update(acc.id, {
          balance: updatedBalance,
          status: newStatus,
          last_synced: new Date().toISOString(),
        });

        UsageDb.recordSync(acc.id, balNum, dailyBurn);

        // Check settings and alert if low
        const settings = SettingsDb.get(acc.user_id);
        const warningThreshold = settings.balance_warning_gb || 5;

        if (balNum < warningThreshold && balNum > 0) {
          NotificationsDb.create(
            acc.user_id,
            '⚠️ تنبيه استهلاك الرصيد',
            `رصيد الباقة للحساب (${acc.label}) وصل إلى ${updatedBalance}. يرجى التجديد.`,
            'warning'
          );
        }

        results.push({
          id: acc.id,
          label: acc.label,
          balance: updatedBalance,
          status: newStatus,
        });
      }
    }

    ActivityDb.log({
      user_id: 'system',
      title: 'مزامنة تلقائية دورية (Background Sync)',
      details: `تمت المزامنة التلقائية لعدد ${results.length} اشتراك بنجاح`,
      type: 'info',
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      updated_accounts: results.length,
      accounts: results,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
