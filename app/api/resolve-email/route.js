import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (error || !data?.user) {
    return NextResponse.json({ email: null });
  }

  return NextResponse.json({ email: data.user.email });
}
