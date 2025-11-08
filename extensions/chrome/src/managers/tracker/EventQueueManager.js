const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');
const { normalizeDomain, normalizeDomainList } = require('../../utils/domainUtils.js');

/**
 * @typedef {Object} Event
 * @property {string} event - Тип события ('active' или 'inactive')
 * @property {string} domain - Домен
 * @property {string} timestamp - Временная метка ISO 8601
 */

/**
 * Менеджер для управления очередью событий.
 * Отвечает за добавление, пакетную обработку и отправку событий.
 * 
 * @class EventQueueManager
 * @extends BaseManager
 */
class EventQueueManager extends BaseManager {
    /**
     * Размер батча по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_BATCH_SIZE = CONFIG.TRACKER.BATCH_SIZE;

    /**
     * Таймаут батча по умолчанию (30 секунд)
     * @readonly
     * @static
     */
    static DEFAULT_BATCH_TIMEOUT = CONFIG.TRACKER.BATCH_TIMEOUT;

    /**
     * Задержка перед повторной попыткой (5 секунд)
     * @readonly
     * @static
     */
    static DEFAULT_RETRY_DELAY = CONFIG.BACKEND.RETRY_DELAY;

    /**
     * Максимальный размер очереди по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_MAX_QUEUE_SIZE = CONFIG.TRACKER.MAX_QUEUE_SIZE;

    /**
     * Максимальное количество последовательных неудачных отправок,
     * после которого трекер будет автоматически отключен
     * @readonly
     * @static
     */
    static DEFAULT_MAX_FAILURES_BEFORE_DISABLE = CONFIG.TRACKER.FAILURE_DISABLE_THRESHOLD || 5;

    /**
     * Создает экземпляр EventQueueManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.backendManager - Менеджер backend
     * @param {Object} dependencies.statisticsManager - Менеджер статистики
     * @param {Object} dependencies.storageManager - Менеджер хранилища
     * @param {Object} [options={}] - Опции конфигурации
     * @param {number} [options.batchSize] - Размер батча
     * @param {number} [options.batchTimeout] - Таймаут батча (мс)
     * @param {number} [options.retryDelay] - Задержка повторной попытки (мс)
     * @param {number} [options.maxQueueSize] - Максимальный размер очереди
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.backendManager || !dependencies.statisticsManager || !dependencies.storageManager) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.eventQueue.dependenciesRequired') || 'EventQueueManager requires backendManager, statisticsManager and storageManager');
        }

        /** 
         * Менеджер backend для отправки событий
         * @type {Object}
         */
        this.backendManager = dependencies.backendManager;
        
        /** 
         * Менеджер статистики для отслеживания событий
         * @type {Object}
         */
        this.statisticsManager = dependencies.statisticsManager;
        
        /** 
         * Менеджер хранилища для сохранения/загрузки очереди
         * @type {Object}
         */
        this.storageManager = dependencies.storageManager;
        
        /** 
         * Контроллер трекера для управления состоянием отслеживания
         * @type {Object|null}
         */
        this.trackingController = dependencies.trackingController || null;

        /** 
         * Очередь событий для отправки
         * @type {Array<Event>}
         */
        this.queue = [];
        
        /** 
         * Размер батча событий для отправки
         * @type {number}
         */
        this.batchSize = options.batchSize || EventQueueManager.DEFAULT_BATCH_SIZE;
        
        /** 
         * Таймаут батча в миллисекундах (интервал между отправками)
         * @type {number}
         */
        this.batchTimeout = options.batchTimeout || EventQueueManager.DEFAULT_BATCH_TIMEOUT;
        
        /** 
         * Задержка перед повторной попыткой отправки в миллисекундах
         * @type {number}
         */
        this.retryDelay = options.retryDelay || EventQueueManager.DEFAULT_RETRY_DELAY;
        
        /** 
         * Максимальный размер очереди событий
         * @type {number}
         */
        this.maxQueueSize = options.maxQueueSize || EventQueueManager.DEFAULT_MAX_QUEUE_SIZE;
        
