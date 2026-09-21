import { NextResponse } from 'next/server';
import { NotificationsDb } from '../../../lib/server/db';
import { getSessionUser } from '../../../lib/server/auth';

export async function GET(request) {
  try {
    const session = getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session?.id || 'usr_777000111';

    const notifs = NotificationsDb.getAll(userId);
    const unreadCount = notifs.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      unread_count: unreadCount,
      notifications: notifs,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (id) {
      NotificationsDb.markAsRead(id);
    }

    return NextResponse.json({ success: true, message: 'تم تحديث حالة الإشعار' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
