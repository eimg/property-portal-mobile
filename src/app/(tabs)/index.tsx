import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCatalog, listListings, type CatalogItem, type Listing } from '@/api';
import { ListingCard } from '@/components/listing-card';
import { OptionPicker } from '@/components/option-picker';
import { Button, EmptyState, Notice, TextField } from '@/components/ui';
import { BottomTabInset, ContentWidth } from '@/constants/theme';
import { parseWholeKyat } from '@/format';
import { useTheme } from '@/hooks/use-theme';
import { rememberListing } from '@/listing-cache';
import { useSession } from '@/session';

type Filters = {
  mode: 'SALE' | 'RENT';
  query: string;
  cityId: string;
  townshipId: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
};

const initialFilters: Filters = { mode: 'SALE', query: '', cityId: '', townshipId: '', categoryId: '', minPrice: '', maxPrice: '' };

export default function DiscoverScreen() {
  const theme = useTheme();
  const { user, savedIds, toggleSaved } = useSession();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [draftQuery, setDraftQuery] = useState('');
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [locations, setLocations] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const requestId = useRef(0);

  const load = useCallback(async (next: Filters, nextPage = 1, append = false) => {
    const current = ++requestId.current;
    const min = next.minPrice.trim();
    const max = next.maxPrice.trim();
    if (min) {
      const parsed = parseWholeKyat(min, { allowZero: true });
      if (!parsed.ok) {
        setError(parsed.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }
    if (max) {
      const parsed = parseWholeKyat(max);
      if (!parsed.ok) {
        setError(parsed.message);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }
    if (min && max && Number(min) > Number(max)) {
      setError('Minimum price cannot be higher than the maximum price.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await listListings({
        transactionType: next.mode,
        q: next.query.trim(),
        cityId: next.cityId,
        townshipId: next.townshipId,
        categoryId: next.categoryId,
        minPrice: min,
        maxPrice: max,
        page: nextPage,
      });
      if (current !== requestId.current) return;
      setListings((currentListings) => (append ? [...currentListings, ...result.items] : result.items));
      setPage(result.pagination.page);
      setTotal(result.pagination.total);
    } catch (failure) {
      if (current !== requestId.current) return;
      setError(failure instanceof Error ? failure.message : 'The catalog is not reachable yet. Start the API and seed the demo data.');
      if (!append) setListings([]);
    } finally {
      if (current === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void getCatalog()
      .then((catalog) => {
        setLocations(catalog.locations);
        setCategories(catalog.categories);
      })
      .catch(() => undefined);
    void load(initialFilters);
  }, [load]);

  function apply(next: Filters) {
    setFilters(next);
    void load(next);
  }

  function openListing(listing: Listing) {
    rememberListing(listing);
    router.push({ pathname: '/listing/[slug]', params: { slug: listing.slug } });
  }

  async function onSave(listing: Listing) {
    const result = await toggleSaved(listing.id).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : 'Unable to update saved listings');
      return null;
    });
    if (result === 'needs-auth') router.push('/auth');
  }

  const cities = locations.filter((item) => item.type === 'CITY');
  const townships = locations.filter((item) => item.type === 'TOWNSHIP' && (!filters.cityId || item.parentId === filters.cityId));
  const canList = user?.roles.some((role) => role === 'OWNER' || role === 'AGENT');

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background, alignItems: 'center' }]} edges={['top']}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        style={styles.column}
        contentContainerStyle={[styles.list, { paddingBottom: BottomTabInset }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={theme.accent} onRefresh={() => { setRefreshing(true); void load(filters); }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.brand, { color: theme.text }]}>Thuta Property</Text>
            <Text style={[styles.intro, { color: theme.textSecondary }]}>Homes, apartments, land, and commercial spaces in Yangon and Mandalay. Prices are in MMK.</Text>
            <View style={[styles.segment, { backgroundColor: theme.backgroundElement }]}>
              {(['SALE', 'RENT'] as const).map((mode) => {
                const active = filters.mode === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => apply({ ...filters, mode, query: draftQuery, minPrice: draftMin, maxPrice: draftMax })}
                    style={[styles.segmentButton, { backgroundColor: active ? theme.accent : 'transparent' }]}>
                    <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: '700' }}>{mode === 'SALE' ? 'Buy' : 'Rent'}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField label="Search" value={draftQuery} onChangeText={setDraftQuery} placeholder="Township, street, or property type" returnKeyType="search" onSubmitEditing={() => apply({ ...filters, query: draftQuery, minPrice: draftMin, maxPrice: draftMax })} />
            <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>City</Text>
            <View style={styles.chips}>
              <Chip label="All cities" active={!filters.cityId} onPress={() => apply({ ...filters, query: draftQuery, minPrice: draftMin, maxPrice: draftMax, cityId: '', townshipId: '' })} />
              {cities.map((city) => (
                <Chip key={city.id} label={city.name} active={filters.cityId === city.id} onPress={() => apply({ ...filters, query: draftQuery, minPrice: draftMin, maxPrice: draftMax, cityId: city.id, townshipId: '' })} />
              ))}
            </View>
            <OptionPicker
              label="Township"
              value={filters.townshipId}
              placeholder="All townships"
              options={[{ id: '', label: 'All townships' }, ...townships.map((item) => ({ id: item.id, label: item.name }))]}
              onChange={(townshipId) => apply({ ...filters, query: draftQuery, minPrice: draftMin, maxPrice: draftMax, townshipId })}
            />
            <OptionPicker
              label="Property type"
              value={filters.categoryId}
              placeholder="All types"
              options={[{ id: '', label: 'All types' }, ...categories.map((item) => ({ id: item.id, label: item.name }))]}
              onChange={(categoryId) => apply({ ...filters, query: draftQuery, minPrice: draftMin, maxPrice: draftMax, categoryId })}
            />
            <View style={styles.priceRow}>
              <TextField label="Minimum MMK" value={draftMin} onChangeText={(value) => setDraftMin(value.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Any" style={styles.priceField} />
              <TextField label="Maximum MMK" value={draftMax} onChangeText={(value) => setDraftMax(value.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="Any" style={styles.priceField} />
            </View>
            <View style={styles.actions}>
              <Button label="Search" onPress={() => apply({ ...filters, query: draftQuery, minPrice: draftMin, maxPrice: draftMax })} />
              <Button
                label="Clear filters"
                kind="outline"
                onPress={() => {
                  setDraftQuery('');
                  setDraftMin('');
                  setDraftMax('');
                  apply(initialFilters);
                }}
              />
            </View>
            <Button label="List a property" onPress={() => router.push(canList ? '/listing-form' : user ? '/account' : '/auth')} />
            {!error && <Text style={{ color: theme.textSecondary }}>{loading && listings.length === 0 ? 'Loading the latest listings…' : `${total} matching properties`}</Text>}
            {error ? <Notice message={error} /> : null}
          </View>
        }
        ListEmptyComponent={!loading && !error ? <EmptyState message={`No published ${filters.mode === 'RENT' ? 'rental' : 'sale'} listings match that search yet.`} /> : undefined}
        renderItem={({ item }) => <ListingCard listing={item} saved={savedIds.includes(item.id)} onOpen={() => openListing(item)} onSave={() => void onSave(item)} />}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListFooterComponent={
          listings.length < total ? (
            <View style={styles.more}>
              <Button label={loading ? 'Loading…' : 'Load more properties'} kind="outline" disabled={loading} onPress={() => void load(filters, page + 1, true)} />
            </View>
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.accent : theme.backgroundElement }]}>
      <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%' },
  column: { width: '100%', maxWidth: ContentWidth },
  list: { paddingHorizontal: 16, gap: 14 },
  header: { gap: 14, paddingTop: 8, paddingBottom: 18 },
  brand: { fontSize: 28, fontWeight: '700' },
  intro: { fontSize: 16, lineHeight: 22 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  segmentButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  filterLabel: { fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12 },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceField: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  more: { marginTop: 16 },
});
