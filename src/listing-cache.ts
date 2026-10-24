import type { Listing } from '@/api';

const bySlug = new Map<string, Listing>();

export function rememberListing(listing: Listing) {
  bySlug.set(listing.slug, listing);
}

export function recallListing(slug: string) {
  return bySlug.get(slug) ?? null;
}
