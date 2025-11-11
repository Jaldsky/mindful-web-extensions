const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');
const DOMManager = require('./DOMManager.js');
const NotificationManager = require('./NotificationManager.js');
const ServiceWorkerManager = require('./ServiceWorkerManager.js');
const DiagnosticsManager = require('./DiagnosticsManager.js');
const LocaleManager = require('../locale/LocaleManager.js');

/**
 * Главный менеджер приложения, координирующий работу всех компонентов app.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class AppManager
 * @extends BaseManager
 */
class AppManager extends BaseManager {
    /**
     * Метки кнопок для различных состояний.
     * @readonly
     * @static
     */
    static BUTTON_LABELS = CONFIG.BUTTON_LABELS;

    /**
     * Создает экземпляр AppManager.
     * Инициализирует все необходимые менеджеры и настраивает их взаимодействие.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=true] - Включить логирование
     */
    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
            ...options
        });

        const enableLogging = this.enableLogging;

        this.localeManager = new LocaleManager({ enableLogging });
        const translateFn = (key, params) => this.localeManager.t(key, params);
        this.domManager = new DOMManager({ enableLogging, translateFn });
        this.notificationManager = new NotificationManager({ enableLogging, translateFn });
        this.serviceWorkerManager = new ServiceWorkerManager({ enableLogging, translateFn });
        this.diagnosticsManager = new DiagnosticsManager(
            this.serviceWorkerManager, 
            this.notificationManager,
            { enableLogging, translateFn }
        );

        this.updateInterval = null;
        this.eventHandlers = new Map();
        this.isInitialized = false;

        this.init();
    }

    /**
     * Инициализирует менеджер приложения.
     * Загружает начальный статус и настраивает обработчики событий.
     * 
     * ПЕРИОДИЧЕСКИЕ ОБНОВЛЕНИЯ ОТКЛЮЧЕНЫ:
     * - Статус онлайн/офлайн определяется по результатам отправки событий
     * - События отправляются автоматически каждые 30 секунд
     * - Дополнительные healthcheck запросы не нужны
     * - Пользователь может проверить вручную кнопкой "Test Connection"
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log({ key: 'logs.app.alreadyInitialized' });
            return;
        }

        try {

            await this.localeManager.init();

            this.domManager.setTranslateFn((key) => this.localeManager.t(key));
            this.localeManager.localizeDOM();

            await this.loadInitialStatus();

            this.setupEventHandlers();
            this.localeManager.addLocaleChangeListener(() => {
                this.onLocaleChange();
            });

            this.isInitialized = true;
        } catch (error) {
            this._logError({ key: 'logs.app.initError' }, error);
            this.notificationManager.showNotification(
                this.localeManager.t('app.notifications.initError'),
                'error'
            );
            throw error;
        }
    }

    /**
     * Загружает начальный статус системы.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadInitialStatus() {
        try {
            const connectionResult = await this.serviceWorkerManager.checkConnection();

            if (connectionResult.tooFrequent) {
                const lastStatus = await this._loadConnectionStatusFromStorage();
                if (lastStatus !== null) {
                    this.domManager.updateConnectionStatus(lastStatus);
                    this.updateState({ isOnline: lastStatus });
                } else {
                    const fallbackStatus = this.state?.isOnline ?? false;
                    this.domManager.updateConnectionStatus(fallbackStatus);
                }
            } else {
                const isOnline = connectionResult.success;
                this.domManager.updateConnectionStatus(isOnline);
                this.updateState({ isOnline });
                await this._saveConnectionStatusToStorage(isOnline);
            }

            const trackingStatus = await this.serviceWorkerManager.getTrackingStatus();
            this.domManager.updateTrackingStatus(trackingStatus.isTracking);
            this.domManager.updateTrackingToggle(trackingStatus.isTracking);
            this.updateState({ isTracking: trackingStatus.isTracking });

            const stats = await this.serviceWorkerManager.getTodayStats();
            this.domManager.updateCounters(stats);
            
        } catch (error) {
            this._logError({ key: 'logs.app.initialStatusError' }, error);
            this.notificationManager.showNotification(
                this.localeManager.t('app.notifications.connectionError'),
                'error'
            );
        }
    }

    /**
     * Настраивает обработчики событий для кнопок.
     * Сохраняет обработчики в Map для последующей очистки.
     * 
     * @returns {void}
     */
    setupEventHandlers() {

        if (this.domManager.elements.openSettings) {
            const handler = () => {
                this._log({ key: 'logs.app.openSettings' });
                chrome.runtime.openOptionsPage();
            };
            this.domManager.elements.openSettings.addEventListener('click', handler);
            this.eventHandlers.set('openSettings', handler);
        }

        if (this.domManager.elements.testConnection) {
            const handler = async () => {
                await this.testConnection();
            };
            this.domManager.elements.testConnection.addEventListener('click', handler);
            this.eventHandlers.set('testConnection', handler);
        }

        if (this.domManager.elements.toggleTracking) {
            const handler = async () => {
                await this.toggleTracking();
            };
            this.domManager.elements.toggleTracking.addEventListener('click', handler);
            this.eventHandlers.set('toggleTracking', handler);
        }
    }

    /**
     * Тестирует подключение к серверу.
     *
     * @async
     * @returns {Promise<boolean>} true если подключение успешно
     */
    async testConnection() {
        const button = this.domManager.elements.testConnection;
        const originalText = this.localeManager.t('app.buttons.testConnection');
        
        try {
            this.domManager.setButtonState(
                button,
                this.localeManager.t('app.buttons.testConnectionLoading'),
                true
            );

            const minDelay = new Promise(resolve => setTimeout(resolve, 500));
            const connectionCheck = this.serviceWorkerManager.checkConnection();
            
            const [connectionResult] = await Promise.all([connectionCheck, minDelay]);
            const isOnline = connectionResult.success;

            let message;
            let messageType;
            if (isOnline) {
                this.updateState({ isOnline });
                this.domManager.updateConnectionStatus(isOnline);
                await this._saveConnectionStatusToStorage(isOnline);
                message = this.localeManager.t('app.status.connectionSuccess');
                messageType = 'success';
            } else if (connectionResult.tooFrequent) {
                message = this.localeManager.t('app.status.requestTooFrequent');
                messageType = 'warning';
            } else {
                this.updateState({ isOnline });
                this.domManager.updateConnectionStatus(isOnline);
                await this._saveConnectionStatusToStorage(isOnline);
                message = this.localeManager.t('app.status.connectionFailed');
                messageType = 'error';
            }
            
            this.domManager.showConnectionStatusMessage(message, messageType);

            return isOnline;
        } catch (error) {
            this._logError({ key: 'logs.app.testConnection.error' }, error);
            this.domManager.updateConnectionStatus(false);
            this.updateState({ isOnline: false });
            await this._saveConnectionStatusToStorage(false);
            this.domManager.showConnectionStatusMessage(
                this.localeManager.t('app.status.connectionError'),
                'error'
            );
            return false;
        } finally {
            this.domManager.setButtonState(
                button,
                originalText,
                false
            );
        }
    }

    /**
     * Переключает состояние отслеживания (включить/отключить).
     * 
     * @async
     * @returns {Promise<boolean>} true если операция завершилась успешно
     */
    async toggleTracking() {
        const currentState = Boolean(this.state.isTracking);
        const targetState = !currentState;
        const button = this.domManager.elements.toggleTracking;

        try {

            this.domManager.setTrackingToggleLoading(targetState);

            const toggleRequest = this.serviceWorkerManager.setTrackingEnabled(targetState);
            const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

            const [toggleResult] = await Promise.allSettled([toggleRequest, minDelay]);

            if (toggleResult.status !== 'fulfilled') {
                const errorMessage = toggleResult.reason?.message || this.localeManager.t('app.notifications.trackingToggleError');
                this._logError({ key: 'logs.app.trackingToggleError' }, toggleResult.reason || new Error(errorMessage));
                this.domManager.updateTrackingToggle(currentState);
                return false;
            }

            const response = toggleResult.value;

            if (!response || typeof response !== 'object' || !('success' in response) || response.success !== true) {
                const errorMessage = (response && typeof response === 'object' && 'error' in response)
                    ? response.error
                    : this.localeManager.t('app.notifications.trackingToggleError');
                this._logError({ key: 'logs.app.trackingToggleError' }, new Error(errorMessage));
                this.domManager.updateTrackingToggle(currentState);
                return false;
            }

            const newIsTracking = Boolean(response.isTracking);
            this.updateState({ isTracking: newIsTracking });
            this.domManager.updateTrackingStatus(newIsTracking);
            this.domManager.updateTrackingToggle(newIsTracking);

            return true;
        } catch (error) {
            this._logError({ key: 'logs.app.trackingToggleError' }, error);
            this.domManager.updateTrackingToggle(currentState);
            return false;
        } finally {
            const finalState = Boolean(this.state.isTracking);
            this.domManager.updateTrackingToggle(finalState, { disabled: false });
            if (button) {
                button.blur();
            }
        }
    }

    /**
     * Обработчик изменения локали.
     * 
     * @returns {void}
     */
    onLocaleChange() {
        try {
            this.localeManager.localizeDOM();
            this.domManager.refreshStatuses();
            
            this._log({ key: 'logs.app.localeChanged' }, {
                locale: this.localeManager.getCurrentLocale()
            });
        } catch (error) {
            this._logError({ key: 'logs.app.localeChangeError' }, error);
        }
    }

    /**
     * Запускает периодические обновления статуса.
     * 
     * @returns {void}
     */
    startPeriodicUpdates() {
        if (this.updateInterval) {
            this._log({ key: 'logs.app.periodicUpdatesAlreadyStarted' });
            return;
        }

        this._log({ key: 'logs.app.periodicUpdatesStart' });
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadInitialStatus();
            } catch (error) {
                this._logError({ key: 'logs.app.periodicUpdatesError' }, error);
            }
        }, this.CONSTANTS.UPDATE_INTERVAL);
    }

    /**
     * Останавливает периодические обновления статуса.
     * 
     * @private
     * @returns {void}
     */
    _stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this._log({ key: 'logs.app.periodicUpdatesStopped' });
        }
    }

    /**
     * Очищает ресурсы при закрытии app.
     *
     * @returns {void}
     */
    destroy() {
        if (!this.isInitialized) {
            this._log({ key: 'logs.app.alreadyDestroyed' });
            return;
        }

        this._log({ key: 'logs.app.destroyStart' });

        try {
            this._stopPeriodicUpdates();
            this._removeEventHandlers();
            this._destroyManagers();

            this.isInitialized = false;
            this._log({ key: 'logs.app.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.app.destroyError' }, error);
        }

        super.destroy();
    }

    /**
     * Удаляет обработчики событий.
     *
     * @private
     * @returns {void}
     */
    _removeEventHandlers() {
        try {
            this.eventHandlers.forEach((handler, key) => {
                const element = this.domManager.elements[key];
                if (element && handler) {
                    element.removeEventListener('click', handler);
                }
            });

            this.eventHandlers.clear();
            this._log({ key: 'logs.app.eventHandlersRemoved' });
        } catch (error) {
            this._logError({ key: 'logs.app.eventHandlersRemoveError' }, error);
        }
    }

    /**
     * Сохраняет статус подключения в chrome.storage.local.
     * 
     * @private
     * @param {boolean} isOnline - Статус подключения
     * @returns {Promise<void>}
     */
    async _saveConnectionStatusToStorage(isOnline) {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ mindful_connection_status: isOnline }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });
            }
        } catch (error) {
            this._logError({ key: 'logs.app.saveConnectionStatusError' }, error);
        }
    }

    /**
     * Загружает статус подключения из chrome.storage.local.
     * 
     * @private
     * @returns {Promise<boolean|null>} Статус подключения или null, если не найден
     */
    async _loadConnectionStatusFromStorage() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                return await new Promise((resolve, reject) => {
                    chrome.storage.local.get(['mindful_connection_status'], (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result.mindful_connection_status !== undefined ? result.mindful_connection_status : null);
                        }
                    });
                });
            }
        } catch (error) {

            this._logError({ key: 'logs.app.loadConnectionStatusError' }, error);
        }
        return null;
    }

    /**
     * Уничтожает все менеджеры.
     *
     * @private
     * @returns {void}
     */
    _destroyManagers() {
        try {
            if (this.diagnosticsManager) {
                this.diagnosticsManager.destroy();
                this.diagnosticsManager = null;
            }

            if (this.serviceWorkerManager) {
                this.serviceWorkerManager.destroy();
                this.serviceWorkerManager = null;
            }

            if (this.notificationManager) {
                this.notificationManager.destroy();
                this.notificationManager = null;
            }

            if (this.domManager) {
                this.domManager.destroy();
                this.domManager = null;
            }

            if (this.localeManager) {
                this.localeManager.destroy();
                this.localeManager = null;
            }

            this._log({ key: 'logs.app.managersDestroyed' });
        } catch (error) {
            this._logError({ key: 'logs.app.managersDestroyError' }, error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppManager;
    module.exports.default = AppManager;
}

if (typeof window !== 'undefined') {
    window.AppManager = AppManager;
}