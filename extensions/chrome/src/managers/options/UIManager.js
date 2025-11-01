class UIManager {
    constructor(manager) {
        this.manager = manager;
    }

    setupEventHandlers() {
        const manager = this.manager;
        const setupStartTime = performance.now();
        let handlersCount = 0;

        manager._log('Настройка обработчиков событий');

        if (manager.domManager.elements.settingsForm) {
            const formSubmitHandler = (e) => {
                e.preventDefault();
                manager.saveSettings();
            };

            manager.domManager.elements.settingsForm.addEventListener('submit', formSubmitHandler);
            manager.eventHandlers.set('settingsForm', formSubmitHandler);
            handlersCount++;
        } else {
            manager._log('Предупреждение: форма настроек не найдена, обработчик submit не установлен');
        }

        if (manager.domManager.elements.resetBtn) {
            manager.originalButtonTexts.set('resetBtn', manager.domManager.elements.resetBtn.textContent);

            const resetClickHandler = () => {
                manager.resetToDefault();
            };

            manager.domManager.elements.resetBtn.addEventListener('click', resetClickHandler);
            manager.eventHandlers.set('resetBtn', resetClickHandler);
            handlersCount++;
        } else {
            manager._log('Предупреждение: кнопка сброса не найдена, обработчик не установлен');
        }

        if (manager.domManager.elements.saveBtn) {
            manager.originalButtonTexts.set('saveBtn', manager.domManager.elements.saveBtn.textContent);
        } else {
            manager._log('Предупреждение: кнопка сохранения не найдена');
        }

        if (manager.domManager.elements.runDiagnostics) {
            manager.originalButtonTexts.set('runDiagnostics', manager.domManager.elements.runDiagnostics.textContent);

            const diagnosticsClickHandler = async () => {
                await manager.runDiagnostics();
            };

            manager.domManager.elements.runDiagnostics.addEventListener('click', diagnosticsClickHandler);
            manager.eventHandlers.set('runDiagnostics', diagnosticsClickHandler);
            handlersCount++;
        } else {
            manager._log('Предупреждение: кнопка диагностики не найдена, обработчик не установлен');
        }

        const clearDiagnostics = document.getElementById('clearDiagnostics');
        if (clearDiagnostics) {
            const handler = () => manager.clearDiagnostics();
            clearDiagnostics.addEventListener('click', handler);
            manager.eventHandlers.set('clearDiagnostics', handler);
            handlersCount++;
        }

        const closeDevToolsPanel = document.getElementById('closeDevToolsPanel');
        if (closeDevToolsPanel) {
            const handler = () => manager.closeDevToolsPanel();
            closeDevToolsPanel.addEventListener('click', handler);
            manager.eventHandlers.set('closeDevToolsPanel', handler);
            handlersCount++;
        }

        const logsTab = document.getElementById('logsTab');
        if (logsTab) {
            const handler = () => manager.switchTab('logs');
            logsTab.addEventListener('click', handler);
            manager.eventHandlers.set('logsTab', handler);
            handlersCount++;
        }

        const diagnosticsTab = document.getElementById('diagnosticsTab');
        if (diagnosticsTab) {
            const handler = () => manager.switchTab('diagnostics');
            diagnosticsTab.addEventListener('click', handler);
            manager.eventHandlers.set('diagnosticsTab', handler);
            handlersCount++;
        }

        const clearLogs = document.getElementById('clearLogs');
        if (clearLogs) {
            const handler = () => manager.clearLogs();
            clearLogs.addEventListener('click', handler);
            manager.eventHandlers.set('clearLogs', handler);
            handlersCount++;
        }

        const copyLogs = document.getElementById('copyLogs');
        if (copyLogs) {
            const handler = () => manager.copyLogs();
            copyLogs.addEventListener('click', handler);
            manager.eventHandlers.set('copyLogs', handler);
            handlersCount++;
        }

        const filterButtons = document.querySelectorAll('.logs-filter-btn');
        filterButtons.forEach((btn, index) => {
            const handler = (e) => {
                const level = e.target.getAttribute('data-filter-level');
                manager.setLogLevelFilter(level);
            };
            btn.addEventListener('click', handler);
            manager.eventHandlers.set(`logFilterBtn${index}`, handler);
            handlersCount++;
        });

        const classFilter = document.getElementById('logsClassFilter');
        if (classFilter) {
            const handler = (e) => {
                manager.setLogClassFilter(e.target.value);
            };
            classFilter.addEventListener('change', handler);
            manager.eventHandlers.set('logsClassFilter', handler);
            handlersCount++;
        }

        const serverOnlyFilter = document.getElementById('logsServerOnlyFilter');
        if (serverOnlyFilter) {
            const handler = (e) => {
                manager.setServerOnlyFilter(e.target.checked);
            };
            serverOnlyFilter.addEventListener('change', handler);
            manager.eventHandlers.set('logsServerOnlyFilter', handler);
            handlersCount++;
        }

        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
            const handler = async () => {
                await manager.toggleLanguage();
            };
            languageToggle.addEventListener('click', handler);
            manager.eventHandlers.set('languageToggle', handler);
            handlersCount++;
        }

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const handler = async () => {
                await manager.toggleTheme();
            };
            themeToggle.addEventListener('click', handler);
            manager.eventHandlers.set('themeToggle', handler);
            handlersCount++;
        }

        if (manager.domManager.elements.toggleDeveloperTools) {
            const handler = () => {
                const panel = document.getElementById('devToolsPanel');
                if (panel && panel.style.display === 'block') {
                    manager.closeDevToolsPanel();
                } else {
                    manager.openDevToolsPanel('logs');
                }
            };
            manager.domManager.elements.toggleDeveloperTools.addEventListener('click', handler);
            manager.eventHandlers.set('toggleDeveloperTools', handler);
            handlersCount++;
        } else {
            manager._log('Предупреждение: кнопка developer tools не найдена, обработчик не установлен');
        }

        manager.developerToolsManager.restoreState();

        const setupTime = Math.round(performance.now() - setupStartTime);
        manager._log('Обработчики событий настроены', {
            setupTime: `${setupTime}мс`,
            handlersCount,
            domStatistics: manager.domManager.getElementsStatistics()
        });
    }

    async saveSettings() {
        const manager = this.manager;
        const saveBtn = manager.domManager.elements.saveBtn;
        const originalText = manager.localeManager.t('options.buttons.save');
        const operationStartTime = performance.now();

        try {
            manager._log('Начало операции сохранения настроек');

            const buttonStateSet = manager.domManager.setButtonState(
                saveBtn,
                manager.localeManager.t('options.buttons.saving'),
                true
            );

            if (!buttonStateSet) {
                manager._log('Предупреждение: не удалось обновить состояние кнопки сохранения');
            }

            const backendUrl = manager.domManager.getBackendUrlValue();

            if (!backendUrl && backendUrl !== '') {
                manager._logError('Не удалось получить значение URL из DOM');

                const errorShown = manager.statusManager.showError(
                    manager.localeManager.t('options.status.uiUpdateError')
                );

                if (!errorShown) {
                    manager._log('Предупреждение: не удалось отобразить статус ошибки чтения UI');
                }

                return false;
            }

            const validationResult = manager.validationManager.validateBackendUrl(backendUrl);

            if (!validationResult.isValid) {
                manager._log('Валидация не прошла', {
                    error: validationResult.error,
                    validationMetrics: manager.validationManager.getPerformanceMetrics(),
                    validationStats: manager.validationManager.getValidationStatistics()
                });

                const statusShown = manager.statusManager.showError(validationResult.error);

                if (!statusShown) {
                    manager._log('Предупреждение: не удалось отобразить статус ошибки валидации');
                }

                return false;
            }

            manager._log('Валидация URL успешна', {
                url: validationResult.value.substring(0, 50) + (validationResult.value.length > 50 ? '...' : ''),
                validationMetrics: manager.validationManager.getPerformanceMetrics()
            });

            const saveSuccess = await manager.storageManager.saveBackendUrl(validationResult.value);

            if (!saveSuccess) {
                throw new Error('Верификация сохранения не удалась');
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(validationResult.value);

            if (!notifySuccess) {
                manager._log('Background script не был уведомлен (продолжаем работу)');
            }

            const statusShown = manager.statusManager.showSuccess(
                manager.localeManager.t('options.status.settingsSaved')
            );

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log('Настройки успешно сохранены', {
                totalTime: `${totalTime}мс`,
                backgroundNotified: notifySuccess,
                statusDisplayed: statusShown,
                statusMetrics: manager.statusManager.getPerformanceMetrics(),
                validationMetrics: manager.validationManager.getPerformanceMetrics(),
                domMetrics: manager.domManager.getPerformanceMetrics(),
                storageMetrics: manager.storageManager.getPerformanceMetrics()
            });

            return true;
        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            manager._logError(`Ошибка сохранения настроек (${totalTime}мс)`, error);

            const errorMessage = error.message.includes('Верификация')
                ? manager.localeManager.t('options.status.saveFailed')
                : manager.localeManager.t('options.status.saveError');

            const statusShown = manager.statusManager.showError(errorMessage);

            if (!statusShown) {
                manager._log('Предупреждение: не удалось отобразить статус ошибки сохранения');
            }

            return false;
        } finally {
            const buttonRestored = manager.domManager.setButtonState(
                saveBtn,
                originalText,
                false
            );

            if (!buttonRestored) {
                manager._log('Предупреждение: не удалось восстановить состояние кнопки сохранения');
            }
        }
    }

    async resetToDefault() {
        const manager = this.manager;
        const resetBtn = manager.domManager.elements.resetBtn;
        const originalText = manager.localeManager.t('options.buttons.reset');
        const operationStartTime = performance.now();

        try {
            manager._log('Начало операции сброса настроек');

            const buttonStateSet = manager.domManager.setButtonState(
                resetBtn,
                manager.localeManager.t('options.buttons.resetting'),
                true
            );

            if (!buttonStateSet) {
                manager._log('Предупреждение: не удалось обновить состояние кнопки сброса');
            }

            const defaultUrl = await manager.storageManager.resetToDefault();

            const uiUpdateSuccess = manager.domManager.setBackendUrlValue(defaultUrl);

            if (!uiUpdateSuccess) {
                manager._logError('Не удалось обновить UI после сброса настроек');

                const warningShown = manager.statusManager.showWarning(
                    manager.localeManager.t('options.status.uiUpdateError')
                );

                if (!warningShown) {
                    manager._log('Предупреждение: не удалось отобразить предупреждение о проблеме с UI');
                }
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(defaultUrl);

            if (!notifySuccess) {
                manager._log('Background script не был уведомлен (продолжаем работу)');
            }

            const statusShown = manager.statusManager.showSuccess(
                manager.localeManager.t('options.status.settingsReset')
            );

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log('Настройки сброшены к значениям по умолчанию', {
                defaultUrl,
                totalTime: `${totalTime}мс`,
                uiUpdateSuccess,
                backgroundNotified: notifySuccess,
                statusDisplayed: statusShown,
                statusMetrics: manager.statusManager.getPerformanceMetrics(),
                domMetrics: manager.domManager.getPerformanceMetrics(),
                storageMetrics: manager.storageManager.getPerformanceMetrics()
            });

            return true;
        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            manager._logError(`Ошибка сброса настроек (${totalTime}мс)`, error);

            const statusShown = manager.statusManager.showError(
                manager.localeManager.t('options.status.resetError')
            );

            if (!statusShown) {
                manager._log('Предупреждение: не удалось отобразить статус ошибки сброса');
            }

            return false;
        } finally {
            const buttonRestored = manager.domManager.setButtonState(
                resetBtn,
                originalText,
                false
            );

            if (!buttonRestored) {
                manager._log('Предупреждение: не удалось восстановить состояние кнопки сброса');
            }
        }
    }

    async toggleLanguage() {
        try {
            await this.manager.localeManager.toggleLocale();
        } catch (error) {
            this.manager._logError('Ошибка переключения языка', error);
        }
    }

    updateLanguageDisplay() {
        const languageCodeElement = document.getElementById('currentLanguage');
        if (languageCodeElement) {
            const locale = this.manager.localeManager.getCurrentLocale();
            languageCodeElement.textContent = locale.toUpperCase();
        }
    }

    onLocaleChange() {
        const manager = this.manager;

        try {
            manager.localeManager.localizeDOM();
            this.updateLanguageDisplay();
            this.updateThemeDisplay();

            const diagnosticsLabel = document.querySelector('.diagnostics-status-label');
            if (diagnosticsLabel) {
                const statusText = manager.localeManager.t('options.diagnostics.status');
                diagnosticsLabel.textContent = (statusText && !statusText.startsWith('options.')) ? statusText : 'Status:';
            }

            const statusValue = document.getElementById('diagnosticsStatusValue');
            if (statusValue) {
                let currentStatus = 'notRun';
                if (statusValue.classList.contains('running')) {
                    currentStatus = 'running';
                } else if (statusValue.classList.contains('success')) {
                    currentStatus = 'success';
                } else if (statusValue.classList.contains('error')) {
                    currentStatus = 'failed';
                }

                manager.diagnosticsWorkflowManager.updateStatus(currentStatus);
            }

            manager._log('Локаль изменена', {
                locale: manager.localeManager.getCurrentLocale()
            });
        } catch (error) {
            manager._logError('Ошибка при изменении локали', error);
        }
    }

    setThemeManager(themeManager) {
        this.manager.themeManager = themeManager;
        this.manager._log('ThemeManager установлен');
    }

    async toggleTheme() {
        const manager = this.manager;

        try {
            if (!manager.themeManager) {
                manager._logError('ThemeManager не установлен');
                return;
            }

            manager._log('Переключение темы');

            const currentTheme = manager.themeManager.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            manager.themeManager.applyTheme(newTheme);
            await manager.themeManager.saveTheme(newTheme);

            this.updateThemeDisplay(newTheme);

            manager._log('Тема переключена', {
                from: currentTheme,
                to: newTheme
            });
        } catch (error) {
            manager._logError('Ошибка переключения темы', error);
            manager.statusManager.showError(
                manager.localeManager.t('options.status.saveError')
            );
        }
    }

    updateThemeDisplay(theme) {
        const manager = this.manager;

        try {
            const themeIconElement = document.getElementById('themeIcon');
            const themeLabelElement = document.getElementById('themeLabel');

            if (!themeIconElement || !themeLabelElement) {
                return;
            }

            const currentTheme = theme || (manager.themeManager ? manager.themeManager.getCurrentTheme() : 'light');

            if (currentTheme === 'dark') {
                themeIconElement.textContent = '🌙';
                themeLabelElement.textContent = manager.localeManager.t('options.theme.dark');
            } else {
                themeIconElement.textContent = '☀️';
                themeLabelElement.textContent = manager.localeManager.t('options.theme.light');
            }
        } catch (error) {
            manager._logError('Ошибка обновления отображения темы', error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
    module.exports.default = UIManager;
}

if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
