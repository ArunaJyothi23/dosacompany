import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';

// Stripe webhook — confirms payments server-side. Configure the endpoint in Stripe as:
//   {SITE_URL}/api/webhooks/stripe  (events: checkout.session.completed, checkout.session.expired, charge.refunded)
// Persist the result to your database here once one is connected.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret || secret.startsWith('your-') || whSecret.startsWith('your-')) {
    return NextResponse.json({ error: 'STRIPE_NOT_CONFIGURED' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'MISSING_SIGNATURE' }, { status: 400 });

  const payload = await req.text();
  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, whSecret);
  } catch {
    return NextResponse.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[stripe] paid', session.metadata?.orderId, session.metadata?.locationId, session.payment_status);
      break;
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('[stripe] expired', session.metadata?.orderId);
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      console.log('[stripe] refunded', charge.id, charge.amount_refunded);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
