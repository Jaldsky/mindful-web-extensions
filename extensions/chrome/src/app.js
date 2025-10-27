/**
 * Entry point for the app page
 * Initializes the AppManager when the DOM is ready
 */
import AppManager from './app_manager/AppManager.js';
import ThemeManager from './theme_manager/ThemeManager.js';

/**
 * Global instance of AppManager.
 * @type {AppManager|null}
 */
let appManagerInstance = null;

/**
 * Global instance of ThemeManager.
 * @type {ThemeManager|null}
 */
let themeManagerInstance = null;

/**
 * Инициализирует страницу приложения.
 * 
 * @async
 * @returns {Promise<void>}
 */
async function initializeAppPage() {
    try {
        console.log('[App] Инициализация страницы приложения');
        
        // Создаем и инициализируем ThemeManager
        themeManagerInstance = new ThemeManager({
            enableLogging: true,
            enableCache: true
        });
        
        // Загружаем и применяем тему
        await themeManagerInstance.loadAndApplyTheme();
        
        // Слушаем изменения темы
        themeManagerInstance.listenForThemeChanges();
        
        appManagerInstance = new AppManager({
            enableLogging: true // Можно отключить в продакшене
        });
        
        // Экспортируем в window для отладки
        window.appManager = appManagerInstance;
        window.themeManager = themeManagerInstance;
        
        console.log('[App] Страница приложения успешно инициализирована');
    } catch (error) {
        console.error('[App] Критическая ошибка инициализации:', error);
    }
}

/**
 * Очистка ресурсов при закрытии страницы.
 * 
 * @returns {void}
 */
function cleanupAppPage() {
    if (themeManagerInstance) {
        console.log('[App] Очистка ресурсов ThemeManager');
        themeManagerInstance.destroy();
        themeManagerInstance = null;
        window.themeManager = null;
    }
    
    if (appManagerInstance) {
        console.log('[App] Очистка ресурсов страницы приложения');
        appManagerInstance.destroy();
        appManagerInstance = null;
        window.appManager = null;
    }
}

/**
 * Получает диагностическую информацию.
 * Доступно в консоли браузера через window.getAppDiagnostics()
 * 
 * @returns {Object} Диагностическая информация
 */
function getAppDiagnostics() {
    if (!appManagerInstance) {
        return {
            error: 'AppManager не инициализирован',
            timestamp: new Date().toISOString()
        };
    }
    
    return {
        isInitialized: appManagerInstance.isInitialized,
        state: appManagerInstance.getState(),
        performanceMetrics: appManagerInstance.getPerformanceMetrics(),
        domPerformanceMetrics: appManagerInstance.domManager?.getPerformanceMetrics(),
        domElementsStatistics: appManagerInstance.domManager?.getElementsStatistics(),
        serviceWorkerMetrics: appManagerInstance.serviceWorkerManager?.getPerformanceMetrics(),
        notificationMetrics: appManagerInstance.notificationManager?.getPerformanceMetrics(),
        notificationStatistics: appManagerInstance.notificationManager?.getNotificationStatistics(),
        timestamp: new Date().toISOString()
    };
}

/**
 * Запускает диагностику системы.
 * Доступно в консоли браузера через window.runAppDiagnostics()
 * 
 * @returns {Promise<Object>} Результаты диагностики
 */
async function runAppDiagnostics() {
    if (!appManagerInstance || !appManagerInstance.diagnosticsManager) {
        return { error: 'DiagnosticsManager не доступен' };
    }
    
    return await appManagerInstance.diagnosticsManager.runDiagnostics();
}

/**
 * Проверяет подключение к серверу.
 * Доступно в консоли браузера через window.testAppConnection()
 * 
 * @returns {Promise<boolean>} Статус подключения
 */
async function testAppConnection() {
    if (!appManagerInstance || !appManagerInstance.serviceWorkerManager) {
        console.error('ServiceWorkerManager не доступен');
        return false;
    }
    
    return await appManagerInstance.serviceWorkerManager.checkConnection();
}

/**
 * Получает статус отслеживания.
 * Доступно в консоли браузера через window.getTrackingStatus()
 * 
 * @returns {Promise<Object>} Статус отслеживания
 */
async function getTrackingStatus() {
    if (!appManagerInstance || !appManagerInstance.serviceWorkerManager) {
        return { error: 'ServiceWorkerManager не доступен' };
    }
    
    return await appManagerInstance.serviceWorkerManager.getTrackingStatus();
}

/**
 * Получает статистику за сегодня.
 * Доступно в консоли браузера через window.getTodayStats()
 * 
 * @returns {Promise<Object>} Статистика
 */
async function getTodayStats() {
    if (!appManagerInstance || !appManagerInstance.serviceWorkerManager) {
        return { error: 'ServiceWorkerManager не доступен' };
    }
    
    return await appManagerInstance.serviceWorkerManager.getTodayStats();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeAppPage);

// Очистка при закрытии страницы
window.addEventListener('beforeunload', cleanupAppPage);

/**
 * Получает метрики производительности DOM.
 * Доступно в консоли браузера через window.getDOMMetrics()
 * 
 * @returns {Object} Метрики производительности DOM
 */
function getDOMMetrics() {
    if (!appManagerInstance || !appManagerInstance.domManager) {
        return { error: 'DOMManager не доступен' };
    }
    
    return {
        performanceMetrics: appManagerInstance.domManager.getPerformanceMetrics(),
        elementsStatistics: appManagerInstance.domManager.getElementsStatistics()
    };
}

/**
 * Получает статистику уведомлений.
 * Доступно в консоли браузера через window.getNotificationStats()
 * 
 * @returns {Object} Статистика уведомлений
 */
function getNotificationStats() {
    if (!appManagerInstance || !appManagerInstance.notificationManager) {
        return { error: 'NotificationManager не доступен' };
    }
    
    return appManagerInstance.notificationManager.getNotificationStatistics();
}

// Экспорт вспомогательных функций в window для отладки в консоли
if (typeof window !== 'undefined') {
    window.getAppDiagnostics = getAppDiagnostics;
    window.runAppDiagnostics = runAppDiagnostics;
    window.testAppConnection = testAppConnection;
    window.getTrackingStatus = getTrackingStatus;
    window.getTodayStats = getTodayStats;
    window.getDOMMetrics = getDOMMetrics;
    window.getNotificationStats = getNotificationStats;
    
    // Вывод информации в консоль при инициализации
    console.log('%c[App] Доступные команды для отладки:', 'color: #4CAF50; font-weight: bold');
    console.log('%cОсновные:', 'color: #2196F3; font-weight: bold');
    console.log('  • getAppDiagnostics() - Получить диагностическую информацию');
    console.log('  • runAppDiagnostics() - Запустить полную диагностику');
    console.log('%cПодключение:', 'color: #2196F3; font-weight: bold');
    console.log('  • testAppConnection() - Проверить подключение к серверу');
    console.log('  • getTrackingStatus() - Получить статус отслеживания');
    console.log('  • getTodayStats() - Получить статистику за сегодня');
    console.log('%cСтатистика:', 'color: #2196F3; font-weight: bold');
    console.log('  • getDOMMetrics() - Метрики производительности DOM');
    console.log('  • getNotificationStats() - Статистика уведомлений');
}

// Экспорт для тестирования (если необходимо)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initializeAppPage, 
        cleanupAppPage,
        getAppDiagnostics,
        runAppDiagnostics,
        testAppConnection,
        getTrackingStatus,
        getTodayStats,
        getDOMMetrics,
        getNotificationStats
    };
}
