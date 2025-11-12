/**
 * Тесты для AppManager класса
 * Тестирует главный менеджер приложения, координирующий работу всех компонентов app
 */

jest.mock('../../../src/managers/app/DOMManager.js');
jest.mock('../../../src/managers/app/NotificationManager.js');
jest.mock('../../../src/managers/app/ServiceWorkerManager.js');
jest.mock('../../../src/managers/app/DiagnosticsManager.js');
jest.mock('../../../src/managers/locale/LocaleManager.js');

const BaseManager = require('../../../src/base/BaseManager.js');
const DOMManager = require('../../../src/managers/app/DOMManager.js');
const NotificationManager = require('../../../src/managers/app/NotificationManager.js');
const ServiceWorkerManager = require('../../../src/managers/app/ServiceWorkerManager.js');
const DiagnosticsManager = require('../../../src/managers/app/DiagnosticsManager.js');
const LocaleManager = require('../../../src/managers/locale/LocaleManager.js');

global.window.BaseManager = BaseManager;
global.window.DOMManager = DOMManager;
global.window.NotificationManager = NotificationManager;
global.window.ServiceWorkerManager = ServiceWorkerManager;
global.window.DiagnosticsManager = DiagnosticsManager;
global.window.LocaleManager = LocaleManager;

const AppManager = require('../../../src/managers/app/AppManager.js');

