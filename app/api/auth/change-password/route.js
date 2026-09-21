import { NextResponse } from 'next/server';
import { getSessionUser, hashPassword, verifyPassword } from '../../../../lib/server/auth';
import { UsersDb, ActivityDb } from '../../../../lib/server/db';

export async function POST(request) {
  try {
    const session = getSessionUser(request);
    const body = await request.json();
    const { currentPassword, newPassword, userId } = body;

    const targetId = session?.id || userId || 'usr_777000111';
    const user = UsersDb.findById(targetId);

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (user.password_hash && !verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);
    UsersDb.updatePassword(targetId, newHash);

    ActivityDb.log({
      user_id: targetId,
      title: 'تغيير كلمة المرور',
      details: 'تم تحديث كلمة المرور للحساب بنجاح',
      type: 'warning',
    });

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تغيير كلمة المرور' }, { status: 500 });
  }
}
