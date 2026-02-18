const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');
const DOMManager = require('./core/DOMManager.js');
const StorageManager = require('./core/StorageManager.js');
const StatusManager = require('./status/StatusManager.js');
const ValidationManager = require('./core/ValidationManager.js');
const ServiceWorkerManager = require('../app/ServiceWorkerManager.js');
const DiagnosticsManager = require('../app/DiagnosticsManager.js');
const NotificationManager = require('../app/NotificationManager.js');
const LocaleManager = require('../locale/LocaleManager.js');
const InitializationManager = require('./core/InitializationManager.js');
const UIManager = require('./ui/UIManager.js');
const DiagnosticsWorkflowManager = require('./diagnostics/DiagnosticsWorkflowManager.js');
const DeveloperToolsManager = require('./diagnostics/DeveloperToolsManager.js');
const LogsManager = require('./core/LogsManager.js');
const DiagnosticsDataManager = require('./diagnostics/DiagnosticsDataManager.js');
const LifecycleManager = require('./core/LifecycleManager.js');
const ConnectionStatusManager = require('./status/ConnectionStatusManager.js');

/**
 * Главный менеджер для страницы настроек расширения.
 * Координирует работу всех компонентов страницы настроек.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class OptionsManager
 * @extends BaseManager
 */
class OptionsManager extends BaseManager {
    /**
     * Метки кнопок для различных состояний.
     * @readonly
     * @static
     */
    static BUTTON_LABELS = CONFIG.BUTTON_LABELS;

    /**
     * Создает экземпляр OptionsManager.
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

        this.localeManager = new LocaleManager({ enableLogging: this.enableLogging });

        try {
            this.domManager = new DOMManager({ enableLogging: this.enableLogging });
        } catch (error) {
            this._logError({ key: 'logs.options.domManagerInitError' }, error);
            const errorMessage = this.t('logs.options.domManagerInitFailed', { message: error.message });
            throw new Error(errorMessage);
        }

        try {
            this.storageManager = new StorageManager({ enableLogging: this.enableLogging });
        } catch (error) {
            this._logError({ key: 'logs.options.storageManagerInitError' }, error);
            const errorMessage = this.t('logs.options.storageManagerInitFailed', { message: error.message });
            throw new Error(errorMessage);
        }

        this.validationManager = new ValidationManager({
            enableLogging: this.enableLogging,
            enableHistory: true,
            maxHistorySize: 50
        });

        try {
            this.statusManager = new StatusManager({
                enableLogging: this.enableLogging,
                statusElement: null,
                enableHistory: true,
                enableQueue: true,
                maxHistorySize: 50,
                maxQueueSize: 5,
                defaultDuration: 3000
            });
        } catch (error) {
            this._logError({ key: 'logs.options.statusManagerInitError' }, error);
            this.statusManager = new StatusManager({
                enableLogging: this.enableLogging,
                enableHistory: true,
                enableQueue: true
            });
        }

        this.notificationManager = new NotificationManager({ enableLogging: this.enableLogging });
        this.serviceWorkerManager = new ServiceWorkerManager({ enableLogging: this.enableLogging });
        this.diagnosticsManager = new DiagnosticsManager(
            this.serviceWorkerManager,
            this.notificationManager,
            { enableLogging: this.enableLogging }
        );

        this.eventHandlers = new Map();
        this.originalButtonTexts = new Map();
        this.isInitialized = false;
        this.logsRefreshIntervalId = null;
        this.activityRefreshIntervalId = null;
        this.lastSelectionChangeTime = 0;
        this.logsFilter = {
            level: 'all',
            className: 'all',
            serverOnly: false
        };
        this.domainExceptions = [];
        this._lastConnectionStatus = false;
        this._connectionMessageTimer = null;

        this.initializationManager = new InitializationManager(this);
        this.uiManager = new UIManager(this);
        this.diagnosticsWorkflowManager = new DiagnosticsWorkflowManager(this);
        this.developerToolsManager = new DeveloperToolsManager(this);
        this.logsManager = new LogsManager(this);
        this.diagnosticsDataManager = new DiagnosticsDataManager(this);
        this.lifecycleManager = new LifecycleManager(this);
        this.connectionStatusManager = new ConnectionStatusManager(this);

        this.init();
    }

    /**
     * Инициализирует OptionsManager.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        return this.initializationManager.init();
    }

    /**
     * Загружает настройки из хранилища.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadSettings() {
        return this.initializationManager.loadSettings();
    }

    /**
     * Настраивает обработчики событий для UI элементов.
     * 
     * @returns {void}
     */
    setupEventHandlers() {
        return this.uiManager.setupEventHandlers();
    }

