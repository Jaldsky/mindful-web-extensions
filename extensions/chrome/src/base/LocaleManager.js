const CONFIG = require('../config/config.js');
const EN = require('../locales/en.js');
const RU = require('../locales/ru.js');

/**
 * Базовый менеджер для работы с локализацией.
 * 
 * @class LocaleManager
 */
class LocaleManager {
    /**
     * Поддерживаемые локали
     * @readonly
     * @static
     */
    static SUPPORTED_LOCALES = CONFIG.LOCALE.SUPPORTED_LOCALES;

    /**
     * Локаль по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_LOCALE = CONFIG.LOCALE.DEFAULT;

    /**
     * Кэш локали для синхронного доступа
     * @private
     * @static
     * @type {string|null}
     */
    static _localeCache = null;

    /**
     * Флаг, указывающий, что локаль уже загружается из chrome.storage.local
     * @private
     * @static
     * @type {Promise<void>|null}
     */
    static _localeLoadingPromise = null;

    /**
     * Определяет локаль браузера.
     * 
     * @static
     * @returns {string|null} Код локали или null, если не удалось определить
     */
    static detectBrowserLocale() {
        try {
            const browserLang = typeof navigator !== 'undefined' 
                ? (navigator.language || navigator.userLanguage)
                : null;
            
            if (!browserLang) {
                return null;
            }

            const langCode = browserLang.substring(0, 2).toLowerCase();
            
            const supportedLocales = Object.values(LocaleManager.SUPPORTED_LOCALES);
            if (supportedLocales.includes(langCode)) {
                return langCode;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Инициализирует кэш локали из localStorage или chrome.storage.local (синхронно).
     * 
     * @private
     * @static
     * @returns {string} Код локали ('en' или 'ru')
     */
    static _initLocaleCache() {
        if (LocaleManager._localeCache !== null) {
            return LocaleManager._localeCache;
        }

        try {
            if (typeof localStorage !== 'undefined') {
                const cachedLocale = localStorage.getItem(CONFIG.LOCALE.CACHE_KEY);
                const supportedLocales = Object.values(LocaleManager.SUPPORTED_LOCALES);
                if (supportedLocales.includes(cachedLocale)) {
                    LocaleManager._localeCache = cachedLocale;
                    return cachedLocale;
                }
            }
        } catch (e) {
            // Ignore localStorage errors
        }

        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome storage is async, cannot be accessed synchronously here
            }
        } catch (e) {
            // Ignore chrome.storage errors
        }

        const browserLocale = LocaleManager.detectBrowserLocale() || LocaleManager.DEFAULT_LOCALE;
        LocaleManager._localeCache = browserLocale;
        return browserLocale;
    }

    /**
     * Обновляет кэш локали.
     * 
     * @static
     * @param {string} locale - Код локали
     * @returns {void}
     */
    static updateLocaleCache(locale) {
        const supportedLocales = Object.values(LocaleManager.SUPPORTED_LOCALES);
        if (supportedLocales.includes(locale)) {
            LocaleManager._localeCache = locale;

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(CONFIG.LOCALE.CACHE_KEY, locale);
                }
            } catch (e) {
                // Ignore localStorage errors
            }

            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ [CONFIG.LOCALE.STORAGE_KEY]: locale }, () => {
                        if (chrome.runtime.lastError) {
                            // Ignore storage errors
                        }
                    });
                }
            } catch (e) {
                // Ignore chrome.storage errors
            }
        }
    }

    /**
     * Загружает локаль из chrome.storage.local для Service Worker контекста.
     * 
     * @protected
     * @async
     * @returns {Promise<void>}
     */
    async _loadLocaleFromStorage() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get([CONFIG.LOCALE.STORAGE_KEY], (items) => {
                        resolve(items[CONFIG.LOCALE.STORAGE_KEY] || null);
                    });
                });
                if (result && CONFIG.LOCALE.AVAILABLE.includes(result)) {
                    LocaleManager.updateLocaleCache(result);
                }
            }
        } catch (e) {
        } finally {
            LocaleManager._localeLoadingPromise = null;
        }
    }

    /**
     * Получает универсальную функцию перевода.
     * 
     * @protected
     * @param {Function} [translateFn] - Основная функция перевода
     * @returns {Function} Функция перевода: (key: string, params?: Object) => string
     */
    _getTranslateFn(translateFn) {
        if (translateFn && typeof translateFn === 'function') {
            return translateFn;
        }
        
        const locale = LocaleManager._localeCache !== null 
            ? LocaleManager._localeCache 
            : LocaleManager._initLocaleCache();
        
        return (key, params = {}) => {
            const currentLocale = LocaleManager._localeCache !== null 
                ? LocaleManager._localeCache 
                : locale;
            const currentTranslations = currentLocale === 'ru' ? RU : EN;
            
            const keys = key.split('.');
            let value = currentTranslations;
            for (const k of keys) {
                value = value?.[k];
            }
            if (typeof value !== 'string') return key;
            return Object.keys(params).reduce((str, paramKey) => 
                str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]), value);
        };
    }

    /**
     * Получает Promise загрузки локали для Service Worker контекста.
     * 
     * @protected
     * @returns {Promise<void>|null}
     */
    _getLocaleLoadingPromise() {
        if (typeof localStorage === 'undefined' && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            if (!LocaleManager._localeLoadingPromise) {
                LocaleManager._localeLoadingPromise = this._loadLocaleFromStorage();
            }
            return LocaleManager._localeLoadingPromise;
        }
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocaleManager;
    module.exports.default = LocaleManager;
}
