import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getMyInquiries,
  getMyListings,
  getReceivedInquiries,
  getReviewQueue,
  getSavedListings,
  moderateListing,
  removeListing,
  submitListing,
  type Inquiry,
  type Listing,
} from '@/api';
import { ListingCard } from '@/components/listing-card';
import { Button, EmptyState, LoadingState, Notice, TextField } from '@/components/ui';
import { BottomTabInset, ContentWidth } from '@/constants/theme';
import { formatPrice, labelize, primaryImage } from '@/format';
import { useTheme } from '@/hooks/use-theme';
import { rememberListing } from '@/listing-cache';
import { useSession } from '@/session';

export default function AccountScreen() {
  const theme = useTheme();
  const { user, signOut, savedIds, toggleSaved } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [saved, setSaved] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [received, setReceived] = useState<Inquiry[]>([]);
  const [reviewQueue, setReviewQueue] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState('');

  const isManager = Boolean(user?.roles.some((role) => role === 'OWNER' || role === 'AGENT'));
  const isBuyer = Boolean(user?.roles.includes('BUYER_RENTER'));
  const isModerator = Boolean(user?.roles.includes('ADMIN'));

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [managed, savedListings, mine, incoming, review] = await Promise.all([
        isManager || isModerator ? getMyListings() : Promise.resolve([] as Listing[]),
        isBuyer ? getSavedListings() : Promise.resolve([] as Listing[]),
        isBuyer ? getMyInquiries() : Promise.resolve([] as Inquiry[]),
        isManager || isModerator ? getReceivedInquiries() : Promise.resolve([] as Inquiry[]),
        isModerator ? getReviewQueue() : Promise.resolve([] as Listing[]),
      ]);
      setListings(managed);
      setSaved(savedListings);
      setInquiries(mine);
      setReceived(incoming);
      setReviewQueue(review);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load your workspace');
    } finally {
      setLoading(false);
    }
  }, [user, isManager, isModerator, isBuyer]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openListing(listing: Listing) {
    rememberListing(listing);
    router.push({ pathname: '/listing/[slug]', params: { slug: listing.slug } });
  }

  async function run(listingId: string, action: () => Promise<void>) {
    setBusyId(listingId);
    setError('');
    try {
      await action();
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The request could not be completed');
    } finally {
      setBusyId('');
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background, alignItems: 'center' }]} edges={['top']}>
        <View style={[styles.column, styles.signedOut]}>
          <Text style={[styles.title, { color: theme.text }]}>Your account</Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>Sign in to save properties, send inquiries, or publish a listing. Visitors can still browse Yangon and Mandalay without an account.</Text>
          <Button label="Sign in" onPress={() => router.push('/auth')} />
          <Button label="Create an account" kind="outline" onPress={() => router.push('/auth')} />
        </View>
      </SafeAreaView>
    );
  }

  const visibleInquiries = isBuyer ? inquiries : received;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background, alignItems: 'center' }]} edges={['top']}>
      <ScrollView style={styles.column} contentContainerStyle={[styles.page, { paddingBottom: BottomTabInset }]}>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>Workspace</Text>
        <Text style={[styles.title, { color: theme.text }]}>{user.name}</Text>
        <Text style={{ color: theme.textSecondary }}>{user.email}</Text>
        <View style={styles.roles}>
          {user.roles.map((role) => (
            <View key={role} style={[styles.role, { backgroundColor: theme.backgroundElement }]}>
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>{labelize(role)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          {isManager && <Button label="Add property" onPress={() => router.push('/listing-form')} />}
          <Button label="Sign out" kind="outline" onPress={() => void signOut()} />
        </View>
        {error ? <Notice message={error} /> : null}
        {loading ? <LoadingState label="Loading your workspace…" /> : (
          <>
            <View style={styles.metrics}>
              <Metric value={isBuyer ? saved.length : listings.length} label={isBuyer ? 'Saved listings' : 'Managed listings'} />
              <Metric value={isBuyer ? inquiries.length : received.length} label={isBuyer ? 'My inquiries' : 'Received inquiries'} />
              {isModerator && <Metric value={reviewQueue.length} label="Awaiting review" />}
            </View>
            {isManager && (
              <Section title="Listings to manage">
                {listings.length === 0 ? <EmptyState message="No managed listings yet. Add your first property." /> : listings.map((listing) => (
                  <View key={listing.id} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    <Image source={{ uri: primaryImage(listing) }} style={styles.thumb} accessible={false} />
                    <View style={styles.rowBody}>
                      <Pressable accessibilityRole="button" onPress={() => openListing(listing)}>
                        <Text style={[styles.rowTitle, { color: theme.text }]}>{listing.title}</Text>
                      </Pressable>
                      <Text style={{ color: theme.textSecondary }}>{listing.address || listing.location?.name} · {formatPrice(listing)}</Text>
                      <Text style={{ color: statusColor(listing.status, theme), fontWeight: '700' }}>{labelize(listing.status)}</Text>
                      {listing.status === 'REJECTED' && listing.latestModerationAction?.reason ? <Text style={{ color: theme.danger }}>Reason: {listing.latestModerationAction.reason}</Text> : null}
                      <View style={styles.rowActions}>
                        {['DRAFT', 'REJECTED'].includes(listing.status) && (
                          <>
                            <Button label="Edit" kind="outline" disabled={busyId === listing.id} onPress={() => router.push({ pathname: '/listing-form', params: { id: listing.id } })} />
                            <Button label="Submit" kind="dark" disabled={busyId === listing.id} onPress={() => void run(listing.id, async () => { await submitListing(listing.id); })} />
                          </>
                        )}
                        {listing.status !== 'REMOVED' && (
                          <Button label="Remove" kind="danger" disabled={busyId === listing.id} onPress={() => confirmRemove(listing, () => void run(listing.id, async () => { await removeListing(listing.id); }))} />
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </Section>
            )}
            {isBuyer && (
              <Section title="Saved properties">
                {saved.length === 0 ? <EmptyState message="Save a property from its detail page and it will appear here." /> : saved.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    saved={savedIds.includes(listing.id)}
                    onOpen={() => openListing(listing)}
                    onSave={() => void toggleSaved(listing.id)}
                  />
                ))}
              </Section>
            )}
            {isModerator && (
              <Section title="Review queue">
                {reviewQueue.length === 0 ? <EmptyState message="The review queue is clear." /> : reviewQueue.map((listing) => (
                  <View key={listing.id} style={[styles.row, { borderColor: theme.border, backgroundColor: theme.card }]}>
                    <Image source={{ uri: primaryImage(listing) }} style={styles.thumb} accessible={false} />
                    <View style={styles.rowBody}>
                      <Pressable accessibilityRole="button" onPress={() => openListing(listing)}>
                        <Text style={[styles.rowTitle, { color: theme.text }]}>{listing.title}</Text>
                      </Pressable>
                      <Text style={{ color: theme.textSecondary }}>{listing.address || listing.location?.name} · {listing.category?.name}</Text>
                      <Text style={{ color: theme.warning, fontWeight: '700' }}>Pending review</Text>
                      <View style={styles.rowActions}>
                        <Button label="Approve" kind="dark" disabled={busyId === listing.id} onPress={() => void run(listing.id, async () => { await moderateListing(listing.id, 'approve'); })} />
                        <Button label="Reject" kind="danger" disabled={busyId === listing.id} onPress={() => { setRejecting(listing); setReason(''); }} />
                      </View>
                    </View>
                  </View>
                ))}
              </Section>
            )}
            {!isModerator && (
              <Section title={isBuyer ? 'Your inquiries' : 'Incoming inquiries'}>
                {visibleInquiries.length === 0 ? <EmptyState message="No inquiry activity yet." /> : visibleInquiries.map((inquiry) => (
                  <View key={inquiry.id} style={[styles.inquiry, { borderColor: theme.border }]}>
                    <Text style={{ color: theme.textSecondary, fontWeight: '700' }}>{labelize(inquiry.status)}</Text>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{inquiry.listing?.title ?? 'Listing'}</Text>
                    <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>{inquiry.message}</Text>
                    {!isBuyer && inquiry.customer ? <Text style={{ color: theme.textSecondary }}>{inquiry.customer.name} · {inquiry.customer.email}</Text> : null}
                  </View>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
      {rejecting && (
        <View style={[styles.rejectPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontWeight: '700' }}>Reject {rejecting.title}</Text>
          <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="Tell the owner what to correct" />
          <View style={styles.rowActions}>
            <Button label="Cancel" kind="outline" onPress={() => setRejecting(null)} />
            <Button
              label="Reject listing"
              kind="danger"
              disabled={!reason.trim() || busyId === rejecting.id}
              onPress={() => {
                const listing = rejecting;
                const rejection = reason.trim();
                setRejecting(null);
                void run(listing.id, async () => { await moderateListing(listing.id, 'reject', rejection); });
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: theme.backgroundElement }]}>
      <Text style={[styles.metricValue, { color: theme.accent }]}>{value}</Text>
      <Text style={{ color: theme.textSecondary }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function confirmRemove(listing: Listing, onRemove: () => void) {
  Alert.alert('Remove listing?', `${listing.title} will no longer be available.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onRemove },
  ]);
}

function statusColor(status: string, theme: ReturnType<typeof useTheme>) {
  if (status === 'ACTIVE') return theme.success;
  if (status === 'PENDING_REVIEW') return theme.warning;
  if (status === 'REJECTED' || status === 'REMOVED') return theme.danger;
  return theme.textSecondary;
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: '100%' },
  column: { width: '100%', maxWidth: ContentWidth },
  signedOut: { gap: 14, padding: 20 },
  page: { gap: 14, padding: 16 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '700' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  role: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  actions: { gap: 10 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { flexGrow: 1, minWidth: 140, gap: 4, borderRadius: 12, padding: 14 },
  metricValue: { fontSize: 28, fontWeight: '700' },
  section: { gap: 12, marginTop: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#cedcd0' },
  rowBody: { flex: 1, gap: 6 },
  rowTitle: { fontSize: 16, fontWeight: '700' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inquiry: { gap: 4, borderWidth: 1, borderRadius: 12, padding: 12 },
  rejectPanel: { gap: 12, borderTopWidth: 1, padding: 16 },
});
