import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Listing } from '@/api';
import { formatPrice, primaryImage } from '@/format';
import { useTheme } from '@/hooks/use-theme';

export function ListingCard({
  listing,
  saved,
  onOpen,
  onSave,
}: {
  listing: Listing;
  saved?: boolean;
  onOpen: () => void;
  onSave?: () => void;
}) {
  const theme = useTheme();
  const price = formatPrice(listing);
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${listing.title}. ${price}. ${listing.address ?? listing.location?.name ?? 'Myanmar'}`}
        onPress={onOpen}>
        <View>
          <Image
            source={{ uri: primaryImage(listing) }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={listing.images?.[0]?.altText || listing.title}
          />
          <View style={[styles.pill, { backgroundColor: theme.background }]}>
            <Text style={[styles.pillText, { color: theme.text }]}>{listing.transactionType === 'RENT' ? 'For rent' : 'For sale'}</Text>
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{listing.category?.name ?? 'Property'}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{listing.title}</Text>
          <Text style={{ color: theme.textSecondary }} numberOfLines={1}>{listing.address ?? listing.location?.name ?? 'Myanmar'}</Text>
          <View style={styles.footer}>
            <Text style={[styles.price, { color: theme.accent }]}>{price}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{listing.bedrooms ? `${listing.bedrooms} beds` : 'View details'}</Text>
          </View>
        </View>
      </Pressable>
      {onSave && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove saved listing' : 'Save listing'}
          onPress={onSave}
          style={[styles.save, { backgroundColor: theme.card }]}>
          <Text style={{ color: saved ? theme.accent : theme.text, fontSize: 16 }}>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderWidth: 1, borderRadius: 14 },
  image: { height: 180, backgroundColor: '#cedcd0' },
  pill: { position: 'absolute', top: 12, left: 12, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  pillText: { fontSize: 11, fontWeight: '700' },
  save: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  copy: { gap: 6, padding: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  price: { fontSize: 14, fontWeight: '700' },
});
