import { NextResponse } from 'next/server';
import { UsersDb, ActivityDb } from '../../../../lib/server/db';
import { hashPassword, createToken } from '../../../../lib/server/auth';
import { supabaseAdmin } from '../../../../lib/server/supabaseAdmin';

export async function POST(request) {
  try {
    const { phone, password, name } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال رقم الهاتف وكلمة المرور' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // Check if user already exists in Supabase
    let existing = null;
    try {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (dbUser) existing = dbUser;
    } catch (e) {}

    if (!existing) {
      existing = UsersDb.findByPhone(cleanPhone);
    }

    if (existing) {
      return NextResponse.json(
        { error: 'رقم الهاتف مسجل مسبقاً، يرجى تسجيل الدخول' },
        { status: 409 }
      );
    }

    const userId = `usr_${Date.now()}`;
    const userName = name?.trim() || `مستخدم (${cleanPhone})`;
    const passwordHash = hashPassword(password);

    const newUser = {
      id: userId,
      phone: cleanPhone,
      name: userName,
      password_hash: passwordHash,
      role: 'user',
    };

    // Save to Supabase
    try {
      await supabaseAdmin.from('users').insert(newUser);
    } catch (insertErr) {
      console.warn('Supabase register error:', insertErr);
    }

    // Save to local / tmp
    try {
      UsersDb.create(newUser);
    } catch {}

    const token = createToken({
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      role: newUser.role,
    });

    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_id: newUser.id,
        action: 'تسجيل حساب جديد',
        details: `تم إنشاء حساب جديد بنجاح برقم ${cleanPhone}`,
        type: 'auth',
      });
    } catch {}

    try {
      ActivityDb.log({
        user_id: newUser.id,
        title: 'تسجيل حساب جديد',
        details: `تم إنشاء حساب جديد بنجاح برقم ${cleanPhone}`,
        type: 'info',
      });
    } catch {}

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role,
      },
      token,
    });

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