        /** 
         * Статус подключения (true - онлайн, false - офлайн)
         * @type {boolean}
         */
        this.isOnline = true;
        
        /** 
         * ID интервала для периодической обработки батчей
         * @type {number|null}
         */
        this.batchInterval = null;

        /** 
         * ID таймера для повторной попытки отправки
         * @type {number|null}
         */
        this.retryTimeoutId = null;
        
        /** 
         * Метрики производительности операций
         * @type {Map<string, number>}
         */
        this.performanceMetrics = new Map();

        /** 
         * Множество исключенных доменов (не отслеживаются)
         * @type {Set<string>}
         */
        this.domainExceptions = new Set();

        /** 
         * Счетчик последовательных неудачных отправок
         * @type {number}
         */
        this.consecutiveFailures = 0;

        /** 
         * Флаг достижения порога ошибок (трекер будет отключен)
         * @type {boolean}
         */
        this.failureThresholdReached = false;

        /** 
         * Флаг процесса отключения трекера (защита от повторных вызовов)
         * @type {boolean}
         */
        this.disableInProgress = false;

        /** 
         * Максимальное количество последовательных неудач перед отключением трекера
         * @type {number}
         */
        this.maxFailuresBeforeDisable = options.maxFailuresBeforeDisable || EventQueueManager.DEFAULT_MAX_FAILURES_BEFORE_DISABLE;
        
        this.updateState({
            queueSize: 0,
            batchSize: this.batchSize,
            maxQueueSize: this.maxQueueSize,
            isOnline: this.isOnline,
            consecutiveFailures: this.consecutiveFailures,
            failureThresholdReached: this.failureThresholdReached
        });
        
