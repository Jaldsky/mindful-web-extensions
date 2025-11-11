/**
 * Entry point for theme initialization.
 * Инициализирует тему при загрузке страницы для предотвращения мигания (flash).
 */
import ThemeInitializer from './managers/theme/ThemeInitializer.js';
import CONFIG from './config/config.js';

try {
    const themeInitializer = new ThemeInitializer({
        enableLogging: CONFIG.THEME.INIT.ENABLE_LOGGING
    });
    themeInitializer.init();
} catch (error) {
    // eslint-disable-next-line no-console
    console.error('[ThemeInit] Критическая ошибка инициализации темы:', error);
}
