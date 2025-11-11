/**
 * Helper utilities for options page.
 * Functions for accessing diagnostics, metrics, and statistics.
 */

/**
 * Получает диагностическую информацию для отладки.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Диагностическая информация
 */
export function getOptionsDiagnostics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return {
            error: 'OptionsManager не инициализирован',
            timestamp: new Date().toISOString()
        };
    }
    
    return optionsManagerInstance.getDiagnostics();
}

/**
 * Получает статистику работы статусов.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Статистика StatusManager
 */
export function getStatusStatistics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getStatusStatistics();
}

/**
 * Получает историю статусов.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @param {Object} [options={}] - Опции фильтрации
 * @returns {Array} История статусов
 */
export function getStatusHistory(optionsManagerInstance, options = {}) {
    if (!optionsManagerInstance) {
        return [];
    }
    
    return optionsManagerInstance.getStatusHistory(options);
}

/**
 * Очищает историю статусов.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {number} Количество удаленных записей
 */
export function clearStatusHistory(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return 0;
    }
    
    return optionsManagerInstance.clearStatusHistory();
}

/**
 * Проверяет валидность состояния всех менеджеров.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Результат валидации
 */
export function validateManagersState(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { 
            isValid: false, 
            error: 'OptionsManager не инициализирован' 
        };
    }
    
    return optionsManagerInstance.validateManagersState();
}

/**
 * Получает метрики производительности DOM операций.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Метрики производительности DOM
 */
export function getDOMPerformanceMetrics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.domManager.getPerformanceMetrics();
}

/**
 * Получает статистику доступности DOM элементов.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Статистика элементов
 */
export function getDOMElementsStatistics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.domManager.getElementsStatistics();
}

/**
 * Получает статистику валидаций.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Статистика валидаций
 */
export function getValidationStatistics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getValidationStatistics();
}

/**
 * Получает историю валидаций.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @param {Object} [options={}] - Опции фильтрации
 * @returns {Array} История валидаций
 */
export function getValidationHistory(optionsManagerInstance, options = {}) {
    if (!optionsManagerInstance) {
        return [];
    }
    
    return optionsManagerInstance.getValidationHistory(options);
}

/**
 * Очищает историю валидаций.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {number} Количество удаленных записей
 */
export function clearValidationHistory(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return 0;
    }
    
    return optionsManagerInstance.clearValidationHistory();
}

/**
 * Получает метрики производительности валидаций.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Метрики производительности
 */
export function getValidationPerformanceMetrics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getValidationPerformanceMetrics();
}

/**
 * Получает метрики производительности статусов.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Метрики производительности
 */
export function getStatusPerformanceMetrics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getStatusPerformanceMetrics();
}

/**
 * Получает метрики производительности хранилища.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Метрики производительности
 */
export function getStoragePerformanceMetrics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.storageManager.getPerformanceMetrics();
}

/**
 * Получает текущий backend URL.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {string|null} Текущий URL
 */
export function getCurrentBackendUrl(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return null;
    }
    
    return optionsManagerInstance.getCurrentBackendUrl();
}

/**
 * Получает URL по умолчанию.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {string} URL по умолчанию
 */
export function getDefaultBackendUrl(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return 'http://localhost:8000/api/v1/events/send';
    }
    
    return optionsManagerInstance.getDefaultBackendUrl();
}

/**
 * Проверяет валидность текущего URL.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {boolean} true если URL валиден
 */
export function isCurrentUrlValid(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return false;
    }
    
    return optionsManagerInstance.isCurrentUrlValid();
}

/**
 * Получает полную сводку по всем метрикам и статистике.
 * 
 * @param {Object|null} optionsManagerInstance - Экземпляр OptionsManager
 * @returns {Object} Все метрики и статистика
 */
export function getAllMetrics(optionsManagerInstance) {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return {
        diagnostics: optionsManagerInstance.getDiagnostics(),
        status: {
            statistics: optionsManagerInstance.getStatusStatistics(),
            performance: optionsManagerInstance.getStatusPerformanceMetrics(),
            history: optionsManagerInstance.getStatusHistory({ limit: 10 })
        },
        validation: {
            statistics: optionsManagerInstance.getValidationStatistics(),
            performance: optionsManagerInstance.getValidationPerformanceMetrics(),
            history: optionsManagerInstance.getValidationHistory({ limit: 10 })
        },
        storage: {
            performance: optionsManagerInstance.storageManager.getPerformanceMetrics()
        },
        dom: {
            performance: optionsManagerInstance.domManager.getPerformanceMetrics(),
            elements: optionsManagerInstance.domManager.getElementsStatistics()
        },
        currentUrl: optionsManagerInstance.getCurrentBackendUrl(),
        isUrlValid: optionsManagerInstance.isCurrentUrlValid(),
        domainExceptions: optionsManagerInstance.uiManager && typeof optionsManagerInstance.uiManager.getDomainExceptions === 'function'
            ? optionsManagerInstance.uiManager.getDomainExceptions()
            : [],
        timestamp: new Date().toISOString()
    };
}
