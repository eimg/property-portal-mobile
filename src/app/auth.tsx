import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { login, register } from '@/api';
import { ScreenHeader } from '@/components/screen-header';
import { Button, Notice, TextField } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/session';

const demoAccounts = [
  { label: 'Admin', email: 'admin@property.local' },
  { label: 'Owner', email: 'owner@property.local' },
  { label: 'Agent', email: 'agent@property.local' },
  { label: 'Buyer / renter', email: 'customer@property.local' },
];

export default function AuthScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'BUYER_RENTER' | 'OWNER' | 'AGENT'>('BUYER_RENTER');
  const [email, setEmail] = useState(__DEV__ ? 'customer@property.local' : '');
  const [password, setPassword] = useState(__DEV__ ? 'demo-password-123' : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError('');
    if (registering && name.trim().length < 2) {
      setError('Enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (registering && password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const result = registering ? await register({ name: name.trim(), email: email.trim(), password, role }) : await login(email.trim(), password);
      await signIn(result);
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScreenHeader title={registering ? 'Create account' : 'Sign in'} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.text }]}>{registering ? 'Create an account' : 'Sign in'}</Text>
      <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>
        {registering ? 'Choose buyer/renter, owner, or authorized agent. You can publish a listing only with an owner or agent account.' : __DEV__ ? 'Local demo accounts use the password demo-password-123.' : 'Use the email and password for your Property Portal account.'}
      </Text>
      {!registering && __DEV__ && (
        <View style={styles.demos}>
          {demoAccounts.map((account) => {
            const selected = email === account.email;
            return (
              <Pressable
                key={account.email}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setEmail(account.email)}
                style={[styles.demo, { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.backgroundSelected : theme.card }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{account.label}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{account.email}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {registering && (
        <>
          <TextField label="Your name" value={name} onChangeText={setName} autoComplete="name" />
          <Text style={[styles.roleLabel, { color: theme.textSecondary }]}>Account type</Text>
          <View style={styles.roles}>
            {([
              ['BUYER_RENTER', 'Buyer / renter'],
              ['OWNER', 'Property owner'],
              ['AGENT', 'Authorized agent'],
            ] as const).map(([value, label]) => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: role === value }} onPress={() => setRole(value)} style={[styles.role, { borderColor: role === value ? theme.accent : theme.border, backgroundColor: role === value ? theme.backgroundSelected : theme.card }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={registering ? 'new-password' : 'current-password'} />
      {error ? <Notice message={error} /> : null}
      <Button label={submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'} disabled={submitting} onPress={() => void submit()} />
      <Button
        label={registering ? 'Already have an account? Sign in' : 'New here? Create an account'}
        kind="outline"
        onPress={() => {
          const next = !registering;
          setRegistering(next);
          setError('');
          setName('');
          if (next) {
            setEmail('');
            setPassword('');
          } else if (__DEV__) {
            setEmail('customer@property.local');
            setPassword('demo-password-123');
          }
        }}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { gap: 14, padding: 20, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '700' },
  demos: { gap: 8 },
  demo: { gap: 2, borderWidth: 1, borderRadius: 10, padding: 12 },
  roleLabel: { fontSize: 13, fontWeight: '700' },
  roles: { gap: 8 },
  role: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
});