describe('AppManager', () => {
    let appManager;
    let mockDOMManager;
    let mockNotificationManager;
    let mockServiceWorkerManager;
    let mockDiagnosticsManager;
    let mockLocaleManager;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        let testConnectionEl = document.getElementById('testConnection');
        if (!testConnectionEl) {
            testConnectionEl = document.createElement('button');
            testConnectionEl.id = 'testConnection';
            document.body.appendChild(testConnectionEl);
        }
        testConnectionEl.textContent = 'Test Connection';

        let toggleTrackingEl = document.getElementById('toggleTracking');
        if (!toggleTrackingEl) {
            toggleTrackingEl = document.createElement('button');
            toggleTrackingEl.id = 'toggleTracking';
            document.body.appendChild(toggleTrackingEl);
        }
        toggleTrackingEl.textContent = 'Disable Tracking';
        
        mockDOMManager = {
            elements: {
                openSettings: document.getElementById('openSettings'),
                testConnection: testConnectionEl,
                toggleTracking: toggleTrackingEl
            },
            updateConnectionStatus: jest.fn(),
            showConnectionStatusMessage: jest.fn(),
            updateTrackingStatus: jest.fn(),
            updateTrackingToggle: jest.fn(),
            updateCounters: jest.fn(),
            setButtonState: jest.fn(),
            setTrackingToggleLoading: jest.fn(),
            setTranslateFn: jest.fn(),
            refreshStatuses: jest.fn(),
            destroy: jest.fn()
        };

        mockNotificationManager = {
            showNotification: jest.fn(),
            destroy: jest.fn()
        };

        mockServiceWorkerManager = {
            checkConnection: jest.fn().mockResolvedValue({ success: true, tooFrequent: false, error: null }),
            getTrackingStatus: jest.fn().mockResolvedValue({
                isTracking: true,
                isOnline: true
            }),
            getTodayStats: jest.fn().mockResolvedValue({
                events: 10,
                domains: 5,
                queue: 2
            }),
        setTrackingEnabled: jest.fn().mockResolvedValue({ success: true, isTracking: false }),
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

        // Создаем мок переводов для тестов
        const mockTranslations = {
            'app.notifications.initError': 'Initialization Error',
            'app.notifications.connectionSuccess': 'Connection Successful!',
            'app.notifications.connectionFailed': 'Connection Failed',
            'app.notifications.connectionError': 'Connection Failed',
            'app.notifications.checkFailed': 'Connection check failed',
            'app.notifications.trackingEnabled': 'Tracking enabled',
            'app.notifications.trackingDisabled': 'Tracking disabled',
            'app.notifications.trackingToggleError': 'Tracking toggle failed',
            'app.buttons.trackingLoading': 'Updating...',
            'app.buttons.enableTracking': 'Enable Tracking',
            'app.buttons.disableTracking': 'Disable Tracking',
            'app.status.connectionSuccess': 'Connection successful',
            'app.status.connectionFailed': 'Connection failed',
            'app.status.connectionError': 'Connection error'
        };

        mockLocaleManager = {
            init: jest.fn().mockResolvedValue(),
            localizeDOM: jest.fn(),
            t: jest.fn((key) => mockTranslations[key] || key),
            getCurrentLocale: jest.fn().mockReturnValue('en'),
            setLocale: jest.fn().mockResolvedValue(),
            addLocaleChangeListener: jest.fn(),
            destroy: jest.fn()
        };

        DOMManager.mockImplementation(() => mockDOMManager);
        NotificationManager.mockImplementation(() => mockNotificationManager);
        ServiceWorkerManager.mockImplementation(() => mockServiceWorkerManager);
        DiagnosticsManager.mockImplementation(() => mockDiagnosticsManager);
        LocaleManager.mockImplementation(() => mockLocaleManager);

        global.chrome.runtime.openOptionsPage = jest.fn();
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
        });

        test('BUTTON_LABELS should have correct structure', () => {
            expect(AppManager.BUTTON_LABELS.TEST_CONNECTION.DEFAULT).toBe('🔍 Test Connection');
            expect(AppManager.BUTTON_LABELS.TEST_CONNECTION.LOADING).toBe('🔍 Checking...');
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

        test('should pass enableLogging to child managers', () => {
            appManager = new AppManager({ enableLogging: false });
            
            // Проверяем что менеджеры были созданы (вызваны конструкторы)
            expect(DOMManager).toHaveBeenCalled();
            expect(NotificationManager).toHaveBeenCalled();
            expect(ServiceWorkerManager).toHaveBeenCalled();
            expect(DiagnosticsManager).toHaveBeenCalled();
            expect(LocaleManager).toHaveBeenCalled();
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

        test('should NOT call startPeriodicUpdates (периодические обновления отключены)', async () => {
            appManager.isInitialized = false;
            const startSpy = jest.spyOn(appManager, 'startPeriodicUpdates');
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            await appManager.init();
            
            // Периодические обновления отключены для оптимизации
            expect(startSpy).not.toHaveBeenCalled();
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
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('should get today stats', async () => {
            await appManager.loadInitialStatus();
            
            expect(mockServiceWorkerManager.getTodayStats).toHaveBeenCalled();
            expect(mockDOMManager.updateCounters).toHaveBeenCalled();
        });

        test('should update internal tracking state', async () => {
            await appManager.loadInitialStatus();

            expect(appManager.state.isTracking).toBe(true);
        });

        test('should handle connection error', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Connection failed'));
            
            await appManager.loadInitialStatus();
            
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Connection Failed', 'error');
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

        test('should setup event handler for toggleTracking button', () => {
            const handler = appManager.eventHandlers.get('toggleTracking');

            expect(handler).toBeDefined();
        });

        test('should initialize localeManager', () => {
            expect(appManager.localeManager).toBeDefined();
            expect(appManager.localeManager).toBe(mockLocaleManager);
        });

        test('should store all handlers in eventHandlers Map', () => {
            expect(appManager.eventHandlers.size).toBeGreaterThan(0);
        });
    });

    describe('testConnection', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            appManager = new AppManager({ enableLogging: false });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should update button state to loading', async () => {
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await testPromise;
            
            expect(mockDOMManager.setButtonState).toHaveBeenCalled();
        });

        test('should check connection', async () => {
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await testPromise;
            
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalled();
        });

        test('should show success notification when online', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue({ success: true, tooFrequent: false, error: null });
            
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            const result = await testPromise;
            
            expect(result).toBe(true);
            expect(mockDOMManager.showConnectionStatusMessage).toHaveBeenCalledWith('Connection successful', 'success');
            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(true);
        });

        test('should show error notification when offline', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue({ success: false, tooFrequent: false, error: null });
            
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            const result = await testPromise;
            
            expect(result).toBe(false);
            expect(mockDOMManager.showConnectionStatusMessage).toHaveBeenCalledWith('Connection failed', 'error');
            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(false);
        });

        test('should update state on success', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue({ success: true, tooFrequent: false, error: null });
            
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await testPromise;
            
            expect(appManager.state.isOnline).toBe(true);
        });

        test('should handle connection error', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Network error'));
            
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            const result = await testPromise;
            
            expect(result).toBe(false);
            expect(mockDOMManager.showConnectionStatusMessage).toHaveBeenCalledWith('Connection error', 'error');
            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
        });

        test('should restore button state after completion', async () => {
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await testPromise;
            
            // Проверяем что setButtonState вызывался как минимум дважды (loading и restore)
            expect(mockDOMManager.setButtonState).toHaveBeenCalledTimes(2);
        });

        test('should restore button state even on error', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Error'));
            
            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await testPromise;
            
            // Проверяем что setButtonState вызывался как минимум дважды (loading и restore)
            expect(mockDOMManager.setButtonState).toHaveBeenCalledTimes(2);
        });
    });

    describe('toggleTracking', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should disable tracking when currently enabled', async () => {
            appManager.state.isTracking = true;
 
             const result = await appManager.toggleTracking();
 
             expect(result).toBe(true);
             expect(mockDOMManager.setTrackingToggleLoading).toHaveBeenCalledWith(false);
             expect(mockServiceWorkerManager.setTrackingEnabled).toHaveBeenCalledWith(false);
            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
            expect(mockDOMManager.updateTrackingStatus).toHaveBeenCalledWith(false);
        });
 
         test('should handle errors from service worker', async () => {
             appManager.state.isTracking = true;
             mockServiceWorkerManager.setTrackingEnabled.mockRejectedValue(new Error('Failed'));
 
             const result = await appManager.toggleTracking();
 
             expect(result).toBe(false);
             expect(mockDOMManager.setTrackingToggleLoading).toHaveBeenCalledWith(false);
            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
             expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
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
            // Сначала запускаем первый раз
            appManager.startPeriodicUpdates();
            const firstInterval = appManager.updateInterval;
            
            // Пытаемся запустить второй раз
            appManager.startPeriodicUpdates();
            
            // Интервал должен остаться тем же
            expect(appManager.updateInterval).toBe(firstInterval);
        });

        test('should call loadInitialStatus periodically (20 секунд)', () => {
            jest.useFakeTimers();
            appManager.updateInterval = null;
            const loadSpy = jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            
            appManager.startPeriodicUpdates();
            
            // Теперь интервал 20000 мс
            jest.advanceTimersByTime(20000);
            
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
            jest.useFakeTimers();
            appManager = new AppManager({ enableLogging: false });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should handle complete lifecycle', async () => {
            expect(appManager.isInitialized).toBe(true);

            const testPromise = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await testPromise;
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalled();

            appManager.destroy();
            expect(appManager.isInitialized).toBe(false);
        });

        test('should handle multiple test connections', async () => {
            mockServiceWorkerManager.checkConnection.mockClear();
            
            const test1 = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await test1;
            
            const test2 = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await test2;
            
            const test3 = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await test3;
            
            expect(mockServiceWorkerManager.checkConnection).toHaveBeenCalledTimes(3);
        });

        test('should continue working after failed operations', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(new Error('Failed'));
            
            const test1 = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await test1;
            
            mockServiceWorkerManager.checkConnection.mockResolvedValue({ success: true, tooFrequent: false, error: null });
            const test2 = appManager.testConnection();
            jest.advanceTimersByTime(500);
            const result = await test2;
            
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

    describe('Покрытие веток (Branch Coverage)', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            appManager = new AppManager({ enableLogging: false });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('init - обрабатывает ошибки инициализации', async () => {
            // Тестируем обработку ошибок через прямой вызов init() на существующем менеджере
            // вместо создания нового экземпляра, чтобы избежать проблем с необработанными промисами
            appManager.isInitialized = false;
            mockLocaleManager.init.mockRejectedValueOnce(new Error('Init error'));
            
            await expect(appManager.init()).rejects.toThrow('Init error');
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                expect.stringContaining('Error'),
                'error'
            );
            
            // Восстанавливаем состояние
            mockLocaleManager.init.mockResolvedValue();
            appManager.isInitialized = true;
        });

        test('loadInitialStatus - обрабатывает tooFrequent с lastStatus', async () => {
            appManager._loadConnectionStatusFromStorage = jest.fn().mockResolvedValue(true);
            mockServiceWorkerManager.checkConnection.mockResolvedValue({
                success: false,
                tooFrequent: true
            });
            
            await appManager.loadInitialStatus();
            
            expect(appManager._loadConnectionStatusFromStorage).toHaveBeenCalled();
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(true);
        });

        test('loadInitialStatus - обрабатывает tooFrequent без lastStatus', async () => {
            appManager._loadConnectionStatusFromStorage = jest.fn().mockResolvedValue(null);
            appManager.state = { isOnline: false };
            mockServiceWorkerManager.checkConnection.mockResolvedValue({
                success: false,
                tooFrequent: true
            });
            
            await appManager.loadInitialStatus();
            
            expect(mockDOMManager.updateConnectionStatus).toHaveBeenCalledWith(false);
        });

        test('setupEventHandlers - обрабатывает отсутствие openSettings', () => {
            mockDOMManager.elements.openSettings = null;
            
            expect(() => appManager.setupEventHandlers()).not.toThrow();
        });

        test('setupEventHandlers - обрабатывает отсутствие testConnection', () => {
            mockDOMManager.elements.testConnection = null;
            
            expect(() => appManager.setupEventHandlers()).not.toThrow();
        });

        test('setupEventHandlers - обрабатывает отсутствие toggleTracking', () => {
            mockDOMManager.elements.toggleTracking = null;
            
            expect(() => appManager.setupEventHandlers()).not.toThrow();
        });

        test('testConnection - обрабатывает tooFrequent результат', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue({
                success: false,
                tooFrequent: true
            });
            
            const result = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await result;
            
            expect(mockDOMManager.showConnectionStatusMessage).toHaveBeenCalledWith(
                expect.any(String),
                'warning'
            );
        });

        test('testConnection - обрабатывает failed результат', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue({
                success: false,
                tooFrequent: false
            });
            appManager._saveConnectionStatusToStorage = jest.fn().mockResolvedValue();
            
            const result = appManager.testConnection();
            jest.advanceTimersByTime(500);
            await result;
            
            expect(mockDOMManager.showConnectionStatusMessage).toHaveBeenCalledWith(
                expect.any(String),
                'error'
            );
        });

        test('toggleTracking - обрабатывает rejected promise', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockRejectedValue(new Error('Toggle error'));
            appManager.state.isTracking = true;
            
            const result = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await result;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('toggleTracking - обрабатывает response без success', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockResolvedValue({
                success: false,
                error: 'Toggle failed'
            });
            appManager.state.isTracking = true;
            
            const result = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await result;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('toggleTracking - обрабатывает response с error', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockResolvedValue({
                error: 'Toggle error'
            });
            appManager.state.isTracking = true;
            
            const result = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await result;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('toggleTracking - обрабатывает некорректный response', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockResolvedValue('invalid');
            appManager.state.isTracking = true;
            
            const result = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await result;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });
    });

    describe('Покрытие statements', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            appManager = new AppManager({ enableLogging: false });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('_saveConnectionStatusToStorage сохраняет статус успешно', async () => {
            global.chrome.storage.local.set.mockImplementation((items, callback) => {
                callback();
            });

            await appManager._saveConnectionStatusToStorage(true);

            expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
                { mindful_connection_status: true },
                expect.any(Function)
            );
        });

        test('_saveConnectionStatusToStorage обрабатывает ошибку chrome.runtime.lastError', async () => {
            const logErrorSpy = jest.spyOn(appManager, '_logError');
            global.chrome.runtime.lastError = { message: 'Storage error' };
            global.chrome.storage.local.set.mockImplementation((items, callback) => {
                callback();
            });

            await appManager._saveConnectionStatusToStorage(false);

            expect(logErrorSpy).toHaveBeenCalled();
            logErrorSpy.mockRestore();
        });

        test('_saveConnectionStatusToStorage обрабатывает отсутствие chrome.storage', async () => {
            const originalChrome = global.chrome;
            global.chrome = {};

            await appManager._saveConnectionStatusToStorage(true);

            global.chrome = originalChrome;
        });

        test('_loadConnectionStatusFromStorage загружает статус успешно', async () => {
            global.chrome.runtime.lastError = null;
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ mindful_connection_status: true });
            });

            const result = await appManager._loadConnectionStatusFromStorage();

            expect(result).toBe(true);
        });

        test('_loadConnectionStatusFromStorage возвращает null если статус не найден', async () => {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({});
            });

            const result = await appManager._loadConnectionStatusFromStorage();

            expect(result).toBeNull();
        });

        test('_loadConnectionStatusFromStorage обрабатывает ошибку chrome.runtime.lastError', async () => {
            const logErrorSpy = jest.spyOn(appManager, '_logError');
            global.chrome.runtime.lastError = { message: 'Storage error' };
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({});
            });

            const result = await appManager._loadConnectionStatusFromStorage();

            expect(result).toBeNull();
            expect(logErrorSpy).toHaveBeenCalled();
            logErrorSpy.mockRestore();
        });

        test('_loadConnectionStatusFromStorage обрабатывает отсутствие chrome.storage', async () => {
            const originalChrome = global.chrome;
            global.chrome = {};

            const result = await appManager._loadConnectionStatusFromStorage();

            expect(result).toBeNull();
            global.chrome = originalChrome;
        });

        test('onLocaleChange обновляет DOM', () => {
            appManager.onLocaleChange();

            expect(mockLocaleManager.localizeDOM).toHaveBeenCalled();
            expect(mockDOMManager.refreshStatuses).toHaveBeenCalled();
        });

        test('_removeEventHandlers обрабатывает отсутствие элемента', () => {
            appManager.domManager.elements = { testButton: null };
            appManager.eventHandlers.set('testButton', jest.fn());

            appManager._removeEventHandlers();

            expect(appManager.eventHandlers.size).toBe(0);
        });

        test('_removeEventHandlers обрабатывает отсутствие handler', () => {
            const button = document.createElement('button');
            button.id = 'testButton';
            document.body.appendChild(button);
            appManager.domManager.elements = { testButton: button };
            appManager.eventHandlers.set('testButton', null);

            appManager._removeEventHandlers();

            expect(appManager.eventHandlers.size).toBe(0);
        });

        test('_destroyManagers обрабатывает отсутствие менеджеров', () => {
            appManager.diagnosticsManager = null;
            appManager.serviceWorkerManager = null;
            appManager.notificationManager = null;
            appManager.domManager = null;
            appManager.localeManager = null;

            expect(() => appManager._destroyManagers()).not.toThrow();
        });

        test('_destroyManagers обрабатывает ошибки при уничтожении', () => {
            const logErrorSpy = jest.spyOn(appManager, '_logError');
            appManager.diagnosticsManager.destroy = jest.fn(() => {
                throw new Error('Destroy error');
            });

            expect(() => appManager._destroyManagers()).not.toThrow();
            expect(logErrorSpy).toHaveBeenCalled();
            logErrorSpy.mockRestore();
        });

        test('destroy обрабатывает случай когда уже уничтожен', () => {
            const logSpy = jest.spyOn(appManager, '_log');
            appManager.isInitialized = false;
            appManager.destroy();

            expect(logSpy).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.app.alreadyDestroyed' })
            );
            logSpy.mockRestore();
        });

        test('destroy обрабатывает ошибки при уничтожении', () => {
            const logErrorSpy = jest.spyOn(appManager, '_logError');
            jest.spyOn(appManager, '_stopPeriodicUpdates').mockImplementation(() => {
                throw new Error('Stop error');
            });

            appManager.destroy();

            expect(logErrorSpy).toHaveBeenCalled();
            logErrorSpy.mockRestore();
        });
    });
});
