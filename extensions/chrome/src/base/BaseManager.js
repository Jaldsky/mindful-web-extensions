const CONFIG = require('../config/config.js');
const LocaleManager = require('./LocaleManager.js');
const LoggingManager = require('./LoggingManager.js');
const StateManager = require('./StateManager.js');
const PerformanceManager = require('./PerformanceManager.js');
const MessageManager = require('./MessageManager.js');

/**
 * Базовый класс для управления состоянием и константами.
 * Содержит общую логику для всех компонентов app.
 * Все менеджеры должны наследоваться от этого класса.
 * 
 * @class BaseManager
 */
class BaseManager {
    /**
     * Константы по умолчанию для всех менеджеров
     * @readonly
     * @enum {number}
     */
    static DEFAULT_CONSTANTS = CONFIG.BASE;

    /**
     * Поддерживаемые локали
     * @readonly
     * @static
     */
    static SUPPORTED_LOCALES = LocaleManager.SUPPORTED_LOCALES;

    /**
     * Локаль по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_LOCALE = LocaleManager.DEFAULT_LOCALE;

    /**
     * Определяет локаль браузера.
     * 
     * @static
     * @returns {string|null} Код локали или null, если не удалось определить
     */
    static detectBrowserLocale() {
        return LocaleManager.detectBrowserLocale();
    }

    /**
     * Обновляет кэш локали.
     * 
     * @static
     * @param {string} locale - Код локали
     * @returns {void}
     */
    static updateLocaleCache(locale) {
        LocaleManager.updateLocaleCache(locale);
    }

    /**
     * Создает экземпляр BaseManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {Object} [options.constants] - Переопределение констант
     * @param {Object} [options.initialState] - Начальное состояние
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     * @param {boolean} [options.enablePerformanceTracking=true] - Включить отслеживание производительности
     * @param {Function} [options.translateFn] - Функция перевода: (key: string, params?: Object) => string
     */
    constructor(options = {}) {
        /** @type {Object} */
        this.CONSTANTS = {
            ...BaseManager.DEFAULT_CONSTANTS,
            ...(options.constants || {})
        };
        
        /** @type {Object} */
        this.options = { ...options };
        
        this.localeManager = new LocaleManager();
        this.loggingManager = new LoggingManager({
            enableLogging: options.enableLogging || false,
            translateFn: options.translateFn,
            getClassName: () => this.constructor.name
        });
        this.stateManager = new StateManager({
            initialState: options.initialState,
            getTranslateFn: () => this._getTranslateFn(),
            logError: (message, error) => this._logError(message, error),
            log: (message) => this._log(message)
        });
        this.performanceManager = new PerformanceManager({
            enablePerformanceTracking: options.enablePerformanceTracking !== false,
            logError: (message, error) => this._logError(message, error),
            log: (message) => this._log(message)
        });
        this.messageManager = new MessageManager({
            getTranslateFn: () => this._getTranslateFn()
        });

        Object.defineProperty(this, 'state', {
            get() {
                return this.stateManager.state;
            },
            set(value) {
                if (this.stateManager && this.stateManager.state) {
                    Object.assign(this.stateManager.state, value);
                }
            },
            enumerable: true,
            configurable: true
        });
    }

    /**
     * Получает флаг включения логирования (для обратной совместимости).
     * 
     * @returns {boolean} true, если логирование включено
     */
    get enableLogging() {
        return this.loggingManager.enableLogging;
    }

    /**
     * Получает флаг включения отслеживания производительности (для обратной совместимости).
     * 
     * @returns {boolean} true, если отслеживание производительности включено
     */
    get enablePerformanceTracking() {
        return this.performanceManager.enablePerformanceTracking;
    }

    /**
     * Получает метрики производительности (для обратной совместимости).
     * 
     * @returns {Map<string, number>} Map с метриками производительности
     */
    get performanceMetrics() {
        return this.performanceManager.performanceMetrics;
    }

    /**
     * Устанавливает метрики производительности (для обратной совместимости).
     * Позволяет устанавливать любое значение для тестирования.
     * 
     * @param {*} value - Новые метрики (может быть Map, Object или любое другое значение для тестов)
     */
    set performanceMetrics(value) {
        this.performanceManager.performanceMetrics = value;
    }

    /**
     * Получает универсальную функцию перевода.
     * 
     * @protected
     * @returns {Function} Функция перевода: (key: string, params?: Object) => string
     */
    _getTranslateFn() {
        return this.localeManager._getTranslateFn(this.options.translateFn);
    }

