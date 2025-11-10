const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');
const { normalizeDomainList } = require('../../../utils/domainUtils.js');

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
            const error = new Error(this.t('logs.storage.apiUnavailable'));
            this._logError({ key: 'logs.storage.criticalInitError' }, error);
            throw error;
        }
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
            this._log({ key: 'logs.storage.invalidValueUsingDefault' });
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
            const result = await chrome.storage.local.get([
                StorageManager.STORAGE_KEYS.BACKEND_URL
            ]);
            
            const loadedUrl = result[StorageManager.STORAGE_KEYS.BACKEND_URL];
            const backendUrl = this._validateLoadedValue(
                loadedUrl,
                StorageManager.DEFAULT_VALUES.BACKEND_URL
            );
            
            return backendUrl;
        });
    }

    async loadDomainExceptions() {
        return this._executeWithTimingAsync('loadDomainExceptions', async () => {

            try {
                const result = await chrome.storage.local.get([
                    StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS
                ]);

                const stored = result[StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS];
                const domains = normalizeDomainList(Array.isArray(stored) ? stored : []);

                return domains;
            } catch (error) {
                this._logError({ key: 'logs.storage.loadDomainExceptionsError' }, error);
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
            throw new TypeError(this.t('logs.storage.backendUrlMustBeString'));
        }

        return this._executeWithTimingAsync('saveBackendUrl', async () => {
            await chrome.storage.local.set({
                [StorageManager.STORAGE_KEYS.BACKEND_URL]: backendUrl
            });

            const verification = await chrome.storage.local.get([
                StorageManager.STORAGE_KEYS.BACKEND_URL
            ]);
            
            const saved = verification[StorageManager.STORAGE_KEYS.BACKEND_URL] === backendUrl;
            
            if (!saved) {
                throw new Error(this.t('logs.storage.verificationFailed'));
            }
            
            return true;
        });
    }

    async saveDomainExceptions(domains) {
        if (!Array.isArray(domains)) {
            throw new TypeError(this.t('logs.storage.domainsMustBeArray'));
        }

        const normalized = normalizeDomainList(domains);

        return this._executeWithTimingAsync('saveDomainExceptions', async () => {
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
                throw new Error(this.t('logs.storage.verificationFailed'));
            }

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
            const defaultUrl = StorageManager.DEFAULT_VALUES.BACKEND_URL;
            await this.saveBackendUrl(defaultUrl);
            await this.saveDomainExceptions([...StorageManager.DEFAULT_VALUES.DOMAIN_EXCEPTIONS]);
            
            this._log({ key: 'logs.storage.resetToDefault' });
            
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
            throw new TypeError(this.t('logs.storage.urlMustBeString'));
        }

        return this._executeWithTimingAsync('notifyBackgroundScript', async () => {
            try {
                const timeoutPromise = new Promise((_resolve, reject) => {
                    setTimeout(() => reject(new Error(this.t('logs.storage.notificationTimeout'))), 
                        StorageManager.NOTIFICATION_TIMEOUT);
                });
                
                const sendPromise = chrome.runtime.sendMessage({
                    action: 'updateBackendUrl',
                    url: url
                });

                await Promise.race([sendPromise, timeoutPromise]);
                
                return true;
                
            } catch (error) {
                this._log({ key: 'logs.storage.backgroundScriptNoResponse' }, error);
                return false;
            }
        });
    }

    async notifyDomainExceptionsUpdate(domains) {
        if (!Array.isArray(domains)) {
            throw new TypeError(this.t('logs.storage.domainsMustBeArray'));
        }

        const normalized = normalizeDomainList(domains);

        return this._executeWithTimingAsync('notifyDomainExceptionsUpdate', async () => {
            try {
                const timeoutPromise = new Promise((_resolve, reject) => {
                    setTimeout(() => reject(new Error(this.t('logs.storage.domainExceptionsNotificationTimeout'))),
                        StorageManager.NOTIFICATION_TIMEOUT);
                });

                const sendPromise = chrome.runtime.sendMessage({
                    action: CONFIG.MESSAGE_TYPES.UPDATE_DOMAIN_EXCEPTIONS,
                    domains: normalized
                });

                await Promise.race([sendPromise, timeoutPromise]);

                this._log({ key: 'logs.storage.domainExceptionsSent' }, {
                    count: normalized.length,
                    domains: normalized
                });
                return true;
            } catch (error) {
                this._log({ key: 'logs.storage.domainExceptionsNoResponse' }, error);
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

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.storage.destroyStart' });
        
        try {
            this._log({ key: 'logs.storage.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.storage.destroyError' }, error);
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
