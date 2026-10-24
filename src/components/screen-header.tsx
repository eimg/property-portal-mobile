import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function ScreenHeader({ title }: { title: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: theme.background }}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          style={styles.back}>
          <Text style={[styles.backLabel, { color: theme.accent }]}>Back</Text>
        </Pressable>
        <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        <View style={styles.back} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 72, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  backLabel: { fontSize: 16, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
});
