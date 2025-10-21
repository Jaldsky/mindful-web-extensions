const BaseManager = typeof window !== 'undefined' ? window.BaseManager : require('./BaseManager.js');
const DOMManager = typeof window !== 'undefined' ? window.DOMManager : require('./DOMManager.js');
const NotificationManager = typeof window !== 'undefined' ? window.NotificationManager : require('./NotificationManager.js');
const ServiceWorkerManager = typeof window !== 'undefined' ? window.ServiceWorkerManager : require('./ServiceWorkerManager.js');
const DiagnosticsManager = typeof window !== 'undefined' ? window.DiagnosticsManager : require('./DiagnosticsManager.js');

/**
 * Главный менеджер приложения, координирующий работу всех компонентов popup.
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
    static BUTTON_LABELS = {
        TEST_CONNECTION: {
            DEFAULT: '🔍 Тест подключения',
            LOADING: '⏳ Проверка...'
        },
        RUN_DIAGNOSTICS: {
            DEFAULT: '🔧 Диагностика',
            LOADING: '⏳ Анализ...'
        }
    };

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

        this.domManager = new DOMManager();
        this.notificationManager = new NotificationManager();
        this.serviceWorkerManager = new ServiceWorkerManager();
        this.diagnosticsManager = new DiagnosticsManager(
            this.serviceWorkerManager, 
            this.notificationManager
        );

        this.updateInterval = null;

        this.eventHandlers = new Map();

        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Инициализирует менеджер приложения.
     * Загружает начальный статус, настраивает обработчики событий и запускает периодические обновления статуса.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log('AppManager уже инициализирован');
            return;
        }

        try {
            this._log('Начало инициализации AppManager');

            await this.loadInitialStatus();

            this.setupEventHandlers();

            this.startPeriodicUpdates();
            
            this.isInitialized = true;
            this._log('AppManager инициализирован успешно');
        } catch (error) {
            this._logError('Ошибка инициализации AppManager', error);
            this.notificationManager.showNotification('Ошибка инициализации', 'error');
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
            const isOnline = await this.serviceWorkerManager.checkConnection();
            this.domManager.updateConnectionStatus(isOnline);

            const trackingStatus = await this.serviceWorkerManager.getTrackingStatus();
            this.domManager.updateTrackingStatus(trackingStatus.isTracking);

            const stats = await this.serviceWorkerManager.getTodayStats();
            this.domManager.updateCounters(stats);
            
            console.log('Initial status loaded:', { isOnline, trackingStatus, stats });
        } catch (error) {
            console.error('Ошибка загрузки начального статуса:', error);
            this.notificationManager.showNotification('Ошибка загрузки статуса', 'error');
        }
    }

    /**
     * Настраивает обработчики событий для кнопок.
     * Сохраняет обработчики в Map для последующей очистки.
     * 
     * @returns {void}
     */
    setupEventHandlers() {
        this._log('Настройка обработчиков событий');

        if (this.domManager.elements.openSettings) {
            const handler = () => {
                this._log('Открытие страницы настроек');
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

        if (this.domManager.elements.reloadExtension) {
            const handler = () => {
                this._log('Перезагрузка расширения');
                chrome.runtime.reload();
            };
            this.domManager.elements.reloadExtension.addEventListener('click', handler);
            this.eventHandlers.set('reloadExtension', handler);
        }

        if (this.domManager.elements.runDiagnostics) {
            const handler = async () => {
                await this.runDiagnostics();
            };
            this.domManager.elements.runDiagnostics.addEventListener('click', handler);
            this.eventHandlers.set('runDiagnostics', handler);
        }

        this._log(`Настроено обработчиков: ${this.eventHandlers.size}`);
    }

    /**
     * Тестирует подключение к серверу.
     *
     * @async
     * @returns {Promise<boolean>} true если подключение успешно
     */
    async testConnection() {
        const button = this.domManager.elements.testConnection;
        
        try {
            this._log('Тестирование подключения');

            this.domManager.setButtonState(
                button,
                AppManager.BUTTON_LABELS.TEST_CONNECTION.LOADING,
                true
            );

            const isOnline = await this.serviceWorkerManager.checkConnection();

            if (isOnline) {
                this.notificationManager.showNotification('Подключение успешно!', 'success');
                this.domManager.updateConnectionStatus(true);
                this.updateState({ isOnline: true });
                this._log('Тестирование подключения: успешно');
            } else {
                this.notificationManager.showNotification('Подключение не удалось', 'error');
                this.domManager.updateConnectionStatus(false);
                this.updateState({ isOnline: false });
                this._log('Тестирование подключения: неудача');
            }

            return isOnline;
        } catch (error) {
            this._logError('Ошибка тестирования подключения', error);
            this.notificationManager.showNotification('Ошибка тестирования', 'error');
            this.domManager.updateConnectionStatus(false);
            this.updateState({ isOnline: false });
            return false;
        } finally {
            this.domManager.setButtonState(
                button,
                AppManager.BUTTON_LABELS.TEST_CONNECTION.DEFAULT,
                false
            );
        }
    }

    /**
     * Запускает диагностику системы.
     *
     * @async
     * @returns {Promise<Object>} Результаты диагностики
     */
    async runDiagnostics() {
        const button = this.domManager.elements.runDiagnostics;
        
        try {
            this._log('Запуск диагностики');

            this.domManager.setButtonState(
                button,
                AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS.LOADING,
                true
            );

            const results = await this.diagnosticsManager.runDiagnostics();
            this.diagnosticsManager.displayDiagnosticResults(results);

            this._log('Диагностика завершена', { overall: results.overall });

            return results;
        } catch (error) {
            this._logError('Ошибка диагностики', error);
            this.notificationManager.showNotification('Ошибка диагностики', 'error');
            throw error;
        } finally {
            this.domManager.setButtonState(
                button,
                AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS.DEFAULT,
                false
            );
        }
    }

    /**
     * Запускает периодические обновления статуса.
     * 
     * @returns {void}
     */
    startPeriodicUpdates() {
        if (this.updateInterval) {
            this._log('Периодические обновления уже запущены');
            return;
        }

        this._log('Запуск периодических обновлений');
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadInitialStatus();
            } catch (error) {
                this._logError('Ошибка периодического обновления', error);
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
            this._log('Периодические обновления остановлены');
        }
    }

    /**
     * Очищает ресурсы при закрытии popup.
     *
     * @returns {void}
     */
    destroy() {
        if (!this.isInitialized) {
            this._log('AppManager уже был уничтожен');
            return;
        }

        this._log('Очистка ресурсов AppManager');

        try {
            this._stopPeriodicUpdates();
            this._removeEventHandlers();
            this._destroyManagers();

            this.isInitialized = false;
            this._log('AppManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении AppManager', error);
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
            this._log('Обработчики событий удалены');
        } catch (error) {
            this._logError('Ошибка удаления обработчиков событий', error);
        }
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

            this._log('Все менеджеры уничтожены');
        } catch (error) {
            this._logError('Ошибка уничтожения менеджеров', error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppManager;
}

if (typeof window !== 'undefined') {
    window.AppManager = AppManager;

    document.addEventListener('DOMContentLoaded', () => {
        window.appManager = new AppManager();
    });

    window.addEventListener('beforeunload', () => {
        if (window.appManager) {
            window.appManager.destroy();
        }
    });
}