import { NextResponse } from 'next/server';
import { AccountsDb, ActivityDb } from '../../../lib/server/db';
import { getSessionUser } from '../../../lib/server/auth';
import { supabaseAdmin } from '../../../lib/server/supabaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = getSessionUser(request);
    const userId = searchParams.get('user_id') || searchParams.get('userId') || session?.id;
    const id = searchParams.get('id');

    if (supabaseAdmin) {
      try {
        if (id) {
          const { data, error } = await supabaseAdmin
            .from('accounts')
            .select('*')
            .eq('id', id);
          if (!error && data && data.length > 0) {
            return NextResponse.json({ data, error: null });
          }
        } else {
          let query = supabaseAdmin.from('accounts').select('*');
          if (userId) {
            query = query.eq('user_id', userId);
          }
          const { data, error } = await query.order('created_at', { ascending: false });
          if (!error && data && data.length > 0) {
            return NextResponse.json({ data, error: null });
          }
        }
      } catch (err) {
        console.warn('Supabase accounts query failed, falling back:', err.message);
      }
    }

    if (id) {
      const acc = AccountsDb.getById(id);
      return NextResponse.json({ data: acc ? [acc] : [], error: null });
    }

    const accounts = AccountsDb.getAll(userId);
    return NextResponse.json({ data: accounts, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error.message || 'فشل استرجاع الحسابات' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = getSessionUser(request);
    const body = await request.json();

    if (!body.username) {
      return NextResponse.json(
        { data: null, error: 'رقم الهاتف أو اسم المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const targetUserId = body.user_id || session?.id || 'usr_11549025';
    const newId = body.id || Date.now().toString();

    let created = null;
    if (supabaseAdmin) {
      try {
        const row = {
          id: newId,
          user_id: targetUserId,
          label: body.label || 'اشتراك جديد',
          username: body.username,
          password: body.password || '',
          balance: body.balance || '0.00 GB',
          expiry: body.expiry || '30/11/2026',
          status: body.status || 'نشط 🟢',
          type: body.type || (body.username?.startsWith('7') ? '4G' : 'ADSL'),
          speed: body.speed || '8 Mbps',
          ip: body.ip || '10.140.22.8',
          subscriber_name: body.subscriber_name || null,
          package_name: body.package_name || null,
          session_cookie: body.session_cookie || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await supabaseAdmin.from('accounts').insert(row).select();
        if (!error && data && data.length > 0) {
          created = data[0];
        }
      } catch (e) {
        console.warn('Supabase account insert error:', e.message);
      }
    }

    if (!created) {
      created = AccountsDb.create({
        ...body,
        id: newId,
        user_id: targetUserId,
      });
    }

    ActivityDb.log({
      user_id: created.user_id,
      account_id: created.id,
      title: 'إضافة اشتراك جديد',
      details: `تمت إضافة الاشتراك (${created.label} - ${created.username}) بنجاح`,
      type: 'info',
    });

    return NextResponse.json({ data: [created], error: null }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error.message || 'فشل إنشاء الحساب' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'معرف الحساب مطلوب' },
        { status: 400 }
      );
    }

    let updated = null;
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('accounts')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select();
        if (!error && data && data.length > 0) {
          updated = data[0];
        }
      } catch (e) {
        console.warn('Supabase account update error:', e.message);
      }
    }

    if (!updated) {
      updated = AccountsDb.update(id, updates);
    }

    if (!updated) {
      return NextResponse.json({ data: null, error: 'الحساب غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ data: [updated], error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error.message || 'فشل تحديث الحساب' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { data: null, error: 'معرف الحساب مطلوب' },
        { status: 400 }
      );
    }

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('accounts').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase account delete error:', e.message);
      }
    }

    const acc = AccountsDb.getById(id);
    AccountsDb.delete(id);

    if (acc) {
      ActivityDb.log({
        user_id: acc.user_id,
        account_id: id,
        title: 'حذف اشتراك',
        details: `تم حذف الاشتراك (${acc.label} - ${acc.username})`,
        type: 'warning',
      });
    }

    return NextResponse.json({ data: null, error: null });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error.message || 'فشل حذف الحساب' },
      { status: 500 }
    );
  }
}
