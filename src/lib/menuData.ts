export type SpiceLevel = 'mild' | 'medium' | 'hot' | 'none';

export interface ModifierOption {
  id: string;
  label: string;
  extraPrice: number; // pence
}

export interface ModifierGroup {
  id: string;
  label: string;
  required: boolean;
  multiSelect: boolean;
  options: ModifierOption[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // pence (base / smallest portion)
  image: string;
  alt: string;
  isVegetarian: boolean;
  isDairy: boolean;
  hasNuts: boolean;
  spiceLevel: SpiceLevel;
  allergens: string[];
  available: boolean;
  featured: boolean;
  eposItemId: string;
  prepTimeMins: number;
  modifierGroups: ModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string;
  displayOrder: number;
}

export const MENU_CATEGORIES: MenuCategory[] = [
  { id: 'all', name: 'All', emoji: '🍽️', displayOrder: 0 },
  { id: 'kebabs-grills', name: 'Kebabs & Grills', emoji: '🍢', displayOrder: 1 },
  { id: 'specials', name: 'Specials', emoji: '⭐', displayOrder: 2 },
  { id: 'curries', name: 'Curries', emoji: '🍛', displayOrder: 3 },
  { id: 'seafood', name: 'Seafood', emoji: '🦐', displayOrder: 4 },
  { id: 'biryani-rice', name: 'Biryani & Rice', emoji: '🍚', displayOrder: 5 },
  { id: 'breads-sides', name: 'Breads, Sides & Others', emoji: '🫓', displayOrder: 6 },
  { id: 'drinks-desserts', name: 'Drinks & Desserts', emoji: '🍹', displayOrder: 7 },
  { id: 'soft-drinks', name: 'Soft Drinks', emoji: '🥤', displayOrder: 8 },
  { id: 'hot-drinks', name: 'Hot Drinks', emoji: '🍵', displayOrder: 9 },
  { id: 'milkshakes', name: 'Milkshakes', emoji: '🥛', displayOrder: 10 },
  { id: 'fresh-juices', name: 'Fresh Juices', emoji: '🧃', displayOrder: 11 },
];

type Dietary = 'd' | 'n' | 'v';

interface RawItem {
  c: string; // category id
  n: string; // name
  d: string; // description
  p: number; // price in pence
  tags?: Dietary[];
  sizes?: { label: string; price: number }[]; // portion options; base price = first size price
  hot?: boolean;
  feat?: boolean;
}

const RAW_ITEMS: RawItem[] = [
  // ─── KEBABS & GRILLS ───
  { c: 'kebabs-grills', n: 'Afghani Mix Grill', d: 'A selection from our famous kebabs masterly marinated', p: 3900, feat: true },
  { c: 'kebabs-grills', n: 'Special Afghani Mix Grill', d: 'A selection from our famous kebabs masterly marinated', p: 6800 },
  { c: 'kebabs-grills', n: 'Chapli Kebab Platter', d: '3 chapli kebab and 1 Afghani naan.', p: 2500 },
  { c: 'kebabs-grills', n: 'Chapli Kebab', d: 'Marinated and barbequed over charcoal grill.', p: 750, feat: true },
  { c: 'kebabs-grills', n: 'Lamb Tikka Kebab (Lamb Prime Loin)', d: '2 skewers of lamb tikka served with naan.', p: 3900 },
  { c: 'kebabs-grills', n: 'Mix Tikka Kebab', d: '1 skewer of chicken and lamb tikka marinated in garlic', p: 1600 },
  { c: 'kebabs-grills', n: 'Chicken Tikka Kebab', d: '2 skewers of chicken tikka served with naan.', p: 1500 },
  { c: 'kebabs-grills', n: 'Chops Kebab (8 pieces)', d: '2 skewers baby lamb chops served with naan.', p: 2200 },
  { c: 'kebabs-grills', n: 'Ashak (8 pieces)', d: '1 skewer of chicken and lamb tikka marinated in garlic', p: 1200 },
  { c: 'kebabs-grills', n: 'Mantu (8 pieces)', d: 'Boiled dumplings filled with ground lamb mince', p: 1200 },
  { c: 'kebabs-grills', n: 'Mix Grill', d: 'A selection from our famous kebabs masterly marinated and barbequed', p: 3600, tags: ['d'] },
  { c: 'kebabs-grills', n: 'Watan Family Tawa Platter', d: 'A selection from our famous kebabs masterly', p: 6500, tags: ['d', 'n'] },
  { c: 'kebabs-grills', n: 'Whole Grilled Chicken (With Chips)', d: '2 skewers baby lamb chops served with naan.', p: 1500 },
  { c: 'kebabs-grills', n: 'Lahori Chargha Watan', d: 'A selection from our famous kebabs masterly marinated and barbequed', p: 1400 },
  { c: 'kebabs-grills', n: 'Seekh Kebab', d: 'Lamb mince seekh kebab (4 pieces).', p: 1000 },
  { c: 'kebabs-grills', n: 'Reshmi Seekh Kebab', d: 'Chicken mince seekh kebab (4 pieces).', p: 1000 },
  { c: 'kebabs-grills', n: 'Chicken Wings with Chips (10 pieces)', d: 'A selection from our famous kebabs masterly', p: 1200, tags: ['d'] },
  { c: 'kebabs-grills', n: 'Chicken Malai Boti Kebab (very tender)', d: 'Lamb mince seekh kebab (4 pieces).', p: 1400, tags: ['d', 'n'] },
  { c: 'kebabs-grills', n: 'Lamb Tikka', d: 'Fine lamb fillet meat cubes marinated in a masala sauce, barbequed over charcoal.', p: 1200, tags: ['d'] },
  { c: 'kebabs-grills', n: 'Chicken Tikka', d: 'Chicken breast meat cubes marinated in a masala sauce, barbequed over charcoal.', p: 1200, tags: ['d'] },
  { c: 'kebabs-grills', n: 'Mix Tikka', d: 'Cubes of fresh boneless chicken and lamb fillet marinated in a masala sauce.', p: 1200, tags: ['d'] },
  { c: 'kebabs-grills', n: 'Lamb Chops', d: '4 pieces of lamb chops marinated in a masala sauce, barbequed over charcoal.', p: 1200, tags: ['d'] },

  // ─── SPECIALS ───
  { c: 'specials', n: 'Peshwari Chicken Karahi (Mild!)', d: 'Chicken cooked in an authentic', p: 3200 },
  { c: 'specials', n: 'Charsi Chicken Karahi (Hot!)', d: 'Chicken cooked in an authentic', p: 3400, hot: true },
  { c: 'specials', n: 'Peshwari Lamb Karahi (Mild!)', d: 'Lamb karahi.', p: 3200, sizes: [{ label: 'Half (1–2 people)', price: 3200 }, { label: 'Full (2–3 people)', price: 4600 }] },
  { c: 'specials', n: 'Charsi Lamb Karahi (Hot!)', d: 'Lamb karahi.', p: 3200, hot: true, sizes: [{ label: 'Half (1–2 people)', price: 3200 }, { label: 'Full (2–3 people)', price: 4600 }] },
  { c: 'specials', n: 'Masale Daar Raan', d: 'Whole baby lamb raan approx. 3kg steamed,', p: 10000 },
  { c: 'specials', n: 'Full Lamb', d: 'Whole baby lamb approx. 13–16kg steamed, fried, garnished', p: 40000 },
  { c: 'specials', n: 'Kabuli Pilau (Lamb Shank)', d: 'Slow cooked steamed rice mixed with raisins, carrots and lamb shank.', p: 1800, feat: true },

  // ─── CURRIES ───
  { c: 'curries', n: 'Chicken Karahi', d: 'Classic Pakistani-style chicken curry cooked with tomatoes, onions, ginger, and spices.', p: 1100 },
  { c: 'curries', n: 'Butter Chicken', d: 'Creamy tomato-based curry with boneless chicken, butter, cream, and mild spices.', p: 1200, tags: ['d', 'n'], feat: true },
  { c: 'curries', n: 'Chilli Chicken', d: 'Spicy chicken dish cooked with green chillies, peppers, and tangy sauces.', p: 1200, hot: true },
  { c: 'curries', n: 'Achari Chicken', d: 'Chicken cooked with traditional achari (pickle-style) spices for a tangy, spicy flavour.', p: 1200 },
  { c: 'curries', n: 'Saag Chicken', d: 'Tender chicken pieces cooked with spinach and aromatic spices.', p: 1200 },
  { c: 'curries', n: 'Karahi Gosht (Boneless)', d: 'Boneless lamb curry cooked in a traditional karahi with fresh spices.', p: 1200 },
  { c: 'curries', n: 'Saag Gosht', d: 'Tender chicken pieces cooked with spinach and aromatic spices.', p: 1300 },
  { c: 'curries', n: 'Achari Gosht', d: 'Lamb prepared with achari spices, giving it a tangy, pickle-inspired taste.', p: 1300 },
  { c: 'curries', n: 'Daal Gosht', d: 'A hearty curry made with lamb and lentils, slow-cooked for rich flavour.', p: 1200 },
  { c: 'curries', n: 'Tarka Daal Mash', d: 'Creamy lentils tempered with fried garlic, onion, and spices.', p: 800 },
  { c: 'curries', n: 'Lahori Chanay', d: 'Chickpeas cooked Lahori-style with aromatic spices and herbs.', p: 850 },
  { c: 'curries', n: 'Daal Achari', d: 'Lentils cooked with pickle-style spices for a tangy twist.', p: 800 },
  { c: 'curries', n: 'Saag', d: 'Pureed spinach cooked with spices, garlic, and butter.', p: 850 },
  { c: 'curries', n: 'Paneer Curry', d: 'Cottage cheese cubes cooked in a spiced curry sauce.', p: 1000, tags: ['d'] },
  { c: 'curries', n: 'Saag Paneer', d: 'Spinach cooked with soft paneer cubes and mild spices.', p: 850 },
  { c: 'curries', n: 'Shahi Paneer Tikka', d: 'Paneer marinated with special herbs, grilled with red and green peppers.', p: 1200 },
  { c: 'curries', n: 'Nihari (Lamb)', d: 'A traditional slow-cooked lamb stew with rich spices, often enjoyed as a hearty delicacy.', p: 1500, tags: ['d'] },
  { c: 'curries', n: 'Paya (Lamb)', d: 'Classic dish made with lamb trotters, slow-cooked until tender in a spicy gravy.', p: 1200 },
  { c: 'curries', n: 'Magaz Masala', d: 'Lamb brain curry cooked with aromatic masala for a rich and creamy taste.', p: 1200 },
  { c: 'curries', n: 'Seekh Kebab Masala', d: 'Juicy lamb seekh kebabs served in a spiced curry sauce.', p: 1400 },
  { c: 'curries', n: 'Haleem', d: 'A wholesome stew made with slow-cooked lamb, lentils, wheat, and aromatic spices.', p: 1200 },
  { c: 'curries', n: 'Chicken Tikka Masala', d: 'Grilled chicken tikka pieces cooked in a creamy, spiced tomato-based curry.', p: 1400, tags: ['d'] },

  // ─── SEAFOOD ───
  { c: 'seafood', n: 'Whole Grilled Fish with Saffron Rice (Half Kg Sea Bream)', d: 'Fresh sea bream grilled and served with fragrant saffron rice.', p: 1800 },
  { c: 'seafood', n: 'Masala Fish', d: 'Cod fish tossed in a frying pan with capsicums, red onion, tomatoes, fresh herbs, and spices, served on a sizzling tray.', p: 1500 },
  { c: 'seafood', n: 'Jumbo King Prawns', d: 'Large king prawns tossed with capsicums, red onion, tomatoes, fresh herbs, and spices, served on a sizzling tray.', p: 1800 },
  { c: 'seafood', n: 'Jumbo King Prawn Curry', d: 'Juicy king prawns cooked in a spiced curry with capsicums, red onion, tomatoes, fresh herbs, and spices, served sizzling hot.', p: 1800 },

  // ─── BIRYANI & RICE ───
  { c: 'biryani-rice', n: 'Dum Chicken Biryani (Masterly pre-ready)', d: 'Fresh sea bream grilled and served with fragrant saffron rice.', p: 1200, tags: ['d'] },
  { c: 'biryani-rice', n: 'Dum Lamb Biryani (Masterly pre-ready)', d: 'Classic lamb biryani, slow-cooked with basmati rice, saffron, and authentic spices.', p: 1200, tags: ['d'], feat: true },
  { c: 'biryani-rice', n: 'Chicken Tikka Biryani', d: 'Skewer of chicken tikka grilled over charcoal, mixed with fresh herbs, basmati rice', p: 1500 },
  { c: 'biryani-rice', n: 'Paneer Tikka Biryani', d: 'Diced cottage cheese cooked with spices, herbs, and basmati rice. Prepared fresh in a frying pan.', p: 1200, tags: ['d', 'v'] },
  { c: 'biryani-rice', n: 'Jumbo King Prawn Biryani (Prepared on order in frying pan)', d: 'Large king prawns cooked with herbs, spices, and basmati rice, freshly prepared.', p: 2000 },
  { c: 'biryani-rice', n: 'Kabuli Pilau (Lamb Shank)', d: 'Fragrant Afghan-style rice dish cooked with lamb shank, raisins, and carrots.', p: 1800 },
  { c: 'biryani-rice', n: 'White Rice', d: 'Steamed plain white basmati rice.', p: 400 },
  { c: 'biryani-rice', n: 'Zafrani Rice', d: 'White rice sautéed in butter and simmered with saffron-infused water.', p: 500 },
  { c: 'biryani-rice', n: 'Vegetable Pilau', d: 'Basmati rice cooked with fresh vegetables and mild spices.', p: 600 },

  // ─── BREADS, SIDES & OTHERS ───
  { c: 'breads-sides', n: 'Naan', d: 'Soft, traditional Indian bread baked in a tandoor.', p: 175 },
  { c: 'breads-sides', n: 'Afghani Naan', d: 'Thick, fluffy naan with a slightly sweet taste.', p: 300 },
  { c: 'breads-sides', n: 'Roti', d: 'Whole wheat flatbread, lighter than naan.', p: 175 },
  { c: 'breads-sides', n: 'Roghani Naan', d: 'Buttery naan with a soft, rich texture.', p: 300 },
  { c: 'breads-sides', n: 'Chilli Naan', d: 'Naan infused with spicy green chillies.', p: 250 },
  { c: 'breads-sides', n: 'Peshwari Naan', d: 'Sweet naan stuffed with coconut, nuts, and raisins.', p: 450 },
  { c: 'breads-sides', n: 'Garlic Naan', d: 'Naan topped with fresh garlic and herbs.', p: 250 },
  { c: 'breads-sides', n: 'Keema Naan', d: 'Naan stuffed with spiced minced meat.', p: 700 },
  { c: 'breads-sides', n: 'Tandoori Paratha', d: 'Layered whole wheat bread cooked in a tandoor.', p: 350 },
  { c: 'breads-sides', n: 'Add Butter', d: 'Extra butter for your naan or roti.', p: 25 },
  { c: 'breads-sides', n: 'French Fries', d: 'Crispy golden potato fries.', p: 500 },
  { c: 'breads-sides', n: 'Hummus', d: 'Creamy chickpea dip made with tahini.', p: 500 },
  { c: 'breads-sides', n: 'Creamy Yoghurt', d: 'Cool and smooth yoghurt, perfect side.', p: 300 },
  { c: 'breads-sides', n: 'Masala Fries', d: 'Spicy fries seasoned with Indian masala.', p: 600 },
  { c: 'breads-sides', n: 'Watan Salad', d: 'Fresh mixed salad with a spicy twist.', p: 700 },
  { c: 'breads-sides', n: 'Raita', d: 'Yoghurt-based dip with herbs and cucumber.', p: 300 },
  { c: 'breads-sides', n: 'Popcorn Chicken', d: 'Crispy bite-sized fried chicken pieces.', p: 750 },
  { c: 'breads-sides', n: 'Chicken Nuggets', d: "Classic kids' favourite, golden fried nuggets.", p: 750 },
  { c: 'breads-sides', n: 'Grilled Chicken Cubes', d: 'Tender grilled chicken pieces, lightly seasoned.', p: 1000 },

  // ─── DRINKS & DESSERTS ───
  { c: 'drinks-desserts', n: 'Mojito', d: 'Refreshing minty lime and soda.', p: 700 },
  { c: 'drinks-desserts', n: 'Strawberry Daiquiri', d: 'Sweet and fruity, garnished with strawberries.', p: 700 },
  { c: 'drinks-desserts', n: 'Pina Colada', d: 'Tropical blend of cream coconut and pineapple.', p: 700 },
  { c: 'drinks-desserts', n: 'Passiontini', d: 'Exotic tropical fruit with a twist and crunch.', p: 700 },
  { c: 'drinks-desserts', n: 'Mango Lassi', d: 'Sweet mango yoghurt drink.', p: 650, sizes: [{ label: 'Glass', price: 650 }, { label: 'Jug', price: 1600 }] },
  { c: 'drinks-desserts', n: 'Lahori Salty Lassi', d: 'Traditional savoury lassi with a tangy flavour.', p: 450, sizes: [{ label: 'Glass', price: 450 }, { label: 'Jug', price: 1100 }] },
  { c: 'drinks-desserts', n: 'Sweet Lassi', d: 'Classic sweetened yoghurt drink.', p: 450, sizes: [{ label: 'Glass', price: 450 }, { label: 'Jug', price: 1100 }] },
  { c: 'drinks-desserts', n: 'Doogh Afghani', d: 'Afghan-style yoghurt drink with herbs.', p: 450, sizes: [{ label: 'Glass', price: 450 }, { label: 'Jug', price: 1100 }] },
  { c: 'drinks-desserts', n: 'Kheer', d: 'Creamy rice pudding with cardamom.', p: 400 },
  { c: 'drinks-desserts', n: 'Pista Kheer', d: 'Rice pudding topped with pistachios.', p: 600 },
  { c: 'drinks-desserts', n: 'Sheeryakh', d: 'Afghan frozen dessert with milk and sugar.', p: 600 },

  // ─── SOFT DRINKS ───
  { c: 'soft-drinks', n: 'Can Drinks (Coke Zero, 7up, Fanta)', d: 'Choose your can.', p: 250 },
  { c: 'soft-drinks', n: 'Coke Glass Bottle (70cl)', d: 'Coke glass bottle, 70cl.', p: 300 },
  { c: 'soft-drinks', n: 'Water (330ml)', d: 'Bottled water, 330ml.', p: 200 },
  { c: 'soft-drinks', n: 'Water Bottle (Large)', d: 'Large bottled water.', p: 350 },

  // ─── HOT DRINKS ───
  { c: 'hot-drinks', n: 'Doodh Pati Pot', d: 'Traditional milk tea served in a pot.', p: 700 },
  { c: 'hot-drinks', n: 'Green Tea Pot (with cardamom)', d: 'Green tea with cardamom served in a pot.', p: 600 },

  // ─── MILKSHAKES ───
  { c: 'milkshakes', n: 'Mango Milkshake', d: 'Mango milkshake.', p: 650, sizes: [{ label: 'Glass', price: 650 }, { label: 'Jug', price: 1600 }] },
  { c: 'milkshakes', n: 'Ferrero Milkshake', d: 'Ferrero milkshake.', p: 700 },
  { c: 'milkshakes', n: 'Oreo Shake', d: 'Oreo milkshake.', p: 700 },

  // ─── FRESH JUICES ───
  { c: 'fresh-juices', n: 'Fresh Pineapple Juice', d: 'Freshly pressed pineapple juice.', p: 800 },
  { c: 'fresh-juices', n: 'Fresh Orange Juice', d: 'Freshly pressed orange juice.', p: 700 },
  { c: 'fresh-juices', n: 'Fresh Apple Juice', d: 'Freshly pressed apple juice.', p: 700 },
  { c: 'fresh-juices', n: 'Fresh Carrot Juice', d: 'Freshly pressed carrot juice.', p: 700 },
  { c: 'fresh-juices', n: 'Juices Mocktail', d: 'Juice mocktail.', p: 800 },
];

const NO_IMAGE = '/assets/images/no_image.png';

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function buildItem(raw: RawItem, index: number): MenuItem {
  const tags = raw.tags ?? [];
  const allergens: string[] = [];
  if (tags.includes('d')) allergens.push('dairy');
  if (tags.includes('n')) allergens.push('nuts');

  const modifierGroups: ModifierGroup[] = raw.sizes
    ? [
        {
          id: `mg-size-${index}`,
          label: 'Choose Portion',
          required: true,
          multiSelect: false,
          options: raw.sizes.map((s, i) => ({
            id: `opt-size-${index}-${i}`,
            label: s.label,
            extraPrice: s.price - raw.sizes![0].price,
          })),
        },
      ]
    : [];

  const hotName = /\(Hot!\)/i.test(raw.n) || raw.hot;
  const mildName = /\(Mild!\)/i.test(raw.n);

  return {
    id: `item-${slugify(raw.n)}-${index}`,
    categoryId: raw.c,
    name: raw.n,
    description: raw.d,
    price: raw.sizes ? raw.sizes[0].price : raw.p,
    image: NO_IMAGE,
    alt: `${raw.n} from the Watan menu`,
    isVegetarian: tags.includes('v'),
    isDairy: tags.includes('d'),
    hasNuts: tags.includes('n'),
    spiceLevel: hotName ? 'hot' : mildName ? 'mild' : 'none',
    allergens,
    available: true,
    featured: !!raw.feat,
    eposItemId: `WT-${String(index + 1).padStart(3, '0')}`,
    prepTimeMins: raw.c === 'soft-drinks' || raw.c === 'hot-drinks' ? 5 : 20,
    modifierGroups,
  };
}

export const MENU_ITEMS: MenuItem[] = RAW_ITEMS.map(buildItem);

export function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}