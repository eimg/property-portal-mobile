import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'outline' | 'dark' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const palette = {
    primary: { backgroundColor: theme.accent, color: theme.accentText, borderColor: theme.accent },
    outline: { backgroundColor: 'transparent', color: theme.text, borderColor: theme.border },
    dark: { backgroundColor: theme.text, color: theme.background, borderColor: theme.text },
    danger: { backgroundColor: 'transparent', color: theme.danger, borderColor: theme.danger },
  }[kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>
      <Text style={[styles.buttonLabel, { color: palette.color }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, style, inputStyle, ...props }: TextInputProps & { label: string; style?: ViewStyle; inputStyle?: TextInputProps['style'] }) {
  const theme = useTheme();
  return (
    <View style={style}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }, inputStyle]}
      />
    </View>
  );
}

export function Notice({ message, tone = 'error' }: { message: string; tone?: 'error' | 'info' | 'success' }) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.success : tone === 'info' ? theme.textSecondary : theme.danger;
  return (
    <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Text style={{ color, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

export function LoadingState({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={theme.accent} />
      <Text style={{ color: theme.textSecondary }}>{label}</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Text style={{ color: theme.textSecondary, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  buttonLabel: { fontSize: 15, fontWeight: '700' },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 14 },
  centered: { alignItems: 'center', gap: 10, padding: 24 },
});
