const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');
const StatusHistoryManager = require('./StatusHistoryManager.js');
const StatusQueueManager = require('./StatusQueueManager.js');
const StatusRendererManager = require('./StatusRendererManager.js');

/**
 * @typedef {Object} StatusHistoryEntry
 * @property {string} type - Тип статуса
 * @property {string} message - Сообщение статуса
 * @property {string} timestamp - ISO строка времени
 * @property {number} duration - Время отображения в мс
 */

/**
 * @typedef {Object} StatusManagerState
 * @property {boolean} isOnline - Статус подключения к сети
 * @property {boolean} isTracking - Статус активности отслеживания
 * @property {number} lastUpdate - Временная метка последнего обновления
 * @property {string|null} currentType - Тип текущего статуса
 * @property {string|null} currentMessage - Сообщение текущего статуса
 * @property {boolean} isVisible - Видимость текущего статуса
 * @property {number} queueLength - Размер очереди сообщений
 * @property {number} historyLength - Размер истории статусов
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
     * @type {StatusManagerState}
     * @override
     */
    state;
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
     * @param {Partial<StatusManagerState>} [options.initialState] - Начальное состояние
     */
    constructor(options = {}) {
        /** @type {Partial<StatusManagerState>} */
        const initialState = {
            currentType: null,
            currentMessage: null,
            isVisible: false,
            queueLength: 0,
            historyLength: 0,
            ...(options.initialState || {})
        };
        
        super({
            ...options,
            initialState: initialState
        });
        
        /** @type {number} */
        this.defaultDuration = options.defaultDuration || StatusManager.DEFAULT_DISPLAY_DURATION;
        
        /** @type {StatusRendererManager} */
        this.renderer = new StatusRendererManager({
            element: options.statusElement || null,
            log: (m, d) => this._log(m, d),
            logError: (m, e) => this._logError(m, e),
            t: this.t.bind(this)
        });
        
        /** @type {StatusHistoryManager} */
        this.historyManager = new StatusHistoryManager({
            enableHistory: options.enableHistory !== false,
            maxHistorySize: options.maxHistorySize || StatusManager.MAX_HISTORY_SIZE,
            log: (m, d) => this._log(m, d),
            logError: (m, e) => this._logError(m, e),
            onUpdate: (size) => {
                /** @type {Partial<StatusManagerState>} */
                const newState = { historyLength: size };
                this.updateState(newState);
            }
        });

        /** @type {StatusQueueManager} */
        this.queueManager = new StatusQueueManager({
            enableQueue: options.enableQueue === true,
            maxQueueSize: options.maxQueueSize || StatusManager.MAX_QUEUE_SIZE,
            log: (m, d) => this._log(m, d),
            logError: (m, e) => this._logError(m, e),
            onUpdate: (size) => {
                /** @type {Partial<StatusManagerState>} */
                const newState = { queueLength: size };
                this.updateState(newState);
                const isVisible = /** @type {StatusManagerState} */ (this.state).isVisible;
                if (size > 0 && !isVisible) {
                    this._processQueue().catch(() => {});
                }
            }
        });
        
        /** @type {number|null} */
        this.lastDisplayTimestamp = null;
    }

    /**
     * Обновляет внутреннее состояние StatusManager.
     * 
     * @param {Partial<StatusManagerState>} newState - Новое состояние для слияния
     * @throws {TypeError} Если newState не является объектом
     * @returns {void}
     */
    updateState(newState) {
        super.updateState(newState);
    }

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
        return this.queueManager.enqueue(message, type, duration);
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
                return await this._displayStatusInternal(item.message, item.type, item.duration);
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

            /** @type {Partial<StatusManagerState>} */
            const newState = {
                currentType: type,
                currentMessage: message,
                isVisible: true
            };
            this.updateState(newState);

            this._log({ key: 'logs.status.displayed' }, {
                message: message.substring(0, CONFIG.STATUS_SETTINGS.MAX_LOG_MESSAGE_LENGTH) + (message.length > CONFIG.STATUS_SETTINGS.MAX_LOG_MESSAGE_LENGTH ? '...' : ''),
                type,
                duration: `${duration}${this.t('common.timeUnitMs')}`
            });

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
     * @returns {Promise<boolean>} Promise, который разрешается в true если сообщение отображено
     */
    async showStatus(message, type = StatusManager.STATUS_TYPES.INFO, duration) {
        if (typeof message !== 'string' || message.trim() === '') {
            throw new TypeError(this.t('logs.status.messageMustBeString'));
        }

        if (!Object.values(StatusManager.STATUS_TYPES).includes(type)) {
            this._log({ key: 'logs.status.invalidType', params: { type } });
            type = StatusManager.STATUS_TYPES.INFO;
        }

        if (!this.renderer.statusElement) {
            this._logError({ key: 'logs.status.elementNotSet' });
            return false;
        }

        const displayDuration = duration !== undefined ? duration : this.defaultDuration;

        if (this.queueManager.enableQueue && this.state && this.state.isVisible) {
            return this._addToQueue(message, type, displayDuration);
        }

        try {
            return await this._displayStatusInternal(message, type, displayDuration);
        } catch (error) {
            this._logError({ key: 'logs.status.displayError' }, error);
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
            /** @type {Partial<StatusManagerState>} */
            const newState = { currentType: null, currentMessage: null, isVisible: false };
            this.updateState(newState);
            const hideTime = Math.round(performance.now() - startTime);
            this.performanceMetrics.set('hideStatus_lastDuration', hideTime);
            this._log({ key: 'logs.status.hidden', params: { time: hideTime } });
            return true;
        } catch (error) {
            const hideTime = Math.round(performance.now() - startTime);
            this._logError({ key: 'logs.status.hideError', params: { time: hideTime } }, error);
            return false;
        }
    }

    /**
     * Показывает статус ошибки.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {Promise<boolean>} Promise, который разрешается в true если сообщение отображено
     */
    async showError(message, duration) {
        return await this.showStatus(message, StatusManager.STATUS_TYPES.ERROR, duration);
    }

    /**
     * Показывает предупреждение.
     * 
     * @param {string} message - Текст сообщения
     * @param {number} [duration] - Длительность отображения в мс
     * @returns {Promise<boolean>} Promise, который разрешается в true если сообщение отображено
     */
    async showWarning(message, duration) {
        return await this.showStatus(message, StatusManager.STATUS_TYPES.WARNING, duration);
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
            return this.historyManager.clear();
        } catch (error) {
            this._logError({ key: 'logs.status.clearHistoryError' }, error);
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
        return this.queueManager.clear();
    }

    /**
     * Получает статистику работы менеджера.
     * 
     * @returns {Object<string, *>} Статистика работы менеджера
     */
    getStatistics() {
        try {
            if (!Array.isArray(this.historyManager.history)) {
                this._logError({ key: 'logs.status.getStatisticsError' }, new Error(this.t('logs.status.invalidHistoryFormat')));
                return {};
            }
            
            let queueItemsIsArray;
            try {
                queueItemsIsArray = Array.isArray(this.queueManager.items);
            } catch (_e) {
                queueItemsIsArray = false;
            }
            
            if (!queueItemsIsArray) {
                this._logError({ key: 'logs.status.getStatisticsError' }, new Error(this.t('logs.status.invalidQueueFormat')));
                return {};
            }

            const historyByType = {};
            Object.values(StatusManager.STATUS_TYPES).forEach(type => {
                historyByType[type] = this.getHistory({ type }).length;
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
            this._logError({ key: 'logs.status.getStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Проверяет валидность состояния менеджера.
     * 
     * @returns {Object} Результат проверки
     * @returns {boolean} Результат.isValid - Валидность состояния
     * @returns {string[]} Результат.issues - Список найденных проблем
     * @returns {string} Результат.timestamp - ISO строка времени проверки
     * @returns {string} [Результат.error] - Сообщение об ошибке (если есть)
     */
    validateState() {
        const issues = [];

        try {
            const HTMLElementCtor = (typeof HTMLElement !== 'undefined') ? HTMLElement : (typeof window !== 'undefined' ? window.HTMLElement : null);
            if (this.renderer.statusElement && HTMLElementCtor && !(this.renderer.statusElement instanceof HTMLElementCtor)) {
                issues.push(this.t('logs.status.invalidElementType'));
            }

            if (this.defaultDuration < 0) {
                issues.push(this.t('logs.status.invalidDuration'));
            }

            if (this.historyManager.size() > this.historyManager.maxHistorySize) {
                issues.push(this.t('logs.status.historyExceedsMaxSize', { 
                    size: this.historyManager.size(), 
                    maxSize: this.historyManager.maxHistorySize 
                }));
            }

            if (this.queueManager.size() > this.queueManager.maxQueueSize) {
                issues.push(this.t('logs.status.queueExceedsMaxSize', { 
                    size: this.queueManager.size(), 
                    maxSize: this.queueManager.maxQueueSize 
                }));
            }

            if (!Array.isArray(this.historyManager.history)) {
                issues.push(this.t('logs.status.invalidHistoryFormat'));
            }
            try {
                const items = this.queueManager.items;
                if (!Array.isArray(items)) {
                    issues.push(this.t('logs.status.invalidQueueFormat'));
                }
            } catch (_e) {
                issues.push(this.t('logs.status.invalidQueueFormat'));
            }

            if (this.state && this.state.isVisible && !this.state.currentType) {
                issues.push(this.t('logs.status.visibleButNoType'));
            }

            if (this.state && this.state.isVisible && !this.state.currentMessage) {
                issues.push(this.t('logs.status.visibleButNoMessage'));
            }

            const isValid = issues.length === 0;

            return {
                isValid,
                issues,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this._logError({ key: 'logs.status.validationError' }, error);
            return {
                isValid: false,
                issues: [this.t('logs.status.validationExecutionError')],
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
        this._log({ key: 'logs.status.destroyStart' });
        
        try {
            this.renderer.clearHideTimeout();
            this._clearQueue();
            this.hideStatus();
            if (this.historyManager.enableHistory) {
                this.clearHistory();
            }
            this.renderer.statusElement = null;
            
            this._log({ key: 'logs.status.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.status.destroyError' }, error);
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
