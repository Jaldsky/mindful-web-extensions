/**
 * Тесты для EventQueueManager
 */

const EventQueueManager = require('../../../../src/managers/tracker/queue/EventQueueManager.js');
const BackendManager = require('../../../../src/managers/tracker/core/BackendManager.js');
const StatisticsManager = require('../../../../src/managers/tracker/core/StatisticsManager.js');
const StorageManager = require('../../../../src/managers/tracker/core/StorageManager.js');

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
                    get: jest.fn((keys, cb) => {
                        if (typeof cb === 'function') cb({});
                    }),
                    set: jest.fn((items, cb) => {
                        if (typeof cb === 'function') cb();
                    })
                }
            };
        }

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

        test('должен иметь performanceMetrics Map из BaseManager', () => {
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

            expect(eventQueueManager.batchProcessor.batchInterval).toBeDefined();
        });

        test('должен останавливать периодическую обработку', () => {
            eventQueueManager.startBatchProcessor();
            expect(eventQueueManager.batchProcessor.batchInterval).toBeDefined();

            eventQueueManager.stopBatchProcessor();
            expect(eventQueueManager.batchProcessor.batchInterval).toBeNull();
        });

        test('не должен запускать дважды', () => {
            eventQueueManager.stopBatchProcessor();
            
            eventQueueManager.startBatchProcessor();
            const interval1 = eventQueueManager.batchProcessor.batchInterval;

            eventQueueManager.startBatchProcessor();
            const interval2 = eventQueueManager.batchProcessor.batchInterval;

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
                jest.spyOn(backendManager, 'checkHealth').mockResolvedValue({ success: false });

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

            expect(eventQueueManager.batchProcessor.batchInterval).toBeNull();
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

    describe('processQueue дополнительные сценарии', () => {
        test('не обрабатывает пустую очередь', async () => {
            eventQueueManager.queue = [];
            
            await eventQueueManager.processQueue();
            
            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });

        test('не обрабатывает очередь когда офлайн', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            eventQueueManager.setOnlineStatus(false);
            storageManager.saveEventQueue.mockResolvedValue(true);
            
            await eventQueueManager.processQueue();
            
            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });

        test('обрабатывает очередь когда достигнут порог ошибок', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => true);
            backendManager.checkHealth = jest.fn().mockResolvedValue({ success: false });
            
            await eventQueueManager.processQueue();
            
            expect(backendManager.checkHealth).toHaveBeenCalled();
        });

        test('фильтрует события по исключениям доменов', async () => {
            eventQueueManager.queue = [
                { event: 'active', domain: 'blocked.com', timestamp: new Date().toISOString() },
                { event: 'active', domain: 'allowed.com', timestamp: new Date().toISOString() }
            ];
            await eventQueueManager.setDomainExceptions(['blocked.com']);
            backendManager.sendEvents.mockResolvedValue({ success: true });
            storageManager.saveEventQueue.mockResolvedValue(true);
            
            await eventQueueManager.processQueue();
            
            expect(backendManager.sendEvents).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ domain: 'allowed.com' })
                ])
            );
        });

        test('не отправляет события если все отфильтрованы', async () => {
            eventQueueManager.queue = [
                { event: 'active', domain: 'blocked.com', timestamp: new Date().toISOString() }
            ];
            await eventQueueManager.setDomainExceptions(['blocked.com']);
            storageManager.saveEventQueue.mockResolvedValue(true);
            
            await eventQueueManager.processQueue();
            
            expect(backendManager.sendEvents).not.toHaveBeenCalled();
        });

        test('возвращает события в очередь при ошибке отправки', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            backendManager.sendEvents.mockResolvedValue({ success: false, error: 'Server error' });
            storageManager.saveEventQueue.mockResolvedValue(true);
            eventQueueManager.failureManager.registerSendFailure = jest.fn().mockResolvedValue(false);
            eventQueueManager.failureManager.getConsecutiveFailures = jest.fn(() => 1);
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => false);
            
            jest.useFakeTimers();
            await eventQueueManager.processQueue();
            await Promise.resolve();
            
            expect(eventQueueManager.queue.length).toBeGreaterThan(0);
            jest.useRealTimers();
        });

        test('обрабатывает исключения при отправке событий', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            backendManager.sendEvents.mockRejectedValue(new Error('Network error'));
            storageManager.saveEventQueue.mockResolvedValue(true);
            eventQueueManager.failureManager.registerSendFailure = jest.fn().mockResolvedValue(false);
            eventQueueManager.failureManager.getConsecutiveFailures = jest.fn(() => 1);
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => false);
            
            jest.useFakeTimers();
            await eventQueueManager.processQueue();
            await Promise.resolve();
            
            expect(eventQueueManager.queue.length).toBeGreaterThan(0);
            jest.useRealTimers();
        });

        test('планирует повтор при ошибке если порог не достигнут', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            backendManager.sendEvents.mockResolvedValue({ success: false, error: 'Error' });
            storageManager.saveEventQueue.mockResolvedValue(true);
            eventQueueManager.failureManager.registerSendFailure = jest.fn().mockResolvedValue(false);
            eventQueueManager.failureManager.getConsecutiveFailures = jest.fn(() => 1);
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => false);
            
            jest.useFakeTimers();
            await eventQueueManager.processQueue();
            await Promise.resolve();
            
            expect(eventQueueManager.retryTimeoutId).toBeDefined();
            jest.useRealTimers();
        });

        test('не планирует повтор если порог достигнут', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            backendManager.sendEvents.mockResolvedValue({ success: false, error: 'Error' });
            storageManager.saveEventQueue.mockResolvedValue(true);
            eventQueueManager.failureManager.registerSendFailure = jest.fn().mockResolvedValue(true);
            eventQueueManager.failureManager.getConsecutiveFailures = jest.fn(() => 5);
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => true);
            backendManager.checkHealth = jest.fn().mockResolvedValue({ success: false });
            
            await eventQueueManager.processQueue();
            await Promise.resolve();
            
            expect(backendManager.checkHealth).toHaveBeenCalled();
        });
    });

    describe('_checkHealthAndResumeIfAvailable', () => {
        test('возобновляет отправку при успешном healthcheck', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            backendManager.checkHealth = jest.fn().mockResolvedValue({ success: true });
            backendManager.sendEvents = jest.fn().mockResolvedValue({ success: true });
            storageManager.saveEventQueue = jest.fn().mockResolvedValue(true);
            eventQueueManager.failureManager.resetFailureCounters = jest.fn();
            eventQueueManager.failureManager.getConsecutiveFailures = jest.fn(() => 0);
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => false);
            
            await eventQueueManager._checkHealthAndResumeIfAvailable();
            await Promise.resolve();
            
            expect(backendManager.sendEvents).toHaveBeenCalled();
        });

        test('запускает периодический healthcheck при неуспехе', async () => {
            backendManager.checkHealth = jest.fn().mockResolvedValue({ success: false });
            
            jest.useFakeTimers();
            await eventQueueManager._checkHealthAndResumeIfAvailable();
            await Promise.resolve();
            
            expect(eventQueueManager.healthcheckIntervalId).toBeDefined();
            jest.useRealTimers();
        });

        test('обрабатывает ошибки healthcheck', async () => {
            backendManager.checkHealth = jest.fn().mockRejectedValue(new Error('Healthcheck error'));
            
            jest.useFakeTimers();
            await eventQueueManager._checkHealthAndResumeIfAvailable();
            await Promise.resolve();
            
            expect(eventQueueManager.healthcheckIntervalId).toBeDefined();
            jest.useRealTimers();
        });
    });

    describe('resetFailureState', () => {
        test('сбрасывает состояние ошибок', () => {
            eventQueueManager.healthcheckIntervalId = setInterval(() => {}, 1000);
            eventQueueManager.failureManager.resetFailureCounters = jest.fn();
            eventQueueManager.failureManager.getConsecutiveFailures = jest.fn(() => 0);
            eventQueueManager.failureManager.isThresholdReached = jest.fn(() => false);
            
            eventQueueManager.resetFailureState();
            
            expect(eventQueueManager.failureManager.resetFailureCounters).toHaveBeenCalled();
            expect(eventQueueManager.healthcheckIntervalId).toBeNull();
        });
    });

    describe('setDomainExceptions дополнительные сценарии', () => {
        test('обрабатывает ошибки сохранения при установке исключений', async () => {
            eventQueueManager.queue = [{ event: 'active', domain: 'test.com', timestamp: new Date().toISOString() }];
            storageManager.saveEventQueue.mockRejectedValue(new Error('Save error'));
            
            const result = await eventQueueManager.setDomainExceptions(['test.com']);
            
            expect(result.count).toBe(1);
        });
    });
});
