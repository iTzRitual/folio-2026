"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type RefObject,
} from "react";
import type { Object3D } from "three";
import { CONFIG, THEMES, type Palette } from "@/config/constants";
import type { ThemeOption } from "@/data/content";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const THEME_STORAGE_KEY = "folio-theme";

export type ThemeRole = keyof Palette;

export interface SweepTarget {
    role: ThemeRole;
    object: RefObject<Object3D | null>;
    apply: (hex: string) => void;
}

export interface SweepRun {
    from: Palette;
    to: Palette;
    elapsed: number;
    active: boolean;
    settled: boolean;
}

export interface ThemeSweepController {
    runRef: RefObject<SweepRun>;
    targetsRef: RefObject<Set<SweepTarget>>;
    register: (target: SweepTarget) => () => void;
}

export interface ThemeContextValue {
    theme: ThemeOption;
    palette: Palette;
    setTheme: (theme: ThemeOption) => void;
    sweep: ThemeSweepController;
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
    const prefersReducedMotion = usePrefersReducedMotion();

    const runRef = useRef<SweepRun>({
        from: THEMES[theme],
        to: THEMES[theme],
        elapsed: CONFIG.themeSweep.DURATION,
        active: false,
        settled: false,
    });
    const targetsRef = useRef<Set<SweepTarget>>(new Set());
    const playedThemeRef = useRef<ThemeOption>(theme);

    const register = useCallback((target: SweepTarget) => {
        const targets = targetsRef.current;
        targets.add(target);
        return () => {
            targets.delete(target);
        };
    }, []);

    const sweep = useMemo(
        () => ({ runRef, targetsRef, register }),
        [register],
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

    useLayoutEffect(() => {
        const previous = playedThemeRef.current;
        if (previous === theme) return;
        playedThemeRef.current = theme;

        runRef.current = {
            from: THEMES[previous],
            to: THEMES[theme],
            elapsed: prefersReducedMotion ? CONFIG.themeSweep.DURATION : 0,
            active: !prefersReducedMotion,
            settled: false,
        };
    }, [theme, prefersReducedMotion]);

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
        () => ({ theme, palette: THEMES[theme], setTheme, sweep }),
        [theme, setTheme, sweep],
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

export function useSweptColor(
    role: ThemeRole,
    object: RefObject<Object3D | null>,
    apply: (hex: string) => void,
): string {
    const { palette, sweep } = useTheme();
    const targetRef = useRef<SweepTarget | null>(null);
    targetRef.current ??= { role, object, apply };

    useLayoutEffect(() => {
        const target = targetRef.current!;
        target.role = role;
        target.object = object;
        target.apply = apply;
    });

    const { register } = sweep;
    useEffect(() => register(targetRef.current!), [register]);

    return palette[role];
}
