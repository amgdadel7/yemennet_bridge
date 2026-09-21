import { NextResponse } from 'next/server';
import { UsageDb, AccountsDb } from '../../../../../lib/server/db';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const history = UsageDb.getForAccount(id);
    const account = AccountsDb.getById(id);

    return NextResponse.json({
      success: true,
      account_id: id,
      label: account?.label || '',
      history,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
