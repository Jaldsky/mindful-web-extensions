/**
 * Entry point for theme initialization.
 * Инициализирует тему при загрузке страницы для предотвращения мигания (flash).
 */
import ThemeInitializer from './managers/theme/ThemeInitializer.js';
import CONFIG from './config/config.js';

    const themeInitializer = new ThemeInitializer({
        enableLogging: CONFIG.THEME.INIT.ENABLE_LOGGING
    });
    themeInitializer.init();
