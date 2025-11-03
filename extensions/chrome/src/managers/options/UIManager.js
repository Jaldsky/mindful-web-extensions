const CONFIG = require('../../../config.js');
const { normalizeDomain, normalizeDomainList } = require('../../utils/domainUtils.js');

class UIManager {
    constructor(manager) {
        this.manager = manager;
        this.buttonFeedbackTimers = new Map();
        this.activityHistory = [];
        this.activityChartInitialized = false;
        this.activityRangeKey = (CONFIG.ACTIVITY && CONFIG.ACTIVITY.DEFAULT_RANGE_KEY) || '1h';
        this.activityRangeMs = (CONFIG.ACTIVITY && CONFIG.ACTIVITY.RANGES && CONFIG.ACTIVITY.RANGES[this.activityRangeKey]) || (60 * 60 * 1000);
        this.domainExceptions = new Set();
    }

    _getLocaleText(key, fallback) {
        try {
            if (this.manager && this.manager.localeManager && typeof this.manager.localeManager.t === 'function') {
                const translated = this.manager.localeManager.t(key);
                if (translated && translated !== key) {
                    return translated;
                }
            }
        } catch (error) {
            this.manager._logError(`Ошибка получения текста локали для ключа ${key}`, error);
        }
        return fallback;
    }

    setDomainExceptions(domains) {
        const normalizedList = normalizeDomainList(domains);
        this.domainExceptions = new Set(normalizedList);
        if (this.manager) {
            this.manager.domainExceptions = normalizedList;
        }
        this.renderDomainExceptions();
    }

    getDomainExceptions() {
        return Array.from(this.domainExceptions);
    }

    _showDomainInputError(key, fallback) {
        const input = this.manager?.domManager?.elements?.domainExceptionInput;
        if (!input) {
            return;
        }
        const message = this._getLocaleText(key, fallback);
        try {
            input.setCustomValidity(message);
            input.reportValidity();
            setTimeout(() => {
                try { input.setCustomValidity(''); } catch (_) {}
            }, 0);
        } catch (error) {
            this.manager._logError('Ошибка отображения ошибки ввода домена', error);
        }
    }

    addDomainException(value) {
        const input = this.manager?.domManager?.elements?.domainExceptionInput;
        const rawValue = value !== undefined ? value : (input ? input.value : '');
        const normalized = normalizeDomain(rawValue);

        if (!normalized) {
            this._showDomainInputError('options.form.domainExceptionsInvalid', 'Enter a valid domain name');
            return false;
        }

        if (this.domainExceptions.has(normalized)) {
            this._showDomainInputError('options.form.domainExceptionsDuplicate', 'Domain is already in the exclusion list');
            return false;
        }

        this.domainExceptions.add(normalized);
        if (this.manager) {
            this.manager.domainExceptions = this.getDomainExceptions();
        }
        this.renderDomainExceptions();

        if (input) {
            input.value = '';
            input.setCustomValidity('');
            input.focus();
        }

        this.manager._log('Домен добавлен в исключения', { domain: normalized });
        return true;
    }

    removeDomainException(domain) {
        if (!domain) {
            return;
        }
        const normalized = normalizeDomain(domain);
        if (!normalized || !this.domainExceptions.has(normalized)) {
            return;
        }

        this.domainExceptions.delete(normalized);
        if (this.manager) {
            this.manager.domainExceptions = this.getDomainExceptions();
        }
        this.renderDomainExceptions();

        this.manager._log('Домен удален из исключений', { domain: normalized });
    }

