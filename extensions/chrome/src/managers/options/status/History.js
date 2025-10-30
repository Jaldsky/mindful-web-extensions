/**
 * Управляет историей статусных сообщений.
 */
class StatusHistory {
    constructor({ enableHistory = true, maxHistorySize = 50, log = () => {}, logError = () => {} } = {}) {
        this.enableHistory = enableHistory !== false;
        this.maxHistorySize = maxHistorySize;
        this.history = [];
        this._log = log;
        this._logError = logError;
    }

    add(type, message, duration) {
        if (!this.enableHistory) return;
        try {
            const entry = {
                type,
                message,
                timestamp: new Date().toISOString(),
                duration
            };
            this.history.push(entry);
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            }
            this._log('Добавлена запись в историю', { entriesCount: this.history.length });
        } catch (error) {
            this._logError('Ошибка добавления в историю', error);
        }
    }

    get(options = {}) {
        try {
            const history = this.history;
            let result = Array.isArray(history) ? [...history] : [];
            if (options.type) {
                result = result.filter(e => e.type === options.type);
            }
            if (options.limit && typeof options.limit === 'number' && options.limit > 0) {
                result = result.slice(-options.limit);
            }
            return result;
        } catch (error) {
            this._logError('Ошибка получения истории', error);
            return [];
        }
    }

    clear() {
        try {
            const count = this.history.length;
            this.history = [];
            this._log(`История очищена: ${count} записей`);
            return count;
        } catch (error) {
            this._logError('Ошибка очистки истории', error);
            return 0;
        }
    }

    size() {
        try {
            const history = this.history;
            return Array.isArray(history) ? history.length : 0;
        } catch (_e) {
            return 0;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusHistory;
    module.exports.default = StatusHistory;
}
