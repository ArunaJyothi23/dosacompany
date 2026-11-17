import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { MENU_ITEMS } from '@/lib/menuData';
import { LOCATIONS, calcDeliveryFee, isPostcodeDeliverable } from '@/lib/locations';

export const runtime = 'nodejs';

interface IncomingItem {
  menuItemId: string;
  quantity: number;
  modifiers: { groupId: string; optionId: string }[];
}

interface Body {
  orderId: string;
  orderNumber: string;
  locationId: string;
  type: 'collection' | 'delivery';
  items: IncomingItem[];
  customer: { name: string; email: string; phone: string };
  postcode?: string;
  discountPence?: number;
}

const CONNECT_ENV: Record<string, string> = {
  southall: 'STRIPE_CONNECT_ACCOUNT_SOUTHALL',
  ilford: 'STRIPE_CONNECT_ACCOUNT_ILFORD',
  tooting: 'STRIPE_CONNECT_ACCOUNT_TOOTING',
  'wood-green': 'STRIPE_CONNECT_ACCOUNT_WOOD_GREEN',
};

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret.startsWith('your-')) {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: 'Online payments are not yet enabled. Stripe keys have not been added.' },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid request body.' }, { status: 400 });
  }

  const location = LOCATIONS.find((l) => l.id === body.locationId);
  if (!location) return NextResponse.json({ error: 'BAD_LOCATION', message: 'Unknown restaurant.' }, { status: 400 });
  if (!body.items?.length) return NextResponse.json({ error: 'EMPTY_CART', message: 'Your basket is empty.' }, { status: 400 });

  // Server-side price recalculation from the master menu
  let subtotal = 0;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const it of body.items) {
    const menuItem = MENU_ITEMS.find((m) => m.id === it.menuItemId);
    if (!menuItem || !menuItem.available) {
      return NextResponse.json({ error: 'ITEM_UNAVAILABLE', message: 'An item in your basket is no longer available.' }, { status: 400 });
    }
    let unit = menuItem.price;
    const labels: string[] = [];
    for (const mod of it.modifiers ?? []) {
      const group = menuItem.modifierGroups.find((g) => g.id === mod.groupId);
      const opt = group?.options.find((o) => o.id === mod.optionId);
      if (!opt) return NextResponse.json({ error: 'BAD_MODIFIER', message: 'Invalid item option.' }, { status: 400 });
      unit += opt.extraPrice;
      labels.push(opt.label);
    }
    const qty = Math.max(1, Math.min(50, Math.floor(it.quantity)));
    subtotal += unit * qty;
    lineItems.push({
      quantity: qty,
      price_data: {
        currency: 'gbp',
        unit_amount: unit,
        product_data: { name: labels.length ? `${menuItem.name} (${labels.join(', ')})` : menuItem.name },
      },
    });
  }

  let deliveryFee = 0;
  if (body.type === 'delivery') {
    if (!location.deliveryEnabled) return NextResponse.json({ error: 'NO_DELIVERY', message: 'Delivery is not available at this restaurant.' }, { status: 400 });
    if (!body.postcode || !isPostcodeDeliverable(location, body.postcode)) {
      return NextResponse.json({ error: 'OUT_OF_AREA', message: 'Sorry, your postcode is outside this restaurant’s delivery area.' }, { status: 400 });
    }
    if (subtotal < location.minDeliveryOrderPence) {
      return NextResponse.json({ error: 'MIN_ORDER', message: 'Your basket is below the minimum delivery order value.' }, { status: 400 });
    }
    deliveryFee = calcDeliveryFee(location, subtotal);
    if (deliveryFee > 0) {
      lineItems.push({
        quantity: 1,
        price_data: { currency: 'gbp', unit_amount: deliveryFee, product_data: { name: 'Delivery charge' } },
      });
    }
  } else if (!location.collectionEnabled) {
    return NextResponse.json({ error: 'NO_COLLECTION', message: 'Collection is not available at this restaurant.' }, { status: 400 });
  }

  const discount = Math.max(0, Math.min(Math.floor(body.discountPence ?? 0), subtotal));
  const total = subtotal + deliveryFee - discount;

  const stripe = new Stripe(secret);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const connectedAccount = process.env[CONNECT_ENV[location.id]];
  const useConnect = !!connectedAccount && !connectedAccount.startsWith('your-');

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: lineItems,
        customer_email: body.customer.email,
        success_url: `${origin}/order-confirmation-screen?order=${encodeURIComponent(body.orderId)}&paid=1`,
        cancel_url: `${origin}/checkout-screen?cancelled=1`,
        client_reference_id: body.orderId,
        metadata: {
          orderId: body.orderId,
          orderNumber: body.orderNumber,
          locationId: location.id,
          type: body.type,
          expectedTotalPence: String(total),
        },
        payment_intent_data: {
          metadata: { orderId: body.orderId, locationId: location.id },
          ...(useConnect ? { transfer_data: { destination: connectedAccount as string } } : {}),
        },
        ...(discount > 0
          ? {
              discounts: [
                {
                  coupon: (
                    await stripe.coupons.create({ amount_off: discount, currency: 'gbp', duration: 'once', name: 'WATAN discount' })
                  ).id,
                },
              ],
            }
          : {}),
      },
      { idempotencyKey: `checkout-${body.orderId}` }
    );
    return NextResponse.json({ url: session.url, sessionId: session.id, totalPence: total });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to start payment.';
    return NextResponse.json({ error: 'STRIPE_ERROR', message }, { status: 502 });
  }
}
