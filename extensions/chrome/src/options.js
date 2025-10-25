/**
 * Options page entry point for Mindful Web extension.
 * Uses the OptionsManager architecture for modular and maintainable code.
 */

import OptionsManager from './options_manager/OptionsManager.js';

/**
 * Global instance of OptionsManager.
 * @type {OptionsManager|null}
 */
let optionsManagerInstance = null;

/**
 * Инициализирует страницу настроек.
 * Создает экземпляр OptionsManager и обрабатывает ошибки инициализации.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initializeOptionsPage() {
    try {
        console.log('[Options] Инициализация страницы настроек');

        optionsManagerInstance = new OptionsManager({
            enableLogging: true
        });
        
        console.log('[Options] Страница настроек успешно инициализирована');
    } catch (error) {
        console.error('[Options] Критическая ошибка инициализации:', error);

        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = 'Failed to initialize settings page. Please reload.';
            statusElement.className = 'status-message error visible';
        }
    }
}

/**
 * Очистка ресурсов при закрытии страницы.
 * 
 * @returns {void}
 */
function cleanupOptionsPage() {
    if (optionsManagerInstance) {
        console.log('[Options] Очистка ресурсов страницы настроек');
        optionsManagerInstance.destroy();
        optionsManagerInstance = null;
    }
}

/**
 * Получает диагностическую информацию для отладки.
 * Доступно в консоли браузера через window.getOptionsDiagnostics()
 * 
 * @returns {Object} Диагностическая информация
 */
function getOptionsDiagnostics() {
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
 * Доступно в консоли браузера через window.getStatusStatistics()
 * 
 * @returns {Object} Статистика StatusManager
 */
function getStatusStatistics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getStatusStatistics();
}

/**
 * Получает историю статусов.
 * Доступно в консоли браузера через window.getStatusHistory()
 * 
 * @param {Object} [options={}] - Опции фильтрации
 * @returns {Array} История статусов
 */
function getStatusHistory(options = {}) {
    if (!optionsManagerInstance) {
        return [];
    }
    
    return optionsManagerInstance.getStatusHistory(options);
}

/**
 * Очищает историю статусов.
 * Доступно в консоли браузера через window.clearStatusHistory()
 * 
 * @returns {number} Количество удаленных записей
 */
function clearStatusHistory() {
    if (!optionsManagerInstance) {
        return 0;
    }
    
    return optionsManagerInstance.clearStatusHistory();
}

/**
 * Проверяет валидность состояния всех менеджеров.
 * Доступно в консоли браузера через window.validateManagersState()
 * 
 * @returns {Object} Результат валидации
 */
function validateManagersState() {
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
 * Доступно в консоли браузера через window.getDOMPerformanceMetrics()
 * 
 * @returns {Object} Метрики производительности DOM
 */
function getDOMPerformanceMetrics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.domManager.getPerformanceMetrics();
}

/**
 * Получает статистику доступности DOM элементов.
 * Доступно в консоли браузера через window.getDOMElementsStatistics()
 * 
 * @returns {Object} Статистика элементов
 */
function getDOMElementsStatistics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.domManager.getElementsStatistics();
}

/**
 * Получает статистику валидаций.
 * Доступно в консоли браузера через window.getValidationStatistics()
 * 
 * @returns {Object} Статистика валидаций
 */
function getValidationStatistics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getValidationStatistics();
}

/**
 * Получает историю валидаций.
 * Доступно в консоли браузера через window.getValidationHistory()
 * 
 * @param {Object} [options={}] - Опции фильтрации
 * @returns {Array} История валидаций
 */
function getValidationHistory(options = {}) {
    if (!optionsManagerInstance) {
        return [];
    }
    
    return optionsManagerInstance.getValidationHistory(options);
}

/**
 * Очищает историю валидаций.
 * Доступно в консоли браузера через window.clearValidationHistory()
 * 
 * @returns {number} Количество удаленных записей
 */
function clearValidationHistory() {
    if (!optionsManagerInstance) {
        return 0;
    }
    
    return optionsManagerInstance.clearValidationHistory();
}

/**
 * Получает метрики производительности валидаций.
 * Доступно в консоли браузера через window.getValidationPerformanceMetrics()
 * 
 * @returns {Object} Метрики производительности
 */
function getValidationPerformanceMetrics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getValidationPerformanceMetrics();
}

/**
 * Получает метрики производительности статусов.
 * Доступно в консоли браузера через window.getStatusPerformanceMetrics()
 * 
 * @returns {Object} Метрики производительности
 */
function getStatusPerformanceMetrics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.getStatusPerformanceMetrics();
}

/**
 * Получает метрики производительности хранилища.
 * Доступно в консоли браузера через window.getStoragePerformanceMetrics()
 * 
 * @returns {Object} Метрики производительности
 */
