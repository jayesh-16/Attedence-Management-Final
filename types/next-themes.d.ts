// Type definitions for next-themes
declare module "next-themes" {
  export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    storageKey?: string;
    themes?: string[];
    attribute?: string | 'class' | 'data-theme';
    value?: { [themeName: string]: string };
    forcedTheme?: string;
    enableColorScheme?: boolean;
  }
  
  export interface UseThemeProps {
    themes: string[];
    forcedTheme?: string;
    setTheme: (theme: string) => void;
    theme?: string;
    resolvedTheme?: string;
    systemTheme?: string;
  }
  
  export function useTheme(): UseThemeProps;
  export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
}

declare module "next-themes/dist/types" {
  export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    storageKey?: string;
    themes?: string[];
    attribute?: string | 'class' | 'data-theme';
    value?: { [themeName: string]: string };
    forcedTheme?: string;
    enableColorScheme?: boolean;
  }
}
