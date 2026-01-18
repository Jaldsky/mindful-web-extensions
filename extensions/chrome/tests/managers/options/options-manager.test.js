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

    describe('Connection Status Methods', () => {
        let optionsManager;
        let mockConnectionStatusElement;
        let mockStatusIndicator;
        let mockLastCheckElement;
        let mockTestConnectionButton;

        beforeEach(() => {
            // Setup DOM elements
            mockConnectionStatusElement = document.createElement('span');
            mockConnectionStatusElement.id = 'connectionStatus';
            document.body.appendChild(mockConnectionStatusElement);

            mockStatusIndicator = document.createElement('span');
            mockStatusIndicator.id = 'statusIndicator';
            document.body.appendChild(mockStatusIndicator);

            mockLastCheckElement = document.createElement('div');
            mockLastCheckElement.id = 'connectionLastCheck';
            document.body.appendChild(mockLastCheckElement);

            mockTestConnectionButton = document.createElement('button');
            mockTestConnectionButton.id = 'testConnection';
            document.body.appendChild(mockTestConnectionButton);

            // Setup chrome.storage mock
            global.chrome = {
                storage: {
                    local: {
                        set: jest.fn((data, callback) => callback()),
                        get: jest.fn((keys, callback) => callback({}))
                    }
                },
                runtime: { lastError: null }
            };

            optionsManager = new OptionsManager({ enableLogging: false });
            optionsManager.domManager.elements.connectionStatus = mockConnectionStatusElement;
            optionsManager.domManager.elements.testConnection = mockTestConnectionButton;
            optionsManager.serviceWorkerManager.checkConnection = jest.fn();
            optionsManager.statusManager.showStatus = jest.fn();
            optionsManager.localeManager.t = jest.fn((key) => {
                const translations = {
                    'options.connection.checking': 'Checking...',
                    'options.connection.online': 'Online',
                    'options.connection.offline': 'Offline',
                    'options.connection.success': 'Connection successful',
                    'options.connection.failed': 'Connection failed',
                    'options.connection.error': 'Connection error',
                    'options.connection.tooFrequent': 'Request too frequent',
                    'options.connection.lastChecked': 'Last checked',
                    'options.connection.cachedStatus': 'Cached status',
                    'options.connection.checkError': 'Error checking status'
                };
                return translations[key] || key;
            });

            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            document.body.innerHTML = '';
            delete global.chrome;
        });

        describe('testConnection', () => {
            test('должен успешно проверить подключение', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: true
                });

                const resultPromise = optionsManager.testConnection();
                jest.advanceTimersByTime(500);
                const result = await resultPromise;

                expect(result).toBe(true);
                expect(mockConnectionStatusElement.textContent).toBe('Connection successful');
                expect(optionsManager.statusManager.showStatus).toHaveBeenCalledWith('Connection successful', 'success');
                expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
                    { mindful_connection_status: true },
                    expect.any(Function)
                );
            });

            test('должен обработать неудачное подключение', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: false
                });

                const resultPromise = optionsManager.testConnection();
                jest.advanceTimersByTime(500);
                const result = await resultPromise;

                expect(result).toBe(false);
                expect(mockConnectionStatusElement.textContent).toBe('Connection failed');
                expect(optionsManager.statusManager.showStatus).toHaveBeenCalledWith('Connection failed', 'error');
            });

            test('должен обработать слишком частые запросы', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: false,
                    tooFrequent: true
                });

                const resultPromise = optionsManager.testConnection();
                jest.advanceTimersByTime(500);
                const result = await resultPromise;

                expect(result).toBe(false);
                expect(mockConnectionStatusElement.textContent).toBe('Request too frequent');
                expect(optionsManager.statusManager.showStatus).toHaveBeenCalledWith('Request too frequent', 'warning');
            });

            test('должен обработать ошибку проверки', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockRejectedValue(
                    new Error('Network error')
                );

                const resultPromise = optionsManager.testConnection();
                jest.advanceTimersByTime(500);
                const result = await resultPromise;

                expect(result).toBe(false);
                expect(mockConnectionStatusElement.textContent).toBe('Connection error');
                expect(optionsManager.statusManager.showStatus).toHaveBeenCalledWith('Connection error', 'error');
            });

            test('должен отключить кнопку во время проверки', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: true
                });

                const resultPromise = optionsManager.testConnection();
                
                expect(mockTestConnectionButton.disabled).toBe(true);
                
                jest.advanceTimersByTime(500);
                await resultPromise;
            });
        });

        describe('updateConnectionStatus', () => {
            test('должен обновить статус для online', () => {
                optionsManager.updateConnectionStatus(true);

                expect(mockConnectionStatusElement.textContent).toBe('Online');
                expect(mockStatusIndicator.classList.contains('status-online')).toBe(true);
                expect(mockTestConnectionButton.disabled).toBe(false);
            });

            test('должен обновить статус для offline', () => {
                optionsManager.updateConnectionStatus(false);

                expect(mockConnectionStatusElement.textContent).toBe('Offline');
                expect(mockStatusIndicator.classList.contains('status-offline')).toBe(true);
                expect(mockTestConnectionButton.disabled).toBe(false);
            });

            test('должен удалить класс showing-message', () => {
                mockTestConnectionButton.classList.add('showing-message');
                
                optionsManager.updateConnectionStatus(true);

                expect(mockTestConnectionButton.classList.contains('showing-message')).toBe(false);
            });

            test('не должен падать если element отсутствует', () => {
                optionsManager.domManager.elements.connectionStatus = null;

                expect(() => {
                    optionsManager.updateConnectionStatus(true);
                }).not.toThrow();
            });
        });

        describe('updateConnectionLastCheckLocale', () => {
            test('должен обновить локализацию для cached статуса', () => {
                optionsManager._lastCheckType = 'cached';
                
                optionsManager.updateConnectionLastCheckLocale();

                expect(mockLastCheckElement.textContent).toBe('Cached status');
            });

            test('должен обновить локализацию для error статуса', () => {
                optionsManager._lastCheckType = 'error';
                
                optionsManager.updateConnectionLastCheckLocale();

                expect(mockLastCheckElement.textContent).toBe('Error checking status');
            });

            test('должен обновить локализацию для timestamp', () => {
                const testDate = new Date('2024-01-01T12:30:00');
                optionsManager._lastCheckType = 'timestamp';
                optionsManager._lastCheckTimestamp = testDate;
                
                optionsManager.updateConnectionLastCheckLocale();

                expect(mockLastCheckElement.textContent).toContain('Last checked');
                expect(mockLastCheckElement.textContent).toContain(testDate.toLocaleTimeString());
            });

            test('не должен падать если element отсутствует', () => {
                mockLastCheckElement.remove();
                optionsManager._lastCheckType = 'cached';

                expect(() => {
                    optionsManager.updateConnectionLastCheckLocale();
                }).not.toThrow();
            });
        });

        describe('loadConnectionStatus', () => {
            test('должен загрузить статус при успешном подключении', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: true
                });

                await optionsManager.loadConnectionStatus();

                expect(mockConnectionStatusElement.textContent).toBe('Online');
                expect(optionsManager._lastConnectionStatus).toBe(true);
                expect(optionsManager._lastCheckType).toBe('timestamp');
            });

            test('должен загрузить статус при неудачном подключении', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: false
                });

                await optionsManager.loadConnectionStatus();

                expect(mockConnectionStatusElement.textContent).toBe('Offline');
                expect(optionsManager._lastConnectionStatus).toBe(false);
            });

            test('должен использовать кэшированный статус при tooFrequent', async () => {
                global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                    callback({ mindful_connection_status: true });
                });
                
                optionsManager.serviceWorkerManager.checkConnection.mockResolvedValue({
                    success: false,
                    tooFrequent: true
                });

                await optionsManager.loadConnectionStatus();

                expect(mockConnectionStatusElement.textContent).toBe('Online');
                expect(optionsManager._lastConnectionStatus).toBe(true);
                expect(optionsManager._lastCheckType).toBe('cached');
                expect(mockLastCheckElement.textContent).toBe('Cached status');
            });

            test('должен обработать ошибку загрузки', async () => {
                optionsManager.serviceWorkerManager.checkConnection.mockRejectedValue(
                    new Error('Load error')
                );

                await optionsManager.loadConnectionStatus();

                expect(mockConnectionStatusElement.textContent).toBe('Offline');
                expect(optionsManager._lastConnectionStatus).toBe(false);
                expect(optionsManager._lastCheckType).toBe('error');
                expect(mockLastCheckElement.textContent).toBe('Error checking status');
            });
        });

        describe('_saveConnectionStatusToStorage', () => {
            test('должен сохранить статус в chrome.storage', async () => {
                await optionsManager._saveConnectionStatusToStorage(true);

                expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
                    { mindful_connection_status: true },
                    expect.any(Function)
                );
                expect(optionsManager._lastConnectionStatus).toBe(true);
            });

            test('должен обработать ошибку chrome.runtime.lastError', async () => {
                global.chrome.runtime.lastError = { message: 'Storage error' };

                await optionsManager._saveConnectionStatusToStorage(true);

                expect(optionsManager._logError).toHaveBeenCalled();
                
                global.chrome.runtime.lastError = null;
            });

            test('не должен падать если chrome.storage недоступен', async () => {
                delete global.chrome.storage;

                await expect(
                    optionsManager._saveConnectionStatusToStorage(true)
                ).resolves.not.toThrow();
            });
        });

        describe('_loadConnectionStatusFromStorage', () => {
            test('должен загрузить статус из chrome.storage', async () => {
                global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                    callback({ mindful_connection_status: true });
                });

                const result = await optionsManager._loadConnectionStatusFromStorage();

                expect(result).toBe(true);
                expect(global.chrome.storage.local.get).toHaveBeenCalledWith(
                    ['mindful_connection_status'],
                    expect.any(Function)
                );
            });

            test('должен вернуть null если статус не найден', async () => {
                global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                    callback({});
                });

                const result = await optionsManager._loadConnectionStatusFromStorage();

                expect(result).toBe(null);
            });

            test('должен обработать ошибку chrome.runtime.lastError', async () => {
                global.chrome.runtime.lastError = { message: 'Storage error' };
                global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                    callback({});
                });

                const result = await optionsManager._loadConnectionStatusFromStorage();

                expect(optionsManager._logError).toHaveBeenCalled();
                expect(result).toBe(null);
                
                global.chrome.runtime.lastError = null;
            });

            test('не должен падать если chrome.storage недоступен', async () => {
                delete global.chrome.storage;

                const result = await optionsManager._loadConnectionStatusFromStorage();

                expect(result).toBe(null);
            });
        });

        describe('_showConnectionStatusMessage', () => {
            test('должен показать success сообщение', () => {
                optionsManager._showConnectionStatusMessage('Connected', 'success');

                expect(mockConnectionStatusElement.textContent).toBe('Connected');
                expect(mockStatusIndicator.classList.contains('status-online')).toBe(true);
                expect(mockTestConnectionButton.disabled).toBe(true);
                expect(mockTestConnectionButton.classList.contains('showing-message')).toBe(true);
                expect(optionsManager._lastCheckType).toBe('timestamp');
            });

            test('должен показать error сообщение', () => {
                optionsManager._showConnectionStatusMessage('Failed', 'error');

                expect(mockConnectionStatusElement.textContent).toBe('Failed');
                expect(mockStatusIndicator.classList.contains('status-offline')).toBe(true);
                expect(mockTestConnectionButton.disabled).toBe(true);
            });

            test('должен показать warning сообщение', () => {
                optionsManager._showConnectionStatusMessage('Too frequent', 'warning');

                expect(mockConnectionStatusElement.textContent).toBe('Too frequent');
                expect(mockStatusIndicator.classList.contains('status-warning')).toBe(true);
                expect(mockTestConnectionButton.disabled).toBe(true);
            });

            test('должен восстановить статус после таймаута', () => {
                optionsManager._lastConnectionStatus = true;
                optionsManager._showConnectionStatusMessage('Connected', 'success');

                jest.advanceTimersByTime(2000);

                expect(mockConnectionStatusElement.textContent).toBe('Online');
                expect(mockTestConnectionButton.disabled).toBe(false);
            });

            test('должен очистить предыдущий таймер', () => {
                optionsManager._showConnectionStatusMessage('Message 1', 'success');
                const firstTimer = optionsManager._connectionMessageTimer;
                
                optionsManager._showConnectionStatusMessage('Message 2', 'success');
                
                expect(optionsManager._connectionMessageTimer).not.toBe(firstTimer);
            });

            test('не должен падать если element отсутствует', () => {
                optionsManager.domManager.elements.connectionStatus = null;

                expect(() => {
                    optionsManager._showConnectionStatusMessage('Test', 'info');
                }).not.toThrow();
            });
        });
    });
});
