import { NextResponse } from 'next/server';

export async function POST(request) {
  const { email, amount, artistId, songId } = await request.json();

  if (!email || !amount || !artistId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // amount comes in as whole cedis from the frontend; Paystack needs it in the
  // smallest currency unit (pesewas), so multiply by 100.
  const amountInPesewas = Math.round(Number(amount) * 100);

  if (!amountInPesewas || amountInPesewas < 100) {
    return NextResponse.json({ error: 'Minimum tip is GH₵1' }, { status: 400 });
  }

  try {
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInPesewas,
        currency: 'GHS',
        metadata: { artistId, songId: songId || null },
      }),
    });

    const data = await paystackRes.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message || 'Could not start payment' }, { status: 500 });
    }

    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
