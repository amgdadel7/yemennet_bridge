import { NextResponse } from 'next/server';
import { fetchWithSessionCookie, parseYemenNetData } from '../../../../lib/yemennet';
import { AccountsDb, UsageDb, ActivityDb, SettingsDb, NotificationsDb } from '../../../../lib/server/db';
import { supabaseAdmin } from '../../../../lib/server/supabaseAdmin';

export async function POST(request) {
  try {
    const body = await request.json();
    let { accountId, sessionCookie, rawHtml, yadslData, balance, expiry, speed, ip } = body;

    // Fallback: If sessionCookie is not sent in request, look it up from database using accountId
    if (!sessionCookie && accountId) {
      try {
        const { data: dbAcc } = await supabaseAdmin
          .from('accounts')
          .select('session_cookie')
          .eq('id', accountId)
          .maybeSingle();
        const localAcc = dbAcc || AccountsDb.getById(accountId);
        if (localAcc?.session_cookie) {
          sessionCookie = localAcc.session_cookie;
        }
      } catch (lookupErr) {
        console.warn('Session cookie lookup error:', lookupErr);
      }
    }

    let updatedData = {};

    // Method 1: If yadslData object is passed
    if (yadslData && typeof yadslData === 'object') {
      const parsed = parseYemenNetData(yadslData);
      if (parsed) {
        updatedData = { ...parsed };
      }
    }
    // Method 2: If session cookie is provided, query adsl.yemen.net.ye directly
    else if (sessionCookie) {
      try {
        const fetched = await fetchWithSessionCookie(sessionCookie);
        updatedData = { ...fetched };
      } catch (err) {
        return NextResponse.json(
          { error: err.message || 'فشل الاتصال بموقع يمن نت، يرجى التأكد من صلاحية الجلسة' },
          { status: 400 }
        );
      }
    }
    // Method 3: If user pasted raw HTML or text from yemen.net.ye or yadsl CLI
    else if (rawHtml) {
      const parsed = parseYemenNetData(rawHtml);
      if (parsed) {
        updatedData = { ...parsed };
      } else {
        return NextResponse.json(
          { error: 'لم يتم العثور على بيانات الرصيد في النص المدخل' },
          { status: 400 }
        );
      }
    }
    // Method 4: Direct parameters passed from verified check / form
    else if (balance) {
      const parsed = parseYemenNetData(`الرصيد: ${balance}`);
      updatedData.balance = parsed?.balance || (balance.includes('GB') ? balance : `${balance} GB`);
      if (expiry) updatedData.expiry = expiry;
      if (speed) updatedData.speed = speed;
      if (ip) updatedData.ip = ip;
      const num = parseFloat(updatedData.balance.replace(/[^\d.]/g, '') || '0');
      updatedData.status = num === 0 ? 'منتهي 🔴' : num < 5 ? 'تحذير 🟡' : 'نشط 🟢';
    } else {
      return NextResponse.json(
        { error: 'يرجى تقديم بيانات التحديث أو جلسة يمن نت' },
        { status: 400 }
      );
    }

    updatedData.last_synced = new Date().toISOString();
    updatedData.updated_at = new Date().toISOString();

    let account = null;
    let alertsTriggered = [];

    // If accountId is provided, update existing account
    if (accountId) {
      // 1. First fetch account from Supabase
      const { data: dbAccount } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();

      account = dbAccount || AccountsDb.getById(accountId);

      if (account) {
        const balanceNum = parseFloat(updatedData.balance.replace(/[^\d.]/g, '') || '0');
        const oldBalanceNum = parseFloat(account.balance?.replace(/[^\d.]/g, '') || '0');
        const usageDelta = Math.max(0, parseFloat((oldBalanceNum - balanceNum).toFixed(2)));

        const finalUpdate = {
          balance: updatedData.balance,
          expiry: updatedData.expiry || account.expiry,
          expiry_time: updatedData.expiry_time || account.expiry_time || undefined,
          status: updatedData.status || account.status,
          speed: updatedData.speed || account.speed,
          ip: updatedData.ip || account.ip,
          subscriber_name: updatedData.subscriber_name || account.subscriber_name || undefined,
          package_name: updatedData.package_name || account.package_name || undefined,
          registration_date: updatedData.registration_date || account.registration_date || undefined,
          session_cookie: sessionCookie || account.session_cookie || undefined,
          last_synced: updatedData.last_synced,
          updated_at: updatedData.updated_at,
        };

        // Update in Supabase accounts table
        try {
          await supabaseAdmin
            .from('accounts')
            .update(finalUpdate)
            .eq('id', accountId);

          // Record to daily_usage time series in Supabase
          await supabaseAdmin
            .from('daily_usage')
            .insert({
              account_id: accountId,
              balance_gb: balanceNum,
              usage_gb: usageDelta > 0 ? usageDelta : 1.2,
              date: new Date().toISOString().split('T')[0],
            });

          // Log in activity_logs in Supabase
          await supabaseAdmin
            .from('activity_logs')
            .insert({
              user_id: account.user_id,
              account_id: accountId,
              action: 'مزامنة رصيد يمن نت',
              details: `تم تحديث رصيد (${account.label}) إلى ${updatedData.balance}، الانتهاء: ${finalUpdate.expiry}`,
              type: 'sync',
            });
        } catch (sbErr) {
          console.error('Supabase sync update error:', sbErr);
        }

        // Also update local fallback
        AccountsDb.update(accountId, finalUpdate);
        UsageDb.recordSync(accountId, balanceNum, usageDelta > 0 ? usageDelta : 1.2);

        // Low balance alert check
        const settings = SettingsDb.get(account.user_id);
        const warningGb = settings.balance_warning_gb || 5;

        if (balanceNum < warningGb && balanceNum > 0) {
          const title = '⚠️ تنبيه: رصيد الباقة منخفض';
          const msg = `رصيد الحساب (${account.label}) وصل إلى ${updatedData.balance}. يرجى التجديد قريباً.`;
          NotificationsDb.create(account.user_id, title, msg, 'warning');
          alertsTriggered.push(title);
        } else if (balanceNum === 0) {
          const title = '🔴 تنبيه: نفاد رصيد الباقة';
          const msg = `نفد رصيد الحساب (${account.label}) بالكامل.`;
          NotificationsDb.create(account.user_id, title, msg, 'error');
          alertsTriggered.push(title);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedData,
      alerts: alertsTriggered,
      message: 'تمت مزامنة بيانات الحساب الحقيقية مع يمن نت بنجاح وتم حفظها في قاعدة البيانات',
    });
  } catch (error) {
    console.error('Sync route error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ أثناء فحص ومزامنة البيانات' },
      { status: 500 }
    );
  }
}
