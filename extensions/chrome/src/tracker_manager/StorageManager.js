const BaseManager = require('../BaseManager.js');
const CONFIG = require('../../config.js');

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
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this._log('StorageManager инициализирован');
    }

    /**
     * Получает или создает ID пользователя.
     * 
     * @async
     * @returns {Promise<string>} ID пользователя
     */
    async getOrCreateUserId() {
        return await this._executeWithTimingAsync('getOrCreateUserId', async () => {
            try {
                const result = await chrome.storage.local.get([StorageManager.STORAGE_KEYS.USER_ID]);
                
                if (result[StorageManager.STORAGE_KEYS.USER_ID]) {
                    this.userId = result[StorageManager.STORAGE_KEYS.USER_ID];
                    this._log('User ID загружен', { userId: this.userId });
                } else {
                    // Генерируем UUID v4
                    this.userId = this._generateUUID();
                    await chrome.storage.local.set({ 
                        [StorageManager.STORAGE_KEYS.USER_ID]: this.userId 
                    });
                    this._log('User ID создан', { userId: this.userId });
                }
                
                this.updateState({ userId: this.userId });
                return this.userId;
            } catch (error) {
                this._logError('Ошибка получения/создания User ID', error);
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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Загружает URL backend из хранилища.
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
                    this._log('Backend URL загружен', { backendUrl: this.backendUrl });
                } else {
                    this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;
                    this._log('Используется Backend URL по умолчанию', { backendUrl: this.backendUrl });
                }
                
                this.updateState({ backendUrl: this.backendUrl });
                return this.backendUrl;
            } catch (error) {
                this._logError('Ошибка загрузки Backend URL', error);
                this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;
                return this.backendUrl;
            }
        });
    }

    /**
     * Сохраняет URL backend в хранилище.
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
                this._log('Backend URL сохранен', { backendUrl: url });
                return true;
            } catch (error) {
                this._logError('Ошибка сохранения Backend URL', error);
                return false;
            }
        });
    }

    /**
     * Восстанавливает очередь событий из хранилища.
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
                    this._log('Очередь событий восстановлена', { queueLength: queue.length });
                    return queue;
                }
                
                this._log('Очередь событий пуста');
                return [];
            } catch (error) {
                this._logError('Ошибка восстановления очереди событий', error);
                return [];
            }
        });
    }

    /**
     * Сохраняет очередь событий в хранилище.
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
                this._log('Очередь событий сохранена', { queueLength: queue.length });
                return true;
            } catch (error) {
                this._logError('Ошибка сохранения очереди событий', error);
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
     * Очищает все данные из хранилища.
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
                    StorageManager.STORAGE_KEYS.EVENT_QUEUE
                ]);
                
                this.userId = null;
                this.backendUrl = StorageManager.DEFAULT_BACKEND_URL;
                
                this._log('Все данные очищены из хранилища');
                return true;
            } catch (error) {
                this._logError('Ошибка очистки данных', error);
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
        this.performanceMetrics.clear();
        this.userId = null;
        this.backendUrl = null;
        super.destroy();
        this._log('StorageManager уничтожен');
    }
}

module.exports = StorageManager;
