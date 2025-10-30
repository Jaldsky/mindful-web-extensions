/**
 * Очередь статусных сообщений с последовательной обработкой.
 */
class StatusQueue {
    constructor({ enableQueue = false, maxQueueSize = 5, log = () => {}, logError = () => {} } = {}) {
        this.enableQueue = enableQueue === true;
        this.maxQueueSize = maxQueueSize;
        this.items = [];
        this.isProcessing = false;
        this._log = log;
        this._logError = logError;
    }

    enqueue(message, type, duration) {
        if (!this.enableQueue) return false;
        try {
            if (this.items.length >= this.maxQueueSize) {
                this._log('Очередь переполнена, пропуск сообщения');
                return false;
            }
            this.items.push({ message, type, duration, timestamp: Date.now() });
            this._log('Сообщение добавлено в очередь', { queueLength: this.items.length });
            return true;
        } catch (error) {
            this._logError('Ошибка добавления в очередь', error);
            return false;
        }
    }

    async process(processItemFn) {
        try {
            const items = this.items;
            if (this.isProcessing || !Array.isArray(items) || items.length === 0) return;
        } catch (_e) {
            return;
        }
        this.isProcessing = true;
        let startSize = 0;
        try { const items = this.items; startSize = Array.isArray(items) ? items.length : 0; } catch (_e) { startSize = 0; }
        let processed = 0;
        let failed = 0;
        try {
            while (true) {
                let hasItems = false;
                try { const items = this.items; hasItems = Array.isArray(items) && items.length > 0; } catch (_e) { hasItems = false; }
                if (!hasItems) break;
                let item;
                try { item = this.items.shift(); } catch (_e) { break; }
                if (!item) continue;
                const ok = await processItemFn(item);
                if (ok) processed++; else failed++;
                if (item.duration > 0) {
                    await new Promise(resolve => setTimeout(resolve, item.duration));
                }
            }
            this._log('Обработка очереди завершена', { startSize, processed, failed });
        } catch (error) {
            this._logError('Критическая ошибка обработки очереди', error);
        } finally {
            this.isProcessing = false;
        }
    }

    clear() {
        try {
            const count = this.items.length;
            this.items = [];
            this._log(`Очередь очищена: ${count} сообщений`);
            return count;
        } catch (error) {
            this._logError('Ошибка очистки очереди', error);
            return 0;
        }
    }

    size() {
        try {
            const items = this.items;
            return Array.isArray(items) ? items.length : 0;
        } catch (_e) {
            return 0;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusQueue;
    module.exports.default = StatusQueue;
}
