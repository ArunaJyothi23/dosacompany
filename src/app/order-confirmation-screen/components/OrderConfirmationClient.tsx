'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { CheckCircle2, Clock, ChefHat, ShoppingBag, Truck, Copy, Check, XCircle, Loader2 } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatPrice } from '@/lib/menuData';
import { getOrderById, subscribeOrders, updateOrder, StoredOrder, ORDER_STATUS_LABELS } from '@/lib/orderStore';
import { clearCart } from '@/lib/cartStore';
import { getLocation } from '@/lib/locations';
import { toast } from 'sonner';

const STEPS_COLLECTION = ['placed', 'accepted', 'preparing', 'ready', 'completed'] as const;
const STEPS_DELIVERY = ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed'] as const;

function stepLabel(status: string, type: 'collection' | 'delivery'): string {
  if (status === 'ready') return type === 'delivery' ? 'Ready for dispatch' : 'Ready for collection';
  if (status === 'completed') return type === 'delivery' ? 'Delivered' : 'Collected';
  if (status === 'placed') return 'Order placed';
  return ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS];
}

function ConfirmationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('order');
  const returnedPaid = params.get('paid') === '1';
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refresh = () => {
      if (!orderId) return;
      setOrder(getOrderById(orderId) ?? null);
      setLoaded(true);
    };
    refresh();
    return subscribeOrders(refresh);
  }, [orderId]);

  // Return from Stripe Checkout: mark paid once. The verified webhook is the source of truth in production.
  useEffect(() => {
    if (order && returnedPaid && order.paymentStatus === 'pending') {
      updateOrder(order.id, { paymentStatus: 'paid' });
      clearCart();
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customer.email,
          subject: `WATAN order ${order.orderNumber} confirmed`,
          orderNumber: order.orderNumber,
          restaurant: getLocation(order.locationId)?.name ?? 'WATAN',
          type: order.type,
          slot: order.slot,
          statusMessage: 'Thank you — your payment was received and your order has been sent to the restaurant.',
          totalPence: order.totalPence,
          items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
        }),
      }).catch(() => undefined);
    }
  }, [order, returnedPaid]);

  const copy = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      setCopied(true);
      toast.success('Order number copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!loaded) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <XCircle size={44} className="text-muted-foreground mb-3" />
        <h1 className="font-bold text-xl mb-1">Order not found</h1>
        <p className="text-muted-foreground text-sm mb-5">We couldn’t find this order on this device.</p>
        <button onClick={() => router.push('/')} className="btn-primary w-auto px-8">Back to WATAN</button>
      </div>
    );
  }

  const location = getLocation(order.locationId);
  const steps = order.type === 'delivery' ? STEPS_DELIVERY : STEPS_COLLECTION;
  const currentIdx = order.status === 'cancelled' ? -1 : steps.indexOf(order.status as (typeof steps)[number]);
  const paid = order.paymentStatus === 'paid';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="rounded-lg bg-[#0E0D0B] p-1"><AppLogo size={30} /></div>
          <div>
            <div className="font-bold text-foreground text-sm">{location?.name}</div>
            <div className="text-xs text-muted-foreground">Order tracking</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20 animate-fade-in">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${paid ? 'bg-secondary/10' : 'bg-amber-100'}`}>
            {paid ? <CheckCircle2 size={42} className="text-secondary" /> : <Clock size={42} className="text-amber-600" />}
          </div>
          <h1 className="text-2xl font-extrabold text-foreground mb-1">
            {order.status === 'cancelled' ? 'Order cancelled' : paid ? 'Thank you — order confirmed' : 'Waiting for payment confirmation'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {order.type === 'delivery' ? 'Delivery' : 'Collection'} · {order.slot} · {location?.shortName}
          </p>
          <button onClick={copy} className="mt-4 inline-flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 font-mono-nums font-bold text-sm">
            {order.orderNumber}
            {copied ? <Check size={14} className="text-secondary" /> : <Copy size={14} className="text-muted-foreground" />}
          </button>
        </div>

        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-2xl border border-border p-5 mb-4">
            <h2 className="font-bold text-foreground mb-4">Order progress</h2>
            <ol className="space-y-4">
              {steps.map((s, i) => {
                const done = i <= currentIdx && paid;
                const active = i === currentIdx + 1 && paid;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-secondary text-white' : active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {done ? <CheckCircle2 size={16} /> : s === 'preparing' ? <ChefHat size={16} /> : s === 'out_for_delivery' ? <Truck size={16} /> : <ShoppingBag size={16} />}
                    </span>
                    <span className={`text-sm font-semibold ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{stepLabel(s, order.type)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-border p-5 mb-4">
          <h2 className="font-bold text-foreground mb-3">Your order</h2>
          <div className="space-y-2">
            {order.items.map((i) => (
              <div key={i.cartItemId} className="flex justify-between text-sm gap-3">
                <span>{i.quantity}× {i.name}{i.modifiers.length > 0 && <span className="text-muted-foreground"> ({i.modifiers.map((m) => m.optionLabel).join(', ')})</span>}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 space-y-1 text-sm">
            {order.deliveryFeePence > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="font-mono-nums">{formatPrice(order.deliveryFeePence)}</span></div>}
            {order.discountPence > 0 && <div className="flex justify-between text-secondary"><span>Discount</span><span className="font-mono-nums">-{formatPrice(order.discountPence)}</span></div>}
            <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary font-mono-nums">{formatPrice(order.totalPence)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 mb-6 text-sm">
          <h2 className="font-bold text-foreground mb-2">{order.type === 'delivery' ? 'Delivering to' : 'Collect from'}</h2>
          {order.type === 'delivery' && order.address ? (
            <p className="text-muted-foreground">{order.address.line1}, {order.address.city} {order.address.postcode}</p>
          ) : (
            <p className="text-muted-foreground">{location?.address} {location?.postcode} · {location?.phone}</p>
          )}
        </div>

        <button onClick={() => router.push('/')} className="btn-secondary-outline">Order again</button>
      </main>
    </div>
  );
}

export default function OrderConfirmationClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConfirmationInner />
    </Suspense>
  );
}