import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const rawBody = await request.text();

  const signature = request.headers.get('x-paystack-signature');
  const expectedSignature = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === 'charge.success') {
    const { reference, amount, customer, metadata } = event.data;

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const matchedUser = usersList?.users?.find((u) => u.email === customer.email);

    await supabaseAdmin.from('tips').upsert(
      {
        tipper_id: matchedUser?.id || null,
        artist_id: metadata.artistId,
        song_id: metadata.songId || null,
        amount_kobo: amount,
        currency: 'GHS',
        paystack_reference: reference,
        status: 'success',
      },
      { onConflict: 'paystack_reference' }
    );

    // Notify only the artist who received the tip, not everyone
    if (metadata.artistId) {
      await supabaseAdmin.from('inbox_posts').insert({
        type: 'announcement',
        title: 'You received a tip! 💝',
        body: `Someone sent you GH₵${(amount / 100).toFixed(2)} to support your music.`,
        target_user_id: metadata.artistId,
      });
    }
  }

  return NextResponse.json({ received: true });
                             }
