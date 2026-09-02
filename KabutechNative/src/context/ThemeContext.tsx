import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../tailwind';
import { auth, db } from '../services/firebase';
import { ref, update } from 'firebase/database';

export const THEME_STORAGE_KEY = '@kabutech_app_theme';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const setTwColorScheme = (scheme: 'light' | 'dark') => {
  if (typeof (tw as any).setColorScheme === 'function') {
    (tw as any).setColorScheme(scheme);
  }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load persisted theme on startup so it stays exactly where the user left it off
  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setIsDarkMode(savedTheme === 'dark');
          setTwColorScheme(savedTheme);
        } else {
          setIsDarkMode(false);
          setTwColorScheme('light');
        }
      } catch (e) {
        setTwColorScheme('light');
      }
    }
    loadStoredTheme();
  }, []);

  const syncThemePersist = (theme: 'light' | 'dark') => {
    AsyncStorage.setItem(THEME_STORAGE_KEY, theme).catch(() => {});

    // If logged in, also sync to user profile cache and Firebase
    if (auth.currentUser?.uid) {
      const uid = auth.currentUser.uid;
      update(ref(db, `kabutech/users/${uid}`), { theme }).catch(() => {});
      AsyncStorage.getItem(`cached_profile_${uid}`)
        .then((cached) => {
          if (cached) {
            try {
              const p = JSON.parse(cached);
              p.theme = theme;
              AsyncStorage.setItem(`cached_profile_${uid}`, JSON.stringify(p)).catch(() => {});
            } catch (e) {}
          }
        })
        .catch(() => {});
    }
  };

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    const nextTheme = nextMode ? 'dark' : 'light';
    setIsDarkMode(nextMode);
    setTwColorScheme(nextTheme);
    syncThemePersist(nextTheme);
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setIsDarkMode(theme === 'dark');
    setTwColorScheme(theme);
    syncThemePersist(theme);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

