const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * Класс для синхронной инициализации темы при загрузке страницы.
 * Применяет тему из localStorage кеша до загрузки основного JavaScript,
 * чтобы предотвратить мигание (flash) при загрузке страницы.
 * 
 * @class ThemeInitializer
 * @extends BaseManager
 */
class ThemeInitializer extends BaseManager {
    /**
     * Создает экземпляр ThemeInitializer.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=true] - Включить логирование
     */
    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined 
                ? options.enableLogging 
                : CONFIG.THEME.INIT.ENABLE_LOGGING,
            ...options
        });

        this._log({ key: 'logs.theme.init.created' });
    }

    /**
     * Проверяет доступность localStorage.
     * 
     * @private
     * @returns {boolean} true если localStorage доступен
     */
    _isLocalStorageAvailable() {
        try {
            return typeof localStorage !== 'undefined';
        } catch (e) {
            return false;
        }
    }

    /**
     * Проверяет доступность Chrome Storage API.
     * 
     * @private
     * @returns {boolean} true если Chrome Storage API доступен
     */
    _isChromeStorageAvailable() {
        return typeof chrome !== 'undefined' && 
               chrome.storage && 
               chrome.storage.local;
    }

    /**
     * Проверяет, является ли тема валидной.
     * 
     * @private
     * @param {string} theme - Тема для проверки
     * @returns {boolean} true если тема валидна
     */
    _isValidTheme(theme) {
        return CONFIG.THEME.AVAILABLE.includes(theme);
    }

    /**
     * Применяет тему к документу.
     * 
     * @private
     * @param {string} theme - Тема для применения
     * @returns {void}
     */
    _applyTheme(theme) {
        if (!this._isValidTheme(theme)) {
            return;
        }

        if (theme === CONFIG.THEME.THEMES.DARK) {
            document.documentElement.setAttribute(
                CONFIG.THEME.ATTRIBUTE, 
                CONFIG.THEME.THEMES.DARK
            );
        } else {
            document.documentElement.removeAttribute(
                CONFIG.THEME.ATTRIBUTE
            );
        }
    }

    /**
     * Получает тему из localStorage кеша.
     * 
     * @private
     * @returns {string|null} Тема из кеша или null
     */
    _getThemeFromCache() {
        if (!this._isLocalStorageAvailable()) {
            return null;
        }

        try {
            return localStorage.getItem(CONFIG.THEME.CACHE_KEY);
        } catch (e) {
            this._logError({ key: 'logs.theme.init.cacheReadError' }, e);
            return null;
        }
    }

    /**
     * Сохраняет тему в localStorage кеш.
     * 
     * @private
     * @param {string} theme - Тема для сохранения
     * @returns {void}
     */
    _saveThemeToCache(theme) {
        if (!this._isLocalStorageAvailable() || 
            !this._isValidTheme(theme)) {
            return;
        }

        try {
            localStorage.setItem(CONFIG.THEME.CACHE_KEY, theme);
        } catch (e) {
        }
    }

    /**
     * Загружает тему из Chrome Storage и обновляет кеш.
     * 
     * @private
     * @returns {void}
     */
    _loadThemeFromStorage() {
        if (!this._isChromeStorageAvailable()) {
            return;
        }

        chrome.storage.local.get([CONFIG.THEME.STORAGE_KEY], (result) => {
            try {
                const theme = result[CONFIG.THEME.STORAGE_KEY] || 
                             CONFIG.THEME.DEFAULT;

                if (this._isValidTheme(theme)) {
                    this._saveThemeToCache(theme);
                    this._applyTheme(theme);
                    this._log({ key: 'logs.theme.init.themeLoadedFromStorage' }, { theme });
                }
            } catch (e) {
                this._logError({ key: 'logs.theme.init.storageLoadError' }, e);
            }
        });
    }

    /**
     * Инициализирует тему при загрузке страницы.
     * Сначала применяет тему из кеша (синхронно), затем обновляет из storage (асинхронно).
     * 
     * @returns {void}
     */
    init() {
        try {
            const cachedTheme = this._getThemeFromCache();
            if (cachedTheme && this._isValidTheme(cachedTheme)) {
                this._applyTheme(cachedTheme);
                this._log({ key: 'logs.theme.init.themeAppliedFromCache' }, { theme: cachedTheme });
            }

            this._loadThemeFromStorage();
        } catch (e) {
            this._logError({ key: 'logs.theme.init.initError' }, e);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeInitializer;
    module.exports.default = ThemeInitializer;
}
