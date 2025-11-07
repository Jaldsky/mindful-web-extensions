const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');

/**
 * Менеджер для работы с хранилищем темы.
 * Отвечает за сохранение и загрузку темы из chrome.storage и localStorage кеша.
 * 
 * @class StorageManager
 * @extends BaseManager
 */
class StorageManager extends BaseManager {
    /**
     * Ключ хранилища для темы в chrome.storage
     * @readonly
     * @static
     */
    static STORAGE_KEY = CONFIG.THEME.STORAGE_KEY;

    /**
     * Ключ кеша темы в localStorage
     * @readonly
     * @static
     */
    static CACHE_KEY = CONFIG.THEME.CACHE_KEY;

    /**
     * Создает экземпляр StorageManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     * @param {boolean} [options.enableCache] - Использовать localStorage кеш
     */
    constructor(options = {}) {
        super(options);

        /** @type {boolean} */
        this.enableCache = options.enableCache !== false;

        /** @type {Object} */
        this.statistics = {
            loads: 0,
            saves: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            lastOperation: null
        };

        this._log({ key: 'logs.theme.storage.created' }, { enableCache: this.enableCache });
    }

    /**
     * Проверяет доступность Chrome Storage API.
     * 
     * @private
     * @returns {boolean} true если API доступен
     */
    _isStorageAvailable() {
        return typeof chrome !== 'undefined' && 
               chrome.storage && 
               chrome.storage.local;
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
     * Получает тему из localStorage кеша.
     * 
     * @returns {string|null} Тема из кеша или null
     */
    getThemeFromCache() {
        if (!this.enableCache || !this._isLocalStorageAvailable()) {
            return null;
        }

        return this._executeWithTiming('getThemeFromCache', () => {
            try {
                const cachedTheme = localStorage.getItem(CONFIG.THEME.CACHE_KEY);
                if (cachedTheme) {
                    this.statistics.cacheHits++;
                    this._log({ key: 'logs.theme.storage.themeFromCache' }, { theme: cachedTheme });
                    return cachedTheme;
                }
                this.statistics.cacheMisses++;
                return null;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.theme.storage.cacheReadError' }, error);
                return null;
            }
        });
    }

    /**
     * Сохраняет тему в localStorage кеш.
     * 
     * @param {string} theme - Тема для сохранения
     * @returns {boolean} true если успешно сохранено
     */
    saveThemeToCache(theme) {
        if (!this.enableCache || !this._isLocalStorageAvailable()) {
            return false;
        }

        return this._executeWithTiming('saveThemeToCache', () => {
            try {
                localStorage.setItem(CONFIG.THEME.CACHE_KEY, theme);
                this._log({ key: 'logs.theme.storage.themeSavedToCache' }, { theme });
                return true;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.theme.storage.cacheSaveError' }, error);
                return false;
            }
        });
    }

    /**
     * Загружает тему из chrome.storage.
     * 
     * @async
     * @returns {Promise<string|null>} Тема или null
     */
    async loadTheme() {
        return await this._executeWithTimingAsync('loadTheme', async () => {
            try {
                if (!this._isStorageAvailable()) {
                    this._log({ key: 'logs.theme.storage.storageApiUnavailable' });
                    this.statistics.errors++;
                    return null;
                }

                const result = await chrome.storage.local.get([CONFIG.THEME.STORAGE_KEY]);
                const theme = result[CONFIG.THEME.STORAGE_KEY] || null;
                
                this.statistics.loads++;
                this.statistics.lastOperation = 'load';
                this.updateState({ lastLoadTime: Date.now() });
                
                this._log({ key: 'logs.theme.storage.themeLoaded' }, { theme });
                return theme;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.theme.storage.loadError' }, error);
                return null;
            }
        });
    }

    /**
     * Сохраняет тему в chrome.storage.
     * 
     * @async
     * @param {string} theme - Тема для сохранения
     * @returns {Promise<boolean>} true если успешно сохранено
     */
    async saveTheme(theme) {
        return await this._executeWithTimingAsync('saveTheme', async () => {
            try {
                if (!theme || typeof theme !== 'string') {
                    this._logError({ key: 'logs.theme.storage.invalidThemeForSave' }, { theme });
                    this.statistics.errors++;
                    return false;
                }

                if (!this._isStorageAvailable()) {
                    this._log({ key: 'logs.theme.storage.storageApiUnavailable' });
                    this.statistics.errors++;
                    return false;
                }

                await chrome.storage.local.set({
                    [CONFIG.THEME.STORAGE_KEY]: theme
                });
                
                this.statistics.saves++;
                this.statistics.lastOperation = 'save';
                this.updateState({ lastSaveTime: Date.now() });
                
                this._log({ key: 'logs.theme.storage.themeSaved' }, { theme });
                return true;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.theme.storage.saveError' }, error);
                return false;
            }
        });
    }

    /**
     * Получает статистику работы.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Очищает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.theme.storage.cleanupStart' });
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
    module.exports.default = StorageManager;
}