        this._log({ key: 'logs.eventQueue.created' }, { 
            batchSize: this.batchSize,
            batchTimeout: this.batchTimeout,
            maxQueueSize: this.maxQueueSize
        });
    }

    /**
     * Проверяет, исключен ли домен из отслеживания.
     * 
     * @private
     * @param {string} domain - Домен для проверки
     * @returns {boolean} true, если домен исключен
     */
    _isDomainExcluded(domain) {
        if (!domain) {
            return false;
        }
        const normalized = normalizeDomain(domain);
        if (!normalized) {
            return false;
        }
        return this.domainExceptions.has(normalized);
    }

    /**
     * Устанавливает список исключенных доменов.
     * Удаляет события из очереди для исключенных доменов.
     * 
     * @async
     * @param {Array<string>} domains - Массив доменов для исключения
     * @returns {Promise<Object>} Результат операции с количеством исключений и удаленных из очереди событий
     */
    async setDomainExceptions(domains) {
        const normalized = normalizeDomainList(domains || []);
        this.domainExceptions = new Set(normalized);
        this.updateState({ domainExceptionsCount: this.domainExceptions.size });

        let removedFromQueue = 0;

        if (this.queue.length > 0) {
            const filteredQueue = this.queue.filter(event => !this._isDomainExcluded(event.domain));
            removedFromQueue = this.queue.length - filteredQueue.length;
            if (removedFromQueue > 0) {
                this.queue = filteredQueue;
                this.updateState({ queueSize: this.queue.length });
                this.statisticsManager.updateQueueSize(this.queue.length);
                try {
                    await this.storageManager.saveEventQueue(this.queue);
                } catch (error) {
                    this._logError({ key: 'logs.eventQueue.domainExceptionsSaveError' }, error);
                }
            }
        }

        this._log({ key: 'logs.eventQueue.domainExceptionsUpdated', params: { count: this.domainExceptions.size, removedFromQueue } });

        return {
            count: this.domainExceptions.size,
            removedFromQueue
        };
    }

    /**
     * Добавляет событие в очередь.
     * События накапливаются и отправляются только по таймеру (каждые 30 секунд).
     * BATCH_SIZE используется только как защита от переполнения очереди.
     * 
     * @param {string} eventType - Тип события ('active' или 'inactive')
     * @param {string} domain - Домен
     * @returns {void}
     */
    addEvent(eventType, domain) {
        this._executeWithTiming('addEvent', () => {
            const event = {
                event: eventType,
                domain: domain,
                timestamp: new Date().toISOString()
            };

            if (this._isDomainExcluded(domain)) {
                this._log({ key: 'logs.eventQueue.eventSkipped' }, {
                    domain,
                    eventType
                });
                return;
            }

            if (this.queue.length >= this.maxQueueSize) {
                this._logError({ key: 'logs.eventQueue.queueMaxSizeReached' }, {
                    queueSize: this.queue.length,
                    maxQueueSize: this.maxQueueSize
                });

                const removeCount = Math.floor(this.maxQueueSize * CONFIG.TRACKER.OLD_EVENTS_REMOVAL_PERCENT);
                this.queue.splice(0, removeCount);
            }

            this.queue.push(event);
            this.statisticsManager.addEvent(eventType, domain);
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this.updateState({ queueSize: this.queue.length });
            
            this._log({ key: 'logs.eventQueue.eventAdded' }, { 
                event,
                queueSize: this.queue.length 
            });

            if (this.queue.length >= this.batchSize) {
                this._log({ key: 'logs.eventQueue.queueExceededBatchSize' }, { 
                    queueSize: this.queue.length,
                    batchSize: this.batchSize 
                });
                this.processQueue();
            }
        });
    }

    /**
     * Запускает периодическую обработку батчей.
     * 
     * ОСНОВНОЙ МЕХАНИЗМ ОТПРАВКИ: События накапливаются в очереди и отправляются
     * на сервер строго раз в 30 секунд (batchTimeout), независимо от количества событий.
     * Это минимизирует нагрузку на сервер и оптимизирует сетевой трафик.
     * 
     * @returns {void}
     */
    startBatchProcessor() {
        if (this.batchInterval) {
            this._log({ key: 'logs.eventQueue.batchProcessorAlreadyStarted' });
            return;
        }

        this.batchInterval = setInterval(() => {
            if (this.queue.length > 0) {
                this._log({ key: 'logs.eventQueue.periodicBatchProcessing', params: { queueSize: this.queue.length, interval: `${this.batchTimeout / 1000}s` } });
                this.processQueue();
            }
        }, this.batchTimeout);

        this._log({ key: 'logs.eventQueue.batchProcessorStarted', params: { interval: this.batchTimeout, intervalSeconds: `${this.batchTimeout / 1000}s` } });
    }

    /**
     * Останавливает периодическую обработку батчей.
     * 
     * @returns {void}
     */
    stopBatchProcessor() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
            this._log({ key: 'logs.eventQueue.batchProcessorStopped' });
        }
    }

    /**
     * Обрабатывает очередь событий.
     * Отправляет батч событий на backend.
     * 
     * Фильтрует события по списку исключенных доменов, отправляет оставшиеся события,
     * обрабатывает ошибки и планирует повторные попытки при необходимости.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async processQueue() {
        await this._executeWithTimingAsync('processQueue', async () => {
            if (this.queue.length === 0) {
                this._log({ key: 'logs.eventQueue.queueEmpty' });
                return;
            }

            if (!this.isOnline) {
                this._log({ key: 'logs.eventQueue.noConnection' });
                await this._registerSendFailure({ reason: 'offline' });
                return;
            }

            const eventsToSend = this.queue.splice(0, this.batchSize);
            this.updateState({ queueSize: this.queue.length });
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this._log({ key: 'logs.eventQueue.batchProcessing', params: { eventsCount: eventsToSend.length, remainingInQueue: this.queue.length } });

            const filteredEvents = eventsToSend.filter(event => !this._isDomainExcluded(event.domain));
            const skippedDueToExclusions = eventsToSend.length - filteredEvents.length;

            if (skippedDueToExclusions > 0) {
                this._log({ key: 'logs.eventQueue.eventsExcluded', params: { skippedDueToExclusions, remainingToSend: filteredEvents.length } });
            }

            if (filteredEvents.length === 0) {
                this._log({ key: 'logs.eventQueue.noEventsAfterExclusions' });

                await this.storageManager.saveEventQueue(this.queue);
                return;
            }

            try {
                const result = await this.backendManager.sendEvents(filteredEvents);
                
                if (result.success) {
                    this._log({ key: 'logs.eventQueue.batchSentSuccess', params: { eventsCount: filteredEvents.length, skippedDueToExclusions } });

                    await this.storageManager.saveEventQueue(this.queue);
                    this._resetFailureCounters();
                } else {
                    const t = this._getTranslateFn();
                    const errorMessage = result.error || t('logs.backend.unknownError');
                    const error = new Error(errorMessage);
                    
                    this._logError({ key: 'logs.eventQueue.batchProcessingError' }, error);

                    this.queue.unshift(...filteredEvents);
                    this.updateState({ queueSize: this.queue.length });
                    this.statisticsManager.updateQueueSize(this.queue.length);
                    
                    this._log({ key: 'logs.eventQueue.eventsReturnedToQueue', params: { queueSize: this.queue.length } });

                    await this._registerSendFailure({
                        reason: 'sendError',
                        error: errorMessage
                    });

                    if (!this.failureThresholdReached) {
                        if (this.retryTimeoutId) {
                            clearTimeout(this.retryTimeoutId);
                        }
                        this.retryTimeoutId = setTimeout(() => {
                            this.retryTimeoutId = null;
                            this._log({ key: 'logs.eventQueue.retryProcessing' });
                            this.processQueue();
                        }, this.retryDelay);
                    } else {
                        this._log({ key: 'logs.eventQueue.retryNotScheduled' });
                    }
                }
            } catch (error) {
                this._logError({ key: 'logs.eventQueue.batchProcessingError' }, error);

                this.queue.unshift(...filteredEvents);
                this.updateState({ queueSize: this.queue.length });
                this.statisticsManager.updateQueueSize(this.queue.length);
                
                this._log({ key: 'logs.eventQueue.eventsReturnedToQueue', params: { queueSize: this.queue.length } });

                await this._registerSendFailure({
                    reason: 'sendError',
                    error: error instanceof Error ? error.message : String(error)
                });

                if (!this.failureThresholdReached) {
                    if (this.retryTimeoutId) {
                        clearTimeout(this.retryTimeoutId);
                    }
                    this.retryTimeoutId = setTimeout(() => {
                        this.retryTimeoutId = null;
                        this._log({ key: 'logs.eventQueue.retryProcessing' });
                        this.processQueue();
                    }, this.retryDelay);
                } else {
                    this._log({ key: 'logs.eventQueue.retryNotScheduled' });
                }
            }
        });
    }

    /**
     * Сбрасывает счетчик неудачных отправок.
     * 
     * @private
     * @returns {void}
     */
    _resetFailureCounters() {
        if (this.consecutiveFailures === 0 && !this.failureThresholdReached) {
            return;
        }

        this.consecutiveFailures = 0;
        this.failureThresholdReached = false;
        this.updateState({
            consecutiveFailures: this.consecutiveFailures,
            failureThresholdReached: this.failureThresholdReached
        });
    }

    /**
     * Сбрасывает состояние неудачных отправок (публичный метод).
     * 
     * Используется для сброса счетчика неудачных попыток и флага превышения порога ошибок.
     * Вызывается при успешной отправке событий или при ручном сбросе состояния.
     * 
     * @returns {void}
     */
    resetFailureState() {
        this._resetFailureCounters();
    }

    /**
     * Регистрирует неудачную попытку отправки событий.
     * 
     * Увеличивает счетчик последовательных неудач. Если достигнут порог ошибок,
     * автоматически отключает трекер через _disableTrackingDueToFailures.
     * 
     * @private
     * @param {Object} [context={}] - Контекст ошибки (reason, error и т.д.)
     * @returns {Promise<void>}
     */
    async _registerSendFailure(context = {}) {
        this.consecutiveFailures += 1;
        this.updateState({ consecutiveFailures: this.consecutiveFailures });

        this._log({ key: 'logs.eventQueue.sendFailure', params: { consecutiveFailures: this.consecutiveFailures, threshold: this.maxFailuresBeforeDisable } }, context);

        if (this.consecutiveFailures >= this.maxFailuresBeforeDisable && !this.failureThresholdReached) {
            this.failureThresholdReached = true;
            this.updateState({ failureThresholdReached: true });
            await this._disableTrackingDueToFailures(context);
        }
    }

    /**
     * Отключает трекер после превышения порога ошибок.
     * 
     * @private
     * @param {Object} context - Дополнительная информация для логирования
     * @returns {Promise<void>}
     */
    async _disableTrackingDueToFailures(context = {}) {
        if (!this.trackingController) {
            this._log({ key: 'logs.eventQueue.trackerCannotBeDisabled' }, context);
            return;
        }

        if (this.disableInProgress) {
            this._log({ key: 'logs.eventQueue.disableInProgress' });
            return;
        }

        this.disableInProgress = true;

        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }

        this.stopBatchProcessor();

        try {
            this._log({ key: 'logs.eventQueue.disablingTracker', params: { consecutiveFailures: this.consecutiveFailures } }, context);
            await this.trackingController.disableTracking();
            await this.storageManager.saveEventQueue(this.queue);
        } catch (error) {
            this._logError({ key: 'logs.eventQueue.disableError' }, error);
        } finally {
            this.disableInProgress = false;
        }
    }

    /**
     * Восстанавливает очередь из хранилища.
     * 
     * Загружает сохраненную очередь событий из chrome.storage и восстанавливает
     * внутреннее состояние менеджера. Используется при инициализации трекера.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async restoreQueue() {
        await this._executeWithTimingAsync('restoreQueue', async () => {
            this.queue = await this.storageManager.restoreEventQueue();
            this.updateState({ queueSize: this.queue.length });
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this._log({ key: 'logs.eventQueue.queueRestored', params: { queueSize: this.queue.length } });
        });
    }

    /**
     * Сохраняет текущую очередь в хранилище.
     * 
     * Сохраняет текущее состояние очереди событий в chrome.storage для восстановления
     * после перезапуска расширения. Вызывается периодически и при критических операциях.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async saveQueue() {
        await this._executeWithTimingAsync('saveQueue', async () => {
            await this.storageManager.saveEventQueue(this.queue);
            this._log({ key: 'logs.eventQueue.queueSaved', params: { queueSize: this.queue.length } });
        });
    }

    /**
     * Устанавливает статус онлайн/офлайн.
     * При восстановлении подключения автоматически запускает обработку очереди.
     * 
     * @param {boolean} isOnline - Статус подключения (true - онлайн, false - офлайн)
     * @returns {void}
     */
    setOnlineStatus(isOnline) {
        const wasOnline = this.isOnline;
        this.isOnline = isOnline;
        this.updateState({ isOnline });
        
        this._log({ key: 'logs.eventQueue.connectionStatusChanged', params: { isOnline } });

        if (!wasOnline && isOnline && this.queue.length > 0) {
            this._log({ key: 'logs.eventQueue.connectionRestored' });
            this.processQueue();
        }
    }

    /**
     * Получает текущий размер очереди.
     * 
     * @returns {number} Текущее количество событий в очереди
     */
    getQueueSize() {
        return this.queue.length;
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * Останавливает batch processor, очищает таймеры, очередь событий,
     * метрики производительности, исключения доменов и сбрасывает все счетчики.
     * 
     * @returns {void}
     */
    destroy() {
        this.stopBatchProcessor();
        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }
        this.queue = [];
        this.performanceMetrics.clear();
        this.domainExceptions.clear();
        this.trackingController = null;
        this.consecutiveFailures = 0;
        this.failureThresholdReached = false;
        super.destroy();
        this._log({ key: 'logs.eventQueue.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventQueueManager;
    module.exports.default = EventQueueManager;
}

if (typeof window !== 'undefined') {
    window.EventQueueManager = EventQueueManager;
}