    /**
     * Получает перевод по ключу.
     * 
     * @param {string} key - Ключ перевода
     * @param {Object} [params] - Параметры для подстановки
     * @returns {string} Переведенная строка или ключ, если перевод не найден
     */
    t(key, params = {}) {
        const translate = this._getTranslateFn();
        return translate(key, params);
    }

    /**
     * Логирует сообщение, если логирование включено.
     * 
     * @protected
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _log(message, data) {
        this.loggingManager._log(message, data);
    }

    /**
     * Логирует ошибку.
     * 
     * @protected
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {Error|*} [error] - Объект ошибки
     * @returns {void}
     */
    _logError(message, error) {
        this.loggingManager._logError(message, error);
    }

    /**
     * Обновляет внутреннее состояние.
     * 
     * @param {Partial<ManagerState>} newState - Новое состояние для слияния
     * @throws {TypeError} Если newState не является объектом
     * @returns {void}
     */
    updateState(newState) {
        this.stateManager.updateState(newState);
    }

    /**
     * Получает текущее состояние (копию).
     * 
     * @returns {ManagerState} Копия текущего состояния
     */
    getState() {
        return this.stateManager.getState();
    }

    /**
     * Сбрасывает состояние к начальному.
     * 
     * @returns {void}
     */
    resetState() {
        this.stateManager.resetState();
    }

    /**
     * Выполняет синхронную операцию с измерением времени.
     * 
     * @protected
     * @param {string} operationName - Название операции
     * @param {Function} operation - Функция операции
     * @returns {*} Результат операции
     */
    _executeWithTiming(operationName, operation) {
        return this.performanceManager._executeWithTiming(operationName, operation);
    }

    /**
     * Выполняет асинхронную операцию с измерением времени.
     * 
     * @protected
     * @param {string} operationName - Название операции
     * @param {Function} operation - Асинхронная функция операции
     * @returns {Promise<*>} Результат операции
     */
    async _executeWithTimingAsync(operationName, operation) {
        return await this.performanceManager._executeWithTimingAsync(operationName, operation);
    }

    /**
     * Получает метрики производительности операций.
     * 
     * @returns {Object} Объект с метриками
     */
    getPerformanceMetrics() {
        return this.performanceManager.getPerformanceMetrics();
    }

    /**
     * Очищает метрики производительности.
     * 
     * @protected
     * @returns {void}
     */
    _clearPerformanceMetrics() {
        this.performanceManager._clearPerformanceMetrics();
    }

    /**
     * Получает список служебных сообщений, которые обрабатываются независимо от статуса отслеживания.
     * 
     * @protected
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @returns {Array<string>} Массив типов служебных сообщений
     */
    _getSystemMessages(messageTypes) {
        return this.messageManager._getSystemMessages(messageTypes);
    }

    /**
     * Проверяет, является ли сообщение служебным.
     * 
     * @protected
     * @param {string} messageType - Тип сообщения
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @returns {boolean} true, если сообщение служебное
     */
    _isSystemMessage(messageType, messageTypes) {
        return this.messageManager._isSystemMessage(messageType, messageTypes);
    }

    /**
     * Проверяет, нужно ли блокировать сообщение на основе статуса отслеживания и подключения.
     * 
     * @protected
     * @param {string} messageType - Тип сообщения
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @param {Function} getTrackingStatus - Функция, возвращающая статус отслеживания (boolean)
     * @param {Function} getOnlineStatus - Функция, возвращающая статус подключения (boolean)
     * @returns {{shouldBlock: boolean, reason?: string}} Результат проверки
     */
    _shouldBlockMessage(messageType, messageTypes, getTrackingStatus, getOnlineStatus) {
        return this.messageManager._shouldBlockMessage(messageType, messageTypes, getTrackingStatus, getOnlineStatus, this.state);
    }

    /**
     * Проверяет, является ли ошибка связанной с блокировкой сообщения
     * (отслеживание отключено или нет подключения).
     * 
     * @protected
     * @param {Error} error - Объект ошибки
     * @returns {boolean} true, если ошибка связана с блокировкой сообщения
     */
    _isBlockingError(error) {
        return this.messageManager._isBlockingError(error);
    }

    /**
     * Очищает ресурсы менеджера.
     * Переопределите этот метод в дочерних классах для специфичной очистки.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.baseManager.destroyStart' });
        this._clearPerformanceMetrics();
        this.resetState();
    }
}

if (typeof window !== 'undefined') {
    window.BaseManager = BaseManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseManager;
    module.exports.default = BaseManager;
}
