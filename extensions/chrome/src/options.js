/**
 * Options page entry point for Mindful Web extension.
 * Uses the OptionsManager architecture for modular and maintainable code.
 */

import OptionsManager from './managers/options/OptionsManager.js';
import ThemeManager from './managers/theme/ThemeManager.js';

/**
 * Global instance of OptionsManager.
 * @type {OptionsManager|null}
 */
let optionsManagerInstance = null;

/**
 * Global instance of ThemeManager for syncing themes.
 * @type {ThemeManager|null}
 */
let themeManagerInstance = null;

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

        // Создаем ThemeManager
        themeManagerInstance = new ThemeManager({
            enableLogging: true,
            enableCache: true
        });
        
        // Загружаем и применяем тему
        await themeManagerInstance.loadAndApplyTheme();
        
        // Слушаем изменения темы из других страниц
        themeManagerInstance.listenForThemeChanges((newTheme) => {
            // При изменении темы из другой страницы обновляем UI
            if (optionsManagerInstance) {
                optionsManagerInstance.updateThemeDisplay(newTheme);
            }
        });

        optionsManagerInstance = new OptionsManager({
            enableLogging: true
        });
        
        // Связываем OptionsManager с ThemeManager
        optionsManagerInstance.setThemeManager(themeManagerInstance);
        
        // Обновляем отображение текущей темы в UI
        optionsManagerInstance.updateThemeDisplay();
        
        // Экспортируем в window для отладки
        window.themeManager = themeManagerInstance;
        
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
    if (themeManagerInstance) {
        console.log('[Options] Очистка ресурсов ThemeManager');
        themeManagerInstance.destroy();
        themeManagerInstance = null;
        window.themeManager = null;
    }
    
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
 * Получает все логи из storage для отладки.
 * Доступно в консоли браузера через window.debugGetAllLogs()
 * 
 * @async
 * @returns {Promise<Array>} Массив всех логов
 */
async function debugGetAllLogs() {
    try {
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        console.log(`Total logs in storage: ${logs.length}`);
        return logs;
    } catch (error) {
        console.error('Error getting logs:', error);
        return [];
    }
}

/**
 * Очищает все логи из storage.
 * Доступно в консоли браузера через window.debugClearAllLogs()
 * 
 * @async
 * @returns {Promise<boolean>} true если успешно
 */
async function debugClearAllLogs() {
    try {
        await chrome.storage.local.set({ mindful_logs: [] });
        console.log('All logs cleared from storage');
        return true;
    } catch (error) {
        console.error('Error clearing logs:', error);
        return false;
    }
}

/**
 * Добавляет тестовый лог для проверки.
 * Доступно в консоли браузера через window.debugAddTestLog()
 * 
 * @async
 * @returns {Promise<boolean>} true если успешно
 */
async function debugAddTestLog() {
    try {
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        
        logs.push({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            className: 'TestDebug',
            message: 'Test log entry - if you see this, logging is working!',
            data: { test: true, timestamp: Date.now() }
        });
        
        await chrome.storage.local.set({ mindful_logs: logs });
        console.log('Test log added to storage');
        return true;
    } catch (error) {
        console.error('Error adding test log:', error);
        return false;
    }
}

/**
 * Добавляет много тестовых логов для проверки лимита 1000.
 * Доступно в консоли браузера через window.debugFillLogs(count)
 * 
 * @async
 * @param {number} [count=1100] - Количество логов для создания
 * @returns {Promise<boolean>} true если успешно
 */
