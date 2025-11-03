class InitializationManager {
    constructor(manager) {
        this.manager = manager;
    }

    async init() {
        const manager = this.manager;

        if (manager.isInitialized) {
            manager._log('OptionsManager уже инициализирован');
            return;
        }

        const initStartTime = performance.now();

        try {
            manager._log('Начало инициализации OptionsManager');

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

            // Load initial activity stats for always-visible panel
            if (manager.uiManager && typeof manager.uiManager.loadActivityStats === 'function') {
                try {
                    await manager.uiManager.loadActivityStats();
                } catch (e) {
                    manager._logError('Ошибка начальной загрузки активности', e);
                }
            }

            // Start auto refresh for activity (same cadence as logs)
            if (manager.uiManager && typeof manager.uiManager.startActivityAutoRefresh === 'function') {
                manager.uiManager.startActivityAutoRefresh();
                // Apply default range active state in UI
                if (typeof manager.uiManager._markActiveRangeButton === 'function') {
                    manager.uiManager._markActiveRangeButton(manager.uiManager.activityRangeKey);
                }
            }

            manager.localeManager.addLocaleChangeListener(() => {
                manager.uiManager.onLocaleChange();
            });

            manager.isInitialized = true;

            const initTime = Math.round(performance.now() - initStartTime);
            manager._log('OptionsManager инициализирован успешно', {
                initTime: `${initTime}мс`,
                storageMetrics: manager.storageManager.getPerformanceMetrics(),
                domMetrics: manager.domManager.getPerformanceMetrics(),
                domElements: manager.domManager.getElementsStatistics(),
                validationMetrics: manager.validationManager.getPerformanceMetrics()
            });
        } catch (error) {
            const initTime = Math.round(performance.now() - initStartTime);
            manager._logError(`Ошибка инициализации OptionsManager (${initTime}мс)`, error);

            const errorMessage = error.message.includes('Chrome Storage API')
                ? error.message
                : manager.localeManager.t('options.status.loadError');

            const statusShown = manager.statusManager.showError(errorMessage);

            if (!statusShown) {
                manager._log('Предупреждение: не удалось отобразить статус ошибки инициализации');
            }

            throw error;
        }
    }

    async loadSettings() {
        const manager = this.manager;
        const startTime = performance.now();

        try {
            manager._log('Загрузка настроек');

            const [backendUrl, domainExceptions] = await Promise.all([
                manager.storageManager.loadBackendUrl(),
                manager.storageManager.loadDomainExceptions()
            ]);
            const setSuccess = manager.domManager.setBackendUrlValue(backendUrl);

            if (!setSuccess) {
                manager._logError('Не удалось обновить UI после загрузки настроек');

                const warningShown = manager.statusManager.showWarning(
                    manager.localeManager.t('options.status.uiUpdateError')
                );

                if (!warningShown) {
                    manager._log('Предупреждение: не удалось отобразить предупреждение о проблеме с UI');
                }
            }

            try {
                manager.setDomainExceptions(domainExceptions);
            } catch (error) {
                manager._logError('Не удалось обновить список исключений доменов в UI', error);
                manager.statusManager.showWarning(
                    manager.localeManager.t('options.status.uiUpdateError')
                );
            }

            const loadTime = Math.round(performance.now() - startTime);
            manager._log('Настройки загружены успешно', {
                backendUrl: backendUrl.substring(0, 50) + (backendUrl.length > 50 ? '...' : ''),
                domainExceptionsCount: Array.isArray(domainExceptions) ? domainExceptions.length : 0,
                loadTime: `${loadTime}мс`,
                uiUpdateSuccess: setSuccess
            });
        } catch (error) {
            const loadTime = Math.round(performance.now() - startTime);
            manager._logError(`Ошибка загрузки настроек (${loadTime}мс)`, error);

            const errorMessage = error.message.includes('chrome.storage API недоступен')
                ? 'Storage API unavailable. Please reload the extension.'
                : manager.localeManager.t('options.status.loadError');

            const statusShown = manager.statusManager.showError(errorMessage);

            if (!statusShown) {
                manager._log('Предупреждение: не удалось отобразить статус ошибки');
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
