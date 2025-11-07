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

        // Проверка зависимостей
        if (!dependencies || !dependencies.backendManager || !dependencies.statisticsManager || !dependencies.storageManager) {
            throw new Error('EventQueueManager требует backendManager, statisticsManager и storageManager');
        }

        /** @type {Object} */
        this.backendManager = dependencies.backendManager;
        
        /** @type {Object} */
        this.statisticsManager = dependencies.statisticsManager;
        
        /** @type {Object} */
        this.storageManager = dependencies.storageManager;
        
        /** @type {Object|null} */
        this.trackingController = dependencies.trackingController || null;

        /** @type {Array<Event>} */
        this.queue = [];
        
        /** @type {number} */
        this.batchSize = options.batchSize || EventQueueManager.DEFAULT_BATCH_SIZE;
        
        /** @type {number} */
        this.batchTimeout = options.batchTimeout || EventQueueManager.DEFAULT_BATCH_TIMEOUT;
        
        /** @type {number} */
        this.retryDelay = options.retryDelay || EventQueueManager.DEFAULT_RETRY_DELAY;
        
        /** @type {number} */
        this.maxQueueSize = options.maxQueueSize || EventQueueManager.DEFAULT_MAX_QUEUE_SIZE;
        
        /** @type {boolean} */
        this.isOnline = true;
        
        /** @type {number|null} */
        this.batchInterval = null;

        /** @type {number|null} */
        this.retryTimeoutId = null;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();

        /** @type {Set<string>} */
        this.domainExceptions = new Set();

        /** @type {number} */
        this.consecutiveFailures = 0;

        /** @type {boolean} */
        this.failureThresholdReached = false;

        /** @type {boolean} */
        this.disableInProgress = false;

        /** @type {number} */
        this.maxFailuresBeforeDisable = options.maxFailuresBeforeDisable || EventQueueManager.DEFAULT_MAX_FAILURES_BEFORE_DISABLE;
        
        this.updateState({
            queueSize: 0,
            batchSize: this.batchSize,
            maxQueueSize: this.maxQueueSize,
            isOnline: this.isOnline,
            consecutiveFailures: this.consecutiveFailures,
            failureThresholdReached: this.failureThresholdReached
        });
        
        this._log('EventQueueManager инициализирован', { 
            batchSize: this.batchSize,
            batchTimeout: this.batchTimeout,
            maxQueueSize: this.maxQueueSize
        });
    }

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
                    this._logError('Ошибка сохранения очереди после применения исключений доменов', error);
                }
            }
        }

        this._log('Исключения доменов обновлены', {
            count: this.domainExceptions.size,
            removedFromQueue
        });

        return {
            count: this.domainExceptions.size,
            removedFromQueue
        };
    }

    getDomainExceptions() {
        return Array.from(this.domainExceptions);
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
                this._log('Событие пропущено из-за исключения домена', {
                    domain,
                    eventType
                });
                return;
            }

            if (this.queue.length >= this.maxQueueSize) {
                this._logError('КРИТИЧЕСКАЯ ОШИБКА: Очередь достигла максимального размера! Удаляем старые события.', {
                    queueSize: this.queue.length,
                    maxQueueSize: this.maxQueueSize
                });
                // Удаляем 10% самых старых событий
                const removeCount = Math.floor(this.maxQueueSize * 0.1);
                this.queue.splice(0, removeCount);
            }

            this.queue.push(event);
            this.statisticsManager.addEvent(eventType, domain);
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this.updateState({ queueSize: this.queue.length });
            
            this._log('Событие добавлено в очередь', { 
                event,
                queueSize: this.queue.length 
            });

            // Защита от переполнения: если очередь превысила BATCH_SIZE, отправляем немедленно
            // Это аварийная мера, в нормальных условиях события отправляются по таймеру
            if (this.queue.length >= this.batchSize) {
                this._log('ВНИМАНИЕ: Размер очереди превысил BATCH_SIZE, аварийная отправка', { 
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
            this._log('Batch processor уже запущен');
            return;
        }

        this.batchInterval = setInterval(() => {
            if (this.queue.length > 0) {
                this._log('Периодическая обработка батча (основной механизм)', { 
                    queueSize: this.queue.length,
                    interval: `${this.batchTimeout / 1000}s`
                });
                this.processQueue();
            }
        }, this.batchTimeout);

        this._log('Batch processor запущен', { 
            interval: this.batchTimeout,
            intervalSeconds: `${this.batchTimeout / 1000}s`
        });
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
            this._log('Batch processor остановлен');
        }
    }

    /**
     * Обрабатывает очередь событий.
     * Отправляет батч событий на backend.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async processQueue() {
        await this._executeWithTimingAsync('processQueue', async () => {
            if (this.queue.length === 0) {
                this._log('Очередь пуста, нечего обрабатывать');
                return;
            }

            if (!this.isOnline) {
                this._log('Нет подключения, обработка отложена');
                await this._registerSendFailure({ reason: 'offline' });
                return;
            }

            const eventsToSend = this.queue.splice(0, this.batchSize);
            this.updateState({ queueSize: this.queue.length });
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this._log('Обработка батча событий', { 
                eventsCount: eventsToSend.length,
                remainingInQueue: this.queue.length 
            });

            const filteredEvents = eventsToSend.filter(event => !this._isDomainExcluded(event.domain));
            const skippedDueToExclusions = eventsToSend.length - filteredEvents.length;

            if (skippedDueToExclusions > 0) {
                this._log('События исключены из-за списка доменов', {
                    skippedDueToExclusions,
                    remainingToSend: filteredEvents.length
                });
            }

            if (filteredEvents.length === 0) {
                this._log('После применения исключений доменов событий для отправки не осталось');
                // сохраняем очередь, чтобы исключенные события не вернулись
                await this.storageManager.saveEventQueue(this.queue);
                return;
            }

            try {
                const result = await this.backendManager.sendEvents(filteredEvents);
                
                if (result.success) {
                    this._log('Батч успешно отправлен', { eventsCount: filteredEvents.length, skippedDueToExclusions });
                    // Сохраняем обновленную очередь
                    await this.storageManager.saveEventQueue(this.queue);
                    this._resetFailureCounters();
                } else {
                    throw new Error(result.error || 'Неизвестная ошибка отправки');
                }
            } catch (error) {
                this._logError('Ошибка обработки батча', error);
                
                // Возвращаем события в очередь для повторной попытки
                this.queue.unshift(...filteredEvents);
                this.updateState({ queueSize: this.queue.length });
                this.statisticsManager.updateQueueSize(this.queue.length);
                
                this._log('События возвращены в очередь', { queueSize: this.queue.length });
                
                // Планируем повторную попытку, если не достигнут лимит неудач
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
                        this._log('Повторная попытка обработки очереди');
                        this.processQueue();
                    }, this.retryDelay);
                } else {
                    this._log('Повторная попытка не запланирована: трекер отключен из-за повторных ошибок');
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
     * @returns {void}
     */
    resetFailureState() {
        this._resetFailureCounters();
    }

    /**
     * Регистрирует неудачную попытку отправки событий.
     * 
     * @private
     * @param {Object} context - Контекст ошибки
     * @returns {Promise<void>}
     */
    async _registerSendFailure(context = {}) {
        this.consecutiveFailures += 1;
        this.updateState({ consecutiveFailures: this.consecutiveFailures });

        this._log('Неудачная попытка отправки событий', {
            consecutiveFailures: this.consecutiveFailures,
            threshold: this.maxFailuresBeforeDisable,
            ...context
        });

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
            this._log('Трекер не может быть отключен автоматически: отсутствует trackingController', context);
            return;
        }

        if (this.disableInProgress) {
            this._log('Отключение трекера уже выполняется, пропуск повторного вызова');
            return;
        }

        this.disableInProgress = true;

        if (this.retryTimeoutId) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }

        this.stopBatchProcessor();

        try {
            this._log('Отключение трекера из-за повторных ошибок отправки', {
                consecutiveFailures: this.consecutiveFailures,
                ...context
            });
            await this.trackingController.disableTracking();
            await this.storageManager.saveEventQueue(this.queue);
        } catch (error) {
            this._logError('Ошибка при автоматическом отключении трекера', error);
        } finally {
            this.disableInProgress = false;
        }
    }

    /**
     * Восстанавливает очередь из хранилища.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async restoreQueue() {
        await this._executeWithTimingAsync('restoreQueue', async () => {
            const restoredQueue = await this.storageManager.restoreEventQueue();
            this.queue = restoredQueue;
            this.updateState({ queueSize: this.queue.length });
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this._log('Очередь восстановлена', { queueSize: this.queue.length });
        });
    }

    /**
     * Сохраняет текущую очередь в хранилище.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async saveQueue() {
        await this._executeWithTimingAsync('saveQueue', async () => {
            await this.storageManager.saveEventQueue(this.queue);
            this._log('Очередь сохранена', { queueSize: this.queue.length });
        });
    }

    /**
     * Устанавливает статус онлайн.
     * 
     * @param {boolean} isOnline - Статус подключения
     * @returns {void}
     */
    setOnlineStatus(isOnline) {
        const wasOnline = this.isOnline;
        this.isOnline = isOnline;
        this.updateState({ isOnline });
        
        this._log('Статус подключения изменен', { isOnline });
        
        // Если статус изменился с офлайн на онлайн, обрабатываем очередь
        if (!wasOnline && isOnline && this.queue.length > 0) {
            this._log('Подключение восстановлено, запуск обработки очереди');
            this.processQueue();
        }
    }

    /**
     * Получает текущий размер очереди.
     * 
     * @returns {number} Размер очереди
     */
    getQueueSize() {
        return this.queue.length;
    }

    /**
     * Получает копию текущей очереди.
     * 
     * @returns {Array<Event>} Копия очереди
     */
    getQueue() {
        return [...this.queue];
    }

    /**
     * Очищает очередь.
     * 
     * @returns {void}
     */
    clearQueue() {
        this.queue = [];
        this.updateState({ queueSize: 0 });
        this.statisticsManager.updateQueueSize(0);
        this._log('Очередь очищена');
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
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
        this._log('EventQueueManager уничтожен');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventQueueManager;
    module.exports.default = EventQueueManager;
}

if (typeof window !== 'undefined') {
    window.EventQueueManager = EventQueueManager;
}
