'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, Clock, ShoppingBag, Truck, ChevronRight } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { LOCATIONS, isLocationOpenNow, RestaurantLocation } from '@/lib/locations';
import { setSelectedLocationId } from '@/lib/cartStore';
import { formatPrice } from '@/lib/menuData';

export default function LocationPickerClient() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#0E0D0B' }}>
      <header className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
        <AppLogo size={56} />
        <Link href="/admin-login" className="text-xs font-semibold text-white/50 hover:text-white transition-colors">
          Staff sign in
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 pb-16">
        <section className="text-center pt-6 pb-10">
          <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-3">Authentic Afghan &amp; Pakistani Cuisine · Halal</p>
          <h1 className="text-white font-extrabold text-3xl sm:text-5xl leading-tight mb-3">Order online from WATAN</h1>
          <p className="text-white/60 text-base max-w-xl mx-auto">Choose your restaurant to browse the menu and order for collection or delivery.</p>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LOCATIONS.map((loc) => (
            <LocationCard key={loc.id} loc={loc} open={now ? isLocationOpenNow(loc, now) : null} />
          ))}
        </div>

        <p className="text-center text-white/40 text-xs mt-10">
          Your basket belongs to one restaurant at a time. Prices include VAT. Please tell us about any allergies when ordering.
        </p>
      </main>
    </div>
  );
}

function LocationCard({ loc, open }: { loc: RestaurantLocation; open: boolean | null }) {
  const hours = loc.hours[0];
  return (
    <Link
      href={`/customer-menu-order-screen?location=${loc.id}`}
      onClick={() => setSelectedLocationId(loc.id)}
      className="group rounded-2xl p-5 border transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: '#1A1814', borderColor: '#2E2A22' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-white font-extrabold text-xl">{loc.shortName}</h2>
          <p className="text-white/50 text-xs mt-0.5">{loc.name}</p>
        </div>
        {open !== null && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${open ? 'bg-secondary/15 text-secondary' : 'bg-white/10 text-white/50'}`}>
            {open ? 'Open now' : 'Closed'}
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm text-white/70 mb-4">
        <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 flex-shrink-0 text-primary" /><span>{loc.address} {loc.postcode}</span></div>
        <div className="flex items-center gap-2"><Phone size={14} className="flex-shrink-0 text-primary" /><span>{loc.phone}</span></div>
        <div className="flex items-center gap-2"><Clock size={14} className="flex-shrink-0 text-primary" /><span>Daily {hours.open.replace(':00', '')}:00 – {hours.close === '24:00' ? 'midnight' : hours.close}</span></div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {loc.collectionEnabled && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/5 rounded-full px-3 py-1">
            <ShoppingBag size={12} /> Collection ~{loc.prepTimeMins} min
          </span>
        )}
        {loc.deliveryEnabled && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 bg-white/5 rounded-full px-3 py-1">
            <Truck size={12} /> Delivery ~{loc.deliveryTimeMins} min · min {formatPrice(loc.minDeliveryOrderPence)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-primary font-bold text-sm">
        <span>Order from {loc.shortName}</span>
        <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
