/**
 * @typedef {Object} StatusHistoryEntry
 * @property {string} type - Тип статуса
 * @property {string} message - Сообщение статуса
 * @property {string} timestamp - ISO строка времени
 * @property {number} duration - Время отображения в мс
 */

/**
 * Менеджер для управления историей статусных сообщений.
 * Отвечает за хранение, фильтрацию и очистку истории статусных уведомлений.
 * 
 * @class StatusHistoryManager
 */
class StatusHistoryManager {
    /**
     * Создает экземпляр StatusHistoryManager.
     * 
     * @param {Object} options - Опции конфигурации
     * @param {boolean} [options.enableHistory=true] - Включить ведение истории
     * @param {number} [options.maxHistorySize=50] - Максимальный размер истории
     * @param {Function} [options.log] - Функция логирования
     * @param {Function} [options.logError] - Функция логирования ошибок
     * @param {Function} [options.onUpdate] - Callback при обновлении истории
     * @param {Function} [options.t] - Функция локализации
     */
    constructor({ enableHistory = true, maxHistorySize = 50, log = () => {}, logError = () => {}, onUpdate = null, t = (key, params) => key } = {}) {
        /** @type {boolean} */
        this.enableHistory = enableHistory !== false;
        
        /** @type {number} */
        this.maxHistorySize = maxHistorySize;
        
        /** @type {StatusHistoryEntry[]} */
        this.history = [];
        
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
     * Добавляет запись в историю.
     * 
     * @param {string} type - Тип статуса
     * @param {string} message - Сообщение статуса
     * @param {number} duration - Время отображения
     * @returns {void}
     */
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
            this._log({ key: 'logs.status.historyEntryAdded' }, { entriesCount: this.history.length });
            if (this.onUpdate) {
                this.onUpdate(this.size());
            }
        } catch (error) {
            this._logError({ key: 'logs.status.addHistoryError' }, error);
        }
    }

    /**
     * Получает историю с фильтрацией.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @param {string} [options.type] - Фильтр по типу статуса
     * @param {number} [options.limit] - Ограничение количества записей
     * @returns {StatusHistoryEntry[]} Массив записей истории
     */
    get(options = {}) {
        try {
            let result = [...this.history];
            if (options.type) {
                result = result.filter(e => e.type === options.type);
            }
            if (options.limit && typeof options.limit === 'number' && options.limit > 0) {
                result = result.slice(-options.limit);
            }
            return result;
        } catch (error) {
            this._logError({ key: 'logs.status.getHistoryError' }, error);
            return [];
        }
    }

    /**
     * Очищает историю.
     * 
     * @returns {number} Количество удаленных записей
     */
    clear() {
        try {
            const count = this.history.length;
            this.history = [];
            this._log({ key: 'logs.status.historyCleared', params: { count } });
            if (this.onUpdate) {
                this.onUpdate(0);
            }
            return count;
        } catch (error) {
            this._logError({ key: 'logs.status.clearHistoryError' }, error);
            return 0;
        }
    }

    /**
     * Получает размер истории.
     * 
     * @returns {number} Размер истории
     */
    size() {
        try {
            return this.history.length;
        } catch (_e) {
            return 0;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusHistoryManager;
    module.exports.default = StatusHistoryManager;
}

if (typeof window !== 'undefined') {
    window.StatusHistoryManager = StatusHistoryManager;
}
