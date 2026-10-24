import type { Listing } from '@/api';

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85';
export const MAX_MMK = 2_147_483_647;

export function formatPrice(listing: Pick<Listing, 'priceMMK' | 'transactionType'>) {
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.trunc(listing.priceMMK));
  return listing.transactionType === 'RENT' ? `${formatted} MMK / month` : `${formatted} MMK`;
}

export function labelize(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function parseWholeKyat(value: string, { allowZero = false } = {}) {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false as const, message: 'Enter a whole MMK amount.' };
  if (!/^\d+$/.test(trimmed)) return { ok: false as const, message: 'Use a whole number of kyat, without decimals or symbols.' };
  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount) || amount > MAX_MMK || (allowZero ? amount < 0 : amount < 1)) {
    return { ok: false as const, message: allowZero ? 'Enter a whole MMK amount from 0 upward.' : 'Enter a whole MMK amount from 1 to 2,147,483,647.' };
  }
  return { ok: true as const, amount };
}

export function primaryImage(listing: Listing) {
  return listing.images?.find((image) => image.isPrimary)?.url ?? listing.images?.[0]?.url ?? FALLBACK_IMAGE;
}
