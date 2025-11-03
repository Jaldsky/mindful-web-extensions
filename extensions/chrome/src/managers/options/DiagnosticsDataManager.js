class DiagnosticsDataManager {
    constructor(manager) {
        this.manager = manager;
    }

    getCurrentBackendUrl() {
        return this.manager.domManager.getBackendUrlValue();
    }

    getDefaultBackendUrl() {
        return this.manager.storageManager.getDefaultBackendUrl();
    }

    isCurrentUrlValid() {
        const url = this.getCurrentBackendUrl();
        return this.manager.validationManager.isValidUrl(url);
    }

    getStatusStatistics() {
        try {
            return this.manager.statusManager.getStatistics();
        } catch (error) {
            this.manager._logError('Ошибка получения статистики статусов', error);
            return {};
        }
    }

    getStatusHistory(options = {}) {
        try {
            return this.manager.statusManager.getHistory(options);
        } catch (error) {
            this.manager._logError('Ошибка получения истории статусов', error);
            return [];
        }
    }

    getStatusPerformanceMetrics() {
        try {
            return this.manager.statusManager.getPerformanceMetrics();
        } catch (error) {
            this.manager._logError('Ошибка получения метрик производительности', error);
            return {};
        }
    }

    clearStatusHistory() {
        try {
            const count = this.manager.statusManager.clearHistory();
            this.manager._log(`История статусов очищена: ${count} записей`);
            return count;
        } catch (error) {
            this.manager._logError('Ошибка очистки истории статусов', error);
            return 0;
        }
    }

    getValidationStatistics() {
        try {
            return this.manager.validationManager.getValidationStatistics();
        } catch (error) {
            this.manager._logError('Ошибка получения статистики валидации', error);
            return {};
        }
    }

    getValidationHistory(options = {}) {
        try {
            return this.manager.validationManager.getHistory(options);
        } catch (error) {
            this.manager._logError('Ошибка получения истории валидации', error);
            return [];
        }
    }

    clearValidationHistory() {
        try {
            const count = this.manager.validationManager.clearHistory();
            this.manager._log(`История валидаций очищена: ${count} записей`);
            return count;
        } catch (error) {
            this.manager._logError('Ошибка очистки истории валидации', error);
            return 0;
        }
    }

    getValidationPerformanceMetrics() {
        try {
            return this.manager.validationManager.getPerformanceMetrics();
        } catch (error) {
            this.manager._logError('Ошибка получения метрик производительности валидации', error);
            return {};
        }
    }

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

            this.manager._log('Валидация менеджеров завершена', results);
            return results;
        } catch (error) {
            this.manager._logError('Ошибка валидации менеджеров', error);
            return {
                isValid: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

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
            this.manager._logError('Ошибка получения диагностики', error);
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
