/**
 * @jest-environment jsdom
 */

const mockLifecycleManagerInstance = { destroy: jest.fn(() => true) };
const mockInitializationManagerInstance = { init: jest.fn(), loadSettings: jest.fn() };
const mockUIManagerInstance = {};
const mockDiagnosticsWorkflowManagerInstance = {};
const mockDeveloperToolsManagerInstance = {};
const mockLogsManagerInstance = {};
const mockDiagnosticsDataManagerInstance = {};

const mockBaseManagerDestroy = jest.fn();
const mockBaseManagerConstructor = jest.fn();

jest.mock('../../../src/base/BaseManager.js', () => (
    class MockBaseManager {
        constructor(options = {}) {
            this.enableLogging = options.enableLogging;
            this._logError = jest.fn();
            this._log = jest.fn();
            mockBaseManagerConstructor(options);
        }

        destroy() {
            mockBaseManagerDestroy();
        }
    }
));

const mockDomManagerInstance = { elements: {} };
const mockStorageManagerInstance = {};
const mockStatusManagerInstance = {};
const mockValidationManagerInstance = {};
const mockServiceWorkerManagerInstance = {};
const mockDiagnosticsManagerInstance = {};
const mockNotificationManagerInstance = {};
const mockLocaleManagerInstance = {};

jest.mock('../../../src/managers/options/core/DOMManager.js', () => jest.fn(() => mockDomManagerInstance));
jest.mock('../../../src/managers/options/core/StorageManager.js', () => jest.fn(() => mockStorageManagerInstance));
jest.mock('../../../src/managers/options/status/StatusManager.js', () => jest.fn(() => mockStatusManagerInstance));
jest.mock('../../../src/managers/options/core/ValidationManager.js', () => jest.fn(() => mockValidationManagerInstance));
jest.mock('../../../src/managers/app/ServiceWorkerManager.js', () => jest.fn(() => mockServiceWorkerManagerInstance));
jest.mock('../../../src/managers/app/DiagnosticsManager.js', () => jest.fn(() => mockDiagnosticsManagerInstance));
jest.mock('../../../src/managers/app/NotificationManager.js', () => jest.fn(() => mockNotificationManagerInstance));
jest.mock('../../../src/managers/locale/LocaleManager.js', () => jest.fn(() => mockLocaleManagerInstance));

jest.mock('../../../src/managers/options/core/InitializationManager.js', () => jest.fn(() => mockInitializationManagerInstance));
jest.mock('../../../src/managers/options/ui/UIManager.js', () => jest.fn(() => mockUIManagerInstance));
jest.mock('../../../src/managers/options/diagnostics/DiagnosticsWorkflowManager.js', () => jest.fn(() => mockDiagnosticsWorkflowManagerInstance));
jest.mock('../../../src/managers/options/diagnostics/DeveloperToolsManager.js', () => jest.fn(() => mockDeveloperToolsManagerInstance));
jest.mock('../../../src/managers/options/core/LogsManager.js', () => jest.fn(() => mockLogsManagerInstance));
jest.mock('../../../src/managers/options/diagnostics/DiagnosticsDataManager.js', () => jest.fn(() => mockDiagnosticsDataManagerInstance));
jest.mock('../../../src/managers/options/core/LifecycleManager.js', () => jest.fn(() => mockLifecycleManagerInstance));

const InitializationManagerMock = require('../../../src/managers/options/core/InitializationManager.js');
const UIManagerMock = require('../../../src/managers/options/ui/UIManager.js');
const DiagnosticsWorkflowManagerMock = require('../../../src/managers/options/diagnostics/DiagnosticsWorkflowManager.js');
const DeveloperToolsManagerMock = require('../../../src/managers/options/diagnostics/DeveloperToolsManager.js');
const LogsManagerMock = require('../../../src/managers/options/core/LogsManager.js');
const DiagnosticsDataManagerMock = require('../../../src/managers/options/diagnostics/DiagnosticsDataManager.js');
const LifecycleManagerMock = require('../../../src/managers/options/core/LifecycleManager.js');

