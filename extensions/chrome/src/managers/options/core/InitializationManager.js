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

            if (typeof manager.loadConnectionStatus === 'function') {
                try {
                    await manager.loadConnectionStatus();
                } catch (e) {
                    manager._logError({ key: 'logs.initialization.connectionStatusLoadError' }, e);
                }
            }
            
            manager.uiManager.setupEventHandlers();
            if (manager.uiManager.authManager && typeof manager.uiManager.authManager.initOnboarding === 'function') {
                await manager.uiManager.authManager.initOnboarding();
            }
            await manager.uiManager.refreshAuthStatus();

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
