// Apply theme immediately to prevent flash - must be synchronous
try {
    // Try to get theme from localStorage cache first (instant)
    const cachedTheme = localStorage.getItem('mindful_theme_cache');
    if (cachedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Then update from chrome.storage (async, for next time)
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['mindful_theme'], function(result) {
            const theme = result.mindful_theme || 'light';
            localStorage.setItem('mindful_theme_cache', theme);
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        });
    }
} catch (e) {
    console.error('Theme initialization error:', e);
}
