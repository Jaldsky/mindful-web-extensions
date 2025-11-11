/**
 * Базовый менеджер для отслеживания производительности.
 * 
 * @class PerformanceManager
 */
class PerformanceManager {
    /**
     * Создает экземпляр PerformanceManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enablePerformanceTracking=true] - Включить отслеживание производительности
     * @param {Function} [options.logError] - Функция логирования ошибок
     * @param {Function} [options.log] - Функция логирования
     */
    constructor(options = {}) {
        this.enablePerformanceTracking = options.enablePerformanceTracking !== false;
        this.logError = options.logError;
        this.log = options.log;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
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
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            if (this.logError) {
                this.logError({ 
                    key: 'logs.baseManager.operationError', 
                    params: { operationName, duration } 
                }, error);
            }
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
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            if (this.logError) {
                this.logError({ 
                    key: 'logs.baseManager.operationError', 
                    params: { operationName, duration } 
                }, error);
            }
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
            if (this.logError) {
                this.logError({ key: 'logs.baseManager.getPerformanceMetricsError' }, error);
            }
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
                if (this.log) {
                    this.log({ key: 'logs.baseManager.performanceMetricsCleared' });
                }
            }
        } catch (error) {
            if (this.logError) {
                this.logError({ key: 'logs.baseManager.clearPerformanceMetricsError' }, error);
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceManager;
    module.exports.default = PerformanceManager;
}
