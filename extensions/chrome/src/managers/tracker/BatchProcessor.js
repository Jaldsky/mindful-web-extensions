const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');

/**
 * Менеджер для периодической обработки батчей событий.
 * Отвечает за запуск и остановку периодической обработки очереди событий.
 * 
 * @class BatchProcessor
 * @extends BaseManager
 */
class BatchProcessor extends BaseManager {
    /**
     * Таймаут батча по умолчанию (30 секунд)
     * @readonly
     * @static
     */
    static DEFAULT_BATCH_TIMEOUT = CONFIG.TRACKER.BATCH_TIMEOUT;

    /**
     * Создает экземпляр BatchProcessor.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Function} dependencies.processQueueFn - Функция для обработки очереди
     * @param {Function} dependencies.getQueueSizeFn - Функция для получения размера очереди
     * @param {Object} [options={}] - Опции конфигурации
     * @param {number} [options.batchTimeout] - Таймаут батча (мс)
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || typeof dependencies.processQueueFn !== 'function') {
            const t = this._getTranslateFn();
            throw new Error(t('logs.batchProcessor.dependenciesRequired') || 'BatchProcessor requires processQueueFn function');
        }

        /** 
         * Функция для обработки очереди
         * @type {Function}
         */
        this.processQueueFn = dependencies.processQueueFn;

        /** 
         * Функция для получения размера очереди
         * @type {Function}
         */
        this.getQueueSizeFn = dependencies.getQueueSizeFn || (() => 0);

        /** 
         * Таймаут батча в миллисекундах (интервал между отправками)
         * @type {number}
         */
        this.batchTimeout = options.batchTimeout || BatchProcessor.DEFAULT_BATCH_TIMEOUT;

        /** 
         * ID интервала для периодической обработки батчей
         * @type {number|null}
         */
        this.batchInterval = null;
        
        this.updateState({
            batchTimeout: this.batchTimeout,
            isRunning: false
        });
        
        this._log({ key: 'logs.batchProcessor.created', params: { batchTimeout: this.batchTimeout } });
    }

    /**
     * Запускает периодическую обработку батчей.
     * 
     * ОСНОВНОЙ МЕХАНИЗМ ОТПРАВКИ: События накапливаются в очереди и отправляются
     * на сервер строго раз в указанный интервал (batchTimeout), независимо от количества событий.
     * Это минимизирует нагрузку на сервер и оптимизирует сетевой трафик.
     * 
     * @returns {void}
     */
    start() {
        if (this.batchInterval) {
            this._log({ key: 'logs.batchProcessor.alreadyStarted' });
            return;
        }

        this.batchInterval = setInterval(() => {
            const queueSize = this.getQueueSizeFn();
            if (queueSize > 0) {
                this._log({ key: 'logs.batchProcessor.periodicProcessing', params: { queueSize, interval: `${this.batchTimeout / 1000}s` } });
                this.processQueueFn();
            }
        }, this.batchTimeout);

        this.updateState({ isRunning: true });
        this._log({ key: 'logs.batchProcessor.started', params: { interval: this.batchTimeout, intervalSeconds: `${this.batchTimeout / 1000}s` } });
    }

    /**
     * Останавливает периодическую обработку батчей.
     * 
     * @returns {void}
     */
    stop() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
            this.updateState({ isRunning: false });
            this._log({ key: 'logs.batchProcessor.stopped' });
        }
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.stop();
        this.processQueueFn = null;
        this.getQueueSizeFn = null;
        super.destroy();
        this._log({ key: 'logs.batchProcessor.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchProcessor;
    module.exports.default = BatchProcessor;
}

if (typeof window !== 'undefined') {
    window.BatchProcessor = BatchProcessor;
}
