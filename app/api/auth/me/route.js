import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/server/auth';
import { UsersDb } from '../../../../lib/server/db';
import { supabaseAdmin } from '../../../../lib/server/supabaseAdmin';

export async function GET(request) {
  try {
    const session = getSessionUser(request);
    if (!session) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 401 });
    }

    let user = null;
    try {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('id, phone, name, role')
        .eq('id', session.id)
        .maybeSingle();
      if (dbUser) user = dbUser;
    } catch {}

    if (!user) {
      user = UsersDb.findById(session.id);
    }

    // Fallback to valid decoded session token data
    const finalUser = user || {
      id: session.id,
      phone: session.phone,
      name: session.name,
      role: session.role || 'user',
    };

    return NextResponse.json({
      authenticated: true,
      user: {
        id: finalUser.id,
        phone: finalUser.phone,
        name: finalUser.name,
        role: finalUser.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
