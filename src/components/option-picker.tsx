import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

export function OptionPicker({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose',
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <View>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a list of choices"
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={{ color: selected ? theme.text : theme.textSecondary, fontSize: 16 }}>{selected?.label ?? placeholder}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: 'rgba(20, 27, 24, 0.45)' }]}>
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)}>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>Close</Text>
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const active = item.id === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    style={[styles.option, { backgroundColor: active ? theme.backgroundSelected : 'transparent' }]}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6, fontSize: 13, fontWeight: '700' },
  trigger: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  option: { paddingHorizontal: 16, paddingVertical: 14 },
});
