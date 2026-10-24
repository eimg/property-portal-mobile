import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createListing, getCatalog, getMyListings, submitListing, updateListing, type CatalogItem, type Listing } from '@/api';
import { OptionPicker } from '@/components/option-picker';
import { ScreenHeader } from '@/components/screen-header';
import { Button, LoadingState, Notice, TextField } from '@/components/ui';
import { parseWholeKyat } from '@/format';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session';

type Draft = {
  title: string;
  description: string;
  transactionType: 'SALE' | 'RENT';
  price: string;
  address: string;
  cityId: string;
  locationId: string;
  categoryId: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  imageUrl: string;
};

const emptyDraft: Draft = {
  title: '',
  description: '',
  transactionType: 'SALE',
  price: '',
  address: '',
  cityId: '',
  locationId: '',
  categoryId: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
  imageUrl: '',
};

export default function ListingFormScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [locations, setLocations] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canManage = user?.roles.some((role) => role === 'OWNER' || role === 'AGENT');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const catalog = await getCatalog();
        if (!active) return;
        setLocations(catalog.locations);
        setCategories(catalog.categories);
        const cities = catalog.locations.filter((item) => item.type === 'CITY');
        const townships = catalog.locations.filter((item) => item.type === 'TOWNSHIP');
        if (id) {
          const mine = await getMyListings();
          const existing = mine.find((listing) => listing.id === id);
          if (!existing) {
            setError('Listing not found');
          } else if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
            setError('Only draft or rejected listings can be edited.');
          } else {
            const township = townships.find((item) => item.id === existing.location?.id);
            setDraft(listingToDraft(existing, township?.parentId ?? cities[0]?.id ?? ''));
          }
        } else {
          setDraft((current) => ({
            ...current,
            cityId: cities[0]?.id ?? '',
            locationId: townships.find((item) => item.parentId === cities[0]?.id)?.id ?? townships[0]?.id ?? '',
            categoryId: catalog.categories[0]?.id ?? '',
          }));
        }
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : 'Unable to open the listing form');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function save(submitAfter: boolean) {
    setError('');
    if (draft.title.trim().length < 5) {
      setError('Enter a title of at least 5 characters.');
      return;
    }
    if (draft.description.trim().length < 20) {
      setError('Enter a description of at least 20 characters.');
      return;
    }
    const price = parseWholeKyat(draft.price);
    if (!price.ok) {
      setError(price.message);
      return;
    }
    if (!draft.locationId || !draft.categoryId) {
      setError('Choose a township and property category.');
      return;
    }
    if (draft.imageUrl.trim() && !/^https?:\/\/\S+$/i.test(draft.imageUrl.trim())) {
      setError('Enter a full http or https photo URL, or leave the photo field empty.');
      return;
    }
    const bedrooms = optionalCount(draft.bedrooms);
    const bathrooms = optionalCount(draft.bathrooms);
    const area = optionalCount(draft.area);
    if (bedrooms === 'invalid' || bathrooms === 'invalid' || area === 'invalid') {
      setError('Rooms and area must be whole numbers when provided.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        transactionType: draft.transactionType,
        priceMMK: price.amount,
        currency: 'MMK' as const,
        rentFrequency: draft.transactionType === 'RENT' ? 'MONTHLY' : undefined,
        address: draft.address.trim(),
        locationId: draft.locationId,
        categoryId: draft.categoryId,
        bedrooms: bedrooms === '' ? undefined : bedrooms,
        bathrooms: bathrooms === '' ? undefined : bathrooms,
        buildingArea: area === '' ? undefined : area,
        buildingAreaUnit: area === '' ? undefined : 'SQ_FT',
        imageUrl: draft.imageUrl.trim() || undefined,
      };
      const listing = id ? await updateListing(id, input) : await createListing(input);
      if (submitAfter) await submitListing(listing.id);
      router.dismissTo('/account');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save listing');
    } finally {
      setSaving(false);
    }
  }

  const cities = locations.filter((item) => item.type === 'CITY');
  const townships = locations.filter((item) => item.type === 'TOWNSHIP' && (!draft.cityId || item.parentId === draft.cityId));

  if (!canManage) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Listing" />
        <View style={styles.page}>
          <Notice message={user ? 'Only property owner and authorized agent accounts can create listings.' : 'Sign in with an owner or agent account to list a property.'} />
          {!user && <Button label="Sign in" onPress={() => router.push('/auth')} />}
        </View>
      </View>
    );
  }

  const formTitle = id ? 'Edit listing' : 'New listing';
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScreenHeader title={formTitle} />
        <LoadingState label="Loading listing details…" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title={formTitle} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>Save a draft, then submit it for administrator review. Prices are whole MMK amounts.</Text>
      <TextField label="Property title" value={draft.title} onChangeText={(title) => update({ title })} placeholder="Bright apartment near Bahan" />
      <Text style={[styles.label, { color: theme.textSecondary }]}>Transaction</Text>
      <View style={styles.row}>
        {(['SALE', 'RENT'] as const).map((value) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: draft.transactionType === value }} onPress={() => update({ transactionType: value })} style={[styles.choice, { flex: 1, borderColor: draft.transactionType === value ? theme.accent : theme.border, backgroundColor: draft.transactionType === value ? theme.backgroundSelected : theme.card }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{value === 'SALE' ? 'For sale' : 'For rent'}</Text>
          </Pressable>
        ))}
      </View>
      <TextField label={draft.transactionType === 'RENT' ? 'Monthly price in MMK' : 'Price in MMK'} value={draft.price} onChangeText={(price) => update({ price: price.replace(/[^\d]/g, '') })} keyboardType="number-pad" placeholder="150000000" />
      <OptionPicker label="City" value={draft.cityId} options={cities.map((city) => ({ id: city.id, label: city.name }))} onChange={(cityId) => update({ cityId, locationId: locations.find((item) => item.type === 'TOWNSHIP' && item.parentId === cityId)?.id ?? '' })} />
      <OptionPicker label="Township" value={draft.locationId} options={townships.map((item) => ({ id: item.id, label: item.name }))} onChange={(locationId) => update({ locationId })} />
      <OptionPicker label="Category" value={draft.categoryId} options={categories.map((item) => ({ id: item.id, label: item.name }))} onChange={(categoryId) => update({ categoryId })} />
      <TextField label="Address" value={draft.address} onChangeText={(address) => update({ address })} placeholder="Street or nearby landmark" />
      <TextField label="Description" value={draft.description} onChangeText={(description) => update({ description })} multiline inputStyle={styles.description} placeholder="Describe the property, surroundings, and key details" />
      <View style={styles.row}>
        <TextField label="Bedrooms" value={draft.bedrooms} onChangeText={(bedrooms) => update({ bedrooms: bedrooms.replace(/[^\d]/g, '') })} keyboardType="number-pad" style={styles.third} />
        <TextField label="Bathrooms" value={draft.bathrooms} onChangeText={(bathrooms) => update({ bathrooms: bathrooms.replace(/[^\d]/g, '') })} keyboardType="number-pad" style={styles.third} />
        <TextField label="Area (sq ft)" value={draft.area} onChangeText={(area) => update({ area: area.replace(/[^\d]/g, '') })} keyboardType="number-pad" style={styles.third} />
      </View>
      <TextField label="Property photo URL" value={draft.imageUrl} onChangeText={(imageUrl) => update({ imageUrl })} autoCapitalize="none" placeholder="https://" />
      {error ? <Notice message={error} /> : null}
      <Button label={saving ? 'Saving…' : id ? 'Save changes' : 'Save draft'} disabled={saving} onPress={() => void save(false)} />
      <Button label={saving ? 'Saving…' : 'Submit for review'} kind="dark" disabled={saving} onPress={() => void save(true)} />
      </ScrollView>
    </View>
  );
}

function listingToDraft(listing: Listing, cityId: string): Draft {
  return {
    title: listing.title,
    description: listing.description,
    transactionType: listing.transactionType,
    price: String(listing.priceMMK),
    address: listing.address ?? '',
    cityId,
    locationId: listing.location?.id ?? '',
    categoryId: listing.category?.id ?? '',
    bedrooms: listing.bedrooms == null ? '' : String(listing.bedrooms),
    bathrooms: listing.bathrooms == null ? '' : String(listing.bathrooms),
    area: listing.buildingArea == null ? '' : String(listing.buildingArea),
    imageUrl: listing.images?.[0]?.url ?? '',
  };
}

function optionalCount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '' as const;
  if (!/^\d+$/.test(trimmed)) return 'invalid' as const;
  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount)) return 'invalid' as const;
  return amount;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { gap: 14, padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8 },
  choice: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10 },
  third: { flex: 1 },
  description: { minHeight: 120, textAlignVertical: 'top' },
});
