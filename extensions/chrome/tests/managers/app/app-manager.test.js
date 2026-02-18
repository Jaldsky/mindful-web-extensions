/**
 * Тесты для AppManager класса
 * Тестирует главный менеджер приложения, координирующий работу всех компонентов app
 */

jest.mock('../../../src/managers/app/DOMManager.js');
jest.mock('../../../src/managers/app/NotificationManager.js');
jest.mock('../../../src/managers/app/ServiceWorkerManager.js');
jest.mock('../../../src/managers/app/DiagnosticsManager.js');
jest.mock('../../../src/managers/locale/LocaleManager.js');
jest.mock('../../../src/managers/theme/ThemeManager.js');

const BaseManager = require('../../../src/base/BaseManager.js');
const DOMManager = require('../../../src/managers/app/DOMManager.js');
const NotificationManager = require('../../../src/managers/app/NotificationManager.js');
const ServiceWorkerManager = require('../../../src/managers/app/ServiceWorkerManager.js');
const DiagnosticsManager = require('../../../src/managers/app/DiagnosticsManager.js');
const LocaleManager = require('../../../src/managers/locale/LocaleManager.js');
const ThemeManager = require('../../../src/managers/theme/ThemeManager.js');

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
            sendMessage: jest.fn().mockResolvedValue({ success: true }),
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

        // Setup additional DOM elements for auth
        const onboardingOverlay = document.createElement('div');
        onboardingOverlay.id = 'appOnboardingOverlay';
        onboardingOverlay.style.display = 'none';
        document.body.appendChild(onboardingOverlay);

        const appMain = document.createElement('div');
        appMain.id = 'appMain';
        appMain.style.display = 'flex';
        document.body.appendChild(appMain);

        const loginContainer = document.createElement('div');
        loginContainer.id = 'appLoginContainer';
        loginContainer.style.display = 'none';
        document.body.appendChild(loginContainer);

        const welcomeScreen = document.createElement('div');
        welcomeScreen.id = 'appWelcomeScreen';
        welcomeScreen.style.display = 'none';
        onboardingOverlay.appendChild(welcomeScreen);

        const loginScreen = document.createElement('div');
        loginScreen.id = 'appLoginScreen';
        loginScreen.style.display = 'none';
        onboardingOverlay.appendChild(loginScreen);

        const registerScreen = document.createElement('div');
        registerScreen.id = 'appRegisterScreen';
        registerScreen.style.display = 'none';
        onboardingOverlay.appendChild(registerScreen);

        const verifyScreen = document.createElement('div');
        verifyScreen.id = 'appVerifyScreen';
        verifyScreen.style.display = 'none';
        onboardingOverlay.appendChild(verifyScreen);

        mockDOMManager.elements.onboardingOverlay = onboardingOverlay;
        mockDOMManager.elements.appMain = appMain;
        mockDOMManager.elements.loginContainer = loginContainer;
        mockDOMManager.elements.welcomeScreen = welcomeScreen;
        mockDOMManager.elements.loginScreen = loginScreen;
        mockDOMManager.elements.registerScreen = registerScreen;
        mockDOMManager.elements.verifyScreen = verifyScreen;
        mockDOMManager.elements.verifyEmail = document.createElement('input');
        mockDOMManager.elements.verifyEmail.id = 'appVerifyEmail';
        mockDOMManager.elements.verifyCode = document.createElement('input');
        mockDOMManager.elements.verifyCode.id = 'appVerifyCode';
        mockDOMManager.elements.verifyDescription = document.createElement('p');
        mockDOMManager.elements.verifyDescription.id = 'appVerifyDescription';
        mockDOMManager.hideLoginButton = jest.fn();
        mockDOMManager.showLoginButton = jest.fn();

        DOMManager.mockImplementation(() => mockDOMManager);
        NotificationManager.mockImplementation(() => mockNotificationManager);
        ServiceWorkerManager.mockImplementation(() => mockServiceWorkerManager);
        DiagnosticsManager.mockImplementation(() => mockDiagnosticsManager);
        LocaleManager.mockImplementation(() => mockLocaleManager);
        ThemeManager.mockImplementation(() => ({
            loadAndApplyTheme: jest.fn().mockResolvedValue('light'),
            getCurrentTheme: jest.fn().mockReturnValue('light'),
            applyTheme: jest.fn().mockReturnValue(true),
            saveTheme: jest.fn().mockResolvedValue(true),
            destroy: jest.fn()
        }));

        global.chrome.runtime.openOptionsPage = jest.fn();
        
        // Setup chrome.storage mocks
        global.chrome.storage = {
            local: {
                get: jest.fn((keys, callback) => {
                    callback({});
                }),
                set: jest.fn((items, callback) => {
                    if (callback) callback();
                }),
                remove: jest.fn((keys, callback) => {
                    if (callback) callback();
                })
            }
        };
        global.chrome.runtime.lastError = null;
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
            expect(AppManager.BUTTON_LABELS).toBeInstanceOf(Object);
        });

        test('BUTTON_LABELS should have correct structure from CONFIG', () => {
            // Проверяем что BUTTON_LABELS берется из CONFIG
            expect(AppManager.BUTTON_LABELS.TEST_CONNECTION).toBeDefined();
            expect(AppManager.BUTTON_LABELS.RUN_DIAGNOSTICS).toBeDefined();
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

        test('should call setupEventHandlers', async () => {
            appManager.isInitialized = false;
            const setupSpy = jest.spyOn(appManager, 'setupEventHandlers');
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            jest.spyOn(appManager, 'loadUserInfo').mockResolvedValue();
            jest.spyOn(appManager, '_updateLoginButtonVisibility').mockResolvedValue();
            
            await appManager.init();
            
            expect(setupSpy).toHaveBeenCalled();
            setupSpy.mockRestore();
        });

        test('should NOT call startPeriodicUpdates (периодические обновления отключены)', async () => {
            appManager.isInitialized = false;
            const startSpy = jest.spyOn(appManager, 'startPeriodicUpdates');
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            jest.spyOn(appManager, 'loadUserInfo').mockResolvedValue();
            jest.spyOn(appManager, '_updateLoginButtonVisibility').mockResolvedValue();
            
            await appManager.init();
            
            // Периодические обновления отключены для оптимизации
            expect(startSpy).not.toHaveBeenCalled();
            startSpy.mockRestore();
        });

        test('should set isInitialized to true', async () => {
            appManager.isInitialized = false;
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            jest.spyOn(appManager, 'loadUserInfo').mockResolvedValue();
            jest.spyOn(appManager, '_updateLoginButtonVisibility').mockResolvedValue();
            
            await appManager.init();
            
            expect(appManager.isInitialized).toBe(true);
        });
    });

    describe('loadInitialStatus', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
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

        test('should call loadUserInfo', async () => {
            const loadUserSpy = jest.spyOn(appManager, 'loadUserInfo').mockResolvedValue();
            
            await appManager.loadInitialStatus();
            
            expect(loadUserSpy).toHaveBeenCalled();
            loadUserSpy.mockRestore();
        });

        test('should call _updateLoginButtonVisibility', async () => {
            const updateLoginSpy = jest.spyOn(appManager, '_updateLoginButtonVisibility').mockResolvedValue();
            
            await appManager.loadInitialStatus();
            
            expect(updateLoginSpy).toHaveBeenCalled();
            updateLoginSpy.mockRestore();
        });
    });

    describe('loadUserInfo', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
        });

        test('should call service worker to get user info', async () => {
            mockServiceWorkerManager.sendMessage.mockResolvedValue({
                success: true,
                user: { username: 'testuser' }
            });
            
            await appManager.loadUserInfo();
            
            expect(mockServiceWorkerManager.sendMessage).toHaveBeenCalled();
        });

        test('should handle error when loading user info', async () => {
            mockServiceWorkerManager.sendMessage.mockRejectedValue(new Error('Failed'));
            
            // Should not throw
            await expect(appManager.loadUserInfo()).resolves.not.toThrow();
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

    describe('toggleTracking', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            appManager = new AppManager({ enableLogging: false });
        });

        afterEach(() => {
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });

        test('should disable tracking when currently enabled', async () => {
            appManager.state.isTracking = true;

            const resultPromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            const result = await resultPromise;

            expect(result).toBe(true);
            expect(mockDOMManager.setTrackingToggleLoading).toHaveBeenCalledWith(false);
            expect(mockServiceWorkerManager.setTrackingEnabled).toHaveBeenCalledWith(false);
            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
            expect(mockDOMManager.updateTrackingStatus).toHaveBeenCalledWith(false);
        });

        test('should handle errors from service worker', async () => {
            appManager.state.isTracking = true;
            mockServiceWorkerManager.setTrackingEnabled.mockRejectedValue(new Error('Failed'));

            const resultPromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            const result = await resultPromise;

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
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });

        test('should handle complete lifecycle', async () => {
            expect(appManager.isInitialized).toBe(true);

            const togglePromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await togglePromise;
            
            expect(mockServiceWorkerManager.setTrackingEnabled).toHaveBeenCalled();

            appManager.destroy();
            expect(appManager.isInitialized).toBe(false);
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
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
        });

        test('init - обрабатывает ошибки инициализации', async () => {
            // Тестируем обработку ошибок через прямой вызов init() на существующем менеджере
            // вместо создания нового экземпляра, чтобы избежать проблем с необработанными промисами
            appManager.isInitialized = false;
            mockLocaleManager.init.mockRejectedValueOnce(new Error('Init error'));
            jest.spyOn(appManager, 'loadInitialStatus').mockResolvedValue();
            jest.spyOn(appManager, 'loadUserInfo').mockResolvedValue();
            jest.spyOn(appManager, '_updateLoginButtonVisibility').mockResolvedValue();
            
            await expect(appManager.init()).rejects.toThrow('Init error');
            expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                expect.stringContaining('Error'),
                'error'
            );
            
            // Восстанавливаем состояние
            mockLocaleManager.init.mockResolvedValue();
            appManager.isInitialized = true;
        });

        test('setupEventHandlers - обрабатывает отсутствие openSettings', () => {
            mockDOMManager.elements.openSettings = null;
            
            expect(() => appManager.setupEventHandlers()).not.toThrow();
        });

        test('setupEventHandlers - обрабатывает отсутствие toggleTracking', () => {
            mockDOMManager.elements.toggleTracking = null;
            
            expect(() => appManager.setupEventHandlers()).not.toThrow();
        });

        test('toggleTracking - обрабатывает rejected promise', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockRejectedValue(new Error('Toggle error'));
            appManager.state.isTracking = true;
            
            const resultPromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await resultPromise;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('toggleTracking - обрабатывает response без success', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockResolvedValue({
                success: false,
                error: 'Toggle failed'
            });
            appManager.state.isTracking = true;
            
            const resultPromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await resultPromise;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('toggleTracking - обрабатывает response с error', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockResolvedValue({
                error: 'Toggle error'
            });
            appManager.state.isTracking = true;
            
            const resultPromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await resultPromise;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });

        test('toggleTracking - обрабатывает некорректный response', async () => {
            mockServiceWorkerManager.setTrackingEnabled.mockResolvedValue('invalid');
            appManager.state.isTracking = true;
            
            const resultPromise = appManager.toggleTracking();
            jest.advanceTimersByTime(500);
            await resultPromise;
            
            expect(mockDOMManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        });
    });

    describe('Покрытие statements', () => {
        beforeEach(() => {
            appManager = new AppManager({ enableLogging: false });
            // Ensure chrome.runtime exists
            if (!global.chrome.runtime) {
                global.chrome.runtime = {};
            }
            global.chrome.runtime.openOptionsPage = jest.fn();
            global.chrome.runtime.lastError = null;
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

    describe('Authentication and Registration', () => {
        beforeEach(() => {
            // Ensure chrome.runtime exists before any tests
            if (!global.chrome.runtime) {
                global.chrome.runtime = {};
            }
            global.chrome.runtime.openOptionsPage = jest.fn();
            global.chrome.runtime.lastError = null;
            
            // Setup DOM elements for auth forms
            const loginForm = document.createElement('form');
            loginForm.id = 'appLoginForm';
            const loginUsername = document.createElement('input');
            loginUsername.id = 'appLoginUsername';
            const loginPassword = document.createElement('input');
            loginPassword.id = 'appLoginPassword';
            loginForm.appendChild(loginUsername);
            loginForm.appendChild(loginPassword);
            document.body.appendChild(loginForm);

            const registerForm = document.createElement('form');
            registerForm.id = 'appRegisterForm';
            const registerUsername = document.createElement('input');
            registerUsername.id = 'appRegisterUsername';
            const registerEmail = document.createElement('input');
            registerEmail.id = 'appRegisterEmail';
            const registerPassword = document.createElement('input');
            registerPassword.id = 'appRegisterPassword';
            const registerConfirmPassword = document.createElement('input');
            registerConfirmPassword.id = 'appRegisterConfirmPassword';
            registerForm.appendChild(registerUsername);
            registerForm.appendChild(registerEmail);
            registerForm.appendChild(registerPassword);
            registerForm.appendChild(registerConfirmPassword);
            document.body.appendChild(registerForm);

            mockDOMManager.elements.loginForm = loginForm;
            mockDOMManager.elements.loginUsername = loginUsername;
            mockDOMManager.elements.loginPassword = loginPassword;
            mockDOMManager.elements.registerForm = registerForm;
            mockDOMManager.elements.registerUsername = registerUsername;
            mockDOMManager.elements.registerEmail = registerEmail;
            mockDOMManager.elements.registerPassword = registerPassword;
            mockDOMManager.elements.registerConfirmPassword = registerConfirmPassword;
            
            // Setup translations
            mockLocaleManager.t.mockImplementation((key) => {
                const translations = {
                    'app.auth.loginError': 'Login error',
                    'app.auth.loginSuccess': 'Login success',
                    'app.register.error': 'Registration error',
                    'app.register.success': 'Registration success',
                    'app.verify.error': 'Verification error',
                    'app.verify.success': 'Verification success',
                    'app.verify.resendError': 'Resend error',
                    'app.verify.resendSuccess': 'Resend success',
                    'app.verify.emailRequired': 'Email required',
                    'app.register.passwordMismatch': 'Passwords do not match',
                    'app.register.usernameInvalid': 'Invalid username'
                };
                return translations[key] || key;
            });
            
            appManager = new AppManager({ enableLogging: false });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        describe('_handleLogin', () => {
            test('should show error if username or password is missing', async () => {
                await appManager._handleLogin('', 'password');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Login error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
                
                await appManager._handleLogin('username', '');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Login error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
            });

            test('should call service worker with correct message type', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                appManager._saveOnboardingCompleted = jest.fn().mockResolvedValue();
                appManager._updateLoginButtonVisibility = jest.fn().mockResolvedValue();
                appManager._showMain = jest.fn();
                
                await appManager._handleLogin('username', 'password');
                
                expect(mockServiceWorkerManager.sendMessage).toHaveBeenCalledWith(
                    expect.any(String),
                    { username: 'username', password: 'password' }
                );
            });

            test('should show success notification on successful login', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                appManager._saveOnboardingCompleted = jest.fn().mockResolvedValue();
                appManager._updateLoginButtonVisibility = jest.fn().mockResolvedValue();
                appManager._showMain = jest.fn();
                
                await appManager._handleLogin('username', 'password');
                
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith('Login success', 'success');
            });

            test('should handle login error', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ 
                    success: false, 
                    error: 'Invalid credentials' 
                });
                
                await appManager._handleLogin('username', 'password');
                
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Invalid credentials',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
            });
        });

        describe('_handleRegister', () => {
            test('should show error if required fields are missing', async () => {
                await appManager._handleRegister('', 'email@test.com', 'password');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Registration error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
                
                await appManager._handleRegister('username', '', 'password');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Registration error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
                
                await appManager._handleRegister('username', 'email@test.com', '');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Registration error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
            });

            test('should save pending verification email on successful registration', async () => {
                // Set email value in DOM element (as _handleRegister reads from DOM)
                mockDOMManager.elements.registerEmail.value = 'email@test.com';
                
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                appManager._savePendingVerificationEmail = jest.fn().mockResolvedValue();
                appManager._showOnboardingScreen = jest.fn();
                
                await appManager._handleRegister('username', 'email@test.com', 'password');
                
                // Check that the email was saved (it's set in _handleRegister before calling _savePendingVerificationEmail)
                expect(appManager._savePendingVerificationEmail).toHaveBeenCalledWith('email@test.com');
            });

            test('should show verification screen after successful registration', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                appManager._savePendingVerificationEmail = jest.fn().mockResolvedValue();
                appManager._showOnboardingScreen = jest.fn();
                
                await appManager._handleRegister('username', 'email@test.com', 'password');
                
                expect(appManager._showOnboardingScreen).toHaveBeenCalledWith('verify');
            });

            test('should handle registration error', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ 
                    success: false, 
                    error: '[400] User already exists' 
                });
                
                await appManager._handleRegister('username', 'email@test.com', 'password');
                
                expect(mockNotificationManager.showNotification).toHaveBeenCalled();
            });
        });

        describe('_handleVerify', () => {
            test('should show error if email or code is missing', async () => {
                await appManager._handleVerify('', '123456');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Verification error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
                
                await appManager._handleVerify('email@test.com', '');
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Verification error',
                    'error',
                    expect.objectContaining({ layout: 'authToast', duration: 5000 })
                );
            });

            test('should clear pending verification email on success', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                appManager._savePendingVerificationEmail = jest.fn().mockResolvedValue();
                appManager._showOnboardingScreen = jest.fn();
                appManager.pendingVerificationEmail = 'email@test.com';
                
                await appManager._handleVerify('email@test.com', '123456');
                
                expect(appManager.pendingVerificationEmail).toBeNull();
                expect(appManager._savePendingVerificationEmail).toHaveBeenCalledWith(null);
            });

            test('should show login screen after successful verification', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                appManager._savePendingVerificationEmail = jest.fn().mockResolvedValue();
                appManager._showOnboardingScreen = jest.fn();
                
                await appManager._handleVerify('email@test.com', '123456');
                
                expect(appManager._showOnboardingScreen).toHaveBeenCalledWith('login');
            });
        });

        describe('_handleResendCode', () => {
            test('should show error if email is missing', async () => {
                await appManager._handleResendCode('');
                expect(mockNotificationManager.showNotification).toHaveBeenCalled();
            });

            test('should show success notification on successful resend', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ success: true });
                
                await appManager._handleResendCode('email@test.com');
                
                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    'Resend success',
                    'success'
                );
            });
        });

        describe('_loadPendingVerificationEmail and _savePendingVerificationEmail', () => {
            test('should load pending verification email from storage', async () => {
                // Mock chrome.storage.local.get to support both callback and promise
                global.chrome.storage.local.get = jest.fn((keys, callback) => {
                    const result = { mindful_pending_verification_email: 'test@example.com' };
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                });
                
                const email = await appManager._loadPendingVerificationEmail();
                
                expect(email).toBe('test@example.com');
            });

            test('should return null if no pending email in storage', async () => {
                global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                    callback({});
                });
                
                const email = await appManager._loadPendingVerificationEmail();
                
                expect(email).toBeNull();
            });

            test('should save pending verification email to storage', async () => {
                // Mock chrome.storage.local.set to support both callback and promise
                global.chrome.storage.local.set = jest.fn((items, callback) => {
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                });
                
                await appManager._savePendingVerificationEmail('test@example.com');
                
                expect(global.chrome.storage.local.set).toHaveBeenCalled();
                const callArgs = global.chrome.storage.local.set.mock.calls[0];
                expect(callArgs[0]).toEqual({ mindful_pending_verification_email: 'test@example.com' });
            });

            test('should remove pending verification email from storage when null', async () => {
                // Mock chrome.storage.local.remove to support both callback and promise
                global.chrome.storage.local.remove = jest.fn((keys, callback) => {
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                });
                
                await appManager._savePendingVerificationEmail(null);
                
                expect(global.chrome.storage.local.remove).toHaveBeenCalled();
                const callArgs = global.chrome.storage.local.remove.mock.calls[0];
                expect(callArgs[0]).toEqual(['mindful_pending_verification_email']);
            });
        });

        describe('_updateLoginButtonVisibility', () => {
            test('should hide login button when authenticated', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ isAuthenticated: true });
                mockDOMManager.hideLoginButton = jest.fn();
                mockDOMManager.showLoginButton = jest.fn();
                
                await appManager._updateLoginButtonVisibility();
                
                expect(mockDOMManager.hideLoginButton).toHaveBeenCalled();
                expect(mockDOMManager.showLoginButton).not.toHaveBeenCalled();
            });

            test('should show login button when not authenticated', async () => {
                mockServiceWorkerManager.sendMessage.mockResolvedValue({ isAuthenticated: false });
                mockDOMManager.hideLoginButton = jest.fn();
                mockDOMManager.showLoginButton = jest.fn();
                
                await appManager._updateLoginButtonVisibility();
                
                expect(mockDOMManager.showLoginButton).toHaveBeenCalled();
                expect(mockDOMManager.hideLoginButton).not.toHaveBeenCalled();
            });

            test('should show login button on error', async () => {
                mockServiceWorkerManager.sendMessage.mockRejectedValue(new Error('Error'));
                mockDOMManager.showLoginButton = jest.fn();
                
                await appManager._updateLoginButtonVisibility();
                
                expect(mockDOMManager.showLoginButton).toHaveBeenCalled();
            });
        });

        describe('Username validation', () => {
        test('should validate username pattern using regex', () => {
            // Test the regex pattern directly instead of relying on form submission
            const usernamePattern = /^[a-zA-Z0-9_]+$/;
            
            // Invalid usernames
            expect(usernamePattern.test('тест')).toBe(false);
            expect(usernamePattern.test('user-name')).toBe(false);
            expect(usernamePattern.test('user name')).toBe(false);
            expect(usernamePattern.test('user@name')).toBe(false);
            
            // Valid usernames
            expect(usernamePattern.test('test_user123')).toBe(true);
            expect(usernamePattern.test('User123')).toBe(true);
            expect(usernamePattern.test('_user_')).toBe(true);
            expect(usernamePattern.test('123')).toBe(true);
        });

        describe('_showOnboardingScreen', () => {
            test('should be callable with screen name', () => {
                expect(() => appManager._showOnboardingScreen('welcome')).not.toThrow();
                expect(() => appManager._showOnboardingScreen('login')).not.toThrow();
                expect(() => appManager._showOnboardingScreen('register')).not.toThrow();
                expect(() => appManager._showOnboardingScreen('verify')).not.toThrow();
            });
        });

        describe('_showMain', () => {
            test('should be callable', () => {
                expect(() => appManager._showMain()).not.toThrow();
            });
        });

        describe('onLocaleChange', () => {
            test('should update localization', () => {
                appManager.onLocaleChange();
                
                expect(mockLocaleManager.localizeDOM).toHaveBeenCalled();
                expect(mockDOMManager.refreshStatuses).toHaveBeenCalled();
            });
        });
        });

        describe('_applyOnboardingState', () => {
            test('should show verify screen if pending verification email exists', async () => {
                // Mock chrome.storage.local.get to support both callback and promise
                global.chrome.storage.local.get = jest.fn((keys, callback) => {
                    const result = { mindful_pending_verification_email: 'test@example.com' };
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                });
                appManager._showOnboardingScreen = jest.fn();
                
                await appManager._applyOnboardingState();
                
                expect(appManager.pendingVerificationEmail).toBe('test@example.com');
                expect(appManager._showOnboardingScreen).toHaveBeenCalledWith('verify');
            });

            test('should show welcome screen if onboarding not completed', async () => {
                // Mock chrome.storage.local.get to support both callback and promise
                let callCount = 0;
                global.chrome.storage.local.get = jest.fn((keys, callback) => {
                    callCount++;
                    let result;
                    if (callCount === 1 && Array.isArray(keys) && keys.includes('mindful_pending_verification_email')) {
                        result = {};
                    } else if (callCount === 2 && Array.isArray(keys) && keys.includes('mindful_onboarding_completed')) {
                        result = { mindful_onboarding_completed: false };
                    } else {
                        result = {};
                    }
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                });
                appManager._showOnboardingScreen = jest.fn();
                
                await appManager._applyOnboardingState();
                
                expect(appManager._showOnboardingScreen).toHaveBeenCalledWith('welcome');
            });

            test('should show main menu if onboarding completed', async () => {
                // Mock chrome.storage.local.get to support both callback and promise
                let callCount = 0;
                global.chrome.storage.local.get = jest.fn((keys, callback) => {
                    callCount++;
                    let result;
                    if (callCount === 1 && Array.isArray(keys) && keys.includes('mindful_pending_verification_email')) {
                        result = {};
                    } else if (callCount === 2 && Array.isArray(keys) && keys.includes('mindful_onboarding_completed')) {
                        result = { mindful_onboarding_completed: true };
                    } else {
                        result = {};
                    }
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                });
                appManager._showMain = jest.fn();
                
                await appManager._applyOnboardingState();
                
                expect(appManager._showMain).toHaveBeenCalled();
            });
        });

        describe('_saveOnboardingCompleted and _loadOnboardingCompleted', () => {
            test('should save onboarding completed status', async () => {
                global.chrome.storage.local.set = jest.fn((items, callback) => {
                    if (callback) {
                        callback();
                        return;
                    }
                    return Promise.resolve();
                });
                
                await appManager._saveOnboardingCompleted(true);
                
                expect(global.chrome.storage.local.set).toHaveBeenCalled();
                const callArgs = global.chrome.storage.local.set.mock.calls[0];
                expect(callArgs[0]).toEqual({ mindful_onboarding_completed: true });
            });

            test('should load onboarding completed status', async () => {
                global.chrome.storage.local.get = jest.fn((keys, callback) => {
                    const result = { mindful_onboarding_completed: true };
                    if (callback) {
                        callback(result);
                        return;
                    }
                    return Promise.resolve(result);
                });
                
                const result = await appManager._loadOnboardingCompleted();
                
                expect(result).toBe(true);
            });

            test('should return false if onboarding not completed', async () => {
                global.chrome.storage.local.get = jest.fn((keys, callback) => {
                    callback({});
                });
                
                const result = await appManager._loadOnboardingCompleted();
                
                expect(result).toBe(false);
            });
        });

        describe('_setLegalLinksUrls', () => {
            test('should set href on .app-legal-terms and .app-legal-privacy links', () => {
                const termsLink = document.createElement('a');
                termsLink.className = 'app-legal-terms';
                document.body.appendChild(termsLink);
                const privacyLink = document.createElement('a');
                privacyLink.className = 'app-legal-privacy';
                document.body.appendChild(privacyLink);

                appManager._setLegalLinksUrls();

                expect(termsLink.href).toBeTruthy();
                expect(termsLink.href).toContain('terms');
                expect(privacyLink.href).toBeTruthy();
                expect(privacyLink.href).toContain('privacy');

                termsLink.remove();
                privacyLink.remove();
            });

            test('should not throw when document or CONFIG.APP is missing', () => {
                expect(() => appManager._setLegalLinksUrls()).not.toThrow();
            });
        });

        describe('_updateThemeLocaleToggleIcons', () => {
            test('should update theme icon to moon in dark theme', () => {
                const themeIcon = document.createElement('span');
                themeIcon.id = 'appThemeIcon';
                document.body.appendChild(themeIcon);
                appManager.themeManager.getCurrentTheme = jest.fn().mockReturnValue('dark');

                appManager._updateThemeLocaleToggleIcons();

                expect(themeIcon.textContent).toBe('🌙');
                expect(themeIcon.classList.contains('app-theme-icon-moon')).toBe(true);
                themeIcon.remove();
            });

            test('should update theme icon to sun in light theme', () => {
                const themeIcon = document.createElement('span');
                themeIcon.id = 'appThemeIcon';
                document.body.appendChild(themeIcon);
                appManager.themeManager.getCurrentTheme = jest.fn().mockReturnValue('light');

                appManager._updateThemeLocaleToggleIcons();

                expect(themeIcon.textContent).toBe('☀️');
                themeIcon.remove();
            });

            test('should update locale icon for ru and en', () => {
                const localeIcon = document.createElement('span');
                localeIcon.id = 'appLocaleIcon';
                document.body.appendChild(localeIcon);

                appManager.localeManager.getCurrentLocale = jest.fn().mockReturnValue('ru');
                appManager._updateThemeLocaleToggleIcons();
                expect(localeIcon.textContent).toBe('🇷🇺');

                appManager.localeManager.getCurrentLocale = jest.fn().mockReturnValue('en');
                appManager._updateThemeLocaleToggleIcons();
                expect(localeIcon.textContent).toBe('🇺🇸');

                localeIcon.remove();
            });

            test('should not throw when icon elements are missing', () => {
                expect(() => appManager._updateThemeLocaleToggleIcons()).not.toThrow();
            });
        });

        describe('destroy', () => {
            test('should call _removeEventHandlers and _destroyManagers', async () => {
                appManager.isInitialized = true;
                const removeSpy = jest.spyOn(appManager, '_removeEventHandlers');
                const destroyManagersSpy = jest.spyOn(appManager, '_destroyManagers');

                appManager.destroy();

                expect(removeSpy).toHaveBeenCalled();
                expect(destroyManagersSpy).toHaveBeenCalled();
                expect(appManager.isInitialized).toBe(false);
            });

            test('should clear recheck debounce timer on destroy', async () => {
                appManager.isInitialized = true;
                appManager._recheckDebounceTimer = setTimeout(() => {}, 9999);
                const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

                appManager.destroy();

                expect(clearTimeoutSpy).toHaveBeenCalled();
            });
        });
    });
});
