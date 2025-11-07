const CONFIG = require('../../../config.js');

/**
 * Менеджер для управления настройками (сохранение/сброс).
 * Отвечает за сохранение и сброс настроек, а также управление обратной связью кнопок.
 * 
 * @class SettingsManager
 */
class SettingsManager {
    /**
     * Создает экземпляр SettingsManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
        this.buttonFeedbackTimers = new Map();
    }

    /**
     * Очищает обратную связь кнопки.
     * 
     * @private
     * @param {string} buttonKey - Ключ кнопки
     * @returns {void}
     */
    _clearButtonFeedback(buttonKey) {
        if (!this.buttonFeedbackTimers.has(buttonKey)) {
            return;
        }

        clearTimeout(this.buttonFeedbackTimers.get(buttonKey));
        this.buttonFeedbackTimers.delete(buttonKey);
    }

    /**
     * Устанавливает обратную связь кнопки.
     * 
     * @private
     * @param {string} buttonKey - Ключ кнопки
     * @param {HTMLElement} button - Элемент кнопки
     * @param {string} text - Текст кнопки
     * @param {boolean} disabled - Отключена ли кнопка
     * @param {string} restoreText - Текст для восстановления
     * @param {number} [duration=2000] - Длительность в миллисекундах
     * @returns {void}
     */
    _setButtonFeedback(buttonKey, button, text, disabled, restoreText, duration = CONFIG.UI.BUTTON_FEEDBACK.DEFAULT_DURATION) {
        const manager = this.manager;

        if (!button) {
            manager._log({ key: 'logs.ui.settings.buttonNotFound', params: { buttonKey } });
            return;
        }

        const truncate = (s, max) => {
            if (typeof s !== 'string') return '';
            if (s.length <= max) return s;
            return `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
        };

        const maxChars = CONFIG.UI.BUTTON_FEEDBACK.MAX_TEXT_LENGTH;
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

    /**
     * Сохраняет настройки.
     * 
     * @async
     * @returns {Promise<boolean>} true если настройки сохранены успешно
     */
    async saveSettings() {
        const manager = this.manager;
        const saveBtn = manager.domManager.elements.saveBtn;
        const originalText = manager.localeManager.t('options.buttons.save');
        const operationStartTime = performance.now();
        const backendInput = manager.domManager.elements.backendUrl;
        const isTestEnv = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID !== undefined;
        const MIN_PROCESSING_FEEDBACK_MS = isTestEnv ? 0 : CONFIG.UI.BUTTON_FEEDBACK.MIN_PROCESSING_FEEDBACK_MS;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        this._clearButtonFeedback('saveBtn');

        if (backendInput) {
            backendInput.setCustomValidity('');
        }

        try {
            manager._log({ key: 'logs.ui.settings.saveSettingsStart' });

            const savingStartTime = performance.now();
            const buttonStateSet = manager.domManager.setButtonState(
                saveBtn,
                manager.localeManager.t('options.buttons.saving'),
                true
            );

            if (!buttonStateSet) {
                manager._log({ key: 'logs.ui.settings.saveButtonStateUpdateFailed' });
            }

            const backendUrl = manager.domManager.getBackendUrlValue();

            if (!backendUrl && backendUrl !== '') {
                manager._logError({ key: 'logs.ui.settings.backendUrlGetFailed' });

                const message = manager.localeManager.t('options.status.uiUpdateError');
                this._setButtonFeedback('saveBtn', saveBtn, message, false, originalText, CONFIG.UI.BUTTON_FEEDBACK.WARNING_DURATION);

                return false;
            }

            const validationResult = manager.validationManager.validateBackendUrl(backendUrl);

            if (!validationResult.isValid) {
                manager._log({ key: 'logs.ui.settings.validationFailed' }, {
                    error: validationResult.error,
                    validationMetrics: manager.validationManager.getPerformanceMetrics(),
                    validationStats: manager.validationManager.getValidationStatistics()
                });

                if (backendInput) {
                    backendInput.setCustomValidity(validationResult.error);
                    backendInput.reportValidity();
                    setTimeout(() => backendInput.setCustomValidity(''), 0);
                }

                manager.statusManager.showError(validationResult.error);

                manager.domManager.setButtonState(saveBtn, originalText, false);

                return false;
            }

            if (backendInput) {
                backendInput.setCustomValidity('');
            }

            manager._log({ key: 'logs.ui.settings.validationSuccess' }, {
                url: validationResult.value.substring(0, CONFIG.UI.LOGGING.MAX_URL_LENGTH) + (validationResult.value.length > CONFIG.UI.LOGGING.MAX_URL_LENGTH ? '...' : ''),
                validationMetrics: manager.validationManager.getPerformanceMetrics()
            });

            const saveSuccess = await manager.storageManager.saveBackendUrl(validationResult.value);

            if (!saveSuccess) {
                const totalTime = Math.round(performance.now() - operationStartTime);
                manager._logError({ key: 'logs.ui.settings.saveSettingsError', params: { totalTime: `${totalTime}мс` } }, new Error(manager.localeManager.t('logs.ui.settings.verificationFailed')));
                const errorMessage = manager.localeManager.t('options.status.saveFailed');
                this._setButtonFeedback('saveBtn', saveBtn, errorMessage, false, originalText, CONFIG.UI.BUTTON_FEEDBACK.ERROR_DURATION);
                return false;
            }

            const domainExceptions = manager.domainExceptionsManager.getDomainExceptions();
            const domainsSaved = await manager.storageManager.saveDomainExceptions(domainExceptions);

            if (!domainsSaved) {
                const totalTime = Math.round(performance.now() - operationStartTime);
                manager._logError({ key: 'logs.ui.settings.saveSettingsError', params: { totalTime: `${totalTime}мс` } }, new Error(manager.localeManager.t('logs.ui.settings.domainExceptionsSaveFailed')));
                const errorMessage = manager.localeManager.t('options.status.saveError');
                this._setButtonFeedback('saveBtn', saveBtn, errorMessage, false, originalText, CONFIG.UI.BUTTON_FEEDBACK.ERROR_DURATION);
                return false;
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(validationResult.value);

            if (!notifySuccess) {
                manager._log({ key: 'logs.ui.settings.backgroundScriptNotNotified' });
            }

            const notifyDomainSuccess = await manager.storageManager.notifyDomainExceptionsUpdate(domainExceptions);

            if (!notifyDomainSuccess) {
                manager._log({ key: 'logs.ui.settings.domainExceptionsNotNotified' });
            }

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log({ key: 'logs.ui.settings.settingsSaved' }, {
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
            manager._logError({ key: 'logs.ui.settings.saveSettingsError', params: { totalTime: `${totalTime}мс` } }, error);
            const errorMessage = manager.localeManager.t('options.status.saveError');
            this._setButtonFeedback('saveBtn', saveBtn, errorMessage, false, originalText, CONFIG.UI.BUTTON_FEEDBACK.ERROR_DURATION);
            return false;
        }
    }

    /**
     * Сбрасывает настройки к значениям по умолчанию.
     * 
     * @async
     * @returns {Promise<boolean>} true если настройки сброшены успешно
     */
    async resetToDefault() {
        const manager = this.manager;
        const resetBtn = manager.domManager.elements.resetBtn;
        const originalText = manager.localeManager.t('options.buttons.reset');
        const operationStartTime = performance.now();
        const isTestEnv = typeof process !== 'undefined' && process.env && process.env.JEST_WORKER_ID !== undefined;
        const MIN_PROCESSING_FEEDBACK_MS = isTestEnv ? 0 : CONFIG.UI.BUTTON_FEEDBACK.MIN_PROCESSING_FEEDBACK_MS;
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        this._clearButtonFeedback('resetBtn');

        try {
            manager._log({ key: 'logs.ui.settings.resetSettingsStart' });

            const resettingStartTime = performance.now();
            const buttonStateSet = manager.domManager.setButtonState(
                resetBtn,
                manager.localeManager.t('options.buttons.resetting'),
                true
            );

            if (!buttonStateSet) {
                manager._log({ key: 'logs.ui.settings.resetButtonStateUpdateFailed' });
            }

            const defaultUrl = await manager.storageManager.resetToDefault();

            const defaultDomainExceptions = [];
            const domainsReset = await manager.storageManager.saveDomainExceptions(defaultDomainExceptions);

            if (!domainsReset) {
                const totalTime = Math.round(performance.now() - operationStartTime);
                manager._logError({ key: 'logs.ui.settings.resetSettingsError', params: { totalTime: `${totalTime}мс` } }, new Error(manager.localeManager.t('logs.ui.settings.domainExceptionsResetFailed')));
                const errorMessage = manager.localeManager.t('options.status.resetError');
                this._setButtonFeedback('resetBtn', resetBtn, errorMessage, false, originalText, CONFIG.UI.BUTTON_FEEDBACK.ERROR_DURATION);
                return false;
            }

            manager.domainExceptionsManager.setDomainExceptions(defaultDomainExceptions);

            const uiUpdateSuccess = manager.domManager.setBackendUrlValue(defaultUrl);

            if (!uiUpdateSuccess) {
                manager._logError({ key: 'logs.ui.settings.uiUpdateAfterResetFailed' });
            }

            const notifySuccess = await manager.storageManager.notifyBackgroundScript(defaultUrl);

            if (!notifySuccess) {
                manager._log({ key: 'logs.ui.settings.backgroundScriptNotNotified' });
            }

            const notifyDomainSuccess = await manager.storageManager.notifyDomainExceptionsUpdate(defaultDomainExceptions);

            if (!notifyDomainSuccess) {
                manager._log({ key: 'logs.ui.settings.domainExceptionsNotNotified' });
            }

            const totalTime = Math.round(performance.now() - operationStartTime);

            manager._log({ key: 'logs.ui.settings.settingsReset' }, {
                defaultUrl,
                totalTime: `${totalTime}мс`,
                uiUpdateSuccess,
                backgroundNotified: notifySuccess,
                domainExceptionsCount: manager.domainExceptionsManager.domainExceptions.size,
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
            manager._logError({ key: 'logs.ui.settings.resetSettingsError', params: { totalTime: `${totalTime}мс` } }, error);

            const errorMessage = manager.localeManager.t('options.status.resetError');
            this._setButtonFeedback('resetBtn', resetBtn, errorMessage, false, originalText, CONFIG.UI.BUTTON_FEEDBACK.ERROR_DURATION);

            return false;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsManager;
    module.exports.default = SettingsManager;
}

if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}