function getStoragePerformanceMetrics() {
    if (!optionsManagerInstance) {
        return { error: 'OptionsManager не инициализирован' };
    }
    
    return optionsManagerInstance.storageManager.getPerformanceMetrics();
}

/**
 * Получает текущий backend URL.
 * Доступно в консоли браузера через window.getCurrentBackendUrl()
 * 
 * @returns {string|null} Текущий URL
 */
function getCurrentBackendUrl() {
    if (!optionsManagerInstance) {
        return null;
    }
    
    return optionsManagerInstance.getCurrentBackendUrl();
}

/**
 * Получает URL по умолчанию.
 * Доступно в консоли браузера через window.getDefaultBackendUrl()
 * 
 * @returns {string} URL по умолчанию
 */
function getDefaultBackendUrl() {
    if (!optionsManagerInstance) {
        return 'http://localhost:8000/api/v1/events/send';
    }
    
    return optionsManagerInstance.getDefaultBackendUrl();
}

/**
 * Проверяет валидность текущего URL.
 * Доступно в консоли браузера через window.isCurrentUrlValid()
 * 
 * @returns {boolean} true если URL валиден
 */
function isCurrentUrlValid() {
    if (!optionsManagerInstance) {
        return false;
    }
    
    return optionsManagerInstance.isCurrentUrlValid();
}

/**
 * Получает полную сводку по всем метрикам и статистике.
 * Доступно в консоли браузера через window.getAllMetrics()
 * 
 * @returns {Object} Все метрики и статистика
 */
function getAllMetrics() {
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
        timestamp: new Date().toISOString()
    };
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeOptionsPage);

// Очистка при закрытии страницы
window.addEventListener('beforeunload', cleanupOptionsPage);

// Экспорт вспомогательных функций в window для отладки в консоли
if (typeof window !== 'undefined') {
    // Диагностика и состояние
    window.getOptionsDiagnostics = getOptionsDiagnostics;
    window.validateManagersState = validateManagersState;
    window.getAllMetrics = getAllMetrics;
    
    // Статусы
    window.getStatusStatistics = getStatusStatistics;
    window.getStatusHistory = getStatusHistory;
    window.getStatusPerformanceMetrics = getStatusPerformanceMetrics;
    window.clearStatusHistory = clearStatusHistory;
    
    // Валидация
    window.getValidationStatistics = getValidationStatistics;
    window.getValidationHistory = getValidationHistory;
    window.getValidationPerformanceMetrics = getValidationPerformanceMetrics;
    window.clearValidationHistory = clearValidationHistory;
    
    // DOM
    window.getDOMPerformanceMetrics = getDOMPerformanceMetrics;
    window.getDOMElementsStatistics = getDOMElementsStatistics;
    
    // Storage
    window.getStoragePerformanceMetrics = getStoragePerformanceMetrics;
    
    // URL
    window.getCurrentBackendUrl = getCurrentBackendUrl;
    window.getDefaultBackendUrl = getDefaultBackendUrl;
    window.isCurrentUrlValid = isCurrentUrlValid;
    
    // Вывод информации в консоль при инициализации
    console.log('%c[Options] Доступные команды для отладки:', 'color: #4CAF50; font-weight: bold');
    console.log('%cОсновные:', 'color: #2196F3; font-weight: bold');
    console.log('  • getAllMetrics() - Получить все метрики и статистику');
    console.log('  • getOptionsDiagnostics() - Полная диагностика');
    console.log('  • validateManagersState() - Проверить состояние менеджеров');
    console.log('%cURL:', 'color: #2196F3; font-weight: bold');
    console.log('  • getCurrentBackendUrl() - Текущий URL');
    console.log('  • getDefaultBackendUrl() - URL по умолчанию');
    console.log('  • isCurrentUrlValid() - Проверить валидность URL');
    console.log('%cСтатусы:', 'color: #2196F3; font-weight: bold');
    console.log('  • getStatusStatistics() - Статистика статусов');
    console.log('  • getStatusHistory() - История статусов');
    console.log('  • getStatusPerformanceMetrics() - Метрики производительности');
    console.log('%cВалидация:', 'color: #2196F3; font-weight: bold');
    console.log('  • getValidationStatistics() - Статистика валидаций');
    console.log('  • getValidationHistory() - История валидаций');
    console.log('  • getValidationPerformanceMetrics() - Метрики производительности');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initializeOptionsPage, 
        cleanupOptionsPage,
        getOptionsDiagnostics,
        validateManagersState,
        getAllMetrics,
        getStatusStatistics,
        getStatusHistory,
        getStatusPerformanceMetrics,
        clearStatusHistory,
        getValidationStatistics,
        getValidationHistory,
        getValidationPerformanceMetrics,
        clearValidationHistory,
        getDOMPerformanceMetrics,
        getDOMElementsStatistics,
        getStoragePerformanceMetrics,
        getCurrentBackendUrl,
        getDefaultBackendUrl,
        isCurrentUrlValid
    };
}
