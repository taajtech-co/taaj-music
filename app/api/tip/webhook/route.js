import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const rawBody = await request.text();

  // Verify this webhook genuinely came from Paystack, not someone faking a payment
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

    // Look up the tipper by email, since that's what we have from Paystack
    const { data: tipperUser } = await supabaseAdmin.auth.admin.listUsers();
    const matchedUser = tipperUser?.users?.find((u) => u.email === customer.email);

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

    // Let the artist know they received a tip
    if (metadata.artistId) {
      await supabaseAdmin.from('inbox_posts').insert({
        type: 'announcement',
        title: 'You received a tip! 💝',
        body: `Someone sent you GH₵${(amount / 100).toFixed(2)} to support your music.`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
