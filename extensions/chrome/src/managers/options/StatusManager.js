const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');
const StatusHistory = require('./status/History.js');
const StatusQueue = require('./status/Queue.js');
const StatusRenderer = require('./status/Renderer.js');

/**
 * @typedef {Object} StatusHistoryEntry
 * @property {string} type - Тип статуса
 * @property {string} message - Сообщение статуса
 * @property {string} timestamp - ISO строка времени
 * @property {number} duration - Время отображения в мс
 */

/**
 * @typedef {Object} StatusQueueItem
 * @property {string} message - Текст сообщения
 * @property {string} type - Тип статуса
 * @property {number} duration - Длительность отображения
 * @property {number} timestamp - Временная метка создания
 */

/**
 * Менеджер для отображения статусных сообщений на странице настроек.
 * Отвечает за создание, отображение и скрытие статусных уведомлений.
 * Поддерживает очередь сообщений, историю статусов и измерение производительности.
 * 
 * @class StatusManager
 * @extends BaseManager
 */
class StatusManager extends BaseManager {
    /**
     * Типы статусов
     * @readonly
     * @enum {string}
     */
    static STATUS_TYPES = CONFIG.STATUS_TYPES;

    /**
     * Длительность отображения статуса по умолчанию (мс)
     * @readonly
     */
    static DEFAULT_DISPLAY_DURATION = CONFIG.STATUS_SETTINGS.DEFAULT_DURATION;

    /**
     * Максимальный размер истории статусов
     * @readonly
     */
    static MAX_HISTORY_SIZE = CONFIG.STATUS_SETTINGS.MAX_HISTORY_SIZE;

    /**
     * Максимальный размер очереди
     * @readonly
     */
    static MAX_QUEUE_SIZE = CONFIG.STATUS_SETTINGS.MAX_QUEUE_SIZE;

    /**
     * Создает экземпляр StatusManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @param {HTMLElement|null} [options.statusElement=null] - Элемент для отображения статуса
     * @param {number} [options.defaultDuration] - Длительность отображения по умолчанию
     * @param {boolean} [options.enableHistory=true] - Включить ведение истории статусов
     * @param {boolean} [options.enableQueue=false] - Включить очередь сообщений
     * @param {number} [options.maxHistorySize] - Максимальный размер истории
     * @param {number} [options.maxQueueSize] - Максимальный размер очереди
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {StatusRenderer} */
        this.renderer = new StatusRenderer({
            element: options.statusElement || null,
            log: (m, d) => this._log(m, d),
            logError: (m, e) => this._logError(m, e)
        });
        
        /** @type {number} */
        this.defaultDuration = options.defaultDuration || StatusManager.DEFAULT_DISPLAY_DURATION;
        
        /** @type {StatusHistory} */
        this.historyManager = new StatusHistory({
            enableHistory: options.enableHistory !== false,
            maxHistorySize: options.maxHistorySize || StatusManager.MAX_HISTORY_SIZE,
            log: (m, d) => this._log(m, d),
            logError: (m, e) => this._logError(m, e)
        });

        /** @type {StatusQueue} */
        this.queueManager = new StatusQueue({
            enableQueue: options.enableQueue === true,
            maxQueueSize: options.maxQueueSize || StatusManager.MAX_QUEUE_SIZE,
            log: (m, d) => this._log(m, d),
            logError: (m, e) => this._logError(m, e)
        });
        
        /** @type {number|null} */
        this.lastDisplayTimestamp = null;
        
        this.updateState({
            currentType: null,
            currentMessage: null,
            isVisible: false,
            queueLength: 0,
            historyLength: 0
        });
        