    /**
     * Сохраняет настройки в хранилище.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async saveSettings() {
        return this.uiManager.saveSettings();
    }

    /**
     * Сбрасывает настройки к значениям по умолчанию.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async resetToDefault() {
        return this.uiManager.resetToDefault();
    }

    /**
     * Очищает все данные расширения из chrome.storage.local и кешей localStorage
     * (ID, онбординг, тема, локаль, настройки и т.д.). После переустановки плагина
     * данные обычно очищаются сами; эта кнопка нужна, если нужен «как первый запуск»
     * без переустановки.
     *
     * @async
     * @returns {Promise<boolean>} true при успехе
     */
    async clearAllExtensionData() {
        try {
            if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
                this._logError({ key: 'logs.trackerStorage.clearAllError' }, new Error('chrome.storage.local unavailable'));
                return false;
            }

            const sessionKeys = [
                CONFIG.STORAGE_KEYS.ANON_ID,
                CONFIG.STORAGE_KEYS.USER_ID,
                CONFIG.STORAGE_KEYS.AUTH_ACCESS_TOKEN,
                CONFIG.STORAGE_KEYS.AUTH_REFRESH_TOKEN,
                CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED
            ];
            await chrome.storage.local.remove(sessionKeys);

            if (typeof chrome.runtime !== 'undefined' && chrome.runtime.sendMessage) {
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => reject(new Error('CLEAR_SESSION timeout')), 5000);
                        chrome.runtime.sendMessage({ type: CONFIG.MESSAGE_TYPES.CLEAR_SESSION }, (response) => {
                            clearTimeout(timeout);
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(response);
                            }
                        });
                    });
                } catch (msgErr) {
                    this._logError({ key: 'logs.trackerStorage.clearAllError' }, msgErr);
                }
            }

            await chrome.storage.local.clear();

            if (typeof localStorage !== 'undefined') {
                [CONFIG.THEME.CACHE_KEY, CONFIG.LOCALE.CACHE_KEY, CONFIG.LOCALE.STORAGE_KEY].forEach((key) => {
                    try {
                        localStorage.removeItem(key);
                    } catch (e) {
                        this._logError({ key: 'logs.trackerStorage.clearAllError' }, e);
                    }
                });
            }
            this._log({ key: 'logs.trackerStorage.allDataCleared' });
            return true;
        } catch (error) {
            this._logError({ key: 'logs.trackerStorage.clearAllError' }, error);
            return false;
        }
    }

    /**
     * Устанавливает список исключений доменов.
     * 
     * @param {Array<string>} domains - Массив доменов для исключения
     * @returns {void}
     */
    setDomainExceptions(domains) {
        this.domainExceptions = Array.isArray(domains) ? [...domains] : [];
        return this.uiManager.setDomainExceptions(domains);
    }

    /**
     * Запускает диагностику системы.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async runDiagnostics() {
        return this.diagnosticsWorkflowManager.runDiagnostics();
    }

    /**
     * Очищает результаты диагностики.
     * 
     * @returns {void}
     */
    clearDiagnostics() {
        return this.diagnosticsWorkflowManager.clearDiagnostics();
    }

    /**
     * Переключает язык интерфейса.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleLanguage() {
        return this.uiManager.toggleLanguage();
    }

    /**
     * Обновляет отображение текущего языка.
     * 
     * @returns {void}
     */
    updateLanguageDisplay() {
        return this.uiManager.updateLanguageDisplay();
    }

    /**
     * Обработчик изменения локали.
     * 
     * @returns {void}
     */
    onLocaleChange() {
        return this.uiManager.onLocaleChange();
    }

    /**
     * Устанавливает менеджер тем.
     * 
     * @param {Object} themeManager - Экземпляр ThemeManager
     * @returns {void}
     */
    setThemeManager(themeManager) {
        return this.uiManager.setThemeManager(themeManager);
    }

    /**
     * Переключает тему интерфейса.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleTheme() {
        return this.uiManager.toggleTheme();
    }

    /**
     * Обновляет отображение текущей темы.
     * 
     * @param {string} [theme] - Название темы
     * @returns {void}
     */
    updateThemeDisplay(theme) {
        return this.uiManager.updateThemeDisplay(theme);
    }

    /**
     * Переключает видимость developer tools.
     * 
     * @returns {void}
     */
    toggleDeveloperTools() {
        return this.developerToolsManager.toggle();
    }

    /**
     * Открывает панель developer tools.
     * 
     * @param {string} [tab='logs'] - Вкладка для открытия
     * @returns {void}
     */
    openDevToolsPanel(tab = 'logs') {
        return this.developerToolsManager.openPanel(tab);
    }

    /**
     * Закрывает панель developer tools.
     * 
     * @returns {void}
     */
    closeDevToolsPanel() {
        return this.developerToolsManager.closePanel();
    }

    /**
     * Переключает вкладку в developer tools.
     * 
     * @param {string} tabName - Название вкладки
     * @returns {void}
     */
    switchTab(tabName) {
        return this.developerToolsManager.switchTab(tabName);
    }

    /**
     * Устанавливает фильтр по уровню логов.
     * 
     * @param {string} level - Уровень логов ('all', 'INFO', 'ERROR')
     * @returns {void}
     */
    setLogLevelFilter(level) {
        return this.logsManager.setLevelFilter(level);
    }

    /**
     * Устанавливает фильтр по классу логов.
     * 
     * @param {string} className - Имя класса или 'all'
     * @returns {void}
     */
    setLogClassFilter(className) {
        return this.logsManager.setClassFilter(className);
    }

    /**
     * Устанавливает фильтр "только серверные запросы".
     * 
     * @param {boolean} serverOnly - true для показа только серверных запросов
     * @returns {void}
     */
    setServerOnlyFilter(serverOnly) {
        return this.logsManager.setServerOnly(serverOnly);
    }

    /**
     * Загружает и отображает логи.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadLogs() {
        return this.logsManager.loadLogs();
    }

    /**
     * Очищает все логи.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async clearLogs() {
        return this.logsManager.clearLogs();
    }

    /**
     * Копирует логи в буфер обмена.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async copyLogs() {
        return this.logsManager.copyLogs();
    }

    /**
     * Загружает статистику активности.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadActivityStats() {
        return this.uiManager.loadActivityStats();
    }

    /**
     * Устанавливает диапазон времени для статистики активности.
     * 
     * @param {string} rangeKey - Ключ диапазона времени
     * @returns {void}
     */
    setActivityRange(rangeKey) {
        if (this.uiManager && typeof this.uiManager.setActivityRangeByKey === 'function') {
            this.uiManager.setActivityRangeByKey(rangeKey);
        }
    }

    /**
     * Получает текущий URL бэкенда.
     * 
     * @returns {string|null} Текущий URL или null
     */
    getCurrentBackendUrl() {
        return this.diagnosticsDataManager.getCurrentBackendUrl();
    }

    /**
     * Получает URL бэкенда по умолчанию.
     * 
     * @returns {string} URL по умолчанию
     */
    getDefaultBackendUrl() {
        return this.diagnosticsDataManager.getDefaultBackendUrl();
    }

    /**
     * Проверяет валидность текущего URL.
     * 
     * @returns {boolean} true если URL валиден
     */
    isCurrentUrlValid() {
        return this.diagnosticsDataManager.isCurrentUrlValid();
    }

    /**
     * Получает статистику статусов.
     * 
     * @returns {Object} Статистика статусов
     */
    getStatusStatistics() {
        return this.diagnosticsDataManager.getStatusStatistics();
    }

    /**
     * Получает историю статусов.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @returns {Array} История статусов
     */
    getStatusHistory(options = {}) {
        return this.diagnosticsDataManager.getStatusHistory(options);
    }

    /**
     * Получает метрики производительности статусов.
     * 
     * @returns {Object} Метрики производительности
     */
    getStatusPerformanceMetrics() {
        return this.diagnosticsDataManager.getStatusPerformanceMetrics();
    }

    /**
     * Очищает историю статусов.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearStatusHistory() {
        return this.diagnosticsDataManager.clearStatusHistory();
    }

    /**
     * Получает статистику валидаций.
     * 
     * @returns {Object} Статистика валидаций
     */
    getValidationStatistics() {
        return this.diagnosticsDataManager.getValidationStatistics();
    }

    /**
     * Получает историю валидаций.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @returns {Array} История валидаций
     */
    getValidationHistory(options = {}) {
        return this.diagnosticsDataManager.getValidationHistory(options);
    }

    /**
     * Очищает историю валидаций.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearValidationHistory() {
        return this.diagnosticsDataManager.clearValidationHistory();
    }

    /**
     * Получает метрики производительности валидаций.
     * 
     * @returns {Object} Метрики производительности
     */
    getValidationPerformanceMetrics() {
        return this.diagnosticsDataManager.getValidationPerformanceMetrics();
    }

    /**
     * Проверяет валидность состояния всех менеджеров.
     * 
     * @returns {Object} Результат валидации
     */
    validateManagersState() {
        return this.diagnosticsDataManager.validateManagersState();
    }

    /**
     * Получает полную диагностическую информацию.
     * 
     * @returns {Object} Диагностическая информация
     */
    getDiagnostics() {
        return this.diagnosticsDataManager.getDiagnostics();
    }

    /**
     * Тестирует подключение к бэкенду.
     * 
     * @async
     * @returns {Promise<boolean>} true если подключение успешно
     */
    async testConnection() {
        return this.connectionStatusManager.testConnection();
    }

    /**
     * Обновляет отображение статуса подключения.
     * 
     * @param {boolean} isOnline - Подключен ли интернет
     * @returns {void}
     */
    updateConnectionStatus(isOnline) {
        return this.connectionStatusManager.updateConnectionStatus(isOnline);
    }

    /**
     * Показывает временное сообщение о статусе подключения.
     * 
     * @private
     * @param {string} message - Сообщение
     * @param {string} type - Тип сообщения ('success', 'error', 'warning')
     * @returns {void}
     */
    _showConnectionStatusMessage(message, type = 'info') {
        return this.connectionStatusManager._showConnectionStatusMessage(message, type);
    }

    /**
     * Сохраняет статус подключения в chrome.storage.local.
     * 
     * @private
     * @param {boolean} isOnline - Статус подключения
     * @returns {Promise<void>}
     */
    async _saveConnectionStatusToStorage(isOnline) {
        return this.connectionStatusManager._saveConnectionStatusToStorage(isOnline);
    }

    /**
     * Загружает статус подключения из chrome.storage.local.
     * 
     * @private
     * @returns {Promise<boolean|null>} Статус подключения или null, если не найден
     */
    async _loadConnectionStatusFromStorage() {
        return this.connectionStatusManager._loadConnectionStatusFromStorage();
    }

    /**
     * Обновляет локализацию времени последней проверки.
     * 
     * @returns {void}
     */
    updateConnectionLastCheckLocale() {
        return this.connectionStatusManager.updateConnectionLastCheckLocale();
    }

    /**
     * Загружает начальный статус подключения.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadConnectionStatus() {
        return this.connectionStatusManager.loadConnectionStatus();
    }

    /**
     * Уничтожает OptionsManager и очищает все ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.connectionStatusManager.clearTimer();
        const destroyed = this.lifecycleManager.destroy();
        if (!destroyed) {
            return;
        }
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptionsManager;
    module.exports.default = OptionsManager;
}

if (typeof window !== 'undefined') {
    window.OptionsManager = OptionsManager;
}
