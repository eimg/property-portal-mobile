import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider } from '@/session';

SplashScreen.preventAutoHideAsync();

const BrandLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#df7658',
    background: '#f8f7f3',
    card: '#fffefa',
    text: '#1d2d2a',
    border: '#dce3dc',
  },
};

const BrandDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#e29a83',
    background: '#141b18',
    card: '#1a2420',
    text: '#f4f7f3',
    border: '#2c3b35',
  },
};

export default function RootLayout() {
  const scheme = useColorScheme();
  const hideSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  const navigationTheme = scheme === 'dark' ? BrandDark : BrandLight;

  return (
    <SessionProvider onReady={hideSplash}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: navigationTheme.colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[slug]" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="listing-form" />
        </Stack>
      </ThemeProvider>
    </SessionProvider>
  );
}
