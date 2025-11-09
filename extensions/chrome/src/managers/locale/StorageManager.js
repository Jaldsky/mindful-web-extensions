const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * Менеджер для работы с хранилищем локалей.
 * Отвечает за сохранение и загрузку выбранной локали из chrome.storage.
 * 
 * @class StorageManager
 * @extends BaseManager
 */
class StorageManager extends BaseManager {

    /**
     * Создает экземпляр StorageManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        super(options);

        /** @type {Object} */
        this.statistics = {
            loads: 0,
            saves: 0,
            errors: 0,
            lastOperation: null
        };

        this._log({ key: 'logs.localeStorage.created' });
    }

    /**
     * Загружает сохраненную локаль из chrome.storage.
     * 
     * @async
     * @returns {Promise<string|null>} Код локали или null
     */
    async loadLocale() {
        return await this._executeWithTimingAsync('loadLocale', async () => {
            try {
                if (!this._isStorageAvailable()) {
                    this._log({ key: 'logs.localeStorage.storageUnavailable' });
                    this.statistics.errors++;
                    return null;
                }

                const result = await new Promise((resolve) => {
                    chrome.storage.local.get([CONFIG.LOCALE.STORAGE_KEY], (result) => {
                        if (chrome.runtime.lastError) {
                            this.statistics.errors++;
                            this._logError({ key: 'logs.localeStorage.loadError' }, chrome.runtime.lastError);
                            resolve(null);
                        } else {
                            resolve(result[CONFIG.LOCALE.STORAGE_KEY] || null);
                        }
                    });
                });

                if (result === null && this.statistics.errors === 0) {
                    this.statistics.loads++;
                    this.statistics.lastOperation = 'load';
                    this.updateState({ lastLoadTime: Date.now() });
                    this._log({ key: 'logs.localeStorage.notFound' });
                } else if (result !== null) {
                    this.statistics.loads++;
                    this.statistics.lastOperation = 'load';
                    this.updateState({ lastLoadTime: Date.now() });
                    const BaseManager = require('../../base/BaseManager.js');
                    BaseManager.updateLocaleCache(result);
                    this._log({ key: 'logs.localeStorage.loaded' }, { locale: result });
                }

                return result;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.localeStorage.loadError' }, error);
                return null;
            }
        });
    }

    /**
     * Сохраняет локаль в chrome.storage.
     * 
     * @async
     * @param {string} locale - Код локали
     * @returns {Promise<boolean>} Успешно ли сохранено
     */
    async saveLocale(locale) {
        return await this._executeWithTimingAsync('saveLocale', async () => {
            try {
                if (!locale || typeof locale !== 'string') {
                    this._logError({ key: 'logs.localeStorage.invalidLocale' }, { locale });
                    this.statistics.errors++;
                    return false;
                }

                if (!this._isStorageAvailable()) {
                    this._log({ key: 'logs.localeStorage.storageUnavailable' });
                    this.statistics.errors++;
                    return false;
                }

                const result = await new Promise((resolve) => {
                    chrome.storage.local.set(
                        { [CONFIG.LOCALE.STORAGE_KEY]: locale },
                        () => {
                            if (chrome.runtime.lastError) {
                                this.statistics.errors++;
                                this._logError({ key: 'logs.localeStorage.saveError' }, chrome.runtime.lastError);
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        }
                    );
                });

                if (result) {
                    this.statistics.saves++;
                    this.statistics.lastOperation = 'save';
                    this.updateState({ 
                        lastSaveTime: Date.now(),
                        currentLocale: locale 
                    });
                    const BaseManager = require('../../base/BaseManager.js');
                    BaseManager.updateLocaleCache(locale);
                    this._log({ key: 'logs.localeStorage.saved' }, { locale });
                }

                return result;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.localeStorage.saveError' }, error);
                return false;
            }
        });
    }

    /**
     * Проверяет доступность chrome.storage.
     * 
     * @private
     * @returns {boolean} true если storage доступен
     */
    _isStorageAvailable() {
        return !!(chrome.storage && chrome.storage.local);
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.localeStorage.destroyStart' });
        
        try {
            this.statistics = {
                loads: 0,
                saves: 0,
                errors: 0,
                lastOperation: null
            };
            
            this._log({ key: 'logs.localeStorage.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.localeStorage.destroyError' }, error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
    module.exports.default = StorageManager;
}

if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
