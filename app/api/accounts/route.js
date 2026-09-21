import { NextResponse } from 'next/server';
import { AccountsDb, ActivityDb } from '../../../lib/server/db';
import { getSessionUser } from '../../../lib/server/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = getSessionUser(request);
    const userId = searchParams.get('user_id') || session?.id;
    const id = searchParams.get('id');

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

    const created = AccountsDb.create({
      ...body,
      user_id: body.user_id || session?.id || 'usr_777000111',
    });

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

    const updated = AccountsDb.update(id, updates);
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
