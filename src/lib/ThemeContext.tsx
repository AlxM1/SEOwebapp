import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [manualTheme, setManualTheme] = useState<ThemeMode | 'auto' | null>(null);

  const getEffectiveTheme = (): ThemeMode => {
    if (manualTheme === 'auto' || manualTheme === null) {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return manualTheme;
  };

  const effectiveTheme = getEffectiveTheme();

  const toggleTheme = () => {
    if (manualTheme === null) {
      setManualTheme(systemColorScheme === 'dark' ? 'light' : 'dark');
    } else if (manualTheme === 'light') {
      setManualTheme('dark');
    } else {
      setManualTheme('auto');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        colorScheme: effectiveTheme,
        isDark: effectiveTheme === 'dark',
        toggleTheme,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


