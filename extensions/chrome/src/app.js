/**
 * Entry point for the app page
 * Initializes the AppManager when the DOM is ready
 */
import AppManager from './managers/app/AppManager.js';
import ThemeManager from './managers/theme/ThemeManager.js';

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
        themeManagerInstance = new ThemeManager({
            enableLogging: true,
            enableCache: true
        });
        
        await themeManagerInstance.loadAndApplyTheme();
        
        themeManagerInstance.listenForThemeChanges();
        
        appManagerInstance = new AppManager({
            enableLogging: true
        });
        
        window.appManager = appManagerInstance;
        window.themeManager = themeManagerInstance;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[App] Критическая ошибка инициализации:', error);
        throw error;
    }
}

/**
 * Очистка ресурсов при закрытии страницы.
 * 
 * @returns {void}
 */
function cleanupAppPage() {
    if (themeManagerInstance) {
        themeManagerInstance.destroy();
        themeManagerInstance = null;
        window.themeManager = null;
    }
    
    if (appManagerInstance) {
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

document.addEventListener('DOMContentLoaded', initializeAppPage);

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

if (typeof window !== 'undefined') {
    window.getAppDiagnostics = getAppDiagnostics;
    window.runAppDiagnostics = runAppDiagnostics;
    window.testAppConnection = testAppConnection;
    window.getTrackingStatus = getTrackingStatus;
    window.getTodayStats = getTodayStats;
    window.getDOMMetrics = getDOMMetrics;
    window.getNotificationStats = getNotificationStats;
    
    const isDevMode = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';
    if (isDevMode) {
        // eslint-disable-next-line no-console
        console.log('%c[App] Доступные команды для отладки:', 'color: #4CAF50; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('%cОсновные:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • getAppDiagnostics() - Получить диагностическую информацию');
        // eslint-disable-next-line no-console
        console.log('  • runAppDiagnostics() - Запустить полную диагностику');
        // eslint-disable-next-line no-console
        console.log('%cПодключение:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • testAppConnection() - Проверить подключение к серверу');
        // eslint-disable-next-line no-console
        console.log('  • getTrackingStatus() - Получить статус отслеживания');
        // eslint-disable-next-line no-console
        console.log('  • getTodayStats() - Получить статистику за сегодня');
        // eslint-disable-next-line no-console
        console.log('%cСтатистика:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • getDOMMetrics() - Метрики производительности DOM');
        // eslint-disable-next-line no-console
        console.log('  • getNotificationStats() - Статистика уведомлений');
    }
}

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
