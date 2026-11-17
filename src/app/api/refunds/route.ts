import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

interface Body {
  stripeSessionId?: string;
  amountPence: number;
  reason?: string;
}

// Issues a full/partial refund against the Checkout Session's payment intent.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret.startsWith('your-')) {
    return NextResponse.json({ error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not connected yet, so this refund was recorded but not sent to Stripe.' }, { status: 503 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid request.' }, { status: 400 });
  }
  if (!body.stripeSessionId || !Number.isInteger(body.amountPence) || body.amountPence <= 0) {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing payment reference or amount.' }, { status: 400 });
  }
  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(body.stripeSessionId);
    const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!pi) return NextResponse.json({ error: 'NO_PAYMENT', message: 'No payment found for this order.' }, { status: 400 });
    const refund = await stripe.refunds.create(
      { payment_intent: pi, amount: body.amountPence, reason: 'requested_by_customer', metadata: { note: body.reason ?? '' }, reverse_transfer: true },
      { idempotencyKey: `refund-${body.stripeSessionId}-${body.amountPence}` }
    );
    return NextResponse.json({ refundId: refund.id, status: refund.status });
  } catch (e) {
    return NextResponse.json({ error: 'STRIPE_ERROR', message: e instanceof Error ? e.message : 'Refund failed.' }, { status: 502 });
  }
}
