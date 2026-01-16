const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для настройки обработчиков событий.
 * Отвечает за установку всех обработчиков событий на странице настроек.
 * 
 * @class EventHandlersManager
 */
class EventHandlersManager {
    /**
     * Создает экземпляр EventHandlersManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Настраивает обработчики событий.
     * 
     * @returns {void}
     */
    setupEventHandlers() {
        const manager = this.manager;

        if (manager.domManager.elements.settingsForm) {
            const formSubmitHandler = (e) => {
                e.preventDefault();
                manager.saveSettings();
            };

            manager.domManager.elements.settingsForm.addEventListener('submit', formSubmitHandler);
            manager.eventHandlers.set('settingsForm', formSubmitHandler);
        } else {
            manager._log({ key: 'logs.ui.eventHandlers.settingsFormNotFound' });
        }

        if (manager.domManager.elements.onboardingTryBtn) {
            const handler = async (e) => {
                e.preventDefault();
                await manager.storageManager.saveOnboardingCompleted(true);
                manager.uiManager.authManager.hideOnboarding();
            };
            manager.domManager.elements.onboardingTryBtn.addEventListener('click', handler);
            manager.eventHandlers.set('onboardingTryBtn', handler);
        }

        if (manager.domManager.elements.onboardingLoginBtn) {
            const handler = async (e) => {
                e.preventDefault();
                await manager.storageManager.saveOnboardingCompleted(true);
                manager.uiManager.authManager.hideOnboarding();
                manager.statusManager.showInfo(
                    manager.localeManager.t('options.onboarding.signInHint') || 
                    'Для авторизации кликните на иконку расширения'
                );
            };
            manager.domManager.elements.onboardingLoginBtn.addEventListener('click', handler);
            manager.eventHandlers.set('onboardingLoginBtn', handler);
        }

        if (manager.domManager.elements.resetBtn) {
            manager.originalButtonTexts.set('resetBtn', manager.domManager.elements.resetBtn.textContent);

            const resetClickHandler = () => {
                manager.resetToDefault();
            };

            manager.domManager.elements.resetBtn.addEventListener('click', resetClickHandler);
            manager.eventHandlers.set('resetBtn', resetClickHandler);
        } else {
            manager._log({ key: 'logs.ui.eventHandlers.resetBtnNotFound' });
        }

        if (manager.domManager.elements.saveBtn) {
            manager.originalButtonTexts.set('saveBtn', manager.domManager.elements.saveBtn.textContent);
        } else {
            manager._log({ key: 'logs.ui.eventHandlers.saveBtnNotFound' });
        }

        if (manager.domManager.elements.runDiagnostics) {
            manager.originalButtonTexts.set('runDiagnostics', manager.domManager.elements.runDiagnostics.textContent);

            const diagnosticsClickHandler = async () => {
                await manager.runDiagnostics();
            };

            manager.domManager.elements.runDiagnostics.addEventListener('click', diagnosticsClickHandler);
            manager.eventHandlers.set('runDiagnostics', diagnosticsClickHandler);
        } else {
            manager._log({ key: 'logs.ui.eventHandlers.runDiagnosticsBtnNotFound' });
        }

        const clearDiagnostics = document.getElementById('clearDiagnostics');
        if (clearDiagnostics) {
            const handler = () => manager.clearDiagnostics();
            clearDiagnostics.addEventListener('click', handler);
            manager.eventHandlers.set('clearDiagnostics', handler);
        }

        const closeDevToolsPanel = document.getElementById('closeDevToolsPanel');
        if (closeDevToolsPanel) {
            const handler = () => manager.closeDevToolsPanel();
            closeDevToolsPanel.addEventListener('click', handler);
            manager.eventHandlers.set('closeDevToolsPanel', handler);
        }

        const logsTab = document.getElementById('logsTab');
        if (logsTab) {
            const handler = () => manager.switchTab('logs');
            logsTab.addEventListener('click', handler);
            manager.eventHandlers.set('logsTab', handler);
        }

        const diagnosticsTab = document.getElementById('diagnosticsTab');
        if (diagnosticsTab) {
            const handler = () => manager.switchTab('diagnostics');
            diagnosticsTab.addEventListener('click', handler);
            manager.eventHandlers.set('diagnosticsTab', handler);
        }

        const clearLogs = document.getElementById('clearLogs');
        if (clearLogs) {
            const handler = () => manager.clearLogs();
            clearLogs.addEventListener('click', handler);
            manager.eventHandlers.set('clearLogs', handler);
        }

        const copyLogs = document.getElementById('copyLogs');
        if (copyLogs) {
            const handler = () => manager.copyLogs();
            copyLogs.addEventListener('click', handler);
            manager.eventHandlers.set('copyLogs', handler);
        }

        const rangeSelect = document.getElementById('activityRangeSelect');
        if (rangeSelect) {
            rangeSelect.value = manager.uiManager.activityRangeKey;
            const handler = (e) => {
                const key = e.target.value;
                manager.uiManager.activityManager.setActivityRangeByKey(key);
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
        });

        const classFilter = document.getElementById('logsClassFilter');
        if (classFilter) {
            const handler = (e) => {
                manager.setLogClassFilter(e.target.value);
            };
            classFilter.addEventListener('change', handler);
            manager.eventHandlers.set('logsClassFilter', handler);
        }

        const serverOnlyFilter = document.getElementById('logsServerOnlyFilter');
        if (serverOnlyFilter) {
            const handler = (e) => {
                manager.setServerOnlyFilter(e.target.checked);
            };
            serverOnlyFilter.addEventListener('change', handler);
            manager.eventHandlers.set('logsServerOnlyFilter', handler);
        }

        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
            const handler = async () => {
                await manager.toggleLanguage();
            };
            languageToggle.addEventListener('click', handler);
            manager.eventHandlers.set('languageToggle', handler);
        }

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const handler = async () => {
                await manager.toggleTheme();
            };
            themeToggle.addEventListener('click', handler);
            manager.eventHandlers.set('themeToggle', handler);
        }

        const addDomainBtn = manager.domManager.elements.addDomainExceptionBtn;
        if (addDomainBtn) {
            const handler = (event) => {
                event.preventDefault();
                manager.uiManager.addDomainException();
            };
            addDomainBtn.addEventListener('click', handler);
            manager.eventHandlers.set('addDomainExceptionBtn', handler);
        }

        const domainInput = manager.domManager.elements.domainExceptionInput;
        if (domainInput) {
            const handler = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    manager.uiManager.addDomainException();
                }
            };
            domainInput.addEventListener('keydown', handler);
            manager.eventHandlers.set('domainExceptionInputKeydown', handler);
        }

        const domainList = manager.domManager.elements.domainExceptionsList;
        if (domainList) {
            const handler = (event) => {
                const button = event.target && event.target.closest ? event.target.closest(`.${CONFIG.UI.DOMAIN_EXCEPTIONS.CSS_CLASSES.REMOVE_BUTTON}`) : null;
                if (!button) {
                    return;
                }
                event.preventDefault();
                const domain = button.getAttribute('data-domain');
                manager.uiManager.removeDomainException(domain);
            };
            domainList.addEventListener('click', handler);
            manager.eventHandlers.set('domainExceptionsList', handler);
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
        } else {
            manager._log({ key: 'logs.ui.eventHandlers.toggleDeveloperToolsBtnNotFound' });
        }

        const visHandler = () => {
            try {
                if (document.visibilityState === 'visible') {
                    manager.activityManager.startActivityAutoRefresh();
                    manager.activityManager.loadActivityStats().catch(() => {});
                } else {
                    manager.activityManager.stopActivityAutoRefresh();
                }
            } catch (_) {}
        };
        document.addEventListener('visibilitychange', visHandler);
        manager.eventHandlers.set('visibilitychange', visHandler);

        const focusHandler = () => {
            try {
                manager.activityManager.startActivityAutoRefresh();
            } catch (_) {}
        };
        const blurHandler = () => {
            try {
                manager.activityManager.stopActivityAutoRefresh();
            } catch (_) {}
        };
        window.addEventListener('focus', focusHandler);
        window.addEventListener('blur', blurHandler);
        manager.eventHandlers.set('windowFocus', focusHandler);
        manager.eventHandlers.set('windowBlur', blurHandler);

        manager.developerToolsManager.restoreState();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventHandlersManager;
    module.exports.default = EventHandlersManager;
}

if (typeof window !== 'undefined') {
    window.EventHandlersManager = EventHandlersManager;
}
