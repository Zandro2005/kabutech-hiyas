import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, set } from 'firebase/database';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types/firebase';
import { registerForPushNotificationsAsync } from '../utils/PushNotifications';
import { useTheme } from './ThemeContext';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
});

import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme } = useTheme();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Register for push notifications once upon login
        registerForPushNotificationsAsync(firebaseUser.uid).catch(console.error);

        // Optimistically load profile from cache to speed up app launch
        try {
          const cachedStr = await AsyncStorage.getItem(`cached_profile_${firebaseUser.uid}`);
          if (cachedStr) {
            const cachedProfile = JSON.parse(cachedStr);
            setUser(firebaseUser);
            setProfile(cachedProfile);
            if (cachedProfile.theme === 'dark' || cachedProfile.theme === 'light') {
              setTheme(cachedProfile.theme);
            }
            setIsLoading(false); // Instant login from cache
          }
        } catch (e) {
          // Ignore cache errors
        }

        // Use onValue to fetch latest and keep updated
        const profileRef = ref(db, `kabutech/users/${firebaseUser.uid}`);
        unsubscribeProfile = onValue(profileRef, (snapshot) => {
          const userProfile = snapshot.val();
          
          setUser(firebaseUser);
          
          if (userProfile) {
            setProfile(userProfile);
            if (userProfile.theme === 'dark' || userProfile.theme === 'light') {
              setTheme(userProfile.theme);
            }
            AsyncStorage.setItem(`cached_profile_${firebaseUser.uid}`, JSON.stringify(userProfile)).catch(() => {});
          } else {
            // Auto-heal missing profile for valid Firebase Auth users (e.g. created via console)
            const fallbackProfile: UserProfile = {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              role: 'staff',
              approved: false,
              createdAt: new Date().toISOString(),
            };
            setProfile(fallbackProfile);
            set(profileRef, fallbackProfile).catch(() => {});
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          // If error reading database (network or permissions), set fallback profile so app doesn't freeze on login
          const fallbackProfile: UserProfile = {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            role: 'staff',
            approved: false,
            createdAt: new Date().toISOString(),
          };
          setUser(firebaseUser);
          setProfile(fallbackProfile);
          setIsLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = undefined;
        }
        setUser(null);
        setProfile(null);
        // Do NOT reset theme to light on logout - preserve exactly what the user had
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
