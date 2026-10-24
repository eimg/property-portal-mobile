/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1d2d2a',
    background: '#f8f7f3',
    backgroundElement: '#f1f6ef',
    backgroundSelected: '#e3eee4',
    textSecondary: '#60706a',
    accent: '#df7658',
    accentText: '#ffffff',
    border: '#dce3dc',
    card: '#fffefa',
    danger: '#9b5c4a',
    success: '#347248',
    warning: '#926c22',
  },
  dark: {
    text: '#f4f7f3',
    background: '#141b18',
    backgroundElement: '#1e2a26',
    backgroundSelected: '#2a3a34',
    textSecondary: '#a8b5ae',
    accent: '#e29a83',
    accentText: '#1d2d2a',
    border: '#2c3b35',
    card: '#1a2420',
    danger: '#e7b2a6',
    success: '#8dcea3',
    warning: '#e6c98a',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 88, android: 96, web: 72 }) ?? 88;
export const ContentWidth = 720;
export const MaxContentWidth = 800;