    renderDomainExceptions() {
        const list = this.manager?.domManager?.elements?.domainExceptionsList;
        if (!list) {
            this.manager?._log('Список исключений доменов не найден в DOM');
            return;
        }

        list.innerHTML = '';
        const domains = this.getDomainExceptions();

        if (domains.length === 0) {
            try {
                list.classList.remove('has-items');
            } catch (_) {}
            return;
        }

        try {
            list.classList.add('has-items');
        } catch (_) {}

        const removeLabel = this._getLocaleText('options.form.domainExceptionsRemove', 'Remove from exclusion list');

        domains.forEach(domain => {
            const item = document.createElement('li');
            item.className = 'domain-exception-item';

            const text = document.createElement('span');
            text.textContent = domain;
            item.appendChild(text);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'domain-exception-remove';
            button.setAttribute('data-domain', domain);
            button.setAttribute('title', removeLabel);
            button.setAttribute('aria-label', `${removeLabel}: ${domain}`);
            button.textContent = '✕';
            item.appendChild(button);

            list.appendChild(item);
        });
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

        // activityTab removed: activity is now always-visible panel

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

        // refresh button removed; auto-refresh is enabled instead

        // Activity range select
        const rangeSelect = document.getElementById('activityRangeSelect');
        if (rangeSelect) {
            rangeSelect.value = this.activityRangeKey;
            const handler = (e) => {
                const key = e.target.value;
                this.setActivityRangeByKey(key);
            };
            rangeSelect.addEventListener('change', handler);
            manager.eventHandlers.set('activityRangeSelect', handler);
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

        const addDomainBtn = manager.domManager.elements.addDomainExceptionBtn;
        if (addDomainBtn) {
            const handler = (event) => {
                event.preventDefault();
                this.addDomainException();
            };
            addDomainBtn.addEventListener('click', handler);
            manager.eventHandlers.set('addDomainExceptionBtn', handler);
            handlersCount++;
        }

        const domainInput = manager.domManager.elements.domainExceptionInput;
        if (domainInput) {
            const handler = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.addDomainException();
                }
            };
            domainInput.addEventListener('keydown', handler);
            manager.eventHandlers.set('domainExceptionInputKeydown', handler);
            handlersCount++;
        }

