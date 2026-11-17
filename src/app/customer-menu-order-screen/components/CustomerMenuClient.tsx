'use client';

import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Search, ShoppingCart, ChevronRight, X, Plus, Info, ArrowLeft, MapPin } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { MENU_CATEGORIES, MENU_ITEMS, MenuItem, formatPrice } from '@/lib/menuData';
import { CartItem, CartModifier, getCartTotal, loadCart, saveCart, setSelectedLocationId, getSelectedLocationId } from '@/lib/cartStore';
import { getLocation, isLocationOpenNow, LocationId } from '@/lib/locations';
import ItemCustomisationModal from './ItemCustomisationModal';
import CartDrawer from './CartDrawer';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function MenuInner() {
  const router = useRouter();
  const params = useSearchParams();
  const locParam = params.get('location') || getSelectedLocationId() || '';
  const location = getLocation(locParam);

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [open, setOpen] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!location) {
      router.replace('/');
      return;
    }
    setSelectedLocationId(location.id);
    setCartItems(loadCart(location.id));
    setOpen(isLocationOpenNow(location, new Date()));
    setHydrated(true);
  }, [location?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hydrated && location) saveCart(location.id as LocationId, cartItems);
  }, [cartItems, hydrated, location]);

  const filteredItems = MENU_ITEMS.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = q === '' || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'all' || item.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const itemsByCategory = MENU_CATEGORIES.filter((c) => c.id !== 'all')
    .map((cat) => ({ category: cat, items: filteredItems.filter((i) => i.categoryId === cat.id) }))
    .filter((g) => g.items.length > 0);

  const addToCart = useCallback((item: MenuItem, modifiers: CartModifier[], specialInstructions: string, qty: number) => {
    const cartItemId = `cart-${item.id}-${Date.now()}`;
    setCartItems((prev) => [
      ...prev,
      { cartItemId, menuItemId: item.id, name: item.name, basePrice: item.price, quantity: qty, modifiers, specialInstructions, image: item.image },
    ]);
    setSelectedItem(null);
  }, []);

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setCartItems((prev) => prev.map((ci) => (ci.cartItemId === cartItemId ? { ...ci, quantity: Math.max(1, ci.quantity + delta) } : ci)));
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.cartItemId !== cartItemId));
  }, []);

  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = getCartTotal(cartItems);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const el = categoryRefs.current[categoryId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAdd = (item: MenuItem) => {
    if (item.modifierGroups.length > 0) setSelectedItem(item);
    else addToCart(item, [], '', 1);
  };

  if (!location) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/" className="w-9 h-9 rounded-xl bg-muted hover:bg-border flex items-center justify-center flex-shrink-0" aria-label="Change restaurant">
                <ArrowLeft size={17} />
              </Link>
              <div className="flex items-center gap-2 min-w-0">
                <div className="rounded-lg bg-[#0E0D0B] p-1 flex-shrink-0"><AppLogo size={30} /></div>
                <div className="min-w-0">
                  <div className="font-bold text-foreground text-base leading-tight truncate">{location.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin size={11} /> {location.address}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 bg-primary text-white rounded-xl px-4 py-2 font-semibold text-sm transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
              aria-label="View basket"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-foreground text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>
              )}
              <span>{cartCount > 0 ? formatPrice(cartTotal) : 'Basket'}</span>
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-input rounded-xl text-sm border border-border focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {MENU_CATEGORIES.map((cat) => (
              <button
                key={`cat-pill-${cat.id}`}
                onClick={() => {
                  if (cat.id === 'all') {
                    setActiveCategory('all');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else scrollToCategory(cat.id);
                }}
                className={`category-pill ${activeCategory === cat.id ? 'category-pill-active' : 'category-pill-inactive'}`}
              >
                <span className="mr-1">{cat.emoji}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4">
        <div className="rounded-2xl px-4 py-3 mb-6 flex items-center gap-3" style={{ background: '#0E0D0B' }}>
          <div className="flex-1">
            <div className="font-bold text-white text-sm">Collection &amp; Delivery</div>
            <div className="text-xs text-white/60">Choose at checkout · Halal · Afghan &amp; Pakistani cuisine</div>
          </div>
          {open !== null && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${open ? 'bg-secondary/20 text-secondary' : 'bg-white/10 text-white/60'}`}>
              {open ? 'Open now' : 'Closed — pre-order available'}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
          <Info size={12} /> (d) dairy · (n) nuts · (v) vegetarian. Please tell us about any allergies before ordering.
        </p>

        {activeCategory === 'all' && searchQuery === '' && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-3">⭐ Popular dishes</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {MENU_ITEMS.filter((i) => i.featured && i.available).map((item) => (
                <button
                  key={`featured-${item.id}`}
                  onClick={() => handleAdd(item)}
                  className="flex-shrink-0 w-44 text-left bg-white rounded-xl border border-border p-3 hover:border-primary transition-colors"
                >
                  <div className="font-bold text-foreground text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">{item.name}</div>
                  <div className="text-primary font-bold text-sm font-mono-nums">{formatPrice(item.price)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {(activeCategory === 'all' ? itemsByCategory : [{ category: MENU_CATEGORIES.find((c) => c.id === activeCategory)!, items: filteredItems }]).map(
          ({ category, items }) =>
            category && (
              <section key={`section-${category.id}`} ref={(el) => { categoryRefs.current[category.id] = el; }} className="mb-8 scroll-mt-44">
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <span>{category.emoji}</span>
                  {category.name}
                  <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
                </h2>
                <div className="bg-white rounded-2xl border border-border divide-y divide-border">
                  {items.map((item) => (
                    <MenuRow key={`row-${item.id}`} item={item} onAdd={() => handleAdd(item)} />
                  ))}
                </div>
              </section>
            )
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-foreground mb-1">No items found</h3>
            <p className="text-muted-foreground text-sm">Try a different search or category</p>
          </div>
        )}
      </main>

      {cartCount > 0 && (
        <div className="sticky-cart-bar px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-3xl mx-auto flex items-center justify-between bg-primary text-white rounded-2xl px-5 py-4 font-bold shadow-xl transition-all hover:opacity-90 block"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 rounded-lg px-2.5 py-1 text-sm font-bold">{cartCount}</span>
              <span className="text-base">View Basket</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold font-mono-nums">{formatPrice(cartTotal)}</span>
              <ChevronRight size={18} />
            </div>
          </button>
        </div>
      )}

      {selectedItem && <ItemCustomisationModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} />}

      {cartOpen && (
        <CartDrawer
          cartItems={cartItems}
          locationName={location.name}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
          onCheckout={() => router.push(`/checkout-screen?location=${location.id}`)}
        />
      )}
    </div>
  );
}

function MenuRow({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const hasSizes = item.modifierGroups.length > 0;
  return (
    <div className={`flex items-start gap-3 p-4 ${!item.available ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
          <h3 className="font-bold text-foreground text-[15px] leading-tight">{item.name}</h3>
          {item.isVegetarian && <span className="text-[10px] font-bold text-secondary bg-secondary/10 rounded px-1.5 py-0.5">(v)</span>}
          {item.isDairy && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">(d)</span>}
          {item.hasNuts && <span className="text-[10px] font-bold text-orange-700 bg-orange-100 rounded px-1.5 py-0.5">(n)</span>}
          {item.spiceLevel === 'hot' && <span className="text-xs">🌶🌶🌶</span>}
        </div>
        <p className="text-muted-foreground text-[13px] leading-snug mt-1 line-clamp-2">{item.description}</p>
        <div className="text-primary font-bold text-sm font-mono-nums mt-1.5">
          {hasSizes ? 'From ' : ''}{formatPrice(item.price)}
        </div>
      </div>
      {item.available ? (
        <button onClick={onAdd} className="add-btn flex-shrink-0 self-center" aria-label={`Add ${item.name}`}>
          <Plus size={16} />
          Add
        </button>
      ) : (
        <span className="text-muted-foreground text-xs font-medium self-center">Unavailable</span>
      )}
    </div>
  );
}

export default function CustomerMenuClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <MenuInner />
    </Suspense>
  );
}