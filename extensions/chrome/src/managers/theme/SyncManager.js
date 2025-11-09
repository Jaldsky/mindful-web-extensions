const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * Менеджер для синхронизации темы между страницами расширения.
 * Отвечает за прослушивание изменений в chrome.storage и уведомление об изменениях.
 * 
 * @class SyncManager
 * @extends BaseManager
 */
class SyncManager extends BaseManager {
    /**
     * Ключ хранилища для темы
     * @readonly
     * @static
     */
    static STORAGE_KEY = CONFIG.THEME.STORAGE_KEY;

    /**
     * Создает экземпляр SyncManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     * @param {Function} [options.onThemeChange] - Callback при изменении темы
     */
    constructor(options = {}) {
        super(options);

        /** @type {Function|null} */
        this.onThemeChangeCallback = options.onThemeChange || null;

        /** @type {Function|null} */
        this.storageListener = null;

        /** @type {Object} */
        this.statistics = {
            changes: 0,
            errors: 0,
            lastChange: null
        };

        this._log({ key: 'logs.theme.sync.created' }, {
            hasCallback: !!this.onThemeChangeCallback
        });
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
               chrome.storage.onChanged;
    }

    /**
     * Начинает слушать изменения темы в хранилище.
     * 
     * @param {Function} callback - Callback при изменении темы
     * @returns {boolean} true если слушатель успешно установлен
     */
    startListening(callback) {
        try {
            if (!this._isStorageAvailable()) {
                this._log({ key: 'logs.theme.sync.storageApiUnavailable' });
                return false;
            }

            if (callback) {
                this.onThemeChangeCallback = callback;
            }

            if (!this.onThemeChangeCallback) {
                this._log({ key: 'logs.theme.sync.callbackNotSet' });
                return false;
            }

            this.stopListening();

            this.storageListener = (changes, areaName) => {
                if (areaName === 'local' && changes[CONFIG.THEME.STORAGE_KEY]) {
                    const newTheme = changes[CONFIG.THEME.STORAGE_KEY].newValue;
                    
                    this.statistics.changes++;
                    this.statistics.lastChange = Date.now();
                    this.updateState({ 
                        lastChangeTime: Date.now(),
                        lastTheme: newTheme 
                    });
                    
                    try {
                        this.onThemeChangeCallback(newTheme);
                        this._log({ key: 'logs.theme.sync.themeChanged' }, { newTheme });
                    } catch (error) {
                        this.statistics.errors++;
                        this._logError({ key: 'logs.theme.sync.callbackError' }, error);
                    }
                }
            };

            chrome.storage.onChanged.addListener(this.storageListener);
            return true;
        } catch (error) {
            this.statistics.errors++;
            this._logError({ key: 'logs.theme.sync.listenerSetupError' }, error);
            return false;
        }
    }

    /**
     * Останавливает прослушивание изменений темы.
     * 
     * @returns {boolean} true если слушатель успешно удален
     */
    stopListening() {
        try {
            if (this.storageListener && this._isStorageAvailable()) {
                chrome.storage.onChanged.removeListener(this.storageListener);
                this.storageListener = null;
                this._log({ key: 'logs.theme.sync.listenerRemoved' });
                return true;
            }
            return false;
        } catch (error) {
            this.statistics.errors++;
            this._logError({ key: 'logs.theme.sync.removeListenerError' }, error);
            return false;
        }
    }

    /**
     * Проверяет, активен ли слушатель.
     * 
     * @returns {boolean} true если слушатель активен
     */
    isListening() {
        return !!this.storageListener;
    }

    /**
     * Получает статистику синхронизации.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return {
            ...this.statistics,
            isListening: this.isListening()
        };
    }

    /**
     * Очищает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.theme.sync.cleanupStart' });
        
        try {
            this.stopListening();
            this.onThemeChangeCallback = null;
            this._log({ key: 'logs.theme.sync.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.theme.sync.destroyError' }, error);
        }

        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncManager;
    module.exports.default = SyncManager;
}

if (typeof window !== 'undefined') {
    window.SyncManager = SyncManager;
}
