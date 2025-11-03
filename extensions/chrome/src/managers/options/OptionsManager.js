const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');
const DOMManager = require('./DOMManager.js');
const StorageManager = require('./StorageManager.js');
const StatusManager = require('./StatusManager.js');
const ValidationManager = require('./ValidationManager.js');
const ServiceWorkerManager = require('../app/ServiceWorkerManager.js');
const DiagnosticsManager = require('../app/DiagnosticsManager.js');
const NotificationManager = require('../app/NotificationManager.js');
const LocaleManager = require('../locale/LocaleManager.js');
const InitializationManager = require('./InitializationManager.js');
const UIManager = require('./UIManager.js');
const DiagnosticsWorkflowManager = require('./DiagnosticsWorkflowManager.js');
const DeveloperToolsManager = require('./DeveloperToolsManager.js');
const LogsManager = require('./LogsManager.js');
const DiagnosticsDataManager = require('./DiagnosticsDataManager.js');
const LifecycleManager = require('./LifecycleManager.js');

class OptionsManager extends BaseManager {
    static BUTTON_LABELS = CONFIG.BUTTON_LABELS;

    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
            ...options
        });

        this.localeManager = new LocaleManager({ enableLogging: this.enableLogging });

        try {
            this.domManager = new DOMManager({ enableLogging: this.enableLogging });
        } catch (error) {
            this._logError('Критическая ошибка инициализации DOMManager', error);
            throw new Error(`DOM Manager initialization failed: ${error.message}`);
        }

        try {
            this.storageManager = new StorageManager({ enableLogging: this.enableLogging });
        } catch (error) {
            this._logError('Критическая ошибка инициализации StorageManager', error);
            throw new Error(`Storage Manager initialization failed: ${error.message}`);
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
            this._logError('Ошибка инициализации StatusManager', error);
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

        this.initializationManager = new InitializationManager(this);
        this.uiManager = new UIManager(this);
        this.diagnosticsWorkflowManager = new DiagnosticsWorkflowManager(this);
        this.developerToolsManager = new DeveloperToolsManager(this);
        this.logsManager = new LogsManager(this);
        this.diagnosticsDataManager = new DiagnosticsDataManager(this);
        this.lifecycleManager = new LifecycleManager(this);

        this.init();
    }

    async init() {
        return this.initializationManager.init();
    }

    async loadSettings() {
        return this.initializationManager.loadSettings();
    }

    setupEventHandlers() {
        return this.uiManager.setupEventHandlers();
    }

    async saveSettings() {
        return this.uiManager.saveSettings();
    }

    async resetToDefault() {
        return this.uiManager.resetToDefault();
    }

    setDomainExceptions(domains) {
        this.domainExceptions = Array.isArray(domains) ? [...domains] : [];
        return this.uiManager.setDomainExceptions(domains);
    }

    async runDiagnostics() {
        return this.diagnosticsWorkflowManager.runDiagnostics();
    }

    clearDiagnostics() {
        return this.diagnosticsWorkflowManager.clearDiagnostics();
    }

    async toggleLanguage() {
        return this.uiManager.toggleLanguage();
    }

    updateLanguageDisplay() {
        return this.uiManager.updateLanguageDisplay();
    }

    onLocaleChange() {
        return this.uiManager.onLocaleChange();
    }

    setThemeManager(themeManager) {
        return this.uiManager.setThemeManager(themeManager);
    }

    async toggleTheme() {
        return this.uiManager.toggleTheme();
    }

    updateThemeDisplay(theme) {
        return this.uiManager.updateThemeDisplay(theme);
    }

    toggleDeveloperTools() {
        return this.developerToolsManager.toggle();
    }

    restoreDeveloperToolsState() {
        return this.developerToolsManager.restoreState();
    }

    openDevToolsPanel(tab = 'logs') {
        return this.developerToolsManager.openPanel(tab);
    }

    closeDevToolsPanel() {
        return this.developerToolsManager.closePanel();
    }

    switchTab(tabName) {
        return this.developerToolsManager.switchTab(tabName);
    }

    setLogLevelFilter(level) {
        return this.logsManager.setLevelFilter(level);
    }

    setLogClassFilter(className) {
        return this.logsManager.setClassFilter(className);
    }

    setServerOnlyFilter(serverOnly) {
        return this.logsManager.setServerOnly(serverOnly);
    }

    async loadLogs() {
        return this.logsManager.loadLogs();
    }

    async clearLogs() {
        return this.logsManager.clearLogs();
    }

    async copyLogs() {
        return this.logsManager.copyLogs();
    }

    async loadActivityStats() {
        return this.uiManager.loadActivityStats();
    }

    setActivityRange(rangeKey) {
        if (this.uiManager && typeof this.uiManager.setActivityRangeByKey === 'function') {
            this.uiManager.setActivityRangeByKey(rangeKey);
        }
    }

    getCurrentBackendUrl() {
        return this.diagnosticsDataManager.getCurrentBackendUrl();
    }

    getDefaultBackendUrl() {
        return this.diagnosticsDataManager.getDefaultBackendUrl();
    }

    isCurrentUrlValid() {
        return this.diagnosticsDataManager.isCurrentUrlValid();
    }

    getStatusStatistics() {
        return this.diagnosticsDataManager.getStatusStatistics();
    }

    getStatusHistory(options = {}) {
        return this.diagnosticsDataManager.getStatusHistory(options);
    }

    getStatusPerformanceMetrics() {
        return this.diagnosticsDataManager.getStatusPerformanceMetrics();
    }

    clearStatusHistory() {
        return this.diagnosticsDataManager.clearStatusHistory();
    }

    getValidationStatistics() {
        return this.diagnosticsDataManager.getValidationStatistics();
    }

    getValidationHistory(options = {}) {
        return this.diagnosticsDataManager.getValidationHistory(options);
    }

    clearValidationHistory() {
        return this.diagnosticsDataManager.clearValidationHistory();
    }

    getValidationPerformanceMetrics() {
        return this.diagnosticsDataManager.getValidationPerformanceMetrics();
    }

    validateManagersState() {
        return this.diagnosticsDataManager.validateManagersState();
    }

    getDiagnostics() {
        return this.diagnosticsDataManager.getDiagnostics();
    }

    destroy() {
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
