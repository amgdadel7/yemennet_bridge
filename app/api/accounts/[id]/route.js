import { NextResponse } from 'next/server';
import { AccountsDb, ActivityDb, UsageDb } from '../../../../lib/server/db';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const account = AccountsDb.getById(id);

    if (!account) {
      return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
    }

    const history = UsageDb.getForAccount(id);

    return NextResponse.json({
      data: {
        ...account,
        history,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const updated = AccountsDb.update(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'الحساب غير موجود' }, { status: 404 });
    }

    ActivityDb.log({
      user_id: updated.user_id,
      account_id: id,
      title: 'تعديل بيانات الحساب',
      details: `تم تحديث بيانات الاشتراك (${updated.label})`,
      type: 'info',
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const acc = AccountsDb.getById(id);
    AccountsDb.delete(id);

    if (acc) {
      ActivityDb.log({
        user_id: acc.user_id,
        account_id: id,
        title: 'حذف اشتراك',
        details: `تم حذف الاشتراك (${acc.label})`,
        type: 'warning',
      });
    }

    return NextResponse.json({ success: true, error: null });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
