const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

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
 * @typedef {Object} DetailedStats
 * @property {number} eventsTracked - Общее количество отслеженных событий
 * @property {number} activeEvents - Количество событий "active"
 * @property {number} inactiveEvents - Количество событий "inactive"
 * @property {number} domainsVisited - Количество уникальных доменов
 * @property {Array<string>} domains - Список доменов
 * @property {number} queueSize - Текущий размер очереди
 * @property {boolean} isTracking - Статус отслеживания
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
     * @param {Function} [options.translateFn] - Функция для получения переводов
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {Function|null} */
        this.messageListener = null;
        
        /** @type {number} */
        this.messageTimeout = options.messageTimeout || this.CONSTANTS.PING_TIMEOUT;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        /** @type {Function} Функция для получения переводов */
        this.translateFn = options.translateFn || (() => '');
        
        this._setupMessageListener();
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

        this.messageListener = () => {
            return false;
        };

        try {
            chrome.runtime.onMessage.addListener(this.messageListener);
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.messageListenerSetupError' }, error);
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
        const t = this._getTranslateFn();
        
        if (typeof type !== 'string' || !type) {
            throw new TypeError(t('logs.serviceWorker.messageTypeMustBeString'));
        }

        const blockCheck = this._shouldBlockMessage(
            type,
            ServiceWorkerManager.MESSAGE_TYPES,
            () => this.state?.isTracking !== undefined ? Boolean(this.state.isTracking) : true,
            () => this.state?.isOnline !== undefined ? Boolean(this.state.isOnline) : true
        );

        if (blockCheck.shouldBlock) {
            const errorMessage = blockCheck.reason === 'Tracking is disabled'
                ? (t('logs.serviceWorker.trackingDisabled') || 'Tracking is disabled')
                : (t('logs.serviceWorker.noConnection') || 'No connection');

            const error = new Error(errorMessage);
            throw error;
        }

        const actualTimeout = timeout || this.messageTimeout;
        
        const isSystemMessage = this._isSystemMessage(type, ServiceWorkerManager.MESSAGE_TYPES);
        if (!isSystemMessage) {
            this._log({ key: 'logs.serviceWorker.messageSending', params: { type } }, { data, timeout: actualTimeout });
        }

        try {
            const timeoutPromise = new Promise((_resolve, reject) => {
                setTimeout(() => {
                    reject(new Error(t('logs.serviceWorker.messageTimeout', { type, timeout: actualTimeout })));
                }, actualTimeout);
            });

            const messagePromise = chrome.runtime.sendMessage({ type, data });

            const response = await Promise.race([messagePromise, timeoutPromise]);
            
            if (!isSystemMessage) {
                this._log({ key: 'logs.serviceWorker.messageReceived', params: { type } }, response);
            }
            
            return response;
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.messageSendError', params: { type } }, error);
            throw error;
        }
    }

    /**
     * Проверяет подключение к серверу.
     * 
     * @returns {Promise<Object>} Результат проверки подключения {success: boolean, tooFrequent?: boolean, error?: string}
     */
    async checkConnection() {
        try {
            const response = await this.sendMessage(
                ServiceWorkerManager.MESSAGE_TYPES.CHECK_CONNECTION
            );
            
            // Возвращаем полный объект ответа, чтобы можно было проверить tooFrequent
            return {
                success: response?.success || false,
                tooFrequent: response?.tooFrequent || false,
                error: response?.error || null
            };
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.connectionCheckError' }, error);
            return {
                success: false,
                tooFrequent: false,
                error: error.message
            };
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
                
                this.updateState(status);
                return status;
            }
            
            this.updateState(defaultStatus);
            return defaultStatus;
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.trackingStatusError' }, error);
            this.updateState(defaultStatus);
            return defaultStatus;
        }
    }

    /**
     * Устанавливает состояние отслеживания.
     * 
     * @param {boolean} isEnabled - Требуемое состояние отслеживания
     * @returns {Promise<{success: boolean, isTracking: boolean}>} Результат операции
     */
    async setTrackingEnabled(isEnabled) {
        const t = this._getTranslateFn();
        
        if (typeof isEnabled !== 'boolean') {
            throw new TypeError(t('logs.serviceWorker.isEnabledMustBeBoolean'));
        }

        try {
            const response = await this.sendMessage(
                ServiceWorkerManager.MESSAGE_TYPES.SET_TRACKING_ENABLED,
                { enabled: isEnabled }
            );

            const success = Boolean(response?.success);
            const isTracking = response?.isTracking !== undefined
                ? Boolean(response.isTracking)
                : isEnabled;

            if (success) {
                this.updateState({ isTracking });
            }

            return {
                success,
                isTracking
            };
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.trackingStateUpdateError' }, error);
            const fallbackState = this.state?.isTracking !== undefined
                ? Boolean(this.state.isTracking)
                : !isEnabled;

            return {
                success: false,
                isTracking: fallbackState
            };
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
                
                return stats;
            }
            
            return defaultStats;
        } catch (error) {
            if (this._isBlockingError(error)) {
                return defaultStats;
            }
            this._logError({ key: 'logs.serviceWorker.statsError' }, error);
            return defaultStats;
        }
    }

    /**
     * Получает подробную статистику за сегодня.
     * 
     * @returns {Promise<DetailedStats>} Подробная статистика
     */
    async getDetailedStats() {
        const defaultStats = {
            eventsTracked: 0,
            activeEvents: 0,
            inactiveEvents: 0,
            domainsVisited: 0,
            domains: [],
            queueSize: 0,
            isTracking: false
        };

        try {
            const response = await this.sendMessage(
                ServiceWorkerManager.MESSAGE_TYPES.GET_DETAILED_STATS
            );

            if (response && typeof response === 'object') {
                const stats = {
                    eventsTracked: Number(response.eventsTracked) || 0,
                    activeEvents: Number(response.activeEvents) || 0,
                    inactiveEvents: Number(response.inactiveEvents) || 0,
                    domainsVisited: Number(response.domainsVisited) || 0,
                    domains: Array.isArray(response.domains) ? response.domains : [],
                    queueSize: Number(response.queueSize) || 0,
                    isTracking: Boolean(response.isTracking)
                };

                return stats;
            }

            return defaultStats;
        } catch (error) {
            if (this._isBlockingError(error)) {
                return defaultStats;
            }
            this._logError({ key: 'logs.serviceWorker.detailedStatsError' }, error);
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
            this._log({ key: 'logs.serviceWorker.pingSuccess' });
            return true;
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.serviceWorkerUnavailable' }, error);
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
     * Генерирует случайные домены (для отладки) в фоне.
     * @param {number} [count=100] Количество доменов
     * @returns {Promise<{success:boolean, generated:number}>}
     */
    async generateRandomDomains(count = 100) {
        try {
            const response = await this.sendMessage(ServiceWorkerManager.MESSAGE_TYPES.GENERATE_RANDOM_DOMAINS, { count });
            return {
                success: Boolean(response?.success),
                generated: Number(response?.generated) || 0
            };
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.generateDomainsError' }, error);
            return { success: false, generated: 0 };
        }
    }

    /**
     * Очищает ресурсы и удаляет слушатели.
     * Вызывайте этот метод при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.serviceWorker.cleanupStart' });
        
        try {
            if (this.messageListener) {
                chrome.runtime.onMessage.removeListener(this.messageListener);
                this.messageListener = null;
            }
            
            this.performanceMetrics.clear();
            
            this._log({ key: 'logs.serviceWorker.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.serviceWorker.destroyError' }, error);
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
