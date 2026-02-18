/**
 * @jest-environment jsdom
 */

const LifecycleManager = require('../../../../src/managers/app/core/LifecycleManager.js');

describe('LifecycleManager', () => {
    let app;
    let manager;

    const createApp = () => ({
        isInitialized: true,
        updateInterval: null,
        _recheckDebounceTimer: null,
        _storageListener: null,
        _visibilityHandler: null,
        CONSTANTS: { UPDATE_INTERVAL: 1000 },
        eventHandlers: new Map(),
        domManager: {
            elements: {},
            destroy: jest.fn()
        },
        diagnosticsManager: { destroy: jest.fn() },
        serviceWorkerManager: { destroy: jest.fn() },
        notificationManager: { destroy: jest.fn() },
        localeManager: { destroy: jest.fn() },
        loadInitialStatus: jest.fn().mockResolvedValue(),
        _stopPeriodicUpdates: jest.fn(),
        _removeEventHandlers: jest.fn(),
        _destroyManagers: jest.fn(),
        _log: jest.fn(),
        _logError: jest.fn()
    });

    beforeEach(() => {
        jest.useFakeTimers();
        app = createApp();
        manager = new LifecycleManager(app);
        global.chrome = {
            storage: {
                onChanged: {
                    removeListener: jest.fn()
                }
            }
        };
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
        delete global.chrome;
    });

    test('startPeriodicUpdates запускает обновления и вызывает loadInitialStatus', async () => {
        manager.startPeriodicUpdates();
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        expect(app.loadInitialStatus).toHaveBeenCalled();
        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.periodicUpdatesStart' });
    });

    test('startPeriodicUpdates не создаёт второй interval', () => {
        app.updateInterval = 1;

        manager.startPeriodicUpdates();

        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.periodicUpdatesAlreadyStarted' });
    });

    test('_stopPeriodicUpdates очищает interval и логирует', () => {
        manager.startPeriodicUpdates();
        expect(app.updateInterval).toBeTruthy();

        manager._stopPeriodicUpdates();

        expect(app.updateInterval).toBeNull();
        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.periodicUpdatesStopped' });
    });

    test('destroy делает ранний return если уже разрушен', () => {
        app.isInitialized = false;

        manager.destroy();

        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.alreadyDestroyed' });
    });

    test('destroy очищает ресурсы и флаги', () => {
        const visibilityHandler = jest.fn();
        document.addEventListener('visibilitychange', visibilityHandler);
        app._visibilityHandler = visibilityHandler;
        const storageListener = jest.fn();
        app._storageListener = storageListener;
        app._recheckDebounceTimer = setTimeout(() => {}, 500);

        manager.destroy();

        expect(app._stopPeriodicUpdates).toHaveBeenCalled();
        expect(app._removeEventHandlers).toHaveBeenCalled();
        expect(app._destroyManagers).toHaveBeenCalled();
        expect(global.chrome.storage.onChanged.removeListener).toHaveBeenCalledWith(storageListener);
        expect(app.isInitialized).toBe(false);
    });

    test('_removeEventHandlers снимает handlers с userStatus и dom elements', () => {
        const userStatus = document.createElement('button');
        userStatus.id = 'userStatus';
        document.body.appendChild(userStatus);

        const toggle = document.createElement('button');
        app.domManager.elements.toggleTracking = toggle;
        const userHandler = jest.fn();
        const toggleHandler = jest.fn();
        app.eventHandlers.set('userStatus', userHandler);
        app.eventHandlers.set('toggleTracking', toggleHandler);

        userStatus.addEventListener('click', userHandler);
        toggle.addEventListener('click', toggleHandler);

        manager._removeEventHandlers();

        expect(app.eventHandlers.size).toBe(0);
        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.eventHandlersRemoved' });
    });

    test('_destroyManagers вызывает destroy у подменеджеров и зануляет ссылки', () => {
        manager._destroyManagers();

        expect(app.diagnosticsManager).toBeNull();
        expect(app.serviceWorkerManager).toBeNull();
        expect(app.notificationManager).toBeNull();
        expect(app.domManager).toBeNull();
        expect(app.localeManager).toBeNull();
        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.managersDestroyed' });
    });
});
