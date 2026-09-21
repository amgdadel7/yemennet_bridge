import { NextResponse } from 'next/server';
import { ActivityDb } from '../../../lib/server/db';
import { getSessionUser } from '../../../lib/server/auth';

export async function GET(request) {
  try {
    const session = getSessionUser(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session?.id || 'usr_777000111';
    const type = searchParams.get('type');

    let logs = ActivityDb.getAll(userId);
    if (type && type !== 'all') {
      logs = logs.filter((l) => l.type === type);
    }

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = getSessionUser(request);
    const body = await request.json();

    const logged = ActivityDb.log({
      user_id: body.user_id || session?.id || 'usr_777000111',
      account_id: body.account_id,
      title: body.title,
      details: body.details,
      type: body.type || 'info',
    });

    return NextResponse.json({ success: true, log: logged }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
