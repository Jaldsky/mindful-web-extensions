class UIManager {
    constructor(manager) {
        this.manager = manager;
        this.buttonFeedbackTimers = new Map();
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

    _clearButtonFeedback(buttonKey) {
        if (!this.buttonFeedbackTimers.has(buttonKey)) {
            return;
        }

        clearTimeout(this.buttonFeedbackTimers.get(buttonKey));
        this.buttonFeedbackTimers.delete(buttonKey);
    }

    _setButtonFeedback(buttonKey, button, text, disabled, restoreText, duration = 2000) {
        const manager = this.manager;

        if (!button) {
            manager._log(`Кнопка ${buttonKey} не найдена для отображения состояния`);
            return;
        }

        const truncate = (s, max) => {
            if (typeof s !== 'string') return '';
            if (s.length <= max) return s;
            return `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
        };

        // Ограничиваем длину подписи, чтобы не дергать ширину кнопки
        const maxChars = 18;
        const truncatedText = truncate(text, maxChars);

        const updated = manager.domManager.setButtonState(button, truncatedText, disabled);

        if (!updated) {
            return;
        }

        this._clearButtonFeedback(buttonKey);

        const timerId = setTimeout(() => {
            manager.domManager.setButtonState(button, restoreText, false);
            this.buttonFeedbackTimers.delete(buttonKey);
        }, duration);

        this.buttonFeedbackTimers.set(buttonKey, timerId);
    }

    async saveSettings() {
        const manager = this.manager;
        const saveBtn = manager.domManager.elements.saveBtn;
        const originalText = manager.localeManager.t('options.buttons.save');
        const operationStartTime = performance.now();
        const backendInput = manager.domManager.elements.backendUrl;
        const isTestEnv = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID !== undefined;
        const MIN_PROCESSING_FEEDBACK_MS = isTestEnv ? 0 : 900;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        this._clearButtonFeedback('saveBtn');

        if (backendInput) {
            backendInput.setCustomValidity('');
        }

        try {
            manager._log('Начало операции сохранения настроек');

            const savingStartTime = performance.now();
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

                const message = manager.localeManager.t('options.status.uiUpdateError');
                this._setButtonFeedback('saveBtn', saveBtn, message, false, originalText, 3000);

                return false;
            }

            const validationResult = manager.validationManager.validateBackendUrl(backendUrl);

            if (!validationResult.isValid) {
                manager._log('Валидация не прошла', {
                    error: validationResult.error,
                    validationMetrics: manager.validationManager.getPerformanceMetrics(),
                    validationStats: manager.validationManager.getValidationStatistics()
                });

                if (backendInput) {
                    backendInput.setCustomValidity(validationResult.error);
                    backendInput.reportValidity();
                    setTimeout(() => backendInput.setCustomValidity(''), 0);
                }

                // Показываем ошибку согласно ожиданиям тестов
                manager.statusManager.showError(validationResult.error);

                manager.domManager.setButtonState(saveBtn, originalText, false);

                return false;
            }

            if (backendInput) {
                backendInput.setCustomValidity('');
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

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log('Настройки успешно сохранены', {
                totalTime: `${totalTime}мс`,
                backgroundNotified: notifySuccess,
                statusDisplayed: false,
                statusMetrics: manager.statusManager.getPerformanceMetrics(),
                validationMetrics: manager.validationManager.getPerformanceMetrics(),
                domMetrics: manager.domManager.getPerformanceMetrics(),
                storageMetrics: manager.storageManager.getPerformanceMetrics()
            });

            const elapsedSinceSaving = performance.now() - savingStartTime;
            if (elapsedSinceSaving < MIN_PROCESSING_FEEDBACK_MS) {
                await sleep(MIN_PROCESSING_FEEDBACK_MS - elapsedSinceSaving);
            }
            manager.domManager.setButtonState(saveBtn, originalText, false);

            return true;
        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            manager._logError(`Ошибка сохранения настроек (${totalTime}мс)`, error);

            const errorMessage = error.message.includes('Верификация')
                ? manager.localeManager.t('options.status.saveFailed')
                : manager.localeManager.t('options.status.saveError');

            this._setButtonFeedback('saveBtn', saveBtn, errorMessage, false, originalText, 4000);

            return false;
        }
    }

    async resetToDefault() {
        const manager = this.manager;
        const resetBtn = manager.domManager.elements.resetBtn;
        const originalText = manager.localeManager.t('options.buttons.reset');
        const operationStartTime = performance.now();
        const isTestEnv = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID !== undefined;
        const MIN_PROCESSING_FEEDBACK_MS = isTestEnv ? 0 : 900;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        this._clearButtonFeedback('resetBtn');

        try {
            manager._log('Начало операции сброса настроек');

            const resettingStartTime = performance.now();
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
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(defaultUrl);

            if (!notifySuccess) {
                manager._log('Background script не был уведомлен (продолжаем работу)');
            }

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log('Настройки сброшены к значениям по умолчанию', {
                defaultUrl,
                totalTime: `${totalTime}мс`,
                uiUpdateSuccess,
                backgroundNotified: notifySuccess,
                statusDisplayed: false,
                statusMetrics: manager.statusManager.getPerformanceMetrics(),
                domMetrics: manager.domManager.getPerformanceMetrics(),
                storageMetrics: manager.storageManager.getPerformanceMetrics()
            });

            const elapsedSinceResetting = performance.now() - resettingStartTime;
            if (elapsedSinceResetting < MIN_PROCESSING_FEEDBACK_MS) {
                await sleep(MIN_PROCESSING_FEEDBACK_MS - elapsedSinceResetting);
            }
            manager.domManager.setButtonState(resetBtn, originalText, false);

            return true;
        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            manager._logError(`Ошибка сброса настроек (${totalTime}мс)`, error);

            const errorMessage = manager.localeManager.t('options.status.resetError');
            this._setButtonFeedback('resetBtn', resetBtn, errorMessage, false, originalText, 4000);

            return false;
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
        const languageIconElement = document.querySelector('.language-icon');
        const languageToggleBtn = document.getElementById('languageToggle');

        const locale = this.manager.localeManager.getCurrentLocale();

        if (languageCodeElement) {
            languageCodeElement.textContent = locale.toUpperCase();
        }

        if (languageIconElement) {
            const flag = locale === 'ru' ? '🇷🇺' : '🇺🇸';
            languageIconElement.textContent = flag;
        }

        if (languageToggleBtn) {
            const nextLocale = locale === 'ru' ? 'en' : 'ru';
            const nextFlag = nextLocale === 'ru' ? '🇷🇺' : '🇺🇸';
            const nextName = this.manager.localeManager && typeof this.manager.localeManager.t === 'function'
                ? (nextLocale === 'ru' ? 'Русский' : 'English')
                : nextLocale.toUpperCase();
            languageToggleBtn.setAttribute('title', `${nextFlag} ${nextName}`);
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
            // На кнопке показываем целевую тему (ту, на которую переключимся при клике)
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';

            if (targetTheme === 'dark') {
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
