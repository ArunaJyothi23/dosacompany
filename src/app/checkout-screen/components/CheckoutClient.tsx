'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Shield, Lock, AlertCircle, Loader2, ShoppingBag, Truck, Tag } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatPrice } from '@/lib/menuData';
import { CartItem, getCartSubtotal, getCartVAT, loadCart, getSelectedLocationId } from '@/lib/cartStore';
import { calcDeliveryFee, generateTimeSlots, getLocation, isPostcodeDeliverable, FulfilmentType } from '@/lib/locations';
import { saveOrder, nextOrderNumber, StoredOrder } from '@/lib/orderStore';
import OrderSummarySection from './OrderSummarySection';

type FormValues = {
  fullName: string;
  phone: string;
  email: string;
  line1: string;
  city: string;
  postcode: string;
  slot: string;
  orderNote: string;
};

const PROMOS: Record<string, { type: 'percent' | 'fixed'; value: number; minPence: number }> = {
  WELCOME10: { type: 'percent', value: 10, minPence: 1500 },
  WATAN5: { type: 'fixed', value: 500, minPence: 3000 },
};

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const location = getLocation(params.get('location') || getSelectedLocationId());

  const [cart, setCart] = useState<CartItem[]>([]);
  const [type, setType] = useState<FulfilmentType>('collection');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [slots, setSlots] = useState<string[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { fullName: '', phone: '', email: '', line1: '', city: '', postcode: '', slot: '', orderNote: '' },
  });
  const postcode = watch('postcode');

  useEffect(() => {
    if (!location) {
      router.replace('/');
      return;
    }
    setCart(loadCart(location.id));
    if (params.get('cancelled')) setError('Payment was cancelled. Your basket has been kept — you can try again.');
  }, [location?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!location) return;
    const s = generateTimeSlots(location, type, new Date());
    setSlots(s);
    setValue('slot', s[0] ?? '');
  }, [type, location, setValue]);

  const subtotal = getCartSubtotal(cart);
  const deliveryFee = location && type === 'delivery' ? calcDeliveryFee(location, subtotal) : 0;
  const discount = promo ? Math.min(promo.discount, subtotal) : 0;
  const total = subtotal + deliveryFee - discount;
  const vat = getCartVAT(total);

  const postcodeOk = useMemo(() => (location && postcode ? isPostcodeDeliverable(location, postcode) : null), [location, postcode]);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    const p = PROMOS[code];
    if (!p) {
      setPromo(null);
      setPromoMsg('That code is not valid.');
      return;
    }
    if (subtotal < p.minPence) {
      setPromo(null);
      setPromoMsg(`Minimum order ${formatPrice(p.minPence)} for this code.`);
      return;
    }
    const d = p.type === 'percent' ? Math.round((subtotal * p.value) / 100) : p.value;
    setPromo({ code, discount: d });
    setPromoMsg(`Code applied: -${formatPrice(d)}`);
  };

  const onSubmit = async (data: FormValues) => {
    if (!location) return;
    setError('');
    if (cart.length === 0) {
      setError('Your basket is empty.');
      return;
    }
    if (type === 'delivery') {
      if (!isPostcodeDeliverable(location, data.postcode)) {
        setError(`Sorry, ${data.postcode.toUpperCase()} is outside the ${location.shortName} delivery area.`);
        return;
      }
      if (subtotal < location.minDeliveryOrderPence) {
        setError(`Minimum delivery order is ${formatPrice(location.minDeliveryOrderPence)}.`);
        return;
      }
    }
    if (!data.slot) {
      setError('No time slots are available today. Please try again when the restaurant is open.');
      return;
    }

    setProcessing(true);
    const now = new Date().toISOString();
    const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const order: StoredOrder = {
      id,
      orderNumber: nextOrderNumber(),
      locationId: location.id,
      type,
      status: 'placed',
      paymentStatus: 'pending',
      items: cart,
      subtotalPence: subtotal,
      deliveryFeePence: deliveryFee,
      discountPence: discount,
      vatPence: vat,
      totalPence: total,
      refundedPence: 0,
      promoCode: promo?.code,
      customer: { name: data.fullName, email: data.email, phone: data.phone, note: data.orderNote },
      address: type === 'delivery' ? { line1: data.line1, city: data.city, postcode: data.postcode.toUpperCase() } : undefined,
      slot: data.slot,
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'placed', at: now }],
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          locationId: location.id,
          type,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            modifiers: c.modifiers.map((m) => ({ groupId: m.groupId, optionId: m.optionId })),
          })),
          customer: { name: data.fullName, email: data.email, phone: data.phone },
          postcode: data.postcode,
          discountPence: discount,
        }),
      });
      const json = (await res.json()) as { url?: string; sessionId?: string; message?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.message || 'Unable to start payment. Please try again.');
        setProcessing(false);
        return;
      }
      // Order stays "pending" until the verified Stripe webhook / paid return confirms it.
      saveOrder({ ...order, stripeSessionId: json.sessionId });
      window.location.href = json.url;
    } catch {
      setError('Network error while starting payment. Please try again.');
      setProcessing(false);
    }
  };

  if (!location) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push(`/customer-menu-order-screen?location=${location.id}`)} className="w-9 h-9 rounded-xl bg-muted hover:bg-border flex items-center justify-center" aria-label="Back to menu">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="rounded-lg bg-[#0E0D0B] p-1"><AppLogo size={28} /></div>
            <div>
              <div className="font-bold text-foreground text-sm leading-tight">Checkout</div>
              <div className="text-xs text-muted-foreground">{location.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-secondary"><Lock size={14} /><span className="text-xs font-semibold">Secure</span></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={44} className="mx-auto text-muted-foreground mb-3" />
            <h2 className="font-bold text-lg mb-1">Your basket is empty</h2>
            <button onClick={() => router.push(`/customer-menu-order-screen?location=${location.id}`)} className="btn-primary w-auto px-8 mx-auto mt-4">Browse menu</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {([
                { id: 'collection', label: 'Collection', sub: `~${location.prepTimeMins} min`, icon: <ShoppingBag size={18} />, enabled: location.collectionEnabled },
                { id: 'delivery', label: 'Delivery', sub: `~${location.deliveryTimeMins} min`, icon: <Truck size={18} />, enabled: location.deliveryEnabled },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={!o.enabled}
                  onClick={() => setType(o.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition-all disabled:opacity-40 ${type === o.id ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}
                >
                  <div className="flex items-center gap-2 font-bold text-foreground">{o.icon}{o.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{o.enabled ? o.sub : 'Not available'}</div>
                </button>
              ))}
            </div>

            <OrderSummarySection cartItems={cart} subtotal={subtotal} vat={vat} total={total} deliveryFee={deliveryFee} discount={discount} />

            <div className="bg-white rounded-2xl border border-border p-5 mb-4">
              <h2 className="font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                Your Details
              </h2>
              <div className="space-y-4">
                <Field label="Full name" error={errors.fullName?.message}>
                  <input id="fullName" autoComplete="name" className={`form-input ${errors.fullName ? 'form-input-error' : ''}`} {...register('fullName', { required: 'Please enter your name', minLength: { value: 2, message: 'Name is too short' } })} />
                </Field>
                <Field label="Phone number" error={errors.phone?.message}>
                  <input id="phone" type="tel" autoComplete="tel" placeholder="+447700123456" className={`form-input ${errors.phone ? 'form-input-error' : ''}`} {...register('phone', { required: 'Please enter your phone number', pattern: { value: /^\+?[0-9\s\-()]{7,20}$/, message: 'Enter a valid phone number' } })} />
                </Field>
                <Field label="Email address" hint="Your order confirmation is sent here" error={errors.email?.message}>
                  <input id="email" type="email" autoComplete="email" className={`form-input ${errors.email ? 'form-input-error' : ''}`} {...register('email', { required: 'Please enter your email', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' } })} />
                </Field>

                {type === 'delivery' && (
                  <>
                    <Field label="Address line" error={errors.line1?.message}>
                      <input id="line1" autoComplete="address-line1" className={`form-input ${errors.line1 ? 'form-input-error' : ''}`} {...register('line1', { validate: (v) => type !== 'delivery' || v.trim().length > 3 || 'Enter your delivery address' })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Town / city" error={errors.city?.message}>
                        <input id="city" autoComplete="address-level2" className={`form-input ${errors.city ? 'form-input-error' : ''}`} {...register('city', { validate: (v) => type !== 'delivery' || v.trim().length > 1 || 'Enter your town' })} />
                      </Field>
                      <Field label="Postcode" error={errors.postcode?.message}>
                        <input id="postcode" autoComplete="postal-code" className={`form-input uppercase ${errors.postcode ? 'form-input-error' : ''}`} {...register('postcode', { validate: (v) => type !== 'delivery' || v.trim().length > 4 || 'Enter your postcode' })} />
                      </Field>
                    </div>
                    {postcodeOk !== null && postcode.length > 4 && (
                      <p className={`text-xs font-semibold ${postcodeOk ? 'text-secondary' : 'text-red-500'}`}>
                        {postcodeOk ? `✓ We deliver to this postcode from ${location.shortName}` : `✕ Outside the ${location.shortName} delivery area`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Minimum order {formatPrice(location.minDeliveryOrderPence)} · Delivery {formatPrice(location.deliveryFeePence)}, free over {formatPrice(location.freeDeliveryThresholdPence)}
                    </p>
                  </>
                )}

                <Field label={type === 'delivery' ? 'Delivery time' : 'Collection time'} error={errors.slot?.message}>
                  {slots.length === 0 ? (
                    <p className="text-sm text-red-500">No slots available right now — the restaurant is closed for the rest of today.</p>
                  ) : (
                    <select id="slot" className="form-input" {...register('slot', { required: 'Choose a time' })}>
                      {slots.map((s) => (<option key={s} value={s}>Today {s}</option>))}
                    </select>
                  )}
                </Field>

                <Field label="Order note (optional)">
                  <textarea id="orderNote" rows={2} placeholder="Allergies or special requests..." className="form-input resize-none" {...register('orderNote')} />
                </Field>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 mb-4">
              <h2 className="font-bold text-foreground text-lg mb-3 flex items-center gap-2">
                <Tag size={18} className="text-primary" /> Promo code
              </h2>
              <div className="flex gap-2">
                <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Enter code" className="form-input uppercase" />
                <button type="button" onClick={applyPromo} className="btn-secondary-outline w-auto px-5">Apply</button>
              </div>
              {promoMsg && <p className={`text-xs mt-2 font-semibold ${promo ? 'text-secondary' : 'text-red-500'}`}>{promoMsg}</p>}
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={processing} className="btn-primary text-lg py-4">
              {processing ? (<><Loader2 size={20} className="animate-spin" /><span>Redirecting to secure payment...</span></>) : (<><Lock size={18} />Pay {formatPrice(total)}</>)}
            </button>

            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-muted-foreground"><Shield size={14} /><span className="text-xs">Secure checkout</span></div>
              <span className="text-xs text-muted-foreground">Powered by Stripe</span>
              <span className="text-xs text-muted-foreground">Card details never touch our servers</span>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
      {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
}

export default function CheckoutClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CheckoutInner />
    </Suspense>
  );
}