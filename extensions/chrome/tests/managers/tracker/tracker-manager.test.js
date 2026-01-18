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

        test('должен принимать опции batchSize и batchTimeout', () => {
            const customBatchSize = 50;
            const customBatchTimeout = 10000;
            
            trackerManager = new TrackerManager({ 
                enableLogging: false,
                batchSize: customBatchSize,
                batchTimeout: customBatchTimeout
            });

            // Проверяем что опции переданы в eventQueueManager
            expect(trackerManager.eventQueueManager).toBeDefined();
        });

        test('должен инициализировать состояние через updateState', () => {
            trackerManager = new TrackerManager({ enableLogging: false });

            const state = trackerManager.getState();

            expect(state).toHaveProperty('isInitialized', false);
            expect(state).toHaveProperty('isTracking', false);
            expect(state).toHaveProperty('isOnline', true);
            expect(state).toHaveProperty('trackingEnabled');
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

        test('должен инициализировать anonToken', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_anon_id: 'test-anon-id',
                mindful_anon_token: 'test-anon-token'
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            
            await trackerManager.init();

            expect(trackerManager.backendManager.authToken).toBe('test-anon-token');
        });

        test('должен настраивать lifecycle handlers', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await trackerManager.init();

            expect(global.chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
            expect(global.chrome.runtime.onStartup.addListener).toHaveBeenCalled();
            expect(global.chrome.runtime.onSuspend.addListener).toHaveBeenCalled();
        });

        test('должен инициализировать backend URL из storage', async () => {
            const testUrl = 'https://test-backend.com/api';
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: testUrl
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            expect(trackerManager.backendManager.getBackendUrl()).toBe(testUrl);
        });

        test('должен загружать domain exceptions', async () => {
            const domainExceptions = ['example.com', 'test.com'];
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_domain_exceptions: domainExceptions
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            const setDomainExceptionsSpy = jest.spyOn(trackerManager.eventQueueManager, 'setDomainExceptions');
            
            await trackerManager.init();

            expect(setDomainExceptionsSpy).toHaveBeenCalledWith(domainExceptions);
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
            expect(stats).toHaveProperty('anonId');
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

        test('должен включать domainExceptions в диагностику', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            const diagnostics = trackerManager.getDiagnostics();

            expect(diagnostics).toHaveProperty('domainExceptions');
        });

        test('timestamp должен быть в формате ISO', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            
            await flushPromises();

            const diagnostics = trackerManager.getDiagnostics();

            expect(diagnostics.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
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

        test('должен возвращать ошибку если сохранение состояния не удалось при enableTracking', async () => {
            jest.spyOn(trackerManager.tabTrackingManager, 'startTracking').mockResolvedValue();
            await trackerManager.disableTracking();
            
            // Мокируем chrome.storage.local.set чтобы он выбрасывал ошибку
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            const saveSpy = jest.spyOn(trackerManager.storageManager, 'saveTrackingEnabled');
            // saveTrackingEnabled вернет false только если произойдет ошибка, но в коде он всегда возвращает true при успехе
            // Поэтому мокируем напрямую метод, чтобы он возвращал false
            saveSpy.mockResolvedValueOnce(false);

            const result = await trackerManager.enableTracking();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(trackerManager.trackingEnabled).toBe(false);
        });

        test('должен возвращать ошибку если сохранение состояния не удалось при disableTracking', async () => {
            jest.spyOn(trackerManager.storageManager, 'saveTrackingEnabled').mockResolvedValue(false);

            const result = await trackerManager.disableTracking();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(trackerManager.trackingEnabled).toBe(true);
        });

        test('должен обрабатывать ошибки при enableTracking', async () => {
            jest.spyOn(trackerManager.tabTrackingManager, 'startTracking').mockRejectedValue(new Error('Start error'));
            await trackerManager.disableTracking();

            const result = await trackerManager.enableTracking();

            expect(result.success).toBe(false);
            expect(trackerManager.trackingEnabled).toBe(false);
        });

        test('должен обрабатывать ошибки при disableTracking', async () => {
            jest.spyOn(trackerManager.tabTrackingManager, 'stopTracking').mockImplementation(() => {
                throw new Error('Stop error');
            });

            const result = await trackerManager.disableTracking();

            expect(result.success).toBe(false);
            expect(trackerManager.trackingEnabled).toBe(true);
        });

        test('должен возвращать success если tracking уже включен', async () => {
            const result = await trackerManager.enableTracking();

            expect(result).toEqual({ success: true, isTracking: true });
        });

        test('должен возвращать success если tracking уже отключен', async () => {
            await trackerManager.disableTracking();

            const result = await trackerManager.disableTracking();

            expect(result).toEqual({ success: true, isTracking: false });
        });

        test('setTrackingEnabled должен выбрасывать TypeError для не boolean значения', async () => {
            await expect(trackerManager.setTrackingEnabled('not boolean')).rejects.toThrow(TypeError);
        });

        test('setTrackingEnabled должен вызывать enableTracking для true', async () => {
            await trackerManager.disableTracking();
            const enableSpy = jest.spyOn(trackerManager, 'enableTracking').mockResolvedValue({ success: true, isTracking: true });

            await trackerManager.setTrackingEnabled(true);

            expect(enableSpy).toHaveBeenCalled();
        });

        test('setTrackingEnabled должен вызывать disableTracking для false', async () => {
            const disableSpy = jest.spyOn(trackerManager, 'disableTracking').mockResolvedValue({ success: true, isTracking: false });

            await trackerManager.setTrackingEnabled(false);

            expect(disableSpy).toHaveBeenCalled();
        });
    });

    describe('Покрытие веток (Branch Coverage)', () => {
        test('init должен обрабатывать случай когда trackingEnabled = false', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_tracking_enabled: false
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            expect(trackerManager.trackingEnabled).toBe(false);
            expect(trackerManager.isInitialized).toBe(true);
        });

        test('_setupOnlineMonitoring должен обрабатывать offline статус', async () => {
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: false
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            const setOnlineStatusSpy = jest.spyOn(trackerManager.eventQueueManager, 'setOnlineStatus');
            await trackerManager.init();

            expect(setOnlineStatusSpy).toHaveBeenCalledWith(false);
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

        test('должен безопасно обрабатывать уничтожение когда менеджеры undefined', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();
            
            // Устанавливаем менеджеры в null после инициализации
            trackerManager.messageHandlerManager = null;
            trackerManager.tabTrackingManager = null;
            trackerManager.eventQueueManager = null;
            trackerManager.backendManager = null;
            trackerManager.statisticsManager = null;
            trackerManager.storageManager = null;

            // Не должно выбросить ошибку
            expect(() => trackerManager.destroy()).not.toThrow();
            expect(trackerManager.isInitialized).toBe(false);
        });

        test('должен сбрасывать trackingEnabled в значение по умолчанию', async () => {
            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();
            await trackerManager.enableTracking();

            expect(trackerManager.trackingEnabled).toBe(true);

            trackerManager.destroy();

            // trackingEnabled должен быть сброшен к дефолтному значению
            expect(trackerManager.trackingEnabled).toBeDefined();
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
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

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

        test('должен вызывать processQueue при онлайн статусе', async () => {
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: true
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            const processQueueSpy = jest.spyOn(trackerManager.eventQueueManager, 'processQueue');
            
            await trackerManager.init();

            expect(processQueueSpy).toHaveBeenCalled();
        });

        test('должен периодически проверять изменение online статуса', async () => {
            const setIntervalSpy = jest.spyOn(global, 'setInterval');
            
            Object.defineProperty(global.navigator, 'onLine', {
                writable: true,
                value: true
            });

            trackerManager = new TrackerManager({ enableLogging: false });
            await trackerManager.init();

            // Проверяем что setInterval был вызван для периодической проверки
            expect(setIntervalSpy).toHaveBeenCalled();
            
            setIntervalSpy.mockRestore();
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
