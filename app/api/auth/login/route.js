import { NextResponse } from 'next/server';
import { UsersDb, ActivityDb } from '../../../../lib/server/db';
import { hashPassword, verifyPassword, createToken } from '../../../../lib/server/auth';
import { supabaseAdmin } from '../../../../lib/server/supabaseAdmin';

export async function POST(request) {
  try {
    const { phone, password, name } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم الهاتف / اسم المستخدم وكلمة المرور' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // 1. Try finding user in Supabase
    let user = null;
    try {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (dbUser) user = dbUser;
    } catch (sbErr) {
      console.warn('Supabase find user error:', sbErr);
    }

    // Fallback to local / tmp memory
    if (!user) {
      user = UsersDb.findByPhone(cleanPhone);
    }

    if (!user) {
      // Auto-register demo account or first time user
      const userId = `usr_${Date.now()}`;
      const defaultName = name?.trim() || (cleanPhone === '777000111' ? 'النقيب للمعلومات' : `مستخدم (${cleanPhone})`);
      const userRole = cleanPhone === '777000111' ? 'admin' : 'user';
      const passwordHash = hashPassword(password);

      const newUser = {
        id: userId,
        phone: cleanPhone,
        name: defaultName,
        password_hash: passwordHash,
        role: userRole,
      };

      // Save to Supabase
      try {
        await supabaseAdmin.from('users').insert(newUser);
      } catch (insertErr) {
        console.warn('Supabase insert user error:', insertErr);
      }

      // Save to local / tmp
      try {
        UsersDb.create(newUser);
      } catch {}

      user = newUser;
    } else {
      const isValid = verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة' },
          { status: 401 }
        );
      }
    }

    // Generate session token
    const token = createToken({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
    });

    // Log login activity in Supabase
    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: user.id,
        action: 'تسجيل دخول ناجح',
        details: `تم تسجيل الدخول إلى لوحة التحكم من خلال ${cleanPhone}`,
        type: 'auth',
      });
    } catch {}

    // Also log in ActivityDb
    try {
      ActivityDb.log({
        user_id: user.id,
        title: 'تسجيل دخول ناجح',
        details: `تم تسجيل الدخول إلى لوحة التحكم من خلال ${cleanPhone}`,
        type: 'success',
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      token,
    });

    // Set cookie
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'حدث خطأ في الخادم أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}
