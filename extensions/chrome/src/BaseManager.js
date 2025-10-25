const CONFIG = require('../config.js');

/**
 * @typedef {Object} ManagerState
 * @property {boolean} isOnline - Статус подключения к сети
 * @property {boolean} isTracking - Статус активности отслеживания
 * @property {number} lastUpdate - Временная метка последнего обновления
 */

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
     * Создает экземпляр BaseManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {Object} [options.constants] - Переопределение констант
     * @param {Object} [options.initialState] - Начальное состояние
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     * @param {boolean} [options.enablePerformanceTracking=true] - Включить отслеживание производительности
     */
    constructor(options = {}) {
        /** @type {Object} */
        this.CONSTANTS = {
            ...BaseManager.DEFAULT_CONSTANTS,
            ...(options.constants || {})
        };
        
        /** @type {ManagerState} */
        this.state = {
            isOnline: false,
            isTracking: false,
            lastUpdate: 0,
            ...(options.initialState || {})
        };
        
        /** @type {Object} */
        this.options = { ...options };
        
        /** @type {boolean} */
        this.enableLogging = options.enableLogging || false;
        
        /** @type {boolean} */
        this.enablePerformanceTracking = options.enablePerformanceTracking !== false;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
    }

    /**
     * Логирует сообщение, если логирование включено.
     * 
     * @protected
     * @param {string} message - Сообщение для логирования
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _log(message, data) {
        if (this.enableLogging) {
            const className = this.constructor.name;
            console.log(`[${className}] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Логирует ошибку.
     * 
     * @protected
     * @param {string} message - Сообщение об ошибке
     * @param {Error|*} [error] - Объект ошибки
     * @returns {void}
     */
    _logError(message, error) {
        const className = this.constructor.name;
        console.error(`[${className}] ${message}`, error || '');
    }

    /**
     * Обновляет внутреннее состояние.
     * 
     * @param {Partial<ManagerState>} newState - Новое состояние для слияния
     * @throws {TypeError} Если newState не является объектом
     * @returns {void}
     */
    updateState(newState) {
        if (!newState || typeof newState !== 'object') {
            throw new TypeError('Новое состояние должно быть объектом');
        }

        try {
            this.state = { ...this.state, ...newState };
            this._log('Состояние обновлено', this.state);
        } catch (error) {
            this._logError('Ошибка обновления состояния', error);
            throw error;
        }
    }

    /**
     * Получает текущее состояние (копию).
     * 
     * @returns {ManagerState} Копия текущего состояния
     */
    getState() {
        try {
            return { ...this.state };
        } catch (error) {
            this._logError('Ошибка получения состояния', error);
            return {};
        }
    }

    /**
     * Сбрасывает состояние к начальному.
     * 
     * @returns {void}
     */
    resetState() {
        try {
            this.state = {
                isOnline: false,
                isTracking: false,
                lastUpdate: 0,
                ...(this.options.initialState || {})
            };
            this._log('Состояние сброшено');
        } catch (error) {
            this._logError('Ошибка сброса состояния', error);
        }
    }

    /**
     * Получает значение константы.
     * 
     * @param {string} key - Ключ константы
     * @returns {*} Значение константы или undefined
     */
    getConstant(key) {
        return this.CONSTANTS[key];
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
        if (!this.enablePerformanceTracking) {
            return operation();
        }

        const startTime = performance.now();
        
        try {
            const result = operation();
            const duration = Math.round(performance.now() - startTime);
            
            this.performanceMetrics.set(`${operationName}_lastDuration`, duration);
            this._log(`${operationName} завершена за ${duration}мс`);
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this._logError(`${operationName} завершилась с ошибкой за ${duration}мс`, error);
            throw error;
        }
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
        if (!this.enablePerformanceTracking) {
            return await operation();
        }

        const startTime = performance.now();
        
        try {
            const result = await operation();
            const duration = Math.round(performance.now() - startTime);
            
            this.performanceMetrics.set(`${operationName}_lastDuration`, duration);
            this._log(`${operationName} завершена за ${duration}мс`);
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this._logError(`${operationName} завершилась с ошибкой за ${duration}мс`, error);
            throw error;
        }
    }

    /**
     * Получает метрики производительности операций.
     * 
     * @returns {Object} Объект с метриками
     */
    getPerformanceMetrics() {
        try {
            return Object.fromEntries(this.performanceMetrics);
        } catch (error) {
            this._logError('Ошибка получения метрик производительности', error);
            return {};
        }
    }

    /**
     * Очищает метрики производительности.
     * 
     * @protected
     * @returns {void}
     */
    _clearPerformanceMetrics() {
        try {
            if (this.performanceMetrics) {
                this.performanceMetrics.clear();
                this._log('Метрики производительности очищены');
            }
        } catch (error) {
            this._logError('Ошибка очистки метрик производительности', error);
        }
    }

    /**
     * Очищает ресурсы менеджера.
     * Переопределите этот метод в дочерних классах для специфичной очистки.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Базовая очистка ресурсов');
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
