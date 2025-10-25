const BaseManager = require('../BaseManager.js');
const CONFIG = require('../../config.js');

/**
 * @typedef {Object} TrackingStatus
 * @property {boolean} isTracking - Статус отслеживания
 * @property {boolean} isOnline - Статус подключения
 */

/**
 * @typedef {Object} TodayStats
 * @property {number} events - Количество событий
 * @property {number} domains - Количество доменов
 * @property {number} queue - Размер очереди
 */

/**
 * @typedef {Object} MessageResponse
 * @property {boolean} [success] - Статус успешности операции
 * @property {*} [data] - Данные ответа
 * @property {string} [error] - Сообщение об ошибке
 */

/**
 * Менеджер для работы с Service Worker.
 * Отвечает за коммуникацию с фоновым скриптом.
 * 
 * @class ServiceWorkerManager
 * @extends BaseManager
 */
class ServiceWorkerManager extends BaseManager {
    /**
     * Типы сообщений для коммуникации с Service Worker
     * @readonly
     * @enum {string}
     */
    static MESSAGE_TYPES = CONFIG.MESSAGE_TYPES;

    /**
     * Создает экземпляр ServiceWorkerManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {number} [options.messageTimeout] - Таймаут для отправки сообщений (мс)
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {Map<string, Function>} */
        this.messageHandlers = new Map();
        
        /** @type {Function|null} */
        this.messageListener = null;
        
