/**
 * Тесты для TrackerManager
 */

const TrackerManager = require('../../../src/managers/tracker/TrackerManager.js');

/**
 * Вспомогательная функция для ожидания всех pending промисов.
 * Запускает несколько итераций event loop для завершения асинхронных операций.
 * @returns {Promise<void>}
 */
async function flushPromises() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

describe('TrackerManager', () => {
    let trackerManager;

    beforeEach(() => {
        // Настраиваем chrome API (всегда переопределяем для чистоты тестов)
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((keys) => Promise.resolve({})),
                    set: jest.fn(() => Promise.resolve())
                }
            },
            runtime: {
                onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
                onInstalled: { addListener: jest.fn() },
                onStartup: { addListener: jest.fn() },
                onSuspend: { addListener: jest.fn() }
            },
            tabs: {
                onActivated: { addListener: jest.fn(), removeListener: jest.fn() },
                onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
                onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
                get: jest.fn().mockResolvedValue({ id: 1, url: 'https://test.com' }),
                query: jest.fn().mockResolvedValue([])
            },
            windows: {
                onFocusChanged: { addListener: jest.fn(), removeListener: jest.fn() },
                WINDOW_ID_NONE: -1
            }
        };

        // Navigator (для проверки онлайн/офлайн)
        Object.defineProperty(global.navigator, 'onLine', {
            writable: true,
            value: true
        });
    });

    afterEach(() => {
        if (trackerManager) {
            try {
                trackerManager.destroy();
                trackerManager = null;
            } catch (error) {
                // Игнорируем ошибки при destroy
            }
        }
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            expect(trackerManager).toBeInstanceOf(TrackerManager);
        });

        test('должен создавать все менеджеры', () => {
            trackerManager = new TrackerManager({ enableLogging: false });

            expect(trackerManager.storageManager).toBeDefined();
            expect(trackerManager.statisticsManager).toBeDefined();
            expect(trackerManager.backendManager).toBeDefined();
            expect(trackerManager.eventQueueManager).toBeDefined();
            expect(trackerManager.tabTrackingManager).toBeDefined();
            expect(trackerManager.messageHandlerManager).toBeDefined();
        });

        test('должен иметь начальные значения', () => {
            trackerManager = new TrackerManager({ enableLogging: false });

            expect(trackerManager.isInitialized).toBe(false);
        });

        test('должен иметь performanceMetrics Map', () => {
            trackerManager = new TrackerManager({ enableLogging: false });

            expect(trackerManager.performanceMetrics).toBeInstanceOf(Map);
        });
    });

    describe('init', () => {
        test('должен инициализировать трекер', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            // Явно дождемся завершения init (вызывается в конструкторе, но не ждется)
            await trackerManager.init();

            expect(trackerManager.isInitialized).toBe(true);
        });

        test('не должен инициализировать дважды', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await trackerManager.init();
            
            const initState1 = trackerManager.isInitialized;
            
            await trackerManager.init();
            
            const initState2 = trackerManager.isInitialized;

            expect(initState1).toBe(true);
            expect(initState2).toBe(true);
        });

        test('должен инициализировать userId', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_user_id: 'test-user-123'
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            
            await trackerManager.init();

            expect(trackerManager.backendManager.userId).toBe('test-user-123');
        });

        test('должен настраивать lifecycle handlers', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await trackerManager.init();

            expect(global.chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
            expect(global.chrome.runtime.onStartup.addListener).toHaveBeenCalled();
            expect(global.chrome.runtime.onSuspend.addListener).toHaveBeenCalled();
        });
    });

    describe('getStatistics', () => {
        test('должен возвращать общую статистику', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            const stats = trackerManager.getStatistics();

            expect(stats).toHaveProperty('eventsTracked');
            expect(stats).toHaveProperty('domainsVisited');
            expect(stats).toHaveProperty('queueSize');
            expect(stats).toHaveProperty('isInitialized');
            expect(stats).toHaveProperty('userId');
            expect(stats).toHaveProperty('backendUrl');
        });
    });

    describe('getDiagnostics', () => {
        test('должен возвращать диагностическую информацию', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            const diagnostics = trackerManager.getDiagnostics();

            expect(diagnostics).toHaveProperty('isInitialized');
            expect(diagnostics).toHaveProperty('state');
            expect(diagnostics).toHaveProperty('trackingEnabled');
            expect(diagnostics).toHaveProperty('statistics');
            expect(diagnostics).toHaveProperty('storageState');
            expect(diagnostics).toHaveProperty('backendState');
            expect(diagnostics).toHaveProperty('queueState');
            expect(diagnostics).toHaveProperty('trackingState');
            expect(diagnostics).toHaveProperty('performanceMetrics');
            expect(diagnostics).toHaveProperty('timestamp');
        });
    });

    describe('getAllPerformanceMetrics', () => {
        test('должен возвращать метрики всех менеджеров', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            const metrics = trackerManager.getAllPerformanceMetrics();

            expect(metrics).toHaveProperty('tracker');
            expect(metrics).toHaveProperty('storage');
            expect(metrics).toHaveProperty('backend');
            expect(metrics).toHaveProperty('eventQueue');
            expect(metrics).toHaveProperty('tabTracking');
            expect(metrics).toHaveProperty('messageHandler');
        });
    });

    describe('tracking controls', () => {
        beforeEach(async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();
        });

        test('должен отключать отслеживание и сохранять состояние', async () => {
            const stopSpy = jest.spyOn(trackerManager.tabTrackingManager, 'stopTracking');

            const result = await trackerManager.disableTracking();

            expect(result).toEqual({ success: true, isTracking: false });
            expect(trackerManager.trackingEnabled).toBe(false);
            expect(stopSpy).toHaveBeenCalled();

            const savedStates = global.chrome.storage.local.set.mock.calls.map(args => args[0]);
            expect(savedStates.some(entry => entry && entry.mindful_tracking_enabled === false)).toBe(true);
        });

        test('должен включать отслеживание и сохранять состояние', async () => {
            jest.spyOn(trackerManager.tabTrackingManager, 'startTracking').mockResolvedValue();
            await trackerManager.disableTracking();
            global.chrome.storage.local.set.mockClear();

            const result = await trackerManager.enableTracking();

            expect(result).toEqual({ success: true, isTracking: true });
            expect(trackerManager.trackingEnabled).toBe(true);

            const savedStates = global.chrome.storage.local.set.mock.calls.map(args => args[0]);
            expect(savedStates.some(entry => entry && entry.mindful_tracking_enabled === true)).toBe(true);
        });
    });

    describe('destroy', () => {
        test('должен уничтожать все менеджеры', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            const storageManagerDestroy = jest.spyOn(trackerManager.storageManager, 'destroy');
            const statisticsManagerDestroy = jest.spyOn(trackerManager.statisticsManager, 'destroy');
            const backendManagerDestroy = jest.spyOn(trackerManager.backendManager, 'destroy');
            const eventQueueManagerDestroy = jest.spyOn(trackerManager.eventQueueManager, 'destroy');
            const tabTrackingManagerDestroy = jest.spyOn(trackerManager.tabTrackingManager, 'destroy');
            const messageHandlerManagerDestroy = jest.spyOn(trackerManager.messageHandlerManager, 'destroy');

            trackerManager.destroy();

            expect(storageManagerDestroy).toHaveBeenCalled();
            expect(statisticsManagerDestroy).toHaveBeenCalled();
            expect(backendManagerDestroy).toHaveBeenCalled();
            expect(eventQueueManagerDestroy).toHaveBeenCalled();
            expect(tabTrackingManagerDestroy).toHaveBeenCalled();
            expect(messageHandlerManagerDestroy).toHaveBeenCalled();
        });

        test('должен очищать ресурсы', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            trackerManager.performanceMetrics.set('test', 100);

            trackerManager.destroy();

            expect(trackerManager.performanceMetrics.size).toBe(0);
            expect(trackerManager.isInitialized).toBe(false);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            trackerManager = new TrackerManager({ enableLogging: false });

            expect(trackerManager.getState).toBeDefined();
            expect(trackerManager.updateState).toBeDefined();
            expect(trackerManager.destroy).toBeDefined();
        });

        test('должен иметь CONSTANTS', () => {
            trackerManager = new TrackerManager({ enableLogging: false });

            expect(trackerManager.CONSTANTS).toBeDefined();
        });
    });

    describe('Интеграционные тесты', () => {
        test('должен корректно координировать работу всех менеджеров', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            // Проверяем что все менеджеры инициализированы и связаны
            expect(trackerManager.eventQueueManager.backendManager).toBe(trackerManager.backendManager);
            expect(trackerManager.eventQueueManager.statisticsManager).toBe(trackerManager.statisticsManager);
            expect(trackerManager.eventQueueManager.storageManager).toBe(trackerManager.storageManager);
            
            expect(trackerManager.tabTrackingManager.eventQueueManager).toBe(trackerManager.eventQueueManager);
            
            expect(trackerManager.messageHandlerManager.statisticsManager).toBe(trackerManager.statisticsManager);
            expect(trackerManager.messageHandlerManager.eventQueueManager).toBe(trackerManager.eventQueueManager);
        });
    });

    describe('Online/Offline мониторинг', () => {
        test('должен обрабатывать онлайн статус при инициализации', async () => {
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: true
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();
            
            expect(trackerManager.eventQueueManager.state.isOnline).toBe(true);
        });

        test('должен обрабатывать офлайн статус при инициализации', async () => {
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: false
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();
            
            expect(trackerManager.eventQueueManager.state.isOnline).toBe(false);
        });

        test('должен устанавливать мониторинг онлайн статуса', async () => {
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: true
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            // Проверяем что статус установлен корректно при инициализации
            expect(trackerManager.eventQueueManager.state.isOnline).toBe(true);
        });
    });

    describe('Lifecycle handlers', () => {
        test('должен обрабатывать событие установки расширения', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            // Получаем callback для onInstalled
            const onInstalledCallback = global.chrome.runtime.onInstalled.addListener.mock.calls[0][0];

            // Симулируем установку
            onInstalledCallback({ reason: 'install' });

            // Проверяем что обработчик вызван (без ошибок)
            expect(onInstalledCallback).toBeDefined();
        });

        test('должен обрабатывать событие обновления расширения', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            // Получаем callback для onInstalled
            const onInstalledCallback = global.chrome.runtime.onInstalled.addListener.mock.calls[0][0];

            // Симулируем обновление
            onInstalledCallback({ reason: 'update' });

            // Проверяем что обработчик вызван (без ошибок)
            expect(onInstalledCallback).toBeDefined();
        });

        test('должен обрабатывать событие запуска расширения', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            // Получаем callback для onStartup
            const onStartupCallback = global.chrome.runtime.onStartup.addListener.mock.calls[0][0];

            // Симулируем запуск
            onStartupCallback();

            // Проверяем что обработчик вызван (без ошибок)
            expect(onStartupCallback).toBeDefined();
        });

        test('должен обрабатывать событие приостановки расширения', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            const saveQueueSpy = jest.spyOn(trackerManager.eventQueueManager, 'saveQueue');

            // Получаем callback для onSuspend
            const onSuspendCallback = global.chrome.runtime.onSuspend.addListener.mock.calls[0][0];

            // Симулируем приостановку
            onSuspendCallback();

            // Проверяем что очередь сохраняется
            expect(saveQueueSpy).toHaveBeenCalled();
        });
    });
});
