import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createInquiry, getListing, type Listing } from '@/api';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Notice, TextField } from '@/components/ui';
import { FALLBACK_IMAGE, formatPrice, labelize } from '@/format';
import { useTheme } from '@/hooks/use-theme';
import { recallListing, rememberListing } from '@/listing-cache';
import { useSession } from '@/session';

export default function ListingDetailScreen() {
  const theme = useTheme();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user, savedIds, toggleSaved } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [photo, setPhoto] = useState(0);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = slug ? recallListing(slug) : null;
    if (cached) {
      setListing(cached);
      setMessage(`I would like more information about ${cached.title}.`);
    }
    (async () => {
      if (!slug) {
        setError('Listing not found');
        setLoading(false);
        return;
      }
      try {
        const next = await getListing(slug);
        if (!active) return;
        rememberListing(next);
        setListing(next);
        setMessage(`I would like more information about ${next.title}.`);
        setError('');
      } catch (failure) {
        if (!active) return;
        if (!cached) setError(failure instanceof Error ? failure.message : 'Listing not found');
        else setMessage(`I would like more information about ${cached.title}.`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const images = listing?.images?.length ? listing.images : [{ url: FALLBACK_IMAGE, altText: listing?.title }];
  const canInquire = Boolean(user?.roles.includes('BUYER_RENTER') && listing?.status === 'ACTIVE');
  const saved = listing ? savedIds.includes(listing.id) : false;

  async function onSave() {
    if (!listing) return;
    try {
      const result = await toggleSaved(listing.id);
      if (result === 'needs-auth') router.push('/auth');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to update saved listings');
    }
  }

  async function sendInquiry() {
    if (!listing) return;
    setSending(true);
    setError('');
    try {
      await createInquiry(listing.id, { message, preferredContact: 'EMAIL', contactValue: user?.email });
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to send inquiry');
    } finally {
      setSending(false);
    }
  }

  if (loading && !listing) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Listing" />
        <View style={styles.pad}><Text style={{ color: theme.textSecondary }}>Loading listing…</Text></View>
      </View>
    );
  }
  if (!listing) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Listing" />
        <View style={styles.pad}><Notice message={error || 'Listing not found'} /></View>
      </View>
    );
  }

  const facts = [
    listing.bedrooms ? `${listing.bedrooms} bedrooms` : null,
    listing.bathrooms ? `${listing.bathrooms} bathrooms` : null,
    listing.buildingArea != null ? `${listing.buildingArea.toLocaleString('en-US')} ${listing.buildingAreaUnit === 'SQ_FT' ? 'sq ft' : listing.buildingAreaUnit ?? 'sq ft'}` : null,
    listing.landArea != null ? `${listing.landArea.toLocaleString('en-US')} ${listing.landAreaUnit ?? ''} land`.trim() : null,
    listing.furnished == null ? null : listing.furnished ? 'Furnished' : 'Unfurnished',
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title={listing.title} />
      <ScrollView contentContainerStyle={styles.page}>
      <Image source={{ uri: images[photo]?.url ?? FALLBACK_IMAGE }} style={styles.hero} contentFit="cover" accessibilityLabel={images[photo]?.altText || listing.title} />
      {images.length > 1 && (
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={styles.thumbRow} contentContainerStyle={styles.thumbs}>
          {images.map((image, index) => (
            <Pressable key={`${image.url}-${index}`} accessibilityRole="button" accessibilityLabel={image.altText || `Photo ${index + 1}`} onPress={() => setPhoto(index)}>
              <Image source={{ uri: image.url }} style={[styles.thumb, { borderColor: index === photo ? theme.accent : 'transparent' }]} contentFit="cover" accessible={false} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Text style={[styles.eyebrow, { color: theme.accent }]}>{listing.category?.name ?? 'Property'} · {listing.location?.name ?? 'Myanmar'}</Text>
      <Text style={[styles.title, { color: theme.text }]}>{listing.title}</Text>
      <Text style={[styles.price, { color: theme.accent }]}>{formatPrice(listing)}</Text>
      <Text style={{ color: theme.textSecondary }}>{listing.address ?? listing.location?.name ?? 'Myanmar'}</Text>
      {listing.status !== 'ACTIVE' && <Notice tone="info" message={`Status: ${labelize(listing.status)}. This listing is not in public search.`} />}
      {listing.status === 'REJECTED' && listing.latestModerationAction?.reason ? <Notice message={`Rejection reason: ${listing.latestModerationAction.reason}`} /> : null}
      {facts.length > 0 && (
        <View style={styles.facts}>
          {facts.map((fact) => (
            <View key={fact} style={[styles.fact, { backgroundColor: theme.backgroundElement }]}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>{fact}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[styles.description, { color: theme.textSecondary }]}>{listing.description}</Text>
      {listing.manager?.name ? <Text style={{ color: theme.textSecondary }}>Listed by {listing.manager.name}</Text> : null}
      <Button label={saved ? 'Saved' : 'Save listing'} kind={saved ? 'outline' : 'primary'} onPress={() => void onSave()} />
      <View style={[styles.inquiry, { backgroundColor: theme.backgroundElement }]}>
        <Text style={[styles.inquiryTitle, { color: theme.text }]}>Ask about this property</Text>
        {sent ? <Notice tone="success" message="Inquiry sent. The listing representative will follow up." /> : canInquire ? (
          <>
            <TextField label="Message" value={message} onChangeText={setMessage} multiline inputStyle={styles.message} />
            <Button label={sending ? 'Sending…' : 'Send inquiry'} kind="dark" disabled={sending || message.trim().length < 10} onPress={() => void sendInquiry()} />
          </>
        ) : (
          <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
            {listing.status !== 'ACTIVE'
              ? 'Inquiries are available once a listing is active.'
              : user
                ? 'Buyer/renter accounts can send inquiries from a listing.'
                : 'Sign in as a buyer/renter to contact this listing.'}
          </Text>
        )}
        {!user && listing.status === 'ACTIVE' && <Button label="Sign in" kind="outline" onPress={() => router.push('/auth')} />}
      </View>
      {error ? <Notice message={error} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { padding: 20 },
  page: { gap: 14, padding: 16, paddingBottom: 40 },
  hero: { width: '100%', height: 260, borderRadius: 16, backgroundColor: '#cedcd0' },
  thumbRow: { height: 60, flexGrow: 0 },
  thumbs: { gap: 8 },
  thumb: { width: 72, height: 56, borderRadius: 8, borderWidth: 2 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontSize: 30, fontWeight: '700' },
  price: { fontSize: 20, fontWeight: '700' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  description: { fontSize: 16, lineHeight: 24 },
  inquiry: { gap: 12, borderRadius: 14, padding: 14 },
  inquiryTitle: { fontSize: 16, fontWeight: '700' },
  message: { minHeight: 96, textAlignVertical: 'top' },
});
