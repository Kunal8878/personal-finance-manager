import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeId = 'dark' | 'light';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  swatches: [string, string, string]; // [primary, card, bg]
  isDark: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'dark',
    label: 'Private Wealth Dark',
    description: 'Deep forest obsidian & antique gold',
    swatches: ['#A5C6A9', '#19251E', '#111914'],
    isDark: true,
  },
  {
    id: 'light',
    label: 'Quiet Luxury Light',
    description: 'Warm cream, deep evergreen & champagne gold',
    swatches: ['#183D32', '#FAF9F5', '#F2EFE7'],
    isDark: false,
  },
];

interface ThemeContextProps {
  theme: ThemeId;
  themeMeta: ThemeMeta;
  toggleTheme: () => void;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const STORAGE_KEY = 'aura-theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const themeMeta = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, themeMeta, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextProps => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
