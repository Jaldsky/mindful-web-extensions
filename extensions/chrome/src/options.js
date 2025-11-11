/**
 * Options page entry point for Mindful Web extension.
 * Uses the OptionsManager architecture for modular and maintainable code.
 */

import OptionsManager from './managers/options/OptionsManager.js';
import ThemeManager from './managers/theme/ThemeManager.js';
import * as debugUtils from './utils/options-debug.js';
import * as helperUtils from './utils/options-helpers.js';

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
        themeManagerInstance = new ThemeManager({
            enableLogging: true,
            enableCache: true
        });
        
        await themeManagerInstance.loadAndApplyTheme();
        
        themeManagerInstance.listenForThemeChanges((newTheme) => {
            if (optionsManagerInstance) {
                optionsManagerInstance.updateThemeDisplay(newTheme);
            }
        });

        optionsManagerInstance = new OptionsManager({
            enableLogging: true
        });
        
        optionsManagerInstance.setThemeManager(themeManagerInstance);
        
        optionsManagerInstance.updateThemeDisplay();
        
        window.themeManager = themeManagerInstance;
        window.generateRandomDomains = async (count = 100) => {
            if (!optionsManagerInstance) {
                return { success: false };
            }
            const res = await optionsManagerInstance.serviceWorkerManager.generateRandomDomains(count);
            try { await optionsManagerInstance.loadActivityStats(); } catch (_) {}
            return res;
        };
        window.getDetailedStats = async () => {
            if (!optionsManagerInstance) {
                return { success: false, error: 'OptionsManager is not initialized' };
            }
            try {
                return await optionsManagerInstance.serviceWorkerManager.getDetailedStats();
            } catch (e) {
                return { success: false, error: e.message };
            }
        };
        window.refreshActivity = async () => {
            if (!optionsManagerInstance) return;
            try { await optionsManagerInstance.loadActivityStats(); } catch (_) {}
        };
    } catch (error) {
        // eslint-disable-next-line no-console
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
        themeManagerInstance.destroy();
        themeManagerInstance = null;
        window.themeManager = null;
    }
    
    if (optionsManagerInstance) {
        optionsManagerInstance.destroy();
        optionsManagerInstance = null;
    }
}

document.addEventListener('DOMContentLoaded', initializeOptionsPage);

window.addEventListener('beforeunload', cleanupOptionsPage);

if (typeof window !== 'undefined') {
    window.getOptionsDiagnostics = () => helperUtils.getOptionsDiagnostics(optionsManagerInstance);
    window.validateManagersState = () => helperUtils.validateManagersState(optionsManagerInstance);
    window.getAllMetrics = () => helperUtils.getAllMetrics(optionsManagerInstance);
    
    window.getStatusStatistics = () => helperUtils.getStatusStatistics(optionsManagerInstance);
    window.getStatusHistory = (options) => helperUtils.getStatusHistory(optionsManagerInstance, options);
    window.getStatusPerformanceMetrics = () => helperUtils.getStatusPerformanceMetrics(optionsManagerInstance);
    window.clearStatusHistory = () => helperUtils.clearStatusHistory(optionsManagerInstance);
    
    window.getValidationStatistics = () => helperUtils.getValidationStatistics(optionsManagerInstance);
    window.getValidationHistory = (options) => helperUtils.getValidationHistory(optionsManagerInstance, options);
    window.getValidationPerformanceMetrics = () => helperUtils.getValidationPerformanceMetrics(optionsManagerInstance);
    window.clearValidationHistory = () => helperUtils.clearValidationHistory(optionsManagerInstance);
    
    window.getDOMPerformanceMetrics = () => helperUtils.getDOMPerformanceMetrics(optionsManagerInstance);
    window.getDOMElementsStatistics = () => helperUtils.getDOMElementsStatistics(optionsManagerInstance);
    
    window.getStoragePerformanceMetrics = () => helperUtils.getStoragePerformanceMetrics(optionsManagerInstance);
    
    window.getCurrentBackendUrl = () => helperUtils.getCurrentBackendUrl(optionsManagerInstance);
    window.getDefaultBackendUrl = () => helperUtils.getDefaultBackendUrl(optionsManagerInstance);
    window.isCurrentUrlValid = () => helperUtils.isCurrentUrlValid(optionsManagerInstance);
    
    window.debugGetAllLogs = debugUtils.debugGetAllLogs;
    window.debugClearAllLogs = debugUtils.debugClearAllLogs;
    window.debugAddTestLog = debugUtils.debugAddTestLog;
    window.debugFillLogs = debugUtils.debugFillLogs;
    window.debugAddServerLog = () => debugUtils.debugAddServerLog(optionsManagerInstance);
    
    const isDevMode = typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production';
    if (isDevMode) {
        // eslint-disable-next-line no-console
        console.log('%c[Options] Доступные команды для отладки:', 'color: #4CAF50; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('%cОсновные:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • getAllMetrics() - Получить все метрики и статистику');
        // eslint-disable-next-line no-console
        console.log('  • getOptionsDiagnostics() - Полная диагностика');
        // eslint-disable-next-line no-console
        console.log('  • validateManagersState() - Проверить состояние менеджеров');
        // eslint-disable-next-line no-console
        console.log('%cURL:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • getCurrentBackendUrl() - Текущий URL');
        // eslint-disable-next-line no-console
        console.log('  • getDefaultBackendUrl() - URL по умолчанию');
        // eslint-disable-next-line no-console
        console.log('  • isCurrentUrlValid() - Проверить валидность URL');
        // eslint-disable-next-line no-console
        console.log('%cСтатусы:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • getStatusStatistics() - Статистика статусов');
        // eslint-disable-next-line no-console
        console.log('  • getStatusHistory() - История статусов');
        // eslint-disable-next-line no-console
        console.log('  • getStatusPerformanceMetrics() - Метрики производительности');
        // eslint-disable-next-line no-console
        console.log('%cВалидация:', 'color: #2196F3; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • getValidationStatistics() - Статистика валидаций');
        // eslint-disable-next-line no-console
        console.log('  • getValidationHistory() - История валидаций');
        // eslint-disable-next-line no-console
        console.log('  • getValidationPerformanceMetrics() - Метрики производительности');
        // eslint-disable-next-line no-console
        console.log('%cОтладка логов:', 'color: #FF9800; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • debugGetAllLogs() - Получить все логи из storage');
        // eslint-disable-next-line no-console
        console.log('  • debugClearAllLogs() - Очистить все логи');
        // eslint-disable-next-line no-console
        console.log('  • debugAddTestLog() - Добавить тестовый лог');
        // eslint-disable-next-line no-console
        console.log('  • debugFillLogs(count) - Создать много логов для проверки лимита (по умолчанию 1100)');
        // eslint-disable-next-line no-console
        console.log('  • debugAddServerLog() - Добавить тестовый лог от BackendManager');
        // eslint-disable-next-line no-console
        console.log('%cСтатистика активности:', 'color: #FF9800; font-weight: bold');
        // eslint-disable-next-line no-console
        console.log('  • generateRandomDomains(count=100) - Сгенерировать случайные домены (отладка)');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initializeOptionsPage, 
        cleanupOptionsPage
    };
}
