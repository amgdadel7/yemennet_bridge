import { NextResponse } from 'next/server';
import { AccountsDb, UsageDb } from '../../../lib/server/db';
import { getSessionUser } from '../../../lib/server/auth';

export async function GET(request) {
  try {
    const session = getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session?.id || 'usr_777000111';

    const accounts = AccountsDb.getAll(userId);

    const totalBalance = accounts.reduce((acc, curr) => {
      return acc + parseFloat(curr.balance?.replace(/[^\d.]/g, '') || '0');
    }, 0);

    const activeCount = accounts.filter(
      (a) => a.status?.includes('نشط') || a.status === 'active'
    ).length;
    const warningCount = accounts.filter((a) => a.status?.includes('تحذير')).length;
    const expiredCount = accounts.filter((a) => a.status?.includes('منتهي')).length;

    // Compile usage breakdown
    const breakdown = accounts.map((a) => {
      const bal = parseFloat(a.balance?.replace(/[^\d.]/g, '') || '0');
      const history = UsageDb.getForAccount(a.id);
      const totalUsage14d = history.reduce((s, h) => s + (h.usage_gb || 0), 0);
      const avgDaily = history.length > 0 ? parseFloat((totalUsage14d / history.length).toFixed(2)) : 1.8;
      const daysRemaining = avgDaily > 0 ? Math.floor(bal / avgDaily) : 99;

      return {
        id: a.id,
        label: a.label,
        username: a.username,
        type: a.type,
        balance: a.balance,
        balance_num: bal,
        expiry: a.expiry,
        status: a.status,
        avg_daily_gb: avgDaily,
        days_remaining_est: daysRemaining,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_accounts: accounts.length,
        total_balance_gb: parseFloat(totalBalance.toFixed(2)),
        active_count: activeCount,
        warning_count: warningCount,
        expired_count: expiredCount,
        generated_at: new Date().toISOString(),
      },
      accounts: breakdown,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
