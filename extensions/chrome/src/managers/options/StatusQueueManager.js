/**
 * @typedef {Object} StatusQueueItem
 * @property {string} message - Текст сообщения
 * @property {string} type - Тип статуса
 * @property {number} duration - Длительность отображения
 * @property {number} timestamp - Временная метка создания
 */

/**
 * @callback ProcessItemCallback
 * @param {StatusQueueItem} item - Элемент очереди для обработки
 * @returns {Promise<boolean>} true если элемент обработан успешно, false в противном случае
 */

/**
 * Менеджер для управления очередью статусных сообщений.
 * Отвечает за добавление, обработку и очистку очереди статусных уведомлений.
 * 
 * @class StatusQueueManager
 */
class StatusQueueManager {
    /**
     * Создает экземпляр StatusQueueManager.
     * 
     * @param {Object} options - Опции конфигурации
     * @param {boolean} [options.enableQueue=false] - Включить очередь
     * @param {number} [options.maxQueueSize=5] - Максимальный размер очереди
     * @param {Function} [options.log] - Функция логирования
     * @param {Function} [options.logError] - Функция логирования ошибок
     * @param {Function} [options.onUpdate] - Callback при обновлении очереди
     * @param {Function} [options.t] - Функция локализации
     */
    constructor({ enableQueue = false, maxQueueSize = 5, log = () => {}, logError = () => {}, onUpdate = null, t = (key, params) => key } = {}) {
        /** @type {boolean} */
        this.enableQueue = enableQueue === true;
        
        /** @type {number} */
        this.maxQueueSize = maxQueueSize;
        
        /** @type {StatusQueueItem[]} */
        this.items = [];
        
        /** @type {boolean} */
        this.isProcessing = false;
        
        /** @type {Function} */
        this._log = log;
        
        /** @type {Function} */
        this._logError = logError;
        
        /** @type {Function|null} */
        this.onUpdate = onUpdate;
        
        /** @type {Function} */
        this.t = t;
    }

    /**
     * Добавляет сообщение в очередь.
     * 
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип статуса
     * @param {number} duration - Длительность отображения
     * @returns {boolean} true если добавлено в очередь
     */
    enqueue(message, type, duration) {
        if (!this.enableQueue) return false;
        try {
            if (this.items.length >= this.maxQueueSize) {
                this._log({ key: 'logs.status.queueFull' });
                return false;
            }
            this.items.push({ message, type, duration, timestamp: Date.now() });
            this._log({ key: 'logs.status.queueEntryAdded' }, { queueLength: this.items.length });
            if (this.onUpdate) {
                this.onUpdate(this.size());
            }
            return true;
        } catch (error) {
            this._logError({ key: 'logs.status.addQueueError' }, error);
            return false;
        }
    }

    /**
     * Обрабатывает очередь сообщений.
     * 
     * @param {ProcessItemCallback} processItemFn - Функция обработки элемента очереди
     * @returns {Promise<void>} Promise, который разрешается после обработки всех элементов очереди
     */
    async process(processItemFn) {
        try {
            if (this.isProcessing || this.items.length === 0) return;
        } catch (_e) {
            return;
        }
        this.isProcessing = true;
        let startSize = 0;
        try {
            startSize = this.items.length;
        } catch (_e) {
            startSize = 0;
        }
        let processed = 0;
        let failed = 0;
        try {
            while (true) {
                let hasItems = false;
                try {
                    hasItems = this.items.length > 0;
                } catch (_e) {
                    hasItems = false;
                }
                if (!hasItems) break;
                let item;
                try {
                    item = this.items.shift();
                } catch (_e) {
                    break;
                }
                if (!item) continue;
                const ok = await processItemFn(item);
                if (ok) processed++; else failed++;
                if (this.onUpdate) {
                    this.onUpdate(this.size());
                }
                if (item.duration > 0) {
                    await new Promise(resolve => setTimeout(resolve, item.duration));
                }
            }
            this._log({ key: 'logs.status.queueProcessCompleted' }, { startSize, processed, failed });
        } catch (error) {
            this._logError({ key: 'logs.status.queueProcessError' }, error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Очищает очередь.
     * 
     * @returns {number} Количество удаленных сообщений
     */
    clear() {
        try {
            const count = this.items.length;
            this.items = [];
            this._log({ key: 'logs.status.queueCleared', params: { count } });
            if (this.onUpdate) {
                this.onUpdate(0);
            }
            return count;
        } catch (error) {
            this._logError({ key: 'logs.status.clearQueueError' }, error);
            return 0;
        }
    }

    /**
     * Получает размер очереди.
     * 
     * @returns {number} Размер очереди
     */
    size() {
        try {
            return this.items.length;
        } catch (_e) {
            return 0;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusQueueManager;
    module.exports.default = StatusQueueManager;
}

if (typeof window !== 'undefined') {
    window.StatusQueueManager = StatusQueueManager;
}