        this._log('StatusManager инициализирован', {
            enableHistory: options.enableHistory !== false,
            enableQueue: options.enableQueue === true,
            defaultDuration: this.defaultDuration,
            hasStatusElement: !!this.renderer.statusElement
        });

    }

    /**
     * Валидирует элемент статуса.
     * 
     * @private
     * @throws {Error} Если statusElement некорректен
     * @returns {void}
     */
    _validateStatusElement() { this.renderer.validateElement(); }

    /**
     * Устанавливает элемент статуса с валидацией.
     * 
     * @param {HTMLElement} element - DOM элемент для статуса
     * @throws {TypeError} Если element не является HTMLElement
     * @returns {void}
     */
    setStatusElement(element) { this.renderer.setElement(element); }

    /**
     * Добавляет запись в историю статусов.
     * 
     * @private
     * @param {string} type - Тип статуса
     * @param {string} message - Сообщение статуса
     * @param {number} duration - Время отображения
     * @returns {void}
     */
    _addToHistory(type, message, duration) {
        this.historyManager.add(type, message, duration);
        try {
            this.updateState({ historyLength: this.historyManager.size() });
        } catch (error) {
            this._logError('Ошибка обновления длины истории', error);
        }
    }

    /**
     * Добавляет сообщение в очередь.
     * 
     * @private
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип статуса
     * @param {number} duration - Длительность отображения
     * @returns {boolean} true если добавлено в очередь
     */
    _addToQueue(message, type, duration) {
        const added = this.queueManager.enqueue(message, type, duration);
        this.updateState({ queueLength: this.queueManager.size() });
        if (added && !this.state.isVisible) {
            this._processQueue();
        }
        return added;
    }

    /**
     * Обрабатывает очередь сообщений с измерением производительности.
     * 
     * @private
     * @returns {Promise<void>}
     */
    async _processQueue() {
        if (this.queueManager.size() === 0) return;
        return this._executeWithTimingAsync('processQueue', async () => {
            await this.queueManager.process(async (item) => {
                const ok = await this._displayStatusInternal(item.message, item.type, item.duration);
                this.updateState({ queueLength: this.queueManager.size() });
                return ok;
            });
        });
    }

    /**
     * Внутренний метод отображения статуса с полной верификацией.
     * 
     * @private
     * @param {string} message - Текст сообщения
     * @param {string} type - Тип статуса
     * @param {number} duration - Длительность отображения
     * @returns {Promise<boolean>} true если отображено успешно
     */
    async _displayStatusInternal(message, type, duration) {
        return this._executeWithTimingAsync('displayStatus', async () => {
            const displayed = this.renderer.display(message, type);
            if (!displayed) return false;

            this.lastDisplayTimestamp = Date.now();

            this.updateState({
                currentType: type,
                currentMessage: message,
                isVisible: true
            });

            this._log('Статус отображен и верифицирован', {
                message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                type,
                duration: `${duration}мс`
            });

            // Добавляем в историю
            this._addToHistory(type, message, duration);

            if (duration > 0) {
                this.renderer.scheduleHide(duration, () => this.hideStatus());
            }

            return true;
        });
    }

    /**
     * Показывает статусное сообщение.
     * 
     * @param {string} message - Текст сообщения
     * @param {string} [type='info'] - Тип статуса (из STATUS_TYPES)
     * @param {number} [duration] - Длительность отображения в мс (0 = бесконечно)
     * @throws {TypeError} Если message не является строкой
     * @returns {boolean} true если сообщение отображено
     */
    showStatus(message, type = StatusManager.STATUS_TYPES.INFO, duration) {
        if (typeof message !== 'string' || message.trim() === '') {
            throw new TypeError('message должен быть непустой строкой');
        }

        if (!Object.values(StatusManager.STATUS_TYPES).includes(type)) {
            this._log(`Неверный тип "${type}", используется INFO`);
            type = StatusManager.STATUS_TYPES.INFO;
        }

        if (!this.renderer.statusElement) {
            this._logError('Элемент статуса не установлен');
            return false;
        }

        const displayDuration = duration !== undefined ? duration : this.defaultDuration;

        // Если включена очередь и статус уже отображается, добавляем в очередь
        if (this.queueManager.enableQueue && this.state.isVisible) {
            return this._addToQueue(message, type, displayDuration);
        }

        try {
            return this._displayStatusInternal(message, type, displayDuration);
        } catch (error) {
            this._logError('Ошибка отображения статуса', error);
            return false;
        }
    }

    /**
     * Скрывает статусное сообщение с верификацией.
     * 
     * @returns {boolean} true если сообщение скрыто
     */
    hideStatus() {
        const startTime = performance.now();
        try {
            const ok = this.renderer.hide();
            if (!ok) return false;
            this.updateState({ currentType: null, currentMessage: null, isVisible: false });
            const hideTime = Math.round(performance.now() - startTime);
            this.performanceMetrics.set('hideStatus_lastDuration', hideTime);
            this._log(`Статус скрыт и верифицирован (${hideTime}мс)`);
            return true;
        } catch (error) {
            const hideTime = Math.round(performance.now() - startTime);
            this._logError(`Ошибка скрытия статуса (${hideTime}мс)`, error);
            return false;
        }
    }

    /**
     * Показывает статус успеха.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {boolean} true если сообщение отображено
     */
    showSuccess(message, duration) {
        return this.showStatus(message, StatusManager.STATUS_TYPES.SUCCESS, duration);
    }

    /**
     * Показывает статус ошибки.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {boolean} true если сообщение отображено
     */
    showError(message, duration) {
        return this.showStatus(message, StatusManager.STATUS_TYPES.ERROR, duration);
    }

    /**
     * Показывает предупреждение.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {boolean} true если сообщение отображено
     */
    showWarning(message, duration) {
        return this.showStatus(message, StatusManager.STATUS_TYPES.WARNING, duration);
    }

    /**
     * Показывает информационное сообщение.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {boolean} true если сообщение отображено
     */
    showInfo(message, duration) {
        return this.showStatus(message, StatusManager.STATUS_TYPES.INFO, duration);
    }

    /**
     * Получает историю статусов.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @param {string} [options.type] - Фильтр по типу статуса
     * @param {number} [options.limit] - Ограничение количества записей
     * @returns {StatusHistoryEntry[]} Массив записей истории
     */
    getHistory(options = {}) {
        try {
            const opts = { ...options };
            if (opts.type && !Object.values(StatusManager.STATUS_TYPES).includes(opts.type)) {
                delete opts.type;
            }
            return this.historyManager.get(opts);
        } catch (_e) {
            return this.historyManager.get();
        }
    }

    /**
     * Очищает историю статусов.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearHistory() {
        try {
            const count = this.historyManager.clear();
            this.updateState({ historyLength: 0 });
            return count;
        } catch (error) {
            this._logError('Ошибка очистки истории', error);
            return 0;
        }
    }

    /**
     * Очищает очередь сообщений.
     * 
     * @private
     * @returns {number} Количество удаленных сообщений
     */
    _clearQueue() {
        const count = this.queueManager.clear();
        this.updateState({ queueLength: 0 });
        return count;
    }

    /**
     * Получает статистику работы менеджера.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        try {
            // Валидация внутренних структур перед расчетом
            if (!Array.isArray(this.historyManager.history)) {
                throw new Error('invalid history');
            }
            let queueItemsIsArray = false;
            try {
                queueItemsIsArray = Array.isArray(this.queueManager.items);
            } catch (_e) {
                queueItemsIsArray = false;
            }
            if (!queueItemsIsArray) {
                throw new Error('invalid queue');
            }

            const historyByType = {};
            Object.values(StatusManager.STATUS_TYPES).forEach(type => {
                historyByType[type] = this.historyManager.get({ type }).length;
            });

            return {
                totalHistoryEntries: this.historyManager.size(),
                historyByType,
                queueLength: this.queueManager.size(),
                isVisible: this.state.isVisible,
                currentType: this.state.currentType,
                lastDisplayTimestamp: this.lastDisplayTimestamp,
                performanceMetrics: this.getPerformanceMetrics(),
                isProcessingQueue: this.queueManager.isProcessing
            };
        } catch (error) {
            this._logError('Ошибка получения статистики', error);
            return {};
        }
    }

    /**
     * Проверяет валидность состояния менеджера.
     * 
     * @returns {Object} Результат проверки
     */
    validateState() {
        const issues = [];

        try {
            const HTMLElementCtor = (typeof HTMLElement !== 'undefined') ? HTMLElement : (typeof window !== 'undefined' ? window.HTMLElement : null);
            if (this.renderer.statusElement && HTMLElementCtor && !(this.renderer.statusElement instanceof HTMLElementCtor)) {
                issues.push('statusElement не является HTMLElement');
            }

            if (this.defaultDuration < 0) {
                issues.push('defaultDuration не может быть отрицательным');
            }

            if (this.historyManager.size() > (this.historyManager.maxHistorySize)) {
                issues.push(`История превышает максимальный размер: ${this.historyManager.size()}/${this.historyManager.maxHistorySize}`);
            }

            if (this.queueManager.size() > (this.queueManager.maxQueueSize)) {
                issues.push(`Очередь превышает максимальный размер: ${this.queueManager.size()}/${this.queueManager.maxQueueSize}`);
            }

            if (!Array.isArray(this.historyManager.history)) {
                issues.push('История имеет некорректный формат');
            }
            try {
                const items = this.queueManager.items;
                if (!Array.isArray(items)) {
                    issues.push('Очередь имеет некорректный формат');
                }
            } catch (_e) {
                issues.push('Очередь имеет некорректный формат');
            }

            if (this.state.isVisible && !this.state.currentType) {
                issues.push('Статус видим, но тип не установлен');
            }

            if (this.state.isVisible && !this.state.currentMessage) {
                issues.push('Статус видим, но сообщение не установлено');
            }

            const isValid = issues.length === 0;

            return {
                isValid,
                issues,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this._logError('Ошибка валидации состояния', error);
            return {
                isValid: false,
                issues: ['Ошибка при выполнении валидации'],
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов StatusManager');
        
        try {
            // Останавливаем все таймеры
        this.renderer.clearHideTimeout();
            
            // Очищаем очередь
            this._clearQueue();
            
            // Останавливаем обработку очереди
            this.isProcessingQueue = false;
            
            // Скрываем текущий статус
        this.hideStatus();
            
            // Очищаем историю
            if (this.historyManager.enableHistory) {
                this.clearHistory();
            }
            
            // Убираем ссылку на элемент
        this.renderer.statusElement = null;
            
            this._log('StatusManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении StatusManager', error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusManager;
    module.exports.default = StatusManager;
}

if (typeof window !== 'undefined') {
    window.StatusManager = StatusManager;
}
