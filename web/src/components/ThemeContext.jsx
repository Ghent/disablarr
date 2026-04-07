import { createContext, useContext, useState, useEffect } from 'react';

const WEB_THEMES = [
    { id: 'violet', label: 'Violet', preview: ['oklch(0.606 0.25 292.717)', 'oklch(0.25 0.04 280)'] },
    { id: 'ocean', label: 'Ocean', preview: ['oklch(0.55 0.2 230)', 'oklch(0.25 0.04 280)'] },
    { id: 'emerald', label: 'Emerald', preview: ['oklch(0.6 0.19 160)', 'oklch(0.25 0.04 280)'] },
    { id: 'sunset', label: 'Sunset', preview: ['oklch(0.7 0.18 55)', 'oklch(0.25 0.04 280)'] },
    { id: 'rose', label: 'Rose', preview: ['oklch(0.6 0.22 350)', 'oklch(0.25 0.04 280)'] },
    { id: 'slate', label: 'Slate', preview: ['oklch(0.45 0.03 260)', 'oklch(0.25 0.04 280)'] },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() =>
        localStorage.getItem('disablarr_web_theme') || 'violet'
    );
    const [colorMode, setColorModeState] = useState(() =>
        localStorage.getItem('disablarr_web_colormode') || 'dark'
    );

    // Apply color theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('disablarr_web_theme', theme);
    }, [theme]);

    // Apply color mode (light/dark)
    useEffect(() => {
        if (colorMode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('disablarr_web_colormode', colorMode);
    }, [colorMode]);

    function setTheme(t) {
        setThemeState(t);
    }

    function setColorMode(mode) {
        setColorModeState(mode);
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, colorMode, setColorMode, themes: WEB_THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
    return ctx;
}

export { WEB_THEMES };
