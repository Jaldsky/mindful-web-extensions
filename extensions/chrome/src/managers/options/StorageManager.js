const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');
const { normalizeDomainList } = require('../../utils/domainUtils.js');

/**
 * @typedef {Object} OptionsStorageData
 * @property {string} mindful_backend_url - URL бэкенда
 */

/**
 * @typedef {Object} StorageOperationResult
 * @property {boolean} success - Успешность операции
 * @property {*} [data] - Данные результата
 * @property {string} [error] - Сообщение об ошибке
 * @property {number} [duration] - Длительность операции в мс
 */

/**
 * Менеджер для работы с хранилищем настроек (chrome.storage).
 * Отвечает за сохранение, загрузку и управление настройками расширения.
 * Включает измерение производительности и надёжную обработку ошибок.
 * 
 * @class StorageManager
 * @extends BaseManager
 */
class StorageManager extends BaseManager {
    /**
     * Ключи для хранилища
     * @readonly
     * @enum {string}
     */
    static STORAGE_KEYS = CONFIG.STORAGE_KEYS;

    /**
     * Значения по умолчанию
     * @readonly
     * @enum {string}
     */
    static DEFAULT_VALUES = {
        BACKEND_URL: CONFIG.BACKEND.DEFAULT_URL,
        DOMAIN_EXCEPTIONS: []
    };

    /**
     * Таймаут для уведомлений background script (мс)
     * @readonly
     */
    static NOTIFICATION_TIMEOUT = CONFIG.BASE.PING_TIMEOUT;

    /**
     * Создает экземпляр StorageManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     */
    constructor(options = {}) {
        super(options);

        this._validateStorageAvailability();
    }

