/**
 * Менеджер для работы с диагностическими данными.
 * Отвечает за получение статистики, истории и метрик производительности статусов и валидации.
 * 
 * @class DiagnosticsDataManager
 */
class DiagnosticsDataManager {
    /**
     * Создает экземпляр DiagnosticsDataManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Получает текущий URL бэкенда из DOM.
     * 
     * @returns {string} Текущий URL бэкенда
     */
    getCurrentBackendUrl() {
        return this.manager.domManager.getBackendUrlValue();
    }

    /**
     * Получает URL бэкенда по умолчанию из хранилища.
     * 
     * @returns {string} URL бэкенда по умолчанию
     */
    getDefaultBackendUrl() {
        return this.manager.storageManager.getDefaultBackendUrl();
    }

    /**
     * Проверяет валидность текущего URL бэкенда.
     * 
     * @returns {boolean} true, если URL валиден
     */
    isCurrentUrlValid() {
        const url = this.getCurrentBackendUrl();
        return this.manager.validationManager.isValidUrl(url);
    }

    /**
     * Получает статистику статусов.
     * 
     * @returns {Object} Статистика статусов
     */
    getStatusStatistics() {
        try {
            return this.manager.statusManager.getStatistics();
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getStatusStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Получает историю статусов.
     * 
     * @param {Object} [options={}] - Опции для фильтрации истории
     * @returns {Array} История статусов
     */
    getStatusHistory(options = {}) {
        try {
            return this.manager.statusManager.getHistory(options);
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getStatusHistoryError' }, error);
            return [];
        }
    }

    /**
     * Получает метрики производительности статусов.
     * 
     * @returns {Object} Метрики производительности
     */
    getStatusPerformanceMetrics() {
        try {
            return this.manager.statusManager.getPerformanceMetrics();
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getStatusPerformanceMetricsError' }, error);
            return {};
        }
    }

    /**
     * Очищает историю статусов.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearStatusHistory() {
        try {
            const count = this.manager.statusManager.clearHistory();
            this.manager._log({ key: 'logs.diagnosticsData.statusHistoryCleared', params: { count } });
            return count;
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.clearStatusHistoryError' }, error);
            return 0;
        }
    }

    /**
     * Получает статистику валидации.
     * 
     * @returns {Object} Статистика валидации
     */
    getValidationStatistics() {
        try {
            return this.manager.validationManager.getValidationStatistics();
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getValidationStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Получает историю валидации.
     * 
     * @param {Object} [options={}] - Опции для фильтрации истории
     * @returns {Array} История валидации
     */
    getValidationHistory(options = {}) {
        try {
            return this.manager.validationManager.getHistory(options);
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getValidationHistoryError' }, error);
            return [];
        }
    }

    /**
     * Очищает историю валидации.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearValidationHistory() {
        try {
            const count = this.manager.validationManager.clearHistory();
            this.manager._log({ key: 'logs.diagnosticsData.validationHistoryCleared', params: { count } });
            return count;
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.clearValidationHistoryError' }, error);
            return 0;
        }
    }

    /**
     * Получает метрики производительности валидации.
     * 
     * @returns {Object} Метрики производительности
     */
    getValidationPerformanceMetrics() {
        try {
            return this.manager.validationManager.getPerformanceMetrics();
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getValidationPerformanceMetricsError' }, error);
            return {};
        }
    }

    /**
     * Валидирует состояние менеджеров.
     * 
     * @returns {Object} Результаты валидации
     */
    validateManagersState() {
        const results = {
            isValid: true,
            managers: {},
            timestamp: new Date().toISOString()
        };

        try {
            if (this.manager.statusManager && typeof this.manager.statusManager.validateState === 'function') {
                results.managers.statusManager = this.manager.statusManager.validateState();
                if (!results.managers.statusManager.isValid) {
                    results.isValid = false;
                }
            }

            if (this.manager.validationManager && typeof this.manager.validationManager.validateState === 'function') {
                results.managers.validationManager = this.manager.validationManager.validateState();
                if (!results.managers.validationManager.isValid) {
                    results.isValid = false;
                }
            }

            this.manager._log({ key: 'logs.diagnosticsData.managersValidationCompleted' }, results);
            return results;
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.managersValidationError' }, error);
            return {
                isValid: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Получает полную диагностическую информацию.
     * 
     * @returns {Object} Диагностическая информация
     */
    getDiagnostics() {
        try {
            return {
                isInitialized: this.manager.isInitialized,
                enableLogging: this.manager.enableLogging,
                statusStatistics: this.getStatusStatistics(),
                statusPerformanceMetrics: this.getStatusPerformanceMetrics(),
                storagePerformanceMetrics: this.manager.storageManager.getPerformanceMetrics(),
                domPerformanceMetrics: this.manager.domManager.getPerformanceMetrics(),
                domElementsStatistics: this.manager.domManager.getElementsStatistics(),
                validationPerformanceMetrics: this.manager.validationManager.getPerformanceMetrics(),
                validationStatistics: this.manager.validationManager.getValidationStatistics(),
                managersValidation: this.validateManagersState(),
                currentUrl: this.getCurrentBackendUrl(),
                defaultUrl: this.getDefaultBackendUrl(),
                isUrlValid: this.isCurrentUrlValid(),
                domainExceptions: this.manager.uiManager && typeof this.manager.uiManager.getDomainExceptions === 'function'
                    ? this.manager.uiManager.getDomainExceptions()
                    : [],
                domainExceptionsCount: this.manager.uiManager && typeof this.manager.uiManager.getDomainExceptions === 'function'
                    ? this.manager.uiManager.getDomainExceptions().length
                    : 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.manager._logError({ key: 'logs.diagnosticsData.getDiagnosticsError' }, error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiagnosticsDataManager;
    module.exports.default = DiagnosticsDataManager;
}

if (typeof window !== 'undefined') {
    window.DiagnosticsDataManager = DiagnosticsDataManager;
}
