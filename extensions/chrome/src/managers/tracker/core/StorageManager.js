const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');
const { normalizeDomainList } = require('../../../utils/domainUtils.js');

/**
 * @typedef {Object} StorageKeys
 * @property {string} USER_ID - Ключ для ID пользователя
 * @property {string} BACKEND_URL - Ключ для URL backend
 * @property {string} EVENT_QUEUE - Ключ для очереди событий
 */

/**
 * Менеджер для работы с chrome.storage.
 * Отвечает за сохранение и загрузку данных трекера.
 * 
 * @class StorageManager
 * @extends BaseManager
 */
class StorageManager extends BaseManager {
    /**
     * Ключи для хранения данных в chrome.storage
     * @readonly
     * @static
     */
    static STORAGE_KEYS = CONFIG.STORAGE_KEYS;

    /**
     * URL backend по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_BACKEND_URL = CONFIG.BACKEND.DEFAULT_URL;

    /**
     * Статус отслеживания по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_TRACKING_ENABLED = CONFIG.TRACKER.DEFAULT_TRACKING_ENABLED;

    /**
     * Создает экземпляр StorageManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {string|null} */
        this.userId = null;
        
        /** @type {string} */
        this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;

        /** @type {Array<string>} */
        this.domainExceptions = [];

        /** @type {boolean} */
        this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;
    }

    /**
     * Получает или создает ID пользователя.
     * 
     * Загружает ID пользователя из хранилища. Если ID не найден,
     * генерирует новый UUID v4 и сохраняет его в хранилище.
     * 
     * @async
     * @returns {Promise<string>} ID пользователя
     * @throws {Error} Если произошла ошибка при работе с хранилищем
     */
    async getOrCreateUserId() {
        return await this._executeWithTimingAsync('getOrCreateUserId', async () => {
            try {
                const result = await chrome.storage.local.get([StorageManager.STORAGE_KEYS.USER_ID]);
                
                if (result[StorageManager.STORAGE_KEYS.USER_ID]) {
                    this.userId = result[StorageManager.STORAGE_KEYS.USER_ID];
                    this._log({ key: 'logs.trackerStorage.userIdLoaded', params: { userId: this.userId } });
                } else {
                    // Генерируем UUID v4
                    this.userId = this._generateUUID();
                    await chrome.storage.local.set({ 
                        [StorageManager.STORAGE_KEYS.USER_ID]: this.userId 
                    });
                    this._log({ key: 'logs.trackerStorage.userIdCreated', params: { userId: this.userId } });
                }
                
                this.updateState({ userId: this.userId });
                return this.userId;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.userIdError' }, error);
                throw error;
            }
        });
    }

    /**
     * Генерирует UUID v4.
     * 
     * @private
     * @returns {string} UUID
     */
    _generateUUID() {
        return CONFIG.TRACKER.UUID_TEMPLATE.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Загружает URL backend из хранилища.
     * 
     * Загружает сохраненный URL backend из хранилища. Если URL не найден,
     * использует значение по умолчанию из конфигурации.
     * 
     * @async
     * @returns {Promise<string>} URL backend
     */
    async loadBackendUrl() {
        return await this._executeWithTimingAsync('loadBackendUrl', async () => {
            try {
                const result = await chrome.storage.local.get([StorageManager.STORAGE_KEYS.BACKEND_URL]);
                
                if (result[StorageManager.STORAGE_KEYS.BACKEND_URL]) {
                    this.backendUrl = result[StorageManager.STORAGE_KEYS.BACKEND_URL];
                } else {
                    this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;
                }
                
                this.updateState({ backendUrl: this.backendUrl });
                return this.backendUrl;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.backendUrlLoadError' }, error);
                this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;
                return this.backendUrl;
            }
        });
    }

    /**
     * Загружает исключения доменов из хранилища.
     * 
     * Загружает список доменов, которые должны быть исключены из отслеживания.
     * Домены нормализуются перед возвратом.
     * 
     * @async
     * @returns {Promise<Array<string>>} Массив исключенных доменов
     */
    async loadDomainExceptions() {
        return await this._executeWithTimingAsync('loadDomainExceptions', async () => {
            try {
                const result = await chrome.storage.local.get([StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS]);
                const domains = normalizeDomainList(result[StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS] || []);
                this.domainExceptions = domains;
                this.updateState({ domainExceptionsCount: domains.length });
                return domains;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.domainExceptionsLoadError' }, error);
                this.domainExceptions = [];
                return [];
            }
        });
    }

    /**
     * Загружает статус отслеживания из хранилища.
     * 
     * Загружает сохраненный статус отслеживания из хранилища. Если статус не найден
     * или имеет неверный тип, использует значение по умолчанию.
     * 
     * @async
     * @returns {Promise<boolean>} Статус отслеживания
     */
    async loadTrackingEnabled() {
        return await this._executeWithTimingAsync('loadTrackingEnabled', async () => {
            try {
                const result = await chrome.storage.local.get([StorageManager.STORAGE_KEYS.TRACKING_ENABLED]);
                const storedValue = result[StorageManager.STORAGE_KEYS.TRACKING_ENABLED];

                this.trackingEnabled = typeof storedValue === 'boolean'
                    ? storedValue
                    : StorageManager.DEFAULT_TRACKING_ENABLED;

                this.updateState({ trackingEnabled: this.trackingEnabled });
                return this.trackingEnabled;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.trackingEnabledLoadError' }, error);
                this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;
                return this.trackingEnabled;
            }
        });
    }

    /**
     * Сохраняет URL backend в хранилище.
     * 
     * Сохраняет новый URL backend в хранилище и обновляет внутреннее состояние менеджера.
     * 
     * @async
     * @param {string} url - Новый URL backend
     * @returns {Promise<boolean>} Успешность операции
     */
    async saveBackendUrl(url) {
        return await this._executeWithTimingAsync('saveBackendUrl', async () => {
            try {
                await chrome.storage.local.set({ 
                    [StorageManager.STORAGE_KEYS.BACKEND_URL]: url 
                });
                this.backendUrl = url;
                this.updateState({ backendUrl: this.backendUrl });
                this._log({ key: 'logs.trackerStorage.backendUrlSaved' }, { backendUrl: url });
                return true;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.backendUrlSaveError' }, error);
                return false;
            }
        });
    }

    /**
     * Сохраняет исключения доменов в хранилище.
     * 
     * Сохраняет список доменов для исключения в хранилище. Домены нормализуются
     * перед сохранением.
     * 
     * @async
     * @param {Array<string>} domains - Массив доменов для исключения
     * @returns {Promise<boolean>} Успешность операции
     */
    async saveDomainExceptions(domains) {
        return await this._executeWithTimingAsync('saveDomainExceptions', async () => {
            const normalized = normalizeDomainList(domains || []);
            try {
                await chrome.storage.local.set({
                    [StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS]: normalized
                });
                this.domainExceptions = normalized;
                this.updateState({ domainExceptionsCount: normalized.length });
                this._log({ key: 'logs.trackerStorage.domainExceptionsSaved' }, { 
                    count: normalized.length,
                    domains: normalized 
                });
                return true;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.domainExceptionsSaveError' }, error);
                return false;
            }
        });
    }

    /**
     * Сохраняет статус отслеживания в хранилище.
     * 
     * @async
     * @param {boolean} isEnabled - Статус отслеживания
     * @returns {Promise<boolean>} Успешность операции
     * @throws {TypeError} Если isEnabled не является булевым значением
     */
    async saveTrackingEnabled(isEnabled) {
        if (typeof isEnabled !== 'boolean') {
            throw new TypeError(this._getTranslateFn()('logs.trackerStorage.trackingEnabledTypeError'));
        }

        return await this._executeWithTimingAsync('saveTrackingEnabled', async () => {
            try {
                await chrome.storage.local.set({
                    [StorageManager.STORAGE_KEYS.TRACKING_ENABLED]: isEnabled
                });
                this.trackingEnabled = isEnabled;
                this.updateState({ trackingEnabled: this.trackingEnabled });
                this._log({ key: 'logs.trackerStorage.trackingEnabledSaved', params: { trackingEnabled: this.trackingEnabled } });
                return true;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.trackingEnabledSaveError' }, error);
                return false;
            }
        });
    }

    /**
     * Восстанавливает очередь событий из хранилища.
     * 
     * Загружает сохраненную очередь событий из хранилища. Если очередь не найдена,
     * возвращает пустой массив.
     * 
     * @async
     * @returns {Promise<Array>} Восстановленная очередь событий
     */
    async restoreEventQueue() {
        return await this._executeWithTimingAsync('restoreEventQueue', async () => {
            try {
                const result = await chrome.storage.local.get([StorageManager.STORAGE_KEYS.EVENT_QUEUE]);
                
                if (result[StorageManager.STORAGE_KEYS.EVENT_QUEUE]) {
                    const queue = result[StorageManager.STORAGE_KEYS.EVENT_QUEUE];
                    return queue;
                }
                
                this._log({ key: 'logs.trackerStorage.eventQueueEmpty' });
                return [];
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.eventQueueRestoreError' }, error);
                return [];
            }
        });
    }

    /**
     * Сохраняет очередь событий в хранилище.
     * 
     * Сохраняет текущую очередь событий в хранилище для последующего восстановления.
     * 
     * @async
     * @param {Array} queue - Очередь событий для сохранения
     * @returns {Promise<boolean>} Успешность операции
     */
    async saveEventQueue(queue) {
        return await this._executeWithTimingAsync('saveEventQueue', async () => {
            try {
                await chrome.storage.local.set({ 
                    [StorageManager.STORAGE_KEYS.EVENT_QUEUE]: queue 
                });
                return true;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.eventQueueSaveError' }, error);
                return false;
            }
        });
    }

    /**
     * Получает текущий User ID.
     * 
     * @returns {string|null} User ID
     */
    getUserId() {
        return this.userId;
    }

    /**
     * Получает текущий Backend URL.
     * 
     * @returns {string} Backend URL
     */
    getBackendUrl() {
        return this.backendUrl;
    }

    /**
     * Получает текущие исключения доменов.
     * 
     * @returns {Array<string>} Копия массива исключенных доменов
     */
    getDomainExceptions() {
        return [...this.domainExceptions];
    }

    /**
     * Очищает все данные из хранилища.
     * 
     * Удаляет все данные трекера из хранилища и сбрасывает внутреннее состояние
     * менеджера на значения по умолчанию.
     * 
     * @async
     * @returns {Promise<boolean>} Успешность операции
     */
    async clearAll() {
        return await this._executeWithTimingAsync('clearAll', async () => {
            try {
                await chrome.storage.local.remove([
                    StorageManager.STORAGE_KEYS.USER_ID,
                    StorageManager.STORAGE_KEYS.BACKEND_URL,
                    StorageManager.STORAGE_KEYS.EVENT_QUEUE,
                    StorageManager.STORAGE_KEYS.DOMAIN_EXCEPTIONS,
                    StorageManager.STORAGE_KEYS.TRACKING_ENABLED
                ]);
                
                this.userId = null;
                this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;
                this.domainExceptions = [];
                this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;
                this.updateState({
                    domainExceptionsCount: 0
                });
                
                this._log({ key: 'logs.trackerStorage.allDataCleared' });
                return true;
            } catch (error) {
                this._logError({ key: 'logs.trackerStorage.clearAllError' }, error);
                return false;
            }
        });
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.userId = null;
        this.backendUrl = null;
        this.domainExceptions = [];
        this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;
        super.destroy();
        this._log({ key: 'logs.trackerStorage.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
    module.exports.default = StorageManager;
}

if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
