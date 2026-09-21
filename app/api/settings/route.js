import { NextResponse } from 'next/server';
import { SettingsDb, ActivityDb } from '../../../lib/server/db';
import { getSessionUser } from '../../../lib/server/auth';

export async function GET(request) {
  try {
    const session = getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session?.id || 'usr_777000111';

    const settings = SettingsDb.get(userId);
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = getSessionUser(request);
    const body = await request.json();
    const userId = body.user_id || session?.id || 'usr_777000111';

    const updated = SettingsDb.save(userId, body);

    ActivityDb.log({
      user_id: userId,
      title: 'تحديث الإعدادات والتنبيهات',
      details: 'تم تعديل خيارات الإشعارات وفترات التنبيه التلقائي بنجاح',
      type: 'info',
    });

    return NextResponse.json({ success: true, data: updated, message: 'تم حفظ الإعدادات بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
