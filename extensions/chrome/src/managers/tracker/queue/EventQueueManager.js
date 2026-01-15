const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');
const DomainExceptionsManager = require('./DomainExceptionsManager.js');
const FailureManager = require('./FailureManager.js');
const BatchProcessor = require('./BatchProcessor.js');

/**
 * @typedef {Object} Event
 * @property {string} event - Тип события ('active' или 'inactive')
 * @property {string} domain - Домен
 * @property {string} timestamp - Временная метка ISO 8601
 */

/**
 * Менеджер для управления очередью событий.
 * Отвечает за добавление, пакетную обработку и отправку событий.
 * Использует композицию для разделения ответственности между менеджерами.
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
         * ID таймера для повторной попытки отправки
         * @type {number|null}
         */
        this.retryTimeoutId = null;

        /** 
         * ID таймера для проверки healthcheck при достижении порога ошибок
         * @type {number|null}
         */
        this.healthcheckIntervalId = null;

        /** 
         * Менеджер исключений доменов
         * @type {DomainExceptionsManager}
         */
        this.domainExceptionsManager = new DomainExceptionsManager({ enableLogging: this.enableLogging });

        /** 
         * Менеджер ошибок и retry логики
         * @type {FailureManager}
         */
        this.failureManager = new FailureManager(
            { trackingController: dependencies.trackingController || null },
            { enableLogging: this.enableLogging, maxFailuresBeforeDisable: options.maxFailuresBeforeDisable }
        );

        /** 
         * Процессор батчей для периодической обработки
         * @type {BatchProcessor}
         */
        this.batchProcessor = new BatchProcessor(
            {
                processQueueFn: () => this.processQueue(),
                getQueueSizeFn: () => this.queue.length
            },
            { enableLogging: this.enableLogging, batchTimeout: this.batchTimeout }
        );
        
        this.updateState({
            queueSize: 0,
            batchSize: this.batchSize,
            maxQueueSize: this.maxQueueSize,
            isOnline: this.isOnline,
            consecutiveFailures: this.failureManager.getConsecutiveFailures(),
            failureThresholdReached: this.failureManager.isThresholdReached()
        });
        
        this._log({ key: 'logs.eventQueue.created' }, { 
            batchSize: this.batchSize,
            batchTimeout: this.batchTimeout,
            maxQueueSize: this.maxQueueSize
        });
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
        this.domainExceptionsManager.setDomainExceptions(domains);
        this.updateState({ domainExceptionsCount: this.domainExceptionsManager.domainExceptions.size });

        let removedFromQueue = 0;

        if (this.queue.length > 0) {
            const { filteredEvents, skippedCount } = this.domainExceptionsManager.filterEvents(this.queue);
            removedFromQueue = skippedCount;
            if (removedFromQueue > 0) {
                this.queue = filteredEvents;
                this.updateState({ queueSize: this.queue.length });
                this.statisticsManager.updateQueueSize(this.queue.length);
                try {
                    await this.storageManager.saveEventQueue(this.queue);
                } catch (error) {
                    this._logError({ key: 'logs.eventQueue.domainExceptionsSaveError' }, error);
                }
            }
        }

        return {
            count: this.domainExceptionsManager.domainExceptions.size,
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

            if (this.domainExceptionsManager.isDomainExcluded(domain)) {
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
        this.batchProcessor.start();
    }

    /**
     * Останавливает периодическую обработку батчей.
     * 
     * @returns {void}
     */
    stopBatchProcessor() {
        this.batchProcessor.stop();
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
                return;
            }

            if (!this.isOnline) {
                this._log({ key: 'logs.eventQueue.noConnection' });
                await this.failureManager.registerSendFailure({ 
                    reason: 'offline',
                    saveQueueFn: () => this.storageManager.saveEventQueue(this.queue)
                });
                return;
            }

            if (this.failureManager.isThresholdReached()) {
                await this._checkHealthAndResumeIfAvailable();
                return;
            }

            const eventsToSend = this.queue.splice(0, this.batchSize);
            this.updateState({ queueSize: this.queue.length });
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this._log({ key: 'logs.eventQueue.batchProcessing', params: { eventsCount: eventsToSend.length, remainingInQueue: this.queue.length } });

            const { filteredEvents, skippedCount: skippedDueToExclusions } = this.domainExceptionsManager.filterEvents(eventsToSend);

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
                    await this.storageManager.saveEventQueue(this.queue);
                    this.failureManager.resetFailureCounters();
                    this.updateState({
                        consecutiveFailures: this.failureManager.getConsecutiveFailures(),
                        failureThresholdReached: this.failureManager.isThresholdReached()
                    });
                } else {
                    const t = this._getTranslateFn();
                    const errorMessage = result.error || t('logs.backend.unknownError');
                    const error = new Error(errorMessage);
                    if (result.status !== undefined) error.status = result.status;
                    if (result.method !== undefined) error.method = result.method;
                    if (result.code !== undefined) error.code = result.code;
                    if (result.name !== undefined) error.name = result.name;
                    if (result.url !== undefined) error.url = result.url;
                    if (result.errorText !== undefined) error.errorText = result.errorText;
                    
                    this._logError({ key: 'logs.eventQueue.batchProcessingError' }, error);

                    this.queue.unshift(...filteredEvents);
                    this.updateState({ queueSize: this.queue.length });
                    this.statisticsManager.updateQueueSize(this.queue.length);
                    
                    this._log({ key: 'logs.eventQueue.eventsReturnedToQueue', params: { queueSize: this.queue.length } });

                    const thresholdReached = await this.failureManager.registerSendFailure({
                        reason: 'sendError',
                        error: errorMessage,
                        status: result.status,
                        method: result.method,
                        code: result.code,
                        name: result.name,
                        url: result.url,
                        errorText: result.errorText,
                        saveQueueFn: () => this.storageManager.saveEventQueue(this.queue)
                    });
                    this.updateState({
                        consecutiveFailures: this.failureManager.getConsecutiveFailures(),
                        failureThresholdReached: this.failureManager.isThresholdReached()
                    });

                    if (!thresholdReached) {
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
                        await this._checkHealthAndResumeIfAvailable();
                    }
                }
            } catch (error) {
                this._logError({ key: 'logs.eventQueue.batchProcessingError' }, error);

                this.queue.unshift(...filteredEvents);
                this.updateState({ queueSize: this.queue.length });
                this.statisticsManager.updateQueueSize(this.queue.length);
                
                this._log({ key: 'logs.eventQueue.eventsReturnedToQueue', params: { queueSize: this.queue.length } });

                const thresholdReached = await this.failureManager.registerSendFailure({
                    reason: 'sendError',
                    error: error instanceof Error ? error.message : String(error),
                    saveQueueFn: () => this.storageManager.saveEventQueue(this.queue)
                });
                this.updateState({
                    consecutiveFailures: this.failureManager.getConsecutiveFailures(),
                    failureThresholdReached: this.failureManager.isThresholdReached()
                });

                if (!thresholdReached) {
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
                    await this._checkHealthAndResumeIfAvailable();
                }
            }
        });
    }

    /**
     * Проверяет доступность сервера через healthcheck и возобновляет отправку при успехе.
     * 
     * Используется когда достигнут порог ошибок. Периодически проверяет healthcheck
     * и возобновляет отправку событий, когда сервер снова становится доступным.
     * 
     * @private
     * @async
     * @returns {Promise<void>}
     */
    async _checkHealthAndResumeIfAvailable() {
        try {
            const healthResult = await this.backendManager.checkHealth(false);
            
            if (healthResult.success) {

                this.failureManager.resetFailureCounters();
                this.updateState({
                    consecutiveFailures: this.failureManager.getConsecutiveFailures(),
                    failureThresholdReached: this.failureManager.isThresholdReached()
                });

                if (this.healthcheckIntervalId) {
                    clearInterval(this.healthcheckIntervalId);
                    this.healthcheckIntervalId = null;
                }

                if (this.queue.length > 0) {
                    this._log({ key: 'logs.eventQueue.connectionRestored' });
                    await this.processQueue();
                }
            } else {

                if (!this.healthcheckIntervalId) {
                    const healthcheckInterval = CONFIG.BASE.UPDATE_INTERVAL;
                    this.healthcheckIntervalId = setInterval(async () => {
                        await this._checkHealthAndResumeIfAvailable();
                    }, healthcheckInterval);
                }
            }
        } catch (error) {
            this._logError({ key: 'logs.eventQueue.batchProcessingError' }, error);

            if (!this.healthcheckIntervalId) {
                const healthcheckInterval = CONFIG.BASE.UPDATE_INTERVAL;
                this.healthcheckIntervalId = setInterval(async () => {
                    await this._checkHealthAndResumeIfAvailable();
                }, healthcheckInterval);
            }
        }
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
        this.failureManager.resetFailureCounters();
        this.updateState({
            consecutiveFailures: this.failureManager.getConsecutiveFailures(),
            failureThresholdReached: this.failureManager.isThresholdReached()
        });

        if (this.healthcheckIntervalId) {
            clearInterval(this.healthcheckIntervalId);
            this.healthcheckIntervalId = null;
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
     * Останавливает batch processor, очищает таймеры, очередь событий
     * и уничтожает все вложенные менеджеры.
     * 
     * @returns {void}
     */
    destroy() {
        this.stopBatchProcessor();
        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }
        
        if (this.healthcheckIntervalId) {
            clearInterval(this.healthcheckIntervalId);
            this.healthcheckIntervalId = null;
        }
        
        this.queue = [];
        
        if (this.domainExceptionsManager) {
            this.domainExceptionsManager.destroy();
        }
        if (this.failureManager) {
            this.failureManager.destroy();
        }
        if (this.batchProcessor) {
            this.batchProcessor.destroy();
        }
        
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
