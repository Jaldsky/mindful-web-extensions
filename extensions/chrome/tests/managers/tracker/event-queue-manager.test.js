/**
 * Тесты для EventQueueManager
 */

const EventQueueManager = require('../../../src/managers/tracker/EventQueueManager.js');
const BackendManager = require('../../../src/managers/tracker/BackendManager.js');
const StatisticsManager = require('../../../src/managers/tracker/StatisticsManager.js');
const StorageManager = require('../../../src/managers/tracker/StorageManager.js');

describe('EventQueueManager', () => {
    let eventQueueManager;
    let backendManager;
    let statisticsManager;
    let storageManager;
    let trackingController;

    beforeEach(() => {
        // Настраиваем chrome API
        if (!global.chrome) {
            global.chrome = {};
        }
        
        if (!global.chrome.storage) {
            global.chrome.storage = {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            };
        }

        global.chrome.storage.local.get.mockResolvedValue({});
        global.chrome.storage.local.set.mockResolvedValue();

        // Создаем зависимости
        backendManager = new BackendManager({
            userId: 'test-user',
            enableLogging: false
        });
        statisticsManager = new StatisticsManager({ enableLogging: false });
        storageManager = new StorageManager({ enableLogging: false });
        trackingController = {
            disableTracking: jest.fn().mockResolvedValue({ success: true, isTracking: false })
        };

        // Мокируем методы зависимостей
        jest.spyOn(backendManager, 'sendEvents');
        jest.spyOn(statisticsManager, 'addEvent');
        jest.spyOn(statisticsManager, 'updateQueueSize');
        jest.spyOn(storageManager, 'saveEventQueue');
        jest.spyOn(storageManager, 'restoreEventQueue');

        // Создаем EventQueueManager
        eventQueueManager = new EventQueueManager(
            {
                backendManager,
                statisticsManager,
                storageManager,
                trackingController
            },
            { enableLogging: false }
        );
    });

    afterEach(() => {
        if (eventQueueManager) {
            eventQueueManager.destroy();
        }
        if (backendManager) {
            backendManager.destroy();
        }
        if (statisticsManager) {
            statisticsManager.destroy();
        }
        if (storageManager) {
            storageManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно с зависимостями', () => {
            expect(eventQueueManager).toBeInstanceOf(EventQueueManager);
        });

        test('должен выбрасывать ошибку без зависимостей', () => {
            expect(() => {
                new EventQueueManager();
            }).toThrow();
        });

        test('должен иметь начальные значения', () => {
            expect(eventQueueManager.queue).toEqual([]);
            expect(eventQueueManager.batchSize).toBe(100); // Увеличен для защиты от переполнения
            expect(eventQueueManager.isOnline).toBe(true);
        });

        test('должен иметь performanceMetrics Map', () => {
            expect(eventQueueManager.performanceMetrics).toBeInstanceOf(Map);
        });
    });

    describe('addEvent', () => {
        test('должен добавлять событие в очередь', () => {
            eventQueueManager.addEvent('active', 'test.com');

            expect(eventQueueManager.queue.length).toBe(1);
            expect(eventQueueManager.queue[0]).toMatchObject({
                event: 'active',
                domain: 'test.com'
            });
            expect(eventQueueManager.queue[0].timestamp).toBeDefined();
        });

        test('должен обновлять статистику', () => {
            eventQueueManager.addEvent('active', 'test.com');

            expect(statisticsManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
            expect(statisticsManager.updateQueueSize).toHaveBeenCalledWith(1);
        });

        test('не должен добавлять событие для исключенного домена', async () => {
            await eventQueueManager.setDomainExceptions(['blocked.com']);
            statisticsManager.addEvent.mockClear();

            eventQueueManager.addEvent('active', 'blocked.com');

            expect(eventQueueManager.queue.length).toBe(0);
            expect(statisticsManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен ограничивать размер очереди значением MAX_QUEUE_SIZE', async () => {
            const maxSize = eventQueueManager.maxQueueSize;

            for (let i = 0; i < maxSize + 20; i++) {
                eventQueueManager.addEvent('active', `test${i}.com`);
            }

            await Promise.resolve();
            await Promise.resolve();

            expect(eventQueueManager.queue.length).toBeLessThanOrEqual(maxSize);
            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });

        test('должен НЕ отправлять автоматически при малом количестве событий', async () => {
            // Мокируем sendEvents
            backendManager.sendEvents.mockResolvedValue({ success: true });

            // Добавляем 10 событий (как раньше было достаточно)
            for (let i = 0; i < 10; i++) {
                eventQueueManager.addEvent('active', `test${i}.com`);
            }

            await Promise.resolve();
            await Promise.resolve();

            // НЕ должно отправиться автоматически - только по таймеру
            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });
    });

    describe('startBatchProcessor / stopBatchProcessor', () => {
        test('должен запускать периодическую обработку', () => {
            eventQueueManager.stopBatchProcessor(); // Сначала останавливаем если уже запущен
            
            eventQueueManager.startBatchProcessor();

            expect(eventQueueManager.batchInterval).toBeDefined();
        });

        test('должен останавливать периодическую обработку', () => {
            eventQueueManager.startBatchProcessor();
            expect(eventQueueManager.batchInterval).toBeDefined();

            eventQueueManager.stopBatchProcessor();
            expect(eventQueueManager.batchInterval).toBeNull();
        });

        test('не должен запускать дважды', () => {
            eventQueueManager.stopBatchProcessor();
            
            eventQueueManager.startBatchProcessor();
            const interval1 = eventQueueManager.batchInterval;

            eventQueueManager.startBatchProcessor();
            const interval2 = eventQueueManager.batchInterval;

            expect(interval1).toBe(interval2);
        });
    });

    describe('processQueue', () => {
        test('должен обрабатывать очередь', async () => {
            backendManager.sendEvents.mockResolvedValue({ success: true });
            storageManager.saveEventQueue.mockResolvedValue(true);

            eventQueueManager.addEvent('active', 'test.com');
            
            await eventQueueManager.processQueue();

            expect(backendManager.sendEvents).toHaveBeenCalled();
            expect(storageManager.saveEventQueue).toHaveBeenCalled();
        });

        test('должен исключать домены из списка исключений при отправке', async () => {
            backendManager.sendEvents.mockResolvedValue({ success: true });
            storageManager.saveEventQueue.mockResolvedValue(true);

            await eventQueueManager.setDomainExceptions(['blocked.com']);
            eventQueueManager.queue = [
                { event: 'active', domain: 'blocked.com', timestamp: new Date().toISOString() },
                { event: 'inactive', domain: 'allowed.com', timestamp: new Date().toISOString() }
            ];

            await eventQueueManager.processQueue();

            expect(backendManager.sendEvents).toHaveBeenCalledTimes(1);
            const sentEvents = backendManager.sendEvents.mock.calls[0][0];
            expect(sentEvents).toHaveLength(1);
            expect(sentEvents[0].domain).toBe('allowed.com');
            expect(storageManager.saveEventQueue).toHaveBeenCalled();
        });

        test('не должен обрабатывать пустую очередь', async () => {
            await eventQueueManager.processQueue();

            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });

        test('не должен обрабатывать в офлайн режиме', async () => {
            eventQueueManager.setOnlineStatus(false);
            eventQueueManager.addEvent('active', 'test.com');

            await eventQueueManager.processQueue();

            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });

        test('должен возвращать события в очередь при ошибке', async () => {
            backendManager.sendEvents.mockResolvedValue({ success: false, error: 'Test error' });

            eventQueueManager.addEvent('active', 'test1.com');
            eventQueueManager.addEvent('active', 'test2.com');

            await eventQueueManager.processQueue();

            // События должны остаться в очереди
            expect(eventQueueManager.queue.length).toBe(2);
        });

        test('должен отключать трекер после 5 неудачных попыток отправки', async () => {
            jest.useFakeTimers();

            try {
                eventQueueManager.destroy();
                eventQueueManager = new EventQueueManager(
                    {
                        backendManager,
                        statisticsManager,
                        storageManager,
                        trackingController
                    },
                    { enableLogging: false, retryDelay: 0 }
                );

                storageManager.saveEventQueue.mockResolvedValue(true);
                backendManager.sendEvents.mockResolvedValue({ success: false, error: 'Test error' });

                eventQueueManager.addEvent('active', 'test.com');

                for (let i = 0; i < 5; i++) {
                    await eventQueueManager.processQueue();
                }

                expect(trackingController.disableTracking).toHaveBeenCalledTimes(1);
                expect(eventQueueManager.getState().failureThresholdReached).toBe(true);
            } finally {
                jest.useRealTimers();
            }
        });
    });

    describe('setDomainExceptions', () => {
        test('должен обновлять список исключений и очищать очередь', async () => {
            storageManager.saveEventQueue.mockResolvedValue(true);
            eventQueueManager.queue = [
                { event: 'active', domain: 'blocked.com', timestamp: new Date().toISOString() },
                { event: 'active', domain: 'allowed.com', timestamp: new Date().toISOString() }
            ];

            const result = await eventQueueManager.setDomainExceptions(['blocked.com']);

            expect(result.count).toBe(1);
            expect(result.removedFromQueue).toBe(1);
            expect(eventQueueManager.queue).toHaveLength(1);
            expect(eventQueueManager.queue[0].domain).toBe('allowed.com');
        });
    });

    describe('restoreQueue / saveQueue', () => {
        test('должен восстанавливать очередь', async () => {
            const testQueue = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];
            storageManager.restoreEventQueue.mockResolvedValue(testQueue);

            await eventQueueManager.restoreQueue();

            expect(eventQueueManager.queue).toEqual(testQueue);
            expect(statisticsManager.updateQueueSize).toHaveBeenCalledWith(1);
        });

        test('должен сохранять очередь', async () => {
            eventQueueManager.queue = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];
            storageManager.saveEventQueue.mockResolvedValue(true);

            await eventQueueManager.saveQueue();

            expect(storageManager.saveEventQueue).toHaveBeenCalledWith(eventQueueManager.queue);
        });
    });

    describe('setOnlineStatus', () => {
        test('должен изменять статус онлайн', () => {
            eventQueueManager.setOnlineStatus(false);

            expect(eventQueueManager.isOnline).toBe(false);
            expect(eventQueueManager.getState().isOnline).toBe(false);
        });

        test('должен запускать обработку при восстановлении соединения', async () => {
            backendManager.sendEvents.mockResolvedValue({ success: true });
            storageManager.saveEventQueue.mockResolvedValue(true);
            
            eventQueueManager.setOnlineStatus(false);
            eventQueueManager.addEvent('active', 'test.com');
            
            eventQueueManager.setOnlineStatus(true);

            // Проматываем pending промисы
            await Promise.resolve();
            await Promise.resolve();

            expect(backendManager.sendEvents).toHaveBeenCalled();
        });
    });

    describe('getQueueSize', () => {
        test('getQueueSize должен возвращать размер очереди', () => {
            eventQueueManager.addEvent('active', 'test1.com');
            eventQueueManager.addEvent('active', 'test2.com');

            expect(eventQueueManager.getQueueSize()).toBe(2);
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            eventQueueManager.startBatchProcessor();
            eventQueueManager.addEvent('active', 'test.com');

            eventQueueManager.destroy();

            expect(eventQueueManager.batchInterval).toBeNull();
            expect(eventQueueManager.queue.length).toBe(0);
            expect(eventQueueManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(eventQueueManager.getState).toBeDefined();
            expect(eventQueueManager.updateState).toBeDefined();
            expect(eventQueueManager.destroy).toBeDefined();
        });
    });
});