        /** @type {number} */
        this.messageTimeout = options.messageTimeout || this.CONSTANTS.PING_TIMEOUT;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this._setupMessageListener();
        this._log('ServiceWorkerManager инициализирован', { messageTimeout: this.messageTimeout });
    }

    /**
     * Настраивает слушатель сообщений от Service Worker.
     * Предотвращает утечку памяти путем создания только одного слушателя.
     * 
     * @private
     * @returns {void}
     */
    _setupMessageListener() {
        if (this.messageListener) {
            chrome.runtime.onMessage.removeListener(this.messageListener);
        }

        this.messageListener = (message, sender, sendResponse) => {
            if (!message || typeof message.type !== 'string') {
                this._log('Получено некорректное сообщение', message);
                return false;
            }

            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                this._log(`Обработка сообщения типа: ${message.type}`, message.data);

                const result = handler(message.data, sendResponse);
                if (result instanceof Promise) {
                    result.then(sendResponse).catch(error => {
                        this._logError('Ошибка в обработчике сообщения', error);
                        sendResponse({ success: false, error: error.message });
                    });
                    return true;
                }
            }
            
            return false;
        };

        try {
            chrome.runtime.onMessage.addListener(this.messageListener);
            this._log('Слушатель сообщений настроен');
        } catch (error) {
            this._logError('Ошибка настройки слушателя сообщений', error);
            throw error;
        }
    }

    /**
     * Регистрирует обработчик сообщений.
     * 
     * @param {string} type - Тип сообщения
     * @param {Function} handler - Обработчик сообщения
     * @throws {TypeError} Если тип не является строкой или обработчик не является функцией
     * @returns {void}
     */
    onMessage(type, handler) {
        if (typeof type !== 'string' || !type) {
            throw new TypeError('Тип сообщения должен быть непустой строкой');
        }
        
        if (typeof handler !== 'function') {
            throw new TypeError('Обработчик должен быть функцией');
        }

        try {
            this.messageHandlers.set(type, handler);
            this._log(`Зарегистрирован обработчик для типа: ${type}`);
        } catch (error) {
            this._logError('Ошибка регистрации обработчика', error);
            throw error;
        }
    }

    /**
     * Отправляет сообщение в Service Worker с поддержкой timeout.
     * 
     * @param {string} type - Тип сообщения
     * @param {Object} [data={}] - Данные сообщения
     * @param {number} [timeout] - Таймаут для данного сообщения (переопределяет глобальный)
     * @returns {Promise<MessageResponse>} Промис с ответом
     * @throws {Error} Если отправка сообщения не удалась или превышен таймаут
     */
    async sendMessage(type, data = {}, timeout) {
        if (typeof type !== 'string' || !type) {
            throw new TypeError('Тип сообщения должен быть непустой строкой');
        }

        const actualTimeout = timeout || this.messageTimeout;
        
        this._log(`Отправка сообщения типа: ${type}`, { data, timeout: actualTimeout });

        try {
            const timeoutPromise = new Promise((_resolve, reject) => {
                setTimeout(() => {
                    reject(new Error(`Таймаут при отправке сообщения "${type}" (${actualTimeout}мс)`));
                }, actualTimeout);
            });

            const messagePromise = chrome.runtime.sendMessage({ type, data });

            const response = await Promise.race([messagePromise, timeoutPromise]);
            
            this._log(`Получен ответ на сообщение типа: ${type}`, response);
            
            return response;
        } catch (error) {
            this._logError(`Ошибка отправки сообщения "${type}"`, error);
            throw error;
        }
    }

    /**
     * Проверяет подключение к серверу.
     * 
     * @returns {Promise<boolean>} Статус подключения
     */
    async checkConnection() {
        try {
            const response = await this.sendMessage(
                ServiceWorkerManager.MESSAGE_TYPES.CHECK_CONNECTION
            );
            
            const isConnected = response?.success || false;
            this._log(`Статус подключения: ${isConnected}`);
            
            return isConnected;
        } catch (error) {
            this._logError('Ошибка проверки подключения', error);
            return false;
        }
    }

    /**
     * Получает текущий статус отслеживания.
     * 
     * @returns {Promise<TrackingStatus>} Статус отслеживания
     */
    async getTrackingStatus() {
        const defaultStatus = { isTracking: false, isOnline: false };
        
        try {
            const response = await this.sendMessage(
                ServiceWorkerManager.MESSAGE_TYPES.GET_TRACKING_STATUS
            );

            if (response && typeof response === 'object') {
                const status = {
                    isTracking: Boolean(response.isTracking),
                    isOnline: Boolean(response.isOnline)
                };
                
                this._log('Получен статус отслеживания', status);
                return status;
            }
            
            return defaultStatus;
        } catch (error) {
            this._logError('Ошибка получения статуса отслеживания', error);
            return defaultStatus;
        }
    }

    /**
     * Получает статистику за сегодня.
     * 
     * @returns {Promise<TodayStats>} Статистика
     */
    async getTodayStats() {
        const defaultStats = { events: 0, domains: 0, queue: 0 };
        
        try {
            const response = await this.sendMessage(
                ServiceWorkerManager.MESSAGE_TYPES.GET_TODAY_STATS
            );

            if (response && typeof response === 'object') {
                const stats = {
                    events: Number(response.events) || 0,
                    domains: Number(response.domains) || 0,
                    queue: Number(response.queue) || 0
                };
                
                this._log('Получена статистика', stats);
                return stats;
            }
            
            return defaultStats;
        } catch (error) {
            this._logError('Ошибка получения статистики', error);
            return defaultStats;
        }
    }

    /**
     * Проверяет доступность Service Worker.
     * 
     * @returns {Promise<boolean>} true, если Service Worker доступен
     */
    async ping() {
        try {
            await this.sendMessage(ServiceWorkerManager.MESSAGE_TYPES.PING, {}, 3000);
            this._log('Ping успешен');
            return true;
        } catch (error) {
            this._logError('Service Worker недоступен', error);
            return false;
        }
    }

    /**
     * Получает метрики производительности.
     * 
     * @returns {Object} Метрики производительности
     */
    getPerformanceMetrics() {
        const metrics = {};
        this.performanceMetrics.forEach((value, key) => {
            metrics[key] = value;
        });
        return metrics;
    }

    /**
     * Очищает ресурсы и удаляет слушатели.
     * Вызывайте этот метод при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов ServiceWorkerManager');
        
        try {
            if (this.messageListener) {
                chrome.runtime.onMessage.removeListener(this.messageListener);
                this.messageListener = null;
            }
            
            this.messageHandlers.clear();
            this.performanceMetrics.clear();
            
            this._log('ServiceWorkerManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении ServiceWorkerManager', error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServiceWorkerManager;
    module.exports.default = ServiceWorkerManager;
}

if (typeof window !== 'undefined') {
    window.ServiceWorkerManager = ServiceWorkerManager;
}
