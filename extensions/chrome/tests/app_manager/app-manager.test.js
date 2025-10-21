/**
 * Тесты для AppManager класса
 * Тестирует главный менеджер приложения, координирующий работу всех компонентов popup
 */

jest.mock('../../src/app_manager/DOMManager.js');
jest.mock('../../src/app_manager/NotificationManager.js');
jest.mock('../../src/app_manager/ServiceWorkerManager.js');
jest.mock('../../src/app_manager/DiagnosticsManager.js');

const BaseManager = require('../../src/app_manager/BaseManager.js');
const DOMManager = require('../../src/app_manager/DOMManager.js');
const NotificationManager = require('../../src/app_manager/NotificationManager.js');
const ServiceWorkerManager = require('../../src/app_manager/ServiceWorkerManager.js');
const DiagnosticsManager = require('../../src/app_manager/DiagnosticsManager.js');

global.window.BaseManager = BaseManager;
global.window.DOMManager = DOMManager;
global.window.NotificationManager = NotificationManager;
global.window.ServiceWorkerManager = ServiceWorkerManager;
global.window.DiagnosticsManager = DiagnosticsManager;

const AppManager = require('../../src/app_manager/AppManager.js');

describe('AppManager', () => {
    let appManager;
    let mockDOMManager;
    let mockNotificationManager;
    let mockServiceWorkerManager;
    let mockDiagnosticsManager;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockDOMManager = {
            elements: {
                openSettings: document.getElementById('openSettings'),
                testConnection: document.getElementById('testConnection'),
                reloadExtension: document.getElementById('reloadExtension'),
                runDiagnostics: document.getElementById('runDiagnostics')
            },
            updateConnectionStatus: jest.fn(),
            updateTrackingStatus: jest.fn(),
            updateCounters: jest.fn(),
            setButtonState: jest.fn(),
            destroy: jest.fn()
        };

        mockNotificationManager = {
            showNotification: jest.fn(),
            destroy: jest.fn()
        };

        mockServiceWorkerManager = {
            checkConnection: jest.fn().mockResolvedValue(true),
            getTrackingStatus: jest.fn().mockResolvedValue({
                isTracking: true
            }),
            getTodayStats: jest.fn().mockResolvedValue({
                events: 10,
                domains: 5,
                queue: 2
            }),
            destroy: jest.fn()
        };

        mockDiagnosticsManager = {
            runDiagnostics: jest.fn().mockResolvedValue({
                overall: 'ok',
                checks: []
            }),
            displayDiagnosticResults: jest.fn(),
            destroy: jest.fn()
        };

        DOMManager.mockImplementation(() => mockDOMManager);
        NotificationManager.mockImplementation(() => mockNotificationManager);
        ServiceWorkerManager.mockImplementation(() => mockServiceWorkerManager);
        DiagnosticsManager.mockImplementation(() => mockDiagnosticsManager);

        global.chrome.runtime.openOptionsPage = jest.fn();
        global.chrome.runtime.reload = jest.fn();
    });

    afterEach(() => {
        if (appManager && appManager.isInitialized) {
            appManager.destroy();
        }
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('static properties', () => {
        test('should have BUTTON_LABELS constant', () => {
            expect(AppManager.BUTTON_LABELS).toBeDefined();
            expect(AppManager.BUTTON_LABELS.TEST_CONNECTION).toBeDefined();
            expect(AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS).toBeDefined();
        });

        test('BUTTON_LABELS should have correct structure', () => {
            expect(AppManager.BUTTON_LABELS.TEST_CONNECTION.DEFAULT).toBe('🔍 Test Connection');
            expect(AppManager.BUTTON_LABELS.TEST_CONNECTION.LOADING).toBe('🔍 Checking...');
            expect(AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS.DEFAULT).toBe('🔧 Run Diagnostics');
            expect(AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS.LOADING).toBe('🔧 Analyzing...');
        });
    });

    describe('constructor', () => {
        test('should create AppManager instance with default options', () => {
            appManager = new AppManager({ enableLogging: false });
            
            expect(appManager).toBeDefined();
            expect(appManager.domManager).toBe(mockDOMManager);
            expect(appManager.notificationManager).toBe(mockNotificationManager);
            expect(appManager.serviceWorkerManager).toBe(mockServiceWorkerManager);
            expect(appManager.diagnosticsManager).toBe(mockDiagnosticsManager);
        });

        test('should initialize with logging enabled by default', () => {
            appManager = new AppManager();
            
            expect(appManager.enableLogging).toBe(true);
        });

        test('should initialize eventHandlers Map', () => {
            appManager = new AppManager({ enableLogging: false });
            
            expect(appManager.eventHandlers).toBeInstanceOf(Map);
            expect(appManager.eventHandlers.size).toBeGreaterThanOrEqual(0);
        });

        test('should initialize originalButtonTexts Map', () => {
            appManager = new AppManager({ enableLogging: false });
            
            expect(appManager.originalButtonTexts).toBeInstanceOf(Map);
        });

        test('should have isInitialized property', () => {
            appManager = new AppManager({ enableLogging: false });

            expect(typeof appManager.isInitialized).toBe('boolean');
        });

        test('should have updateInterval property', () => {
            appManager = new AppManager({ enableLogging: false });

            expect(appManager).toHaveProperty('updateInterval');
        });
    });

    describe('init', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should not reinitialize if already initialized', async () => {
            const initialHandlers = appManager.eventHandlers;
            
            await appManager.init();
            
            expect(appManager.eventHandlers).toBe(initialHandlers);
        });

        test('should call loadInitialStatus', async () => {
            appManager.isInitialized = false;
            const loadSpy = jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            await appManager.init();
            
            expect(loadSpy).toHaveBeenCalled();
            loadSpy.mockRestore();
        });

        test('should call setupEventHandlers', async () => {
            appManager.isInitialized = false;
            const setupSpy = jest.spyOn(appManager, 'setupEventHandlers');
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            await appManager.init();
            
            expect(setupSpy).toHaveBeenCalled();
            setupSpy.mockRestore();
        });

        test('should call startPeriodicUpdates', async () => {
            appManager.isInitialized = false;
            const startSpy = jest.spyOn(appManager, 'startPeriodicUpdates');
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            await appManager.init();
            
            expect(startSpy).toHaveBeenCalled();
            startSpy.mockRestore();
        });

        test('should set isInitialized to true', async () => {
            appManager.isInitialized = false;
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            await appManager.init();
            
            expect(appManager.isInitialized).toBe(true);
        });

        test('should handle initialization errors', async () => {
            appManager.isInitialized = false;
            const error = new Error('Init failed');
            jest.spyOn(appManager, 'loadInitialStatus').mockRejectedValue(error);
            
            await expect(appManager.init()).rejects.toThrow('Init failed');
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Initialization Error', 'error');
        });
    });

    describe('loadInitialStatus', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should check connection status', async () => {
            await appManager.loadInitialStatus();
            
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalled();
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(true);
        });

        test('should get tracking status', async () => {
            await appManager.loadInitialStatus();
            
            expect(mockServiceWorkerManager.getTrackingStatus).toHaveBeenCalled();
            expect(mockDOMManager.updateTrackingStatus).toHaveBeenCalledWith(true);
        });

        test('should get today stats', async () => {
            await appManager.loadInitialStatus();
            
            expect(mockServiceWorkerManager.getTodayStats).toHaveBeenCalled();
            expect(mockDOMManager.updateCounters).toHaveBeenCalled();
        });

        test('should handle connection error', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Connection failed'));
            
            await appManager.loadInitialStatus();
            
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Status Loading Error', 'error');
        });
    });

    describe('setupEventHandlers', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should setup event handler for openSettings button', () => {
            const handler = appManager.eventHandlers.get('openSettings');
            
            expect(handler).toBeDefined();
        });

        test('should setup event handler for testConnection button', () => {
            const handler = appManager.eventHandlers.get('testConnection');
            
            expect(handler).toBeDefined();
        });

        test('should setup event handler for reloadExtension button', () => {
            const handler = appManager.eventHandlers.get('reloadExtension');
            
            expect(handler).toBeDefined();
        });

        test('should setup event handler for runDiagnostics button', () => {
            const handler = appManager.eventHandlers.get('runDiagnostics');
            
            expect(handler).toBeDefined();
        });

        test('should store original text for testConnection button', () => {
            const originalText = appManager.originalButtonTexts.get('testConnection');
            
            expect(originalText).toBe('Test Connection');
        });

        test('should store original text for runDiagnostics button', () => {
            const originalText = appManager.originalButtonTexts.get('runDiagnostics');
            
            expect(originalText).toBe('Run Diagnostics');
        });

        test('should store all handlers in eventHandlers Map', () => {
            expect(appManager.eventHandlers.size).toBeGreaterThan(0);
        });
    });

    describe('testConnection', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should update button state to loading', async () => {
            await appManager.testConnection();
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalledWith(
                mockDOMManager.elements.testConnection,
                AppManager.BUTTON_LABELS.TEST_CONNECTION.LOADING,
                true
            );
        });

        test('should check connection', async () => {
            await appManager.testConnection();
            
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalled();
        });

        test('should show success notification when online', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue(true);
            
            const result = await appManager.testConnection();
            
            expect(result).toBe(true);
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Connection Successful!', 'success');
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(true);
        });

        test('should show error notification when offline', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue(false);
            
            const result = await appManager.testConnection();
            
            expect(result).toBe(false);
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Connection Failed', 'error');
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(false);
        });

        test('should update state on success', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue(true);
            
            await appManager.testConnection();
            
            expect(appManager.state.isOnline).toBe(true);
        });

        test('should handle connection error', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Network error'));
            
            const result = await appManager.testConnection();
            
            expect(result).toBe(false);
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Connection Test Error', 'error');
        });

        test('should restore button state after completion', async () => {
            await appManager.testConnection();
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalledWith(
                mockDOMManager.elements.testConnection,
                'Test Connection',
                false
            );
        });

        test('should restore button state even on error', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Error'));
            
            await appManager.testConnection();
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalledWith(
                mockDOMManager.elements.testConnection,
                'Test Connection',
                false
            );
        });
    });

    describe('runDiagnostics', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should update button state to loading', async () => {
            await appManager.runDiagnostics();
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalledWith(
                mockDOMManager.elements.runDiagnostics,
                AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS.LOADING,
                true
            );
        });

        test('should run diagnostics', async () => {
            await appManager.runDiagnostics();
            
            expect(mockDiagnosticsManager.runDiagnostics).toHaveBeenCalled();
        });

        test('should display diagnostic results', async () => {
            const mockResults = { overall: 'ok', checks: [] };
            mockDiagnosticsManager.runDiagnostics.mockResolvedValue(mockResults);
            
            await appManager.runDiagnostics();
            
            expect(mockDiagnosticsManager.displayDiagnosticResults).toHaveBeenCalledWith(mockResults);
        });

        test('should return diagnostic results', async () => {
            const mockResults = { overall: 'ok', checks: [] };
            mockDiagnosticsManager.runDiagnostics.mockResolvedValue(mockResults);
            
            const result = await appManager.runDiagnostics();
            
            expect(result).toEqual(mockResults);
        });

        test('should handle diagnostics error', async () => {
            const error = new Error('Diagnostics failed');
            mockDiagnosticsManager.runDiagnostics.mockRejectedValue(error);
            
            await expect(appManager.runDiagnostics()).rejects.toThrow('Diagnostics failed');
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Diagnostics Error', 'error');
        });

        test('should restore button state after completion', async () => {
            await appManager.runDiagnostics();
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalledWith(
                mockDOMManager.elements.runDiagnostics,
                'Run Diagnostics',
                false
            );
        });

        test('should restore button state even on error', async () => {
            mockDiagnosticsManager.runDiagnostics.mockRejectedValue(new Error('Error'));
            
            await expect(appManager.runDiagnostics()).rejects.toThrow();
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalledWith(
                mockDOMManager.elements.runDiagnostics,
                'Run Diagnostics',
                false
            );
        });
    });

    describe('startPeriodicUpdates', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should start interval for periodic updates', () => {
            appManager.updateInterval = null;
            
            appManager.startPeriodicUpdates();
            
            expect(appManager.updateInterval).not.toBeNull();
        });

        test('should not start if already running', () => {
            const existingInterval = appManager.updateInterval;
            
            appManager.startPeriodicUpdates();
            
            expect(appManager.updateInterval).toBe(existingInterval);
        });

        test('should call loadInitialStatus periodically', () => {
            jest.useFakeTimers();
            appManager.updateInterval = null;
            const loadSpy = jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            appManager.startPeriodicUpdates();
            
            jest.advanceTimersByTime(2000);
            
            expect(loadSpy).toHaveBeenCalled();
            loadSpy.mockRestore();
        });

        test('should handle errors in periodic updates', () => {
            appManager.updateInterval = null;
            jest.spyOn(appManager, 'loadInitialStatus').mockRejectedValue(new Error('Update failed'));
            
            appManager.startPeriodicUpdates();
            jest.advanceTimersByTime(2000);

            expect(appManager.updateInterval).not.toBeNull();
        });
    });

    describe('_stopPeriodicUpdates', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should clear interval', () => {
            appManager._stopPeriodicUpdates();
            
            expect(appManager.updateInterval).toBeNull();
        });

        test('should do nothing if no interval is running', () => {
            appManager.updateInterval = null;
            
            expect(() => appManager._stopPeriodicUpdates()).not.toThrow();
        });
    });

    describe('_removeEventHandlers', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should clear all event handlers', () => {
            appManager._removeEventHandlers();
            
            expect(appManager.eventHandlers.size).toBe(0);
        });

        test('should not throw error if elements are missing', () => {
            mockDOMManager.elements = {};
            
            expect(() => appManager._removeEventHandlers()).not.toThrow();
        });
    });

    describe('_destroyManagers', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should destroy all managers', () => {
            appManager._destroyManagers();
            
            expect(mockDiagnosticsManager.destroy).toHaveBeenCalled();
            expect(mockServiceWorkerManager.destroy).toHaveBeenCalled();
            expect(mockNotificationManager.destroy).toHaveBeenCalled();
            expect(mockDOMManager.destroy).toHaveBeenCalled();
        });

        test('should set all managers to null', () => {
            appManager._destroyManagers();
            
            expect(appManager.diagnosticsManager).toBeNull();
            expect(appManager.serviceWorkerManager).toBeNull();
            expect(appManager.notificationManager).toBeNull();
            expect(appManager.domManager).toBeNull();
        });

        test('should handle missing managers gracefully', () => {
            appManager.diagnosticsManager = null;
            
            expect(() => appManager._destroyManagers()).not.toThrow();
        });
    });

    describe('destroy', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should stop periodic updates', () => {
            const stopSpy = jest.spyOn(appManager, '_stopPeriodicUpdates');
            
            appManager.destroy();
            
            expect(stopSpy).toHaveBeenCalled();
            stopSpy.mockRestore();
        });

        test('should remove event handlers', () => {
            const removeSpy = jest.spyOn(appManager, '_removeEventHandlers');
            
            appManager.destroy();
            
            expect(removeSpy).toHaveBeenCalled();
            removeSpy.mockRestore();
        });

        test('should destroy all managers', () => {
            const destroySpy = jest.spyOn(appManager, '_destroyManagers');
            
            appManager.destroy();
            
            expect(destroySpy).toHaveBeenCalled();
            destroySpy.mockRestore();
        });

        test('should set isInitialized to false', () => {
            appManager.destroy();
            
            expect(appManager.isInitialized).toBe(false);
        });

        test('should not throw error', () => {
            expect(() => appManager.destroy()).not.toThrow();
        });

        test('should not destroy if already destroyed', () => {
            appManager.destroy();
            const destroySpy = jest.spyOn(appManager, '_destroyManagers');
            
            appManager.destroy();
            
            expect(destroySpy).not.toHaveBeenCalled();
            destroySpy.mockRestore();
        });

        test('should handle errors during destruction', () => {
            jest.spyOn(appManager, '_destroyManagers').mockImplementation(() => {
                throw new Error('Destroy failed');
            });
            
            expect(() => appManager.destroy()).not.toThrow();
        });
    });

    describe('integration tests', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should handle complete lifecycle', async () => {
            expect(appManager.isInitialized).toBe(true);

            await appManager.testConnection();
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalled();

            await appManager.runDiagnostics();
            expect(mockDiagnosticsManager.runDiagnostics).toHaveBeenCalled();

            appManager.destroy();
            expect(appManager.isInitialized).toBe(false);
        });

        test('should handle multiple test connections', async () => {
            mockServiceWorkerManager.checkConnection.mockClear();
            
            await appManager.testConnection();
            await appManager.testConnection();
            await appManager.testConnection();
            
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalledTimes(3);
        });

        test('should continue working after failed operations', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Failed'));
            
            await appManager.testConnection();
            
            mockServiceWorkerManager.checkConnection.mockResolvedValue(true);
            const result = await appManager.testConnection();
            
            expect(result).toBe(true);
        });
    });

    describe('edge cases', () => {
        test('should handle missing DOM elements', () => {
            mockDOMManager.elements = {};
            
            expect(() => new AppManager({ enableLogging: false })).not.toThrow();
        });

        test('should handle custom options', () => {
            const customManager = new AppManager({
                enableLogging: false,
                constants: { UPDATE_INTERVAL: 5000 }
            });
            
            expect(customManager.CONSTANTS.UPDATE_INTERVAL).toBe(5000);
            customManager.destroy();
        });

        test('should work with disabled logging', () => {
            const silentManager = new AppManager({ enableLogging: false });
            
            silentManager._log('test message');

            silentManager.destroy();
        });
    });
});

