export type LocationId = 'southall' | 'ilford' | 'tooting' | 'wood-green';

export interface DayHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface RestaurantLocation {
  id: LocationId;
  name: string;
  shortName: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  collectionEnabled: boolean;
  deliveryEnabled: boolean;
  prepTimeMins: number;
  deliveryTimeMins: number;
  minDeliveryOrderPence: number;
  deliveryFeePence: number;
  freeDeliveryThresholdPence: number;
  deliveryPostcodePrefixes: string[];
  maxOrdersPerSlot: number;
  hours: DayHours[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const dailyHours = (open: string, close: string): DayHours[] =>
  DAYS.map((day) => ({ day, open, close, closed: false }));

export const LOCATIONS: RestaurantLocation[] = [
  {
    id: 'southall',
    name: 'Watan Southall',
    shortName: 'Southall',
    address: '161-163 The Broadway, Southall',
    postcode: 'UB1 1LR',
    phone: '+44 20 8571 0928',
    email: 'southall@watanrestaurant.co.uk',
    collectionEnabled: true,
    deliveryEnabled: true,
    prepTimeMins: 25,
    deliveryTimeMins: 50,
    minDeliveryOrderPence: 1500,
    deliveryFeePence: 350,
    freeDeliveryThresholdPence: 4000,
    deliveryPostcodePrefixes: ['UB1', 'UB2', 'UB3', 'UB4', 'UB6', 'W7', 'TW8'],
    maxOrdersPerSlot: 6,
    hours: dailyHours('12:00', '24:00'),
  },
  {
    id: 'ilford',
    name: 'Watan Ilford',
    shortName: 'Ilford',
    address: 'Ilford, London',
    postcode: 'IG1',
    phone: 'Add phone number',
    email: 'ilford@watanrestaurant.co.uk',
    collectionEnabled: true,
    deliveryEnabled: true,
    prepTimeMins: 25,
    deliveryTimeMins: 50,
    minDeliveryOrderPence: 1500,
    deliveryFeePence: 350,
    freeDeliveryThresholdPence: 4000,
    deliveryPostcodePrefixes: ['IG1', 'IG2', 'IG3', 'IG6', 'E7', 'E12'],
    maxOrdersPerSlot: 6,
    hours: dailyHours('12:00', '24:00'),
  },
  {
    id: 'tooting',
    name: 'Watan Tooting',
    shortName: 'Tooting',
    address: 'Tooting, London',
    postcode: 'SW17',
    phone: 'Add phone number',
    email: 'tooting@watanrestaurant.co.uk',
    collectionEnabled: true,
    deliveryEnabled: true,
    prepTimeMins: 25,
    deliveryTimeMins: 50,
    minDeliveryOrderPence: 1500,
    deliveryFeePence: 350,
    freeDeliveryThresholdPence: 4000,
    deliveryPostcodePrefixes: ['SW17', 'SW16', 'SW12', 'SW18', 'CR4'],
    maxOrdersPerSlot: 6,
    hours: dailyHours('12:00', '24:00'),
  },
  {
    id: 'wood-green',
    name: 'Watan Wood Green',
    shortName: 'Wood Green',
    address: 'Wood Green, London',
    postcode: 'N22',
    phone: 'Add phone number',
    email: 'woodgreen@watanrestaurant.co.uk',
    collectionEnabled: true,
    deliveryEnabled: true,
    prepTimeMins: 25,
    deliveryTimeMins: 50,
    minDeliveryOrderPence: 1500,
    deliveryFeePence: 350,
    freeDeliveryThresholdPence: 4000,
    deliveryPostcodePrefixes: ['N22', 'N8', 'N15', 'N17', 'N11'],
    maxOrdersPerSlot: 6,
    hours: dailyHours('12:00', '24:00'),
  },
];

export function getLocation(id: string | null | undefined): RestaurantLocation | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

export function normalisePostcode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function isPostcodeDeliverable(location: RestaurantLocation, rawPostcode: string): boolean {
  const pc = normalisePostcode(rawPostcode);
  if (pc.length < 5) return false;
  return location.deliveryPostcodePrefixes.some((prefix) => pc.startsWith(prefix.toUpperCase()));
}

export function calcDeliveryFee(location: RestaurantLocation, subtotalPence: number): number {
  if (subtotalPence >= location.freeDeliveryThresholdPence) return 0;
  return location.deliveryFeePence;
}

export function isLocationOpenNow(location: RestaurantLocation, now: Date): boolean {
  const dayIdx = (now.getDay() + 6) % 7;
  const h = location.hours[dayIdx];
  if (!h || h.closed) return false;
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const openM = oh * 60 + om;
  const closeM = ch * 60 + cm;
  return mins >= openM && mins < closeM;
}

export function generateTimeSlots(location: RestaurantLocation, type: 'collection' | 'delivery', now: Date): string[] {
  const lead = type === 'collection' ? location.prepTimeMins : location.deliveryTimeMins;
  const dayIdx = (now.getDay() + 6) % 7;
  const h = location.hours[dayIdx];
  if (!h || h.closed) return [];
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  const openM = oh * 60 + om;
  const closeM = ch * 60 + cm;
  const earliest = Math.max(openM, now.getHours() * 60 + now.getMinutes() + lead);
  const start = Math.ceil(earliest / 15) * 15;
  const slots: string[] = [];
  for (let m = start; m <= closeM - 15; m += 15) {
    const hh = Math.floor(m / 60) % 24;
    const mm = m % 60;
    slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  }
  return slots;
}

export const ORDER_PREFIX = 'WT';

function FulfilmentType(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: FulfilmentType is not implemented yet.', args);
  return null;
}

export { FulfilmentType };