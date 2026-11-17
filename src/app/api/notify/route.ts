import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

interface Body {
  to: string;
  subject: string;
  orderNumber: string;
  restaurant: string;
  type: 'collection' | 'delivery';
  slot: string;
  statusMessage: string;
  totalPence: number;
  items: { name: string; quantity: number }[];
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith('your-')) {
    return NextResponse.json({ sent: false, error: 'RESEND_NOT_CONFIGURED' }, { status: 503 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ sent: false, error: 'BAD_REQUEST' }, { status: 400 });
  }
  if (!body.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
    return NextResponse.json({ sent: false, error: 'BAD_EMAIL' }, { status: 400 });
  }

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM_EMAIL || 'orders@watanrestaurant.co.uk';
  const rows = body.items.map((i) => `<li>${i.quantity} × ${esc(i.name)}</li>`).join('');
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
      <h2 style="color:#B8892B">WATAN — ${esc(body.restaurant.replace('Watan ', ''))}</h2>
      <p>${esc(body.statusMessage)}</p>
      <p><strong>Order ${esc(body.orderNumber)}</strong><br/>${body.type === 'delivery' ? 'Delivery' : 'Collection'} · ${esc(body.slot)}</p>
      <ul>${rows}</ul>
      <p><strong>Total: £${(body.totalPence / 100).toFixed(2)}</strong></p>
    </div>`;

  try {
    const { error } = await resend.emails.send({ from: `WATAN <${from}>`, to: body.to, subject: body.subject, html });
    if (error) return NextResponse.json({ sent: false, error: error.message }, { status: 502 });
    return NextResponse.json({ sent: true });
  } catch (e) {
    return NextResponse.json({ sent: false, error: e instanceof Error ? e.message : 'SEND_FAILED' }, { status: 502 });
  }
}