async function debugFillLogs(count = 1100) {
    try {
        console.log(`Creating ${count} test logs...`);
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        
        const initialCount = logs.length;
        console.log(`Initial logs count: ${initialCount}`);
        
        // Добавляем тестовые логи
        for (let i = 0; i < count; i++) {
            logs.push({
                timestamp: new Date(Date.now() + i).toISOString(),
                level: i % 10 === 0 ? 'ERROR' : 'INFO',
                className: 'TestDebug',
                message: `Test log #${i + 1} of ${count}`,
                data: { index: i, timestamp: Date.now() + i }
            });
        }
        
        console.log(`Total logs before limit: ${logs.length}`);
        
        // Применяем лимит 1000 (как в BaseManager)
        const maxLogs = 1000;
        if (logs.length > maxLogs) {
            const toRemove = logs.length - maxLogs;
            logs.splice(0, toRemove);
            console.log(`Removed ${toRemove} old logs to maintain limit of ${maxLogs}`);
        }
        
        await chrome.storage.local.set({ mindful_logs: logs });
        
        console.log(`Final logs count in storage: ${logs.length}`);
        console.log(`First log timestamp: ${logs[0].timestamp}`);
        console.log(`Last log timestamp: ${logs[logs.length - 1].timestamp}`);
        
        return true;
    } catch (error) {
        console.error('Error filling logs:', error);
        return false;
    }
}

/**
 * Добавляет тестовый лог от BackendManager для проверки фильтра SERVER.
 * Доступно в консоли браузера через window.debugAddServerLog()
 * 
 * @returns {Promise<void>}
 */
async function debugAddServerLog() {
    try {
        const result = await chrome.storage.local.get(['mindful_logs']);
        const logs = result.mindful_logs || [];
        
        // Добавляем несколько логов для имитации реального запроса
        // Формат согласно SendEventsRequestSchema на сервере
        const mockEvents = [
            { 
                event: 'active', 
                domain: 'instagram.com', 
                timestamp: new Date(Date.now() - 5000).toISOString() 
            },
            { 
                event: 'inactive', 
                domain: 'instagram.com', 
                timestamp: new Date(Date.now() - 3000).toISOString() 
            },
            { 
                event: 'active', 
                domain: 'youtube.com', 
                timestamp: new Date(Date.now() - 1000).toISOString() 
            }
        ];
        
        const serverLogs = [
            {
                timestamp: new Date(Date.now()).toISOString(),
                level: 'INFO',
                className: 'BackendManager',
                message: 'Отправка событий на backend',
                data: { 
                    method: 'POST',
                    url: 'http://localhost:3000/api/events',
                    eventsCount: mockEvents.length,
                    userId: 'test-user-123',
                    payload: { data: mockEvents }
                }
            },
            {
                timestamp: new Date(Date.now() + 100).toISOString(),
                level: 'INFO',
                className: 'BackendManager',
                message: 'Ответ от backend',
                data: { 
                    method: 'POST',
                    status: 204
                }
            },
            {
                timestamp: new Date(Date.now() + 200).toISOString(),
                level: 'INFO',
                className: 'BackendManager',
                message: 'События успешно отправлены',
                data: { 
                    eventsCount: 3
                }
            }
        ];
        
        logs.push(...serverLogs);
        
        await chrome.storage.local.set({ mindful_logs: logs });
        console.log('[Debug] Server logs added:', serverLogs.length);
        
        // Обновляем отображение логов если OptionsManager доступен
        if (optionsManagerInstance) {
            await optionsManagerInstance.loadLogs();
        }
    } catch (error) {
        console.error('[Debug] Error adding server log:', error);
    }
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
    
    // Debug
    window.debugGetAllLogs = debugGetAllLogs;
    window.debugClearAllLogs = debugClearAllLogs;
    window.debugAddTestLog = debugAddTestLog;
    window.debugFillLogs = debugFillLogs;
    window.debugAddServerLog = debugAddServerLog;
    
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
    console.log('%cОтладка логов:', 'color: #FF9800; font-weight: bold');
    console.log('  • debugGetAllLogs() - Получить все логи из storage');
    console.log('  • debugClearAllLogs() - Очистить все логи');
    console.log('  • debugAddTestLog() - Добавить тестовый лог');
    console.log('  • debugFillLogs(count) - Создать много логов для проверки лимита (по умолчанию 1100)');
    console.log('  • debugAddServerLog() - Добавить тестовый лог от BackendManager');
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
