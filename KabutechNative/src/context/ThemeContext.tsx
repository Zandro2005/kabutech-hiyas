import React, { createContext, useContext } from 'react';
import { useAppColorScheme } from 'twrnc';
import tw from '../tailwind';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [colorScheme, toggleColorScheme] = useAppColorScheme(tw);
  const isDarkMode = colorScheme === 'dark';

  const toggleTheme = () => {
    toggleColorScheme();
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
