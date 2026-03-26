import { createContext, useContext, useState, useEffect } from 'react';

const WEB_THEMES = [
    { id: 'midnight', label: 'Midnight', preview: ['#38bdf8', '#818cf8', '#0b0f19'] },
    { id: 'dracula', label: 'Dracula', preview: ['#ff79c6', '#bd93f9', '#282a36'] },
    { id: 'catppuccin', label: 'Catppuccin', preview: ['#cba6f7', '#f5c2e7', '#1e1e2e'] },
    { id: 'nord', label: 'Nord', preview: ['#88c0d0', '#81a1c1', '#2e3440'] },
    { id: 'tokyo', label: 'Tokyo Night', preview: ['#7aa2f7', '#bb9af7', '#1a1b26'] },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() =>
        localStorage.getItem('disablarr_web_theme') || 'midnight'
    );

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('disablarr_web_theme', theme);
    }, [theme]);

    function setTheme(t) {
        setThemeState(t);
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, themes: WEB_THEMES }}>
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