const OptionsManager = require('../../../src/managers/options/OptionsManager.js');

describe('OptionsManager', () => {
    beforeEach(() => {
        mockInitializationManagerInstance.init.mockClear();
        mockLifecycleManagerInstance.destroy.mockClear();
        mockBaseManagerDestroy.mockClear();
        mockBaseManagerConstructor.mockClear();
        jest.clearAllMocks();
    });

    test('конструктор создаёт подменеджеры и запускает init', () => {
        const optionsManager = new OptionsManager({ enableLogging: false });

        expect(optionsManager).toBeInstanceOf(OptionsManager);
        expect(mockBaseManagerConstructor).toHaveBeenCalledWith(expect.objectContaining({ enableLogging: false }));
        expect(InitializationManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(UIManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(DiagnosticsWorkflowManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(DeveloperToolsManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(LogsManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(DiagnosticsDataManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(LifecycleManagerMock).toHaveBeenCalledWith(optionsManager);
        expect(mockInitializationManagerInstance.init).toHaveBeenCalled();
    });

    test('destroy вызывает LifecycleManager и super.destroy при успехе', () => {
        const optionsManager = new OptionsManager();

        optionsManager.destroy();

        expect(mockLifecycleManagerInstance.destroy).toHaveBeenCalled();
        expect(mockBaseManagerDestroy).toHaveBeenCalled();
    });

    test('destroy не вызывает super.destroy, если LifecycleManager возвращает false', () => {
        const optionsManager = new OptionsManager();
        mockLifecycleManagerInstance.destroy.mockReturnValueOnce(false);

        optionsManager.destroy();

        expect(mockBaseManagerDestroy).not.toHaveBeenCalled();
    });

    describe('Покрытие веток (Branch Coverage)', () => {
        test('конструктор обрабатывает ошибку при создании DOMManager', () => {
            const DOMManager = require('../../../src/managers/options/core/DOMManager.js');
            DOMManager.mockImplementationOnce(() => {
                throw new Error('DOM init error');
            });

            expect(() => {
                new OptionsManager({ enableLogging: false });
            }).toThrow();
        });

        test('конструктор обрабатывает ошибку при создании StorageManager', () => {
            const StorageManager = require('../../../src/managers/options/core/StorageManager.js');
            StorageManager.mockImplementationOnce(() => {
                throw new Error('Storage init error');
            });

            expect(() => {
                new OptionsManager({ enableLogging: false });
            }).toThrow();
        });

        test('конструктор обрабатывает ошибку при создании StatusManager и создает fallback', () => {
            const StatusManager = require('../../../src/managers/options/status/StatusManager.js');
            
            // Первый вызов выбрасывает ошибку, второй возвращает экземпляр
            StatusManager.mockImplementationOnce(() => {
                throw new Error('Status init error');
            });
            StatusManager.mockImplementationOnce(() => mockStatusManagerInstance);

            const optionsManager = new OptionsManager({ enableLogging: false });

            expect(StatusManager).toHaveBeenCalledTimes(2);
            expect(optionsManager.statusManager).toBe(mockStatusManagerInstance);
        });

        test('setActivityRange вызывает setActivityRangeByKey если uiManager и метод доступны', () => {
            const optionsManager = new OptionsManager({ enableLogging: false });
            optionsManager.uiManager = {
                setActivityRangeByKey: jest.fn()
            };

            optionsManager.setActivityRange('1d');

            expect(optionsManager.uiManager.setActivityRangeByKey).toHaveBeenCalledWith('1d');
        });

        test('setActivityRange не вызывает setActivityRangeByKey если uiManager отсутствует', () => {
            const optionsManager = new OptionsManager({ enableLogging: false });
            optionsManager.uiManager = null;

            expect(() => {
                optionsManager.setActivityRange('1d');
            }).not.toThrow();
        });

        test('setActivityRange не вызывает setActivityRangeByKey если метод отсутствует', () => {
            const optionsManager = new OptionsManager({ enableLogging: false });
            optionsManager.uiManager = {};

            expect(() => {
                optionsManager.setActivityRange('1d');
            }).not.toThrow();
        });

        test('setDomainExceptions обрабатывает не массив', () => {
            const optionsManager = new OptionsManager({ enableLogging: false });
            const setDomainExceptionsSpy = jest.fn();
            optionsManager.uiManager.setDomainExceptions = setDomainExceptionsSpy;

            optionsManager.setDomainExceptions('not an array');

            expect(optionsManager.domainExceptions).toEqual([]);
            expect(setDomainExceptionsSpy).toHaveBeenCalledWith('not an array');
        });

        test('setDomainExceptions обрабатывает массив', () => {
            const optionsManager = new OptionsManager({ enableLogging: false });
            const setDomainExceptionsSpy = jest.fn();
            optionsManager.uiManager.setDomainExceptions = setDomainExceptionsSpy;
            const domains = ['example.com', 'test.com'];

            optionsManager.setDomainExceptions(domains);

            expect(optionsManager.domainExceptions).toEqual(domains);
            expect(setDomainExceptionsSpy).toHaveBeenCalledWith(domains);
        });
    });

    describe('Методы-делегаты для покрытия statements', () => {
        let optionsManager;

        beforeEach(() => {
            optionsManager = new OptionsManager({ enableLogging: false });
        });

        test('init вызывает initializationManager.init', async () => {
            await optionsManager.init();
            expect(mockInitializationManagerInstance.init).toHaveBeenCalled();
        });

        test('loadSettings вызывает initializationManager.loadSettings', async () => {
            await optionsManager.loadSettings();
            expect(mockInitializationManagerInstance.loadSettings).toHaveBeenCalled();
        });

        test('setupEventHandlers вызывает uiManager.setupEventHandlers', () => {
            optionsManager.uiManager.setupEventHandlers = jest.fn();
            optionsManager.setupEventHandlers();
            expect(optionsManager.uiManager.setupEventHandlers).toHaveBeenCalled();
        });

        test('saveSettings вызывает uiManager.saveSettings', async () => {
            optionsManager.uiManager.saveSettings = jest.fn().mockResolvedValue();
            await optionsManager.saveSettings();
            expect(optionsManager.uiManager.saveSettings).toHaveBeenCalled();
        });

        test('resetToDefault вызывает uiManager.resetToDefault', async () => {
            optionsManager.uiManager.resetToDefault = jest.fn().mockResolvedValue();
            await optionsManager.resetToDefault();
            expect(optionsManager.uiManager.resetToDefault).toHaveBeenCalled();
        });

        test('runDiagnostics вызывает diagnosticsWorkflowManager.runDiagnostics', async () => {
            optionsManager.diagnosticsWorkflowManager.runDiagnostics = jest.fn().mockResolvedValue();
            await optionsManager.runDiagnostics();
            expect(optionsManager.diagnosticsWorkflowManager.runDiagnostics).toHaveBeenCalled();
        });

        test('clearDiagnostics вызывает diagnosticsWorkflowManager.clearDiagnostics', () => {
            optionsManager.diagnosticsWorkflowManager.clearDiagnostics = jest.fn();
            optionsManager.clearDiagnostics();
            expect(optionsManager.diagnosticsWorkflowManager.clearDiagnostics).toHaveBeenCalled();
        });

        test('toggleLanguage вызывает uiManager.toggleLanguage', async () => {
            optionsManager.uiManager.toggleLanguage = jest.fn().mockResolvedValue();
            await optionsManager.toggleLanguage();
            expect(optionsManager.uiManager.toggleLanguage).toHaveBeenCalled();
        });

        test('updateLanguageDisplay вызывает uiManager.updateLanguageDisplay', () => {
            optionsManager.uiManager.updateLanguageDisplay = jest.fn();
            optionsManager.updateLanguageDisplay();
            expect(optionsManager.uiManager.updateLanguageDisplay).toHaveBeenCalled();
        });

        test('onLocaleChange вызывает uiManager.onLocaleChange', () => {
            optionsManager.uiManager.onLocaleChange = jest.fn();
            optionsManager.onLocaleChange();
            expect(optionsManager.uiManager.onLocaleChange).toHaveBeenCalled();
        });

        test('setThemeManager вызывает uiManager.setThemeManager', () => {
            optionsManager.uiManager.setThemeManager = jest.fn();
            const themeManager = {};
            optionsManager.setThemeManager(themeManager);
            expect(optionsManager.uiManager.setThemeManager).toHaveBeenCalledWith(themeManager);
        });

        test('toggleTheme вызывает uiManager.toggleTheme', async () => {
            optionsManager.uiManager.toggleTheme = jest.fn().mockResolvedValue();
            await optionsManager.toggleTheme();
            expect(optionsManager.uiManager.toggleTheme).toHaveBeenCalled();
        });

        test('updateThemeDisplay вызывает uiManager.updateThemeDisplay', () => {
            optionsManager.uiManager.updateThemeDisplay = jest.fn();
            optionsManager.updateThemeDisplay('dark');
            expect(optionsManager.uiManager.updateThemeDisplay).toHaveBeenCalledWith('dark');
        });

        test('toggleDeveloperTools вызывает developerToolsManager.toggle', () => {
            optionsManager.developerToolsManager.toggle = jest.fn();
            optionsManager.toggleDeveloperTools();
            expect(optionsManager.developerToolsManager.toggle).toHaveBeenCalled();
        });

        test('openDevToolsPanel вызывает developerToolsManager.openPanel', () => {
            optionsManager.developerToolsManager.openPanel = jest.fn();
            optionsManager.openDevToolsPanel('diagnostics');
            expect(optionsManager.developerToolsManager.openPanel).toHaveBeenCalledWith('diagnostics');
        });

        test('openDevToolsPanel использует значение по умолчанию', () => {
            optionsManager.developerToolsManager.openPanel = jest.fn();
            optionsManager.openDevToolsPanel();
            expect(optionsManager.developerToolsManager.openPanel).toHaveBeenCalledWith('logs');
        });

        test('closeDevToolsPanel вызывает developerToolsManager.closePanel', () => {
            optionsManager.developerToolsManager.closePanel = jest.fn();
            optionsManager.closeDevToolsPanel();
            expect(optionsManager.developerToolsManager.closePanel).toHaveBeenCalled();
        });

        test('switchTab вызывает developerToolsManager.switchTab', () => {
            optionsManager.developerToolsManager.switchTab = jest.fn();
            optionsManager.switchTab('diagnostics');
            expect(optionsManager.developerToolsManager.switchTab).toHaveBeenCalledWith('diagnostics');
        });

        test('setLogLevelFilter вызывает logsManager.setLevelFilter', () => {
            optionsManager.logsManager.setLevelFilter = jest.fn();
            optionsManager.setLogLevelFilter('ERROR');
            expect(optionsManager.logsManager.setLevelFilter).toHaveBeenCalledWith('ERROR');
        });

        test('setLogClassFilter вызывает logsManager.setClassFilter', () => {
            optionsManager.logsManager.setClassFilter = jest.fn();
            optionsManager.setLogClassFilter('TestClass');
            expect(optionsManager.logsManager.setClassFilter).toHaveBeenCalledWith('TestClass');
        });

        test('setServerOnlyFilter вызывает logsManager.setServerOnly', () => {
            optionsManager.logsManager.setServerOnly = jest.fn();
            optionsManager.setServerOnlyFilter(true);
            expect(optionsManager.logsManager.setServerOnly).toHaveBeenCalledWith(true);
        });

        test('loadLogs вызывает logsManager.loadLogs', async () => {
            optionsManager.logsManager.loadLogs = jest.fn().mockResolvedValue();
            await optionsManager.loadLogs();
            expect(optionsManager.logsManager.loadLogs).toHaveBeenCalled();
        });

        test('clearLogs вызывает logsManager.clearLogs', async () => {
            optionsManager.logsManager.clearLogs = jest.fn().mockResolvedValue();
            await optionsManager.clearLogs();
            expect(optionsManager.logsManager.clearLogs).toHaveBeenCalled();
        });

        test('copyLogs вызывает logsManager.copyLogs', async () => {
            optionsManager.logsManager.copyLogs = jest.fn().mockResolvedValue();
            await optionsManager.copyLogs();
            expect(optionsManager.logsManager.copyLogs).toHaveBeenCalled();
        });

        test('loadActivityStats вызывает uiManager.loadActivityStats', async () => {
            optionsManager.uiManager.loadActivityStats = jest.fn().mockResolvedValue();
            await optionsManager.loadActivityStats();
            expect(optionsManager.uiManager.loadActivityStats).toHaveBeenCalled();
        });

        test('getCurrentBackendUrl вызывает diagnosticsDataManager.getCurrentBackendUrl', () => {
            optionsManager.diagnosticsDataManager.getCurrentBackendUrl = jest.fn().mockReturnValue('https://api.example.com');
            const url = optionsManager.getCurrentBackendUrl();
            expect(optionsManager.diagnosticsDataManager.getCurrentBackendUrl).toHaveBeenCalled();
            expect(url).toBe('https://api.example.com');
        });

        test('getDefaultBackendUrl вызывает diagnosticsDataManager.getDefaultBackendUrl', () => {
            optionsManager.diagnosticsDataManager.getDefaultBackendUrl = jest.fn().mockReturnValue('https://default.api.com');
            const url = optionsManager.getDefaultBackendUrl();
            expect(optionsManager.diagnosticsDataManager.getDefaultBackendUrl).toHaveBeenCalled();
            expect(url).toBe('https://default.api.com');
        });

        test('isCurrentUrlValid вызывает diagnosticsDataManager.isCurrentUrlValid', () => {
            optionsManager.diagnosticsDataManager.isCurrentUrlValid = jest.fn().mockReturnValue(true);
            const isValid = optionsManager.isCurrentUrlValid();
            expect(optionsManager.diagnosticsDataManager.isCurrentUrlValid).toHaveBeenCalled();
            expect(isValid).toBe(true);
        });

        test('getStatusStatistics вызывает diagnosticsDataManager.getStatusStatistics', () => {
            const stats = { total: 10 };
            optionsManager.diagnosticsDataManager.getStatusStatistics = jest.fn().mockReturnValue(stats);
            const result = optionsManager.getStatusStatistics();
            expect(optionsManager.diagnosticsDataManager.getStatusStatistics).toHaveBeenCalled();
            expect(result).toBe(stats);
        });

        test('getStatusHistory вызывает diagnosticsDataManager.getStatusHistory', () => {
            const history = [{ id: 1 }];
            optionsManager.diagnosticsDataManager.getStatusHistory = jest.fn().mockReturnValue(history);
            const result = optionsManager.getStatusHistory({ limit: 10 });
            expect(optionsManager.diagnosticsDataManager.getStatusHistory).toHaveBeenCalledWith({ limit: 10 });
            expect(result).toBe(history);
        });

        test('getStatusHistory использует пустой объект по умолчанию', () => {
            const history = [];
            optionsManager.diagnosticsDataManager.getStatusHistory = jest.fn().mockReturnValue(history);
            optionsManager.getStatusHistory();
            expect(optionsManager.diagnosticsDataManager.getStatusHistory).toHaveBeenCalledWith({});
        });

        test('getStatusPerformanceMetrics вызывает diagnosticsDataManager.getStatusPerformanceMetrics', () => {
            const metrics = { avg: 100 };
            optionsManager.diagnosticsDataManager.getStatusPerformanceMetrics = jest.fn().mockReturnValue(metrics);
            const result = optionsManager.getStatusPerformanceMetrics();
            expect(optionsManager.diagnosticsDataManager.getStatusPerformanceMetrics).toHaveBeenCalled();
            expect(result).toBe(metrics);
        });

        test('clearStatusHistory вызывает diagnosticsDataManager.clearStatusHistory', () => {
            optionsManager.diagnosticsDataManager.clearStatusHistory = jest.fn().mockReturnValue(5);
            const count = optionsManager.clearStatusHistory();
            expect(optionsManager.diagnosticsDataManager.clearStatusHistory).toHaveBeenCalled();
            expect(count).toBe(5);
        });

        test('getValidationStatistics вызывает diagnosticsDataManager.getValidationStatistics', () => {
            const stats = { valid: 8, invalid: 2 };
            optionsManager.diagnosticsDataManager.getValidationStatistics = jest.fn().mockReturnValue(stats);
            const result = optionsManager.getValidationStatistics();
            expect(optionsManager.diagnosticsDataManager.getValidationStatistics).toHaveBeenCalled();
            expect(result).toBe(stats);
        });

        test('getValidationHistory вызывает diagnosticsDataManager.getValidationHistory', () => {
            const history = [{ id: 1 }];
            optionsManager.diagnosticsDataManager.getValidationHistory = jest.fn().mockReturnValue(history);
            const result = optionsManager.getValidationHistory({ limit: 5 });
            expect(optionsManager.diagnosticsDataManager.getValidationHistory).toHaveBeenCalledWith({ limit: 5 });
            expect(result).toBe(history);
        });

        test('getValidationHistory использует пустой объект по умолчанию', () => {
            const history = [];
            optionsManager.diagnosticsDataManager.getValidationHistory = jest.fn().mockReturnValue(history);
            optionsManager.getValidationHistory();
            expect(optionsManager.diagnosticsDataManager.getValidationHistory).toHaveBeenCalledWith({});
        });

        test('clearValidationHistory вызывает diagnosticsDataManager.clearValidationHistory', () => {
            optionsManager.diagnosticsDataManager.clearValidationHistory = jest.fn().mockReturnValue(3);
            const count = optionsManager.clearValidationHistory();
            expect(optionsManager.diagnosticsDataManager.clearValidationHistory).toHaveBeenCalled();
            expect(count).toBe(3);
        });

        test('getValidationPerformanceMetrics вызывает diagnosticsDataManager.getValidationPerformanceMetrics', () => {
            const metrics = { avg: 50 };
            optionsManager.diagnosticsDataManager.getValidationPerformanceMetrics = jest.fn().mockReturnValue(metrics);
            const result = optionsManager.getValidationPerformanceMetrics();
            expect(optionsManager.diagnosticsDataManager.getValidationPerformanceMetrics).toHaveBeenCalled();
            expect(result).toBe(metrics);
        });

        test('validateManagersState вызывает diagnosticsDataManager.validateManagersState', () => {
            const validation = { isValid: true };
            optionsManager.diagnosticsDataManager.validateManagersState = jest.fn().mockReturnValue(validation);
            const result = optionsManager.validateManagersState();
            expect(optionsManager.diagnosticsDataManager.validateManagersState).toHaveBeenCalled();
            expect(result).toBe(validation);
        });

        test('getDiagnostics вызывает diagnosticsDataManager.getDiagnostics', () => {
            const diagnostics = { status: 'ok' };
            optionsManager.diagnosticsDataManager.getDiagnostics = jest.fn().mockReturnValue(diagnostics);
            const result = optionsManager.getDiagnostics();
            expect(optionsManager.diagnosticsDataManager.getDiagnostics).toHaveBeenCalled();
            expect(result).toBe(diagnostics);
        });
    });
});
