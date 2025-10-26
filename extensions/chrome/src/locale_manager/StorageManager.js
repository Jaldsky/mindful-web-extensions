const BaseManager = require('../BaseManager.js');

/**
 * Менеджер для работы с хранилищем локалей.
 * Отвечает за сохранение и загрузку выбранной локали из chrome.storage.
 * 
 * @class StorageManager
 * @extends BaseManager
 */
class StorageManager extends BaseManager {
    /**
     * Ключ для хранения выбранной локали в storage
     * @readonly
     * @static
     */
    static STORAGE_KEY = 'mindful_locale';

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

        this._log('StorageManager создан');
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
                    this._log('chrome.storage.local недоступен');
                    this.statistics.errors++;
                    return null;
                }

                const result = await new Promise((resolve) => {
                    chrome.storage.local.get([StorageManager.STORAGE_KEY], (result) => {
                        if (chrome.runtime.lastError) {
                            this.statistics.errors++;
                            this._logError('Ошибка загрузки локали', chrome.runtime.lastError);
                            resolve(null);
                        } else {
                            resolve(result[StorageManager.STORAGE_KEY] || null);
                        }
                    });
                });

                if (result === null && this.statistics.errors === 0) {
                    // null из-за отсутствия сохранённой локали, а не ошибки
                    this.statistics.loads++;
                    this.statistics.lastOperation = 'load';
                    this.updateState({ lastLoadTime: Date.now() });
                    this._log('Сохраненная локаль не найдена');
                } else if (result !== null) {
                    // Успешная загрузка
                    this.statistics.loads++;
                    this.statistics.lastOperation = 'load';
                    this.updateState({ lastLoadTime: Date.now() });
                    this._log('Локаль загружена', { locale: result });
                }

                return result;
            } catch (error) {
                this.statistics.errors++;
                this._logError('Ошибка загрузки локали', error);
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
                    this._logError('Невалидная локаль для сохранения', { locale });
                    this.statistics.errors++;
                    return false;
                }

                if (!this._isStorageAvailable()) {
                    this._log('chrome.storage.local недоступен');
                    this.statistics.errors++;
                    return false;
                }

                const result = await new Promise((resolve) => {
                    chrome.storage.local.set(
                        { [StorageManager.STORAGE_KEY]: locale },
                        () => {
                            if (chrome.runtime.lastError) {
                                this.statistics.errors++;
                                this._logError('Ошибка сохранения локали', chrome.runtime.lastError);
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
                    this._log('Локаль сохранена', { locale });
                }

                return result;
            } catch (error) {
                this.statistics.errors++;
                this._logError('Ошибка сохранения локали', error);
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
     * Получает статистику работы со storage.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return {
            ...this.statistics,
            storageAvailable: this._isStorageAvailable()
        };
    }

    /**
     * Сбрасывает статистику.
     * 
     * @returns {void}
     */
    resetStatistics() {
        this.statistics = {
            loads: 0,
            saves: 0,
            errors: 0,
            lastOperation: null
        };
        this._log('Статистика сброшена');
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов StorageManager');
        
        try {
            this.statistics = {
                loads: 0,
                saves: 0,
                errors: 0,
                lastOperation: null
            };
            
            this._log('StorageManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении StorageManager', error);
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
