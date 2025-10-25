const BaseManager = require('../BaseManager.js');
const CONFIG = require('../../config.js');

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
        
        /** @type {Array<Event>} */
        this.queue = [];
        
        /** @type {number} */
        this.batchSize = options.batchSize || EventQueueManager.DEFAULT_BATCH_SIZE;
        
        /** @type {number} */
        this.batchTimeout = options.batchTimeout || EventQueueManager.DEFAULT_BATCH_TIMEOUT;
        
        /** @type {number} */
        this.retryDelay = options.retryDelay || EventQueueManager.DEFAULT_RETRY_DELAY;
        
        /** @type {boolean} */
        this.isOnline = true;
        
        /** @type {number|null} */
        this.batchInterval = null;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this.updateState({
            queueSize: 0,
            batchSize: this.batchSize,
            isOnline: this.isOnline
        });
        
        this._log('EventQueueManager инициализирован', { 
            batchSize: this.batchSize,
            batchTimeout: this.batchTimeout 
        });
    }

    /**
     * Добавляет событие в очередь.
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

            this.queue.push(event);
            this.statisticsManager.addEvent(eventType, domain);
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this.updateState({ queueSize: this.queue.length });
            
            this._log('Событие добавлено в очередь', { 
                event,
                queueSize: this.queue.length 
            });

            // Если очередь достигла размера батча, отправляем сразу
            if (this.queue.length >= this.batchSize) {
                this._log('Размер батча достигнут, запуск обработки');
                this.processQueue();
            }
        });
    }

    /**
     * Запускает периодическую обработку батчей.
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
                this._log('Периодическая обработка батча', { queueSize: this.queue.length });
                this.processQueue();
            }
        }, this.batchTimeout);

        this._log('Batch processor запущен', { interval: this.batchTimeout });
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
                return;
            }

            const eventsToSend = this.queue.splice(0, this.batchSize);
            this.updateState({ queueSize: this.queue.length });
            this.statisticsManager.updateQueueSize(this.queue.length);
            
            this._log('Обработка батча событий', { 
                eventsCount: eventsToSend.length,
                remainingInQueue: this.queue.length 
            });

            try {
                const result = await this.backendManager.sendEvents(eventsToSend);
                
                if (result.success) {
                    this._log('Батч успешно отправлен', { eventsCount: eventsToSend.length });
                    // Сохраняем обновленную очередь
                    await this.storageManager.saveEventQueue(this.queue);
                } else {
                    throw new Error(result.error || 'Неизвестная ошибка отправки');
                }
            } catch (error) {
                this._logError('Ошибка обработки батча', error);
                
                // Возвращаем события в очередь для повторной попытки
                this.queue.unshift(...eventsToSend);
                this.updateState({ queueSize: this.queue.length });
                this.statisticsManager.updateQueueSize(this.queue.length);
                
                this._log('События возвращены в очередь', { queueSize: this.queue.length });
                
                // Планируем повторную попытку
                setTimeout(() => {
                    this._log('Повторная попытка обработки очереди');
                    this.processQueue();
                }, this.retryDelay);
            }
        });
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
        this.queue = [];
        this.performanceMetrics.clear();
        super.destroy();
        this._log('EventQueueManager уничтожен');
    }
}

module.exports = EventQueueManager;