    /**
     * Проверяет доступность chrome.storage API.
     * 
     * @private
     * @throws {Error} Если chrome.storage недоступен
     * @returns {void}
     */
    _validateStorageAvailability() {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            const error = new Error('chrome.storage API недоступен');
            this._logError('Критическая ошибка инициализации', error);
            throw error;
        }
        this._log('chrome.storage API доступен');
    }

    /**
     * Валидирует загруженные данные.
     * 
     * @private
     * @param {string} value - Значение для валидации
     * @param {string} defaultValue - Значение по умолчанию
     * @returns {string} Валидное значение
     */
    _validateLoadedValue(value, defaultValue) {
        if (!value || typeof value !== 'string' || value.trim() === '') {
            this._log('Некорректное значение, используется значение по умолчанию');
            return defaultValue;
        }
        return value;
    }

    /**
     * Загружает URL бэкенда из хранилища.
     * Включает измерение производительности и валидацию данных.
     * 
     * @async
     * @returns {Promise<string>} URL бэкенда или значение по умолчанию
     * @throws {Error} Если произошла ошибка при загрузке
     */
    async loadBackendUrl() {
        return this._executeWithTimingAsync('loadBackendUrl', async () => {
            this._log('Загрузка URL бэкенда из хранилища');
            
            const result = await chrome.storage.local.get([
                StorageManager.STORAGE_KEYS.BACKEND_URL
            ]);
            
            const loadedUrl = result[StorageManager.STORAGE_KEYS.BACKEND_URL];
            const backendUrl = this._validateLoadedValue(
                loadedUrl,
                StorageManager.DEFAULT_VALUES.BACKEND_URL
            );
            
            this._log('URL бэкенда загружен', { 
                backendUrl,
                wasDefault: !loadedUrl
            });
            
            return backendUrl;
        });
    }

    async loadDomainExceptions() {
        return this._executeWithTimingAsync('loadDomainExceptions', async () => {
            this._log('Загрузка списка исключений доменов');

            try {
                const result = await chrome.storage.local.get([
                    StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS
                ]);

                const stored = result[StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS];
                const domains = normalizeDomainList(Array.isArray(stored) ? stored : []);

                this._log('Список исключений доменов загружен', {
                    count: domains.length
                });

                return domains;
            } catch (error) {
                this._logError('Ошибка загрузки исключений доменов', error);
                return [];
            }
        });
    }

    /**
     * Сохраняет URL бэкенда в хранилище.
     * Включает валидацию, измерение производительности и проверку успешности.
     * 
     * @async
     * @param {string} backendUrl - URL бэкенда для сохранения
     * @throws {TypeError} Если backendUrl не является строкой или пустой
     * @throws {Error} Если произошла ошибка при сохранении
     * @returns {Promise<boolean>} true если сохранение успешно
     */
    async saveBackendUrl(backendUrl) {
        if (typeof backendUrl !== 'string' || backendUrl.trim() === '') {
            throw new TypeError('backendUrl должен быть непустой строкой');
        }

        return this._executeWithTimingAsync('saveBackendUrl', async () => {
            this._log('Сохранение URL бэкенда в хранилище', { backendUrl });
            
            await chrome.storage.local.set({
                [StorageManager.STORAGE_KEYS.BACKEND_URL]: backendUrl
            });
            
            // Верификация сохранения
            const verification = await chrome.storage.local.get([
                StorageManager.STORAGE_KEYS.BACKEND_URL
            ]);
            
            const saved = verification[StorageManager.STORAGE_KEYS.BACKEND_URL] === backendUrl;
            
            if (saved) {
                this._log('URL бэкенда успешно сохранен и верифицирован');
            } else {
                throw new Error('Верификация сохранения не удалась');
            }
            
            return true;
        });
    }

    async saveDomainExceptions(domains) {
        if (!Array.isArray(domains)) {
            throw new TypeError('domains должен быть массивом строк');
        }

        const normalized = normalizeDomainList(domains);

        return this._executeWithTimingAsync('saveDomainExceptions', async () => {
            this._log('Сохранение исключений доменов в хранилище', { count: normalized.length });

            await chrome.storage.local.set({
                [StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS]: normalized
            });

            const verification = await chrome.storage.local.get([
                StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS
            ]);

            const saved = Array.isArray(verification[StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS])
                ? verification[StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS]
                : [];

            if (saved.length !== normalized.length || saved.some((domain, index) => domain !== normalized[index])) {
                throw new Error('Верификация сохранения не удалась');
            }

            this._log('Исключения доменов успешно сохранены');

            return true;
        });
    }

    /**
     * Сбрасывает настройки к значениям по умолчанию.
     * Использует saveBackendUrl для обеспечения консистентности.
     * 
     * @async
     * @returns {Promise<string>} URL бэкенда по умолчанию
     * @throws {Error} Если произошла ошибка при сбросе
     */
    async resetToDefault() {
        return this._executeWithTimingAsync('resetToDefault', async () => {
            this._log('Сброс настроек к значениям по умолчанию');
            
            const defaultUrl = StorageManager.DEFAULT_VALUES.BACKEND_URL;
            await this.saveBackendUrl(defaultUrl);
            await this.saveDomainExceptions([...StorageManager.DEFAULT_VALUES.DOMAIN_EXCEPTIONS]);
            
            this._log('Настройки сброшены к значениям по умолчанию');
            
            return defaultUrl;
        });
    }

    /**
     * Уведомляет background script об обновлении URL бэкенда с таймаутом.
     * 
     * @async
     * @param {string} url - Новый URL бэкенда
     * @throws {TypeError} Если url не является строкой
     * @returns {Promise<boolean>} true если сообщение отправлено успешно
     */
    async notifyBackgroundScript(url) {
        if (typeof url !== 'string' || url.trim() === '') {
            throw new TypeError('url должен быть непустой строкой');
        }

        return this._executeWithTimingAsync('notifyBackgroundScript', async () => {
            this._log('Отправка уведомления background script', { url });
            
            try {
                const timeoutPromise = new Promise((_resolve, reject) => {
                    setTimeout(() => reject(new Error('Таймаут уведомления')), 
                        StorageManager.NOTIFICATION_TIMEOUT);
                });
                
                const sendPromise = chrome.runtime.sendMessage({
                    action: 'updateBackendUrl',
                    url: url
                });
                
                // Race между отправкой и таймаутом
                await Promise.race([sendPromise, timeoutPromise]);
                
                this._log('Уведомление успешно отправлено background script');
                return true;
                
            } catch (error) {
                // Если background script не отвечает, это не критичная ошибка
                this._log('Background script не ответил (это нормально если он перезагружается)', error);
                return false;
            }
        });
    }

    async notifyDomainExceptionsUpdate(domains) {
        if (!Array.isArray(domains)) {
            throw new TypeError('domains должен быть массивом строк');
        }

        const normalized = normalizeDomainList(domains);

        return this._executeWithTimingAsync('notifyDomainExceptionsUpdate', async () => {
            this._log('Отправка исключений доменов background script', {
                count: normalized.length
            });

            try {
                const timeoutPromise = new Promise((_resolve, reject) => {
                    setTimeout(() => reject(new Error('Таймаут уведомления исключений доменов')),
                        StorageManager.NOTIFICATION_TIMEOUT);
                });

                const sendPromise = chrome.runtime.sendMessage({
                    action: CONFIG.MESSAGE_TYPES.UPDATE_DOMAIN_EXCEPTIONS,
                    domains: normalized
                });

                await Promise.race([sendPromise, timeoutPromise]);

                this._log('Исключения доменов отправлены background script');
                return true;
            } catch (error) {
                this._log('Background script не ответил на обновление исключений доменов', error);
                return false;
            }
        });
    }

    /**
     * Получает значение по умолчанию для бэкенда.
     * 
     * @returns {string} URL бэкенда по умолчанию
     */
    getDefaultBackendUrl() {
        return StorageManager.DEFAULT_VALUES.BACKEND_URL;
    }

    getDefaultDomainExceptions() {
        return [...StorageManager.DEFAULT_VALUES.DOMAIN_EXCEPTIONS];
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов StorageManager');
        
        try {
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
