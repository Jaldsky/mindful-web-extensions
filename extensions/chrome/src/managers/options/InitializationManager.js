/**
 * Менеджер для инициализации OptionsManager.
 * Отвечает за загрузку настроек, локализацию и настройку UI.
 * 
 * @class InitializationManager
 */
class InitializationManager {
    /**
     * Создает экземпляр InitializationManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Инициализирует OptionsManager.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        const manager = this.manager;

        if (manager.isInitialized) {
            manager._log({ key: 'logs.initialization.alreadyInitialized' });
            return;
        }

        const initStartTime = performance.now();

        try {
            manager._log({ key: 'logs.initialization.initStart' });
            await manager.localeManager.init();
            manager.localeManager.localizeDOM();
            manager.uiManager.updateLanguageDisplay();

            const diagnosticsLabel = document.querySelector('.diagnostics-status-label');
            if (diagnosticsLabel) {
                const statusText = manager.localeManager.t('options.diagnostics.status');
                diagnosticsLabel.textContent = (statusText && !statusText.startsWith('options.')) ? statusText : 'Status:';
            }

            manager.diagnosticsWorkflowManager.updateStatus('notRun');
            await this.loadSettings();
            manager.uiManager.setupEventHandlers();

            if (manager.uiManager && typeof manager.uiManager.loadActivityStats === 'function') {
                try {
                    await manager.uiManager.loadActivityStats();
                } catch (e) {
                    manager._logError({ key: 'logs.initialization.activityLoadError' }, e);
                }
            }

            if (manager.uiManager && typeof manager.uiManager.startActivityAutoRefresh === 'function') {
                manager.uiManager.startActivityAutoRefresh();

                const rangeSelect = document.getElementById('activityRangeSelect');
                if (rangeSelect) {
                    rangeSelect.value = manager.uiManager.activityRangeKey;
                }
            }

            manager.localeManager.addLocaleChangeListener(() => {
                manager.uiManager.onLocaleChange();
            });
            manager.isInitialized = true;

            const initTime = Math.round(performance.now() - initStartTime);
            const timeUnit = manager.localeManager.t('common.timeUnitMs');
            manager._log({ key: 'logs.initialization.initSuccess' }, {
                initTime: `${initTime}${timeUnit}`,
                storageMetrics: manager.storageManager.getPerformanceMetrics(),
                domMetrics: manager.domManager.getPerformanceMetrics(),
                domElements: manager.domManager.getElementsStatistics(),
                validationMetrics: manager.validationManager.getPerformanceMetrics()
            });
        } catch (error) {
            const initTime = Math.round(performance.now() - initStartTime);
            manager._logError({ key: 'logs.initialization.initError', params: { initTime } }, error);

            const errorMessage = error.message.includes('Chrome Storage API')
                ? error.message
                : manager.localeManager.t('options.status.loadError');

            const statusShown = manager.statusManager.showError(errorMessage);

            if (!statusShown) {
                manager._log({ key: 'logs.initialization.initStatusErrorWarning' });
            }

            throw error;
        }
    }

    /**
     * Загружает настройки из хранилища.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadSettings() {
        const manager = this.manager;
        const startTime = performance.now();

        try {
            manager._log({ key: 'logs.initialization.loadStart' });

            const [backendUrl, domainExceptions] = await Promise.all([
                manager.storageManager.loadBackendUrl(),
                manager.storageManager.loadDomainExceptions()
            ]);
            const setSuccess = manager.domManager.setBackendUrlValue(backendUrl);

            if (!setSuccess) {
                manager._logError({ key: 'logs.initialization.uiUpdateError' });

                const warningShown = manager.statusManager.showWarning(
                    manager.localeManager.t('options.status.uiUpdateError')
                );

                if (!warningShown) {
                    manager._log({ key: 'logs.initialization.uiUpdateWarning' });
                }
            }

            try {
                manager.setDomainExceptions(domainExceptions);
            } catch (error) {
                manager._logError({ key: 'logs.initialization.domainExceptionsUpdateError' }, error);
                manager.statusManager.showWarning(
                    manager.localeManager.t('options.status.uiUpdateError')
                );
            }

            const loadTime = Math.round(performance.now() - startTime);
            const timeUnit = manager.localeManager.t('common.timeUnitMs');
            manager._log({ key: 'logs.initialization.loadSuccess' }, {
                backendUrl: backendUrl.substring(0, 50) + (backendUrl.length > 50 ? '...' : ''),
                domainExceptionsCount: Array.isArray(domainExceptions) ? domainExceptions.length : 0,
                loadTime: `${loadTime}${timeUnit}`,
                uiUpdateSuccess: setSuccess
            });
        } catch (error) {
            const loadTime = Math.round(performance.now() - startTime);
            manager._logError({ key: 'logs.initialization.loadError', params: { loadTime } }, error);

            const storageApiUnavailableError = manager.localeManager.t('logs.initialization.storageApiUnavailableError');
            const errorMessage = error.message.includes(storageApiUnavailableError)
                ? manager.localeManager.t('logs.initialization.storageApiUnavailable')
                : manager.localeManager.t('options.status.loadError');

            const statusShown = manager.statusManager.showError(errorMessage);

            if (!statusShown) {
                manager._log({ key: 'logs.initialization.loadStatusErrorWarning' });
            }

            throw error;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InitializationManager;
    module.exports.default = InitializationManager;
}

if (typeof window !== 'undefined') {
    window.InitializationManager = InitializationManager;
}
