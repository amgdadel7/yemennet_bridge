import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { AccountsDb, UsageDb, ActivityDb } from '../../../../lib/server/db';
import { supabaseAdmin } from '../../../../lib/server/supabaseAdmin';

const BRIDGE_URL = process.env.YEMENNET_BRIDGE_URL || 'http://127.0.0.1:5055';
const PYTHON_PATH = process.env.PYTHON_PATH || 'C:\\Users\\Amjad Alhakimi\\anaconda3\\envs\\environment-gpu\\python.exe';
const BRIDGE_SCRIPT = path.join(process.cwd(), 'scripts', 'yemennet_bridge.py');

let isSpawning = false;

async function checkBridgeHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${BRIDGE_URL}/api/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureBridgeRunning() {
  const healthy = await checkBridgeHealth();
  if (healthy) return true;

  if (isSpawning) {
    // Wait briefly for existing spawn
    await new Promise((r) => setTimeout(r, 2000));
    return await checkBridgeHealth();
  }

  isSpawning = true;
  try {
    const child = spawn(PYTHON_PATH, [BRIDGE_SCRIPT], {
      detached: true,
      stdio: 'ignore',
      cwd: process.cwd(),
    });
    child.unref();

    // Poll for up to 6 seconds until ready
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkBridgeHealth()) {
        isSpawning = false;
        return true;
      }
    }
  } catch (err) {
    console.error('Failed to spawn yemennet_bridge:', err);
  } finally {
    isSpawning = false;
  }

  return await checkBridgeHealth();
}

/**
 * GET: Request live captcha image for an account
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const customUsername = searchParams.get('username');
    const customPassword = searchParams.get('password');

    let username = customUsername;
    let password = customPassword || '';

    if (accountId) {
      const { data: dbAccount } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .maybeSingle();
      const account = dbAccount || AccountsDb.getById(accountId);

      if (account) {
        username = username || account.username;
        password = password || account.password || '';
      }
    }

    if (!username) {
      return NextResponse.json(
        { error: 'يرجى تقديم اسم المستخدم أو معرف الحساب' },
        { status: 400 }
      );
    }

    const ready = await ensureBridgeRunning();
    if (!ready) {
      return NextResponse.json(
        { error: 'تعذر تشغيل خدمة الاتصال بيمن نت. يرجى التأكد من تشغيل بيئة بايثون.' },
        { status: 503 }
      );
    }

    const bridgeRes = await fetch(`${BRIDGE_URL}/api/captcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const bridgeData = await bridgeRes.json();
    if (!bridgeRes.ok || !bridgeData.success) {
      return NextResponse.json(
        { error: bridgeData.detail || bridgeData.error || 'فشل جلب صورة الكابتشا من يمن نت' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: bridgeData.session_id,
      captcha: bridgeData.captcha,
      username,
    });
  } catch (err) {
    console.error('Live Captcha error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Submit captcha and sync real data
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { accountId, sessionId, captcha } = body;

    if (!sessionId || !captcha) {
      return NextResponse.json(
        { error: 'يرجى تقديم معرف الجلسة ورمز التحقق' },
        { status: 400 }
      );
    }

    const ready = await ensureBridgeRunning();
    if (!ready) {
      return NextResponse.json(
        { error: 'خدمة الاتصال بيمن نت غير متاحة' },
        { status: 503 }
      );
    }

    const bridgeRes = await fetch(`${BRIDGE_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, captcha }),
    });

    const result = await bridgeRes.json();
    if (!bridgeRes.ok || !result.success) {
      return NextResponse.json(
        { error: result.error || result.detail || 'رمز التحقق غير صحيح، يرجى المحاولة مجدداً' },
        { status: 400 }
      );
    }

    const scraped = result.data || {};
    const balNum = parseFloat(scraped.balance?.replace(/[^\d.]/g, '') || '0');
    const status = balNum === 0 ? 'منتهي 🔴' : balNum < 5 ? 'تحذير 🟡' : 'نشط 🟢';

    const updatePayload = {
      balance: scraped.balance || undefined,
      expiry: scraped.expiry || undefined,
      expiry_time: scraped.expiry_time || undefined,
      speed: scraped.speed || undefined,
      ip: scraped.ip || undefined,
      subscriber_name: scraped.subscriber_name || undefined,
      package_name: scraped.package_name || undefined,
      registration_date: scraped.registration_date || undefined,
      session_cookie: result.sessionCookie || undefined,
      status,
      last_synced: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let updatedAccount = null;

    if (accountId) {
      // 1. Update in Supabase
      try {
        await supabaseAdmin
          .from('accounts')
          .update(updatePayload)
          .eq('id', accountId);

        // Record usage
        await supabaseAdmin.from('daily_usage').insert({
          account_id: accountId,
          date: new Date().toISOString().split('T')[0],
          balance_gb: balNum,
          usage_gb: 0,
        });
      } catch (err) {
        console.warn('Supabase update warning:', err.message);
      }

      // 2. Update local AccountsDb
      updatedAccount = AccountsDb.update(accountId, updatePayload);
      if (balNum > 0) {
        UsageDb.recordSync(accountId, balNum, 0);
      }

      ActivityDb.log({
        user_id: updatedAccount?.user_id || 'usr-1',
        title: 'مزامنة مباشرة مع يمن نت',
        details: `تم جلب وتحديث الرصيد الحقيقي (${scraped.balance}) للحساب ${updatedAccount?.label || accountId}`,
        type: 'sync',
      });
    }

    return NextResponse.json({
      success: true,
      message: `تم تحديث الرصيد الحقيقي بنجاح: ${scraped.balance || 'تم التحديث'}`,
      data: updatedAccount || { ...updatePayload, id: accountId },
      raw: scraped,
      sessionCookie: result.sessionCookie,
    });
  } catch (err) {
    console.error('Live Verify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
