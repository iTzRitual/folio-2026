"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { THEMES, type Palette } from "@/config/constants";
import type { ThemeOption } from "@/data/content";

export const THEME_STORAGE_KEY = "folio-theme";

export interface ThemeContextValue {
    theme: ThemeOption;
    palette: Palette;
    setTheme: (theme: ThemeOption) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeOption | null {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "Light" || stored === "Dark" ? stored : null;
    } catch {
        return null;
    }
}

function systemTheme(): ThemeOption {
    return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "Light"
        : "Dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeOption>(() =>
        typeof window === "undefined" ? "Dark" : readStoredTheme() ?? systemTheme(),
    );

    useEffect(() => {
        const query = window.matchMedia("(prefers-color-scheme: light)");
        const sync = () => {
            if (readStoredTheme()) return;
            setThemeState(query.matches ? "Light" : "Dark");
        };
        query.addEventListener("change", sync);
        return () => query.removeEventListener("change", sync);
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme.toLowerCase();
    }, [theme]);

    const setTheme = useCallback((next: ThemeOption) => {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {}
        setThemeState(next);
    }, []);

    const value = useMemo(
        () => ({ theme, palette: THEMES[theme], setTheme }),
        [theme, setTheme],
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function ThemeBridge({
    value,
    children,
}: {
    value: ThemeContextValue;
    children: React.ReactNode;
}) {
    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
