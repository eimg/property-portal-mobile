import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { getSavedListings, removeSavedListing, saveListing, type AuthUser } from '@/api';
import { getSessionToken, setMemoryToken } from '@/token';

const TOKEN_KEY = 'property_portal_token';
const USER_KEY = 'property_portal_user';

type SessionValue = {
  user: AuthUser | null;
  savedIds: string[];
  signIn: (result: { token: string; user: AuthUser }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSaved: () => Promise<void>;
  toggleSaved: (listingId: string) => Promise<'needs-auth' | 'saved' | 'removed'>;
};

const SessionContext = createContext<SessionValue | null>(null);

function normalizeUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AuthUser>;
  if (typeof candidate.id !== 'string' || typeof candidate.email !== 'string' || typeof candidate.name !== 'string') return null;
  return {
    id: candidate.id,
    email: candidate.email,
    name: candidate.name,
    roles: Array.isArray(candidate.roles) ? candidate.roles.filter((role): role is string => typeof role === 'string') : [],
  };
}

async function readItem(key: string) {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeItem(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

export function SessionProvider({ children, onReady }: { children: ReactNode; onReady: () => void }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const refreshSaved = useCallback(async () => {
    if (!getSessionToken()) {
      setSavedIds([]);
      return;
    }
    try {
      const saved = await getSavedListings();
      setSavedIds(saved.map((listing) => listing.id));
    } catch {
      setSavedIds([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [token, rawUser] = await Promise.all([readItem(TOKEN_KEY), readItem(USER_KEY)]);
        const nextUser = rawUser ? normalizeUser(JSON.parse(rawUser)) : null;
        if (!active) return;
        if (token && nextUser) {
          setMemoryToken(token);
          setUser(nextUser);
        } else {
          setMemoryToken(null);
          setUser(null);
        }
      } catch {
        setMemoryToken(null);
        setUser(null);
      } finally {
        if (active) {
          setReady(true);
          onReadyRef.current();
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) void refreshSaved();
    else setSavedIds([]);
  }, [user, refreshSaved]);

  const signIn = useCallback(async (result: { token: string; user: AuthUser }) => {
    const nextUser = normalizeUser(result.user);
    if (!nextUser) throw new Error('The account response was incomplete.');
    setMemoryToken(result.token);
    await Promise.all([writeItem(TOKEN_KEY, result.token), writeItem(USER_KEY, JSON.stringify(nextUser))]);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    setMemoryToken(null);
    setUser(null);
    setSavedIds([]);
    await Promise.all([writeItem(TOKEN_KEY, null), writeItem(USER_KEY, null)]);
  }, []);

  const toggleSaved = useCallback(async (listingId: string) => {
    if (!getSessionToken()) return 'needs-auth' as const;
    if (savedIds.includes(listingId)) {
      await removeSavedListing(listingId);
      setSavedIds((current) => current.filter((id) => id !== listingId));
      return 'removed' as const;
    }
    await saveListing(listingId);
    setSavedIds((current) => [...current, listingId]);
    return 'saved' as const;
  }, [savedIds]);

  const value = useMemo(
    () => ({ user, savedIds, signIn, signOut, refreshSaved, toggleSaved }),
    [user, savedIds, signIn, signOut, refreshSaved, toggleSaved],
  );

  if (!ready) return null;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}