        const domainList = manager.domManager.elements.domainExceptionsList;
        if (domainList) {
            const handler = (event) => {
                const button = event.target && event.target.closest ? event.target.closest('.domain-exception-remove') : null;
                if (!button) {
                    return;
                }
                event.preventDefault();
                const domain = button.getAttribute('data-domain');
                this.removeDomainException(domain);
            };
            domainList.addEventListener('click', handler);
            manager.eventHandlers.set('domainExceptionsList', handler);
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

        // Visibility-based auto-refresh control for activity
        const visHandler = () => {
            try {
                if (document.visibilityState === 'visible') {
                    this.startActivityAutoRefresh();
                    this.loadActivityStats().catch(() => {});
                } else {
                    this.stopActivityAutoRefresh();
                }
            } catch (_) {}
        };
        document.addEventListener('visibilitychange', visHandler);
        manager.eventHandlers.set('visibilitychange', visHandler);
        handlersCount++;

        const focusHandler = () => {
            try {
                this.startActivityAutoRefresh();
            } catch (_) {}
        };
        const blurHandler = () => {
            try {
                this.stopActivityAutoRefresh();
            } catch (_) {}
        };
        window.addEventListener('focus', focusHandler);
        window.addEventListener('blur', blurHandler);
        manager.eventHandlers.set('windowFocus', focusHandler);
        manager.eventHandlers.set('windowBlur', blurHandler);
        handlersCount += 2;

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

            const domainExceptions = this.getDomainExceptions();
            const domainsSaved = await manager.storageManager.saveDomainExceptions(domainExceptions);

            if (!domainsSaved) {
                throw new Error('Не удалось сохранить список исключений доменов');
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(validationResult.value);

            if (!notifySuccess) {
                manager._log('Background script не был уведомлен (продолжаем работу)');
            }

            const notifyDomainSuccess = await manager.storageManager.notifyDomainExceptionsUpdate(domainExceptions);

            if (!notifyDomainSuccess) {
                manager._log('Background script не получил обновление исключений доменов (продолжаем работу)');
            }

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log('Настройки успешно сохранены', {
                totalTime: `${totalTime}мс`,
                backgroundNotified: notifySuccess,
                domainExceptionsCount: domainExceptions.length,
                domainNotification: notifyDomainSuccess,
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

            const defaultDomainExceptions = [];
            const domainsReset = await manager.storageManager.saveDomainExceptions(defaultDomainExceptions);

            if (!domainsReset) {
                throw new Error('Не удалось сбросить список исключений доменов');
            }

            this.setDomainExceptions(defaultDomainExceptions);

            const uiUpdateSuccess = manager.domManager.setBackendUrlValue(defaultUrl);

            if (!uiUpdateSuccess) {
                manager._logError('Не удалось обновить UI после сброса настроек');
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(defaultUrl);

            if (!notifySuccess) {
                manager._log('Background script не был уведомлен (продолжаем работу)');
            }

            const notifyDomainSuccess = await manager.storageManager.notifyDomainExceptionsUpdate(defaultDomainExceptions);

            if (!notifyDomainSuccess) {
                manager._log('Background script не получил обновление исключений доменов (продолжаем работу)');
            }

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log('Настройки сброшены к значениям по умолчанию', {
                defaultUrl,
                totalTime: `${totalTime}мс`,
                uiUpdateSuccess,
                backgroundNotified: notifySuccess,
                domainExceptionsCount: this.domainExceptions.size,
                domainNotification: notifyDomainSuccess,
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
            this.renderDomainExceptions();

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

    async loadActivityStats() {
        const manager = this.manager;
        try {
            const stats = await manager.serviceWorkerManager.getDetailedStats();

            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = String(value);
                }
            };

            setText('activityEvents', stats.eventsTracked);
            setText('activityActive', stats.activeEvents);
            setText('activityInactive', stats.inactiveEvents);
            setText('activityDomainsCount', stats.domainsVisited);
            setText('activityQueueSize', stats.queueSize);

            const list = document.getElementById('activityDomainsList');
            if (list) {
                list.innerHTML = '';
                const domains = Array.isArray(stats.domains) ? stats.domains : [];
                if (domains.length === 0) {
                    const li = document.createElement('li');
                    li.className = 'activity-domains-empty';
                    const emptyText = (this.manager.localeManager && typeof this.manager.localeManager.t === 'function')
                        ? (this.manager.localeManager.t('options.activity.noDomains') || 'No domains')
                        : 'No domains';
                    li.textContent = emptyText;
                    list.appendChild(li);
                } else {
                    const maxItems = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.MAX_DOMAINS_DISPLAY === 'number')
                        ? CONFIG.ACTIVITY.MAX_DOMAINS_DISPLAY
                        : 100;
                    domains.slice(0, maxItems).forEach(domain => {
                        const li = document.createElement('li');
                        li.textContent = domain;
                        list.appendChild(li);
                    });
                }
            }

            manager._log('Обновлены данные активности', { countDomains: stats.domainsVisited });

            this._updateActivityChart(stats.eventsTracked, true);

            // meta labels removed by design
        } catch (error) {
            manager._logError('Ошибка загрузки подробной статистики', error);
        }
    }

    setActivityRangeByKey(key) {
        try {
            if (!CONFIG.ACTIVITY || !CONFIG.ACTIVITY.RANGES || !CONFIG.ACTIVITY.RANGES[key]) {
                return;
            }
            this.activityRangeKey = key;
            this.activityRangeMs = CONFIG.ACTIVITY.RANGES[key];
            this._markActiveRangeButton(key);
            // Redraw with new range without adding a new point
            const last = this.activityHistory.length > 0 ? this.activityHistory[this.activityHistory.length - 1].v : 0;
            this._updateActivityChart(last, false);
        } catch (error) {
            this.manager._logError('Ошибка установки диапазона активности', error);
        }
    }

    _markActiveRangeButton(key) {
        const select = document.getElementById('activityRangeSelect');
        if (select) {
            select.value = key;
        }
    }

    startActivityAutoRefresh() {
        const manager = this.manager;
        try {
            this.stopActivityAutoRefresh();
            const interval = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.AUTO_REFRESH_INTERVAL === 'number' && CONFIG.ACTIVITY.AUTO_REFRESH_INTERVAL > 0)
                ? CONFIG.ACTIVITY.AUTO_REFRESH_INTERVAL
                : ((CONFIG.LOGS && typeof CONFIG.LOGS.AUTO_REFRESH_INTERVAL === 'number') ? CONFIG.LOGS.AUTO_REFRESH_INTERVAL : 1000);
            // Immediate tick so UI updates without waiting a full interval
            this.loadActivityStats().catch(() => {});
            manager.activityRefreshIntervalId = setInterval(() => {
                this.loadActivityStats().catch(() => {});
            }, interval);
            manager._log(`Автообновление активности запущено (каждые ${interval}мс)`);
        } catch (error) {
            manager._logError('Ошибка запуска автообновления активности', error);
        }
    }

    _ensureActivityChartInitialized() {
        if (this.activityChartInitialized) {
            return;
        }

        const canvas = document.getElementById('activityChart');
        if (!canvas) {
            return;
        }

        // Set canvas height from config if provided
        const height = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.CHART_HEIGHT === 'number')
            ? CONFIG.ACTIVITY.CHART_HEIGHT
            : (canvas.height || 120);
        // Ensure CSS height reflects configured height
        try { canvas.style.height = `${height}px`; } catch (_) {}
        // Set initial device-pixel sized backing store
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = canvas.clientWidth || canvas.offsetWidth || 300;
        const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
        const targetHeight = Math.max(1, Math.floor(height * dpr));
        if (canvas.width !== targetWidth) canvas.width = targetWidth;
        if (canvas.height !== targetHeight) canvas.height = targetHeight;
        this.activityChartInitialized = true;
    }

    _updateActivityChart(currentValue, addPoint = true) {
        try {
            this._ensureActivityChartInitialized();
            const canvas = document.getElementById('activityChart');
            if (!canvas) {
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            const cssWidth = canvas.clientWidth || canvas.offsetWidth || 300;
            const cssHeight = parseFloat(getComputedStyle(canvas).height) || canvas.height || 120;
            const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
            const targetHeight = Math.max(1, Math.floor(cssHeight * dpr));
            if (canvas.width !== targetWidth) canvas.width = targetWidth;
            if (canvas.height !== targetHeight) canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);

            // Update history
            const maxPoints = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.CHART_MAX_POINTS === 'number')
                ? CONFIG.ACTIVITY.CHART_MAX_POINTS
                : 60;

            const now = Date.now();
            if (addPoint) {
                this.activityHistory.push({ t: now, v: Number(currentValue) || 0 });
            }
            // Prune old points beyond max history window
            const maxWindow = (CONFIG.ACTIVITY && CONFIG.ACTIVITY.HISTORY_MAX_MS) || (24 * 60 * 60 * 1000);
            const minTime = now - maxWindow;
            if (this.activityHistory.length > 0) {
                let startIndex = 0;
                while (startIndex < this.activityHistory.length && this.activityHistory[startIndex].t < minTime) {
                    startIndex++;
                }
                if (startIndex > 0) {
                    this.activityHistory.splice(0, startIndex);
                }
            }
            if (this.activityHistory.length > maxPoints) {
                this.activityHistory.splice(0, this.activityHistory.length - maxPoints);
            }

            // Filter by selected time range
            const rangeMs = this.activityRangeMs || ((CONFIG.ACTIVITY && CONFIG.ACTIVITY.RANGES && CONFIG.ACTIVITY.RANGES['1h']) || 60 * 60 * 1000);
            const cutoff = now - rangeMs;
            const data = this.activityHistory.filter(p => p.t >= cutoff);

            const values = data.map(p => p.v);
            const minV = Math.min(...values);
            const maxV = Math.max(...values);

            // Integer-only ticks for event counts
            const yDesiredCount = (CONFIG.ACTIVITY && Number.isFinite(CONFIG.ACTIVITY.GRID_Y_COUNT)) ? Math.max(2, CONFIG.ACTIVITY.GRID_Y_COUNT) : 4;
            let minInt = isFinite(minV) ? Math.floor(minV) : 0;
            let maxInt = isFinite(maxV) ? Math.ceil(maxV) : 1;
            if (maxInt - minInt <= 0) {
                minInt = Math.max(0, minInt - 1);
                maxInt = minInt + 1;
            }
            const step = Math.max(1, Math.ceil((maxInt - minInt) / yDesiredCount));
            const ticksAll = [];
            for (let v = minInt; v <= maxInt; v += step) {
                ticksAll.push(v);
            }
            const maxTicks = yDesiredCount + 1;
            const sampleStep = Math.max(1, Math.ceil(ticksAll.length / maxTicks));
            const yTicks = ticksAll.filter((_, i) => i % sampleStep === 0);
            while (yTicks.length > maxTicks) yTicks.pop();
            const axisMin = minInt;
            const axisMax = maxInt;
            const axisRange = Math.max(1, axisMax - axisMin);
            const basePadding = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.CHART_PADDING === 'number')
                ? CONFIG.ACTIVITY.CHART_PADDING
                : 20;
            const width = cssWidth;
            const height = cssHeight;
            const fontSize = 12;
            ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
            const unitEventsShort = (this.manager.localeManager && typeof this.manager.localeManager.t === 'function')
                ? (this.manager.localeManager.t('options.activity.axis.unitEventsShort') || 'evt')
                : 'evt';
            const formatVal = (v) => `${Math.round(v)} ${unitEventsShort}`;
            // Estimate Y tick label width using computed ticks
            const maxYTickWidth = yTicks.reduce((m, v) => Math.max(m, ctx.measureText(formatVal(v)).width), 0);
            const yTitlePad = 0; // no axis titles
            const xTitlePad = 0; // no axis titles
            const xTickHeight = fontSize; // approximate tick label height
            const spacing = 2; // between tick labels and content
            const leftPadding = basePadding + Math.ceil(maxYTickWidth + 8) + yTitlePad;
            const rightPadding = basePadding + 6;
            const topPadding = basePadding;
            const bottomPadding = basePadding + xTickHeight + spacing + xTitlePad;
            const innerW = Math.max(1, width - leftPadding - rightPadding);
            const innerH = Math.max(1, height - topPadding - bottomPadding);

            // Grid background
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-bg-secondary') || '#f5f5f5';
            ctx.fillRect(0, 0, width, height);

            // Axes
            const axisColor = getComputedStyle(document.body).getPropertyValue('--color-text-secondary') || '#777';
            ctx.strokeStyle = axisColor;
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(leftPadding, topPadding);
            ctx.lineTo(leftPadding, height - bottomPadding);
            ctx.lineTo(width - rightPadding, height - bottomPadding);
            ctx.stroke();

            // Grid and ticks
            const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color') || '#ddd';
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            const xCount = (CONFIG.ACTIVITY && Number.isFinite(CONFIG.ACTIVITY.GRID_X_COUNT)) ? Math.max(2, CONFIG.ACTIVITY.GRID_X_COUNT) : 3;
            // Horizontal grid lines + y labels
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-text-secondary') || '#666';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            yTicks.forEach((val) => {
                const t = (val - axisMin) / axisRange;
                const y = topPadding + innerH - t * innerH;
                ctx.beginPath();
                ctx.moveTo(leftPadding, y);
                ctx.lineTo(width - rightPadding, y);
                ctx.stroke();
                // Avoid overlap with X label at origin: nudge bottom Y label slightly up
                if (Math.abs(y - (height - bottomPadding)) < 1.5) {
                    const prevBaseline = ctx.textBaseline;
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(formatVal(val), leftPadding - 6, y - 1);
                    ctx.textBaseline = prevBaseline;
                } else {
                    ctx.fillText(formatVal(val), leftPadding - 6, y);
                }
            });
            // Vertical grid lines + x labels (time)
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const xMin = cutoff;
            const xMax = now;
            const xRange = Math.max(1, xMax - xMin);
            for (let i = 0; i <= xCount; i++) {
                const t = i / xCount;
                const x = leftPadding + t * innerW;
                ctx.beginPath();
                ctx.moveTo(x, topPadding);
                ctx.lineTo(x, height - bottomPadding);
                ctx.stroke();
                const labelTs = new Date(xMin + t * xRange);
                const hh = String(labelTs.getHours()).padStart(2, '0');
                const mm = String(labelTs.getMinutes()).padStart(2, '0');
                // Adjust alignment at edges to reduce overlap with Y tick label
                const prevAlign = ctx.textAlign;
                let dx = 0;
                if (i === 0) { ctx.textAlign = 'left'; dx = 2; } else if (i === xCount) { ctx.textAlign = 'right'; dx = -2; }
                ctx.fillText(`${hh}:${mm}`, x + dx, height - bottomPadding + 2);
                ctx.textAlign = prevAlign;
            }
            ctx.setLineDash([]);

            // No axis titles

            // Line or single point if not enough data (time-based X)
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--color-primary') || '#4CAF50';
            ctx.lineWidth = 2;
            if (data.length >= 2) {
                ctx.beginPath();
                data.forEach((p, i) => {
                    const xr = (p.t - xMin) / xRange;
                    const x = leftPadding + xr * innerW;
                    const y = topPadding + innerH - ((p.v - axisMin) / axisRange) * innerH;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();
            } else if (data.length === 1) {
                const p = data[0];
                const xr = (p.t - xMin) / xRange;
                const x = leftPadding + xr * innerW;
                const y = topPadding + innerH - ((p.v - axisMin) / axisRange) * innerH;
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } catch (error) {
            this.manager._logError('Ошибка отрисовки графика активности', error);
        }
    }

    stopActivityAutoRefresh() {
        const manager = this.manager;
        try {
            if (manager.activityRefreshIntervalId) {
                clearInterval(manager.activityRefreshIntervalId);
                manager.activityRefreshIntervalId = null;
                manager._log('Автообновление активности остановлено');
            }
        } catch (error) {
            manager._logError('Ошибка остановки автообновления активности', error);
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
