const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для отображения локали.
 * Отвечает за обновление отображения языка и обработку изменений локали.
 * 
 * @class LocaleDisplayManager
 */
class LocaleDisplayManager {
    /**
     * Создает экземпляр LocaleDisplayManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Переключает язык.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleLanguage() {
        try {
            await this.manager.localeManager.toggleLocale();
        } catch (error) {
            this.manager._logError({ key: 'logs.ui.localeDisplay.toggleLanguageError' }, error);
        }
    }

    /**
     * Обновляет отображение языка.
     * 
     * @returns {void}
     */
    updateLanguageDisplay() {
        const languageCodeElement = document.getElementById('currentLanguage');
        const languageIconElement = document.querySelector('.language-icon');
        const languageToggleBtn = document.getElementById('languageToggle');

        const locale = this.manager.localeManager.getCurrentLocale();

        if (languageCodeElement) {
            languageCodeElement.textContent = locale.toUpperCase();
        }

        if (languageIconElement) {
            languageIconElement.textContent = locale === 'ru' ? CONFIG.UI.LOCALE_DISPLAY.FLAGS.RU : CONFIG.UI.LOCALE_DISPLAY.FLAGS.EN;
        }

        if (languageToggleBtn) {
            const nextLocale = locale === 'ru' ? 'en' : 'ru';
            const nextFlag = nextLocale === 'ru' ? CONFIG.UI.LOCALE_DISPLAY.FLAGS.RU : CONFIG.UI.LOCALE_DISPLAY.FLAGS.EN;
            const nextName = this.manager.localeManager && typeof this.manager.localeManager.t === 'function'
                ? (nextLocale === 'ru' ? 'Русский' : 'English')
                : nextLocale.toUpperCase();
            languageToggleBtn.setAttribute('title', `${nextFlag} ${nextName}`);
        }
    }

    /**
     * Обрабатывает изменение локали.
     * 
     * @returns {void}
     */
    onLocaleChange() {
        const manager = this.manager;

        try {
            manager.localeManager.localizeDOM();
            this.updateLanguageDisplay();
            manager.uiManager.updateThemeDisplay();
            manager.uiManager.domainExceptionsManager.renderDomainExceptions();

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

            if (typeof manager.updateConnectionLastCheckLocale === 'function') {
                manager.updateConnectionLastCheckLocale();
            }

            if (manager._lastConnectionStatus !== undefined) {
                manager.updateConnectionStatus(manager._lastConnectionStatus);
            }

        } catch (error) {
            manager._logError({ key: 'logs.ui.localeDisplay.localeChangeError' }, error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocaleDisplayManager;
    module.exports.default = LocaleDisplayManager;
}

if (typeof window !== 'undefined') {
    window.LocaleDisplayManager = LocaleDisplayManager;
}
