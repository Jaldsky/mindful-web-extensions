/**
 * Простой менеджер для работы с темами.
 * Может использоваться на любой странице расширения.
 * 
 * @class ThemeManager
 */
class ThemeManager {
    /**
     * Ключ хранилища для темы
     * @readonly
     */
    static STORAGE_KEY = 'mindful_theme';

    /**
     * Значение по умолчанию
     * @readonly
     */
    static DEFAULT_THEME = 'light';

    /**
     * Загружает тему из хранилища и применяет её.
     * 
     * @static
     * @async
     * @returns {Promise<string>} Применённая тема
     */
    static async loadAndApplyTheme() {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                console.warn('[ThemeManager] Chrome storage API недоступен');
                return ThemeManager.DEFAULT_THEME;
            }

            const result = await chrome.storage.local.get([ThemeManager.STORAGE_KEY]);
            const theme = result[ThemeManager.STORAGE_KEY] || ThemeManager.DEFAULT_THEME;
            
            ThemeManager.applyTheme(theme);
            
            console.log('[ThemeManager] Тема загружена и применена:', theme);
            return theme;
        } catch (error) {
            console.error('[ThemeManager] Ошибка загрузки темы:', error);
            ThemeManager.applyTheme(ThemeManager.DEFAULT_THEME);
            return ThemeManager.DEFAULT_THEME;
        }
    }

    /**
     * Применяет тему к документу.
     * 
     * @static
     * @param {string} theme - Тема ('light' или 'dark')
     * @returns {void}
     */
    static applyTheme(theme) {
        try {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            
            // Кешируем в localStorage для мгновенного применения при следующем открытии
            try {
                localStorage.setItem('mindful_theme_cache', theme);
            } catch (e) {
                // Игнорируем ошибки localStorage
            }
            
            console.log('[ThemeManager] Тема применена:', theme);
        } catch (error) {
            console.error('[ThemeManager] Ошибка применения темы:', error);
        }
    }

    /**
     * Слушает изменения темы в хранилище.
     * 
     * @static
     * @param {Function} callback - Функция, вызываемая при изменении темы
     * @returns {void}
     */
    static listenForThemeChanges(callback) {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) {
                console.warn('[ThemeManager] Chrome storage API недоступен');
                return;
            }

            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && changes[ThemeManager.STORAGE_KEY]) {
                    const newTheme = changes[ThemeManager.STORAGE_KEY].newValue;
                    ThemeManager.applyTheme(newTheme);
                    
                    if (callback) {
                        callback(newTheme);
                    }
                    
                    console.log('[ThemeManager] Тема изменена:', newTheme);
                }
            });
        } catch (error) {
            console.error('[ThemeManager] Ошибка установки слушателя темы:', error);
        }
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
    module.exports.default = ThemeManager;
}

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
}
