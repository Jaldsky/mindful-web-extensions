/**
 * Тесты для MessageHandlerManager
 */

const MessageHandlerManager = require('../../src/tracker_manager/MessageHandlerManager.js');
const EventQueueManager = require('../../src/tracker_manager/EventQueueManager.js');
const BackendManager = require('../../src/tracker_manager/BackendManager.js');
const StatisticsManager = require('../../src/tracker_manager/StatisticsManager.js');
const StorageManager = require('../../src/tracker_manager/StorageManager.js');

describe('MessageHandlerManager', () => {
    let messageHandlerManager;
    let eventQueueManager;
    let backendManager;
    let statisticsManager;
    let storageManager;

    beforeEach(() => {
        // Настраиваем chrome API
        if (!global.chrome) {
            global.chrome = {};
        }

        if (!global.chrome.runtime) {
            global.chrome.runtime = {
                onMessage: {
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                }
            };
        }

        if (!global.chrome.storage) {
            global.chrome.storage = {
                local: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue()
                }
            };
        }

        // Создаем зависимости
        backendManager = new BackendManager({ userId: 'test-user', enableLogging: false });
        statisticsManager = new StatisticsManager({ enableLogging: false });
        storageManager = new StorageManager({ enableLogging: false });
        eventQueueManager = new EventQueueManager(
            { backendManager, statisticsManager, storageManager },
            { enableLogging: false }
        );

        // Создаем MessageHandlerManager
        messageHandlerManager = new MessageHandlerManager(
            { eventQueueManager, backendManager, statisticsManager, storageManager },
            { enableLogging: false }
        );
    });

    afterEach(() => {
        if (messageHandlerManager) {
            messageHandlerManager.destroy();
        }
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
            expect(messageHandlerManager).toBeInstanceOf(MessageHandlerManager);
        });

        test('должен выбрасывать ошибку без зависимостей', () => {
            expect(() => {
                new MessageHandlerManager();
            }).toThrow();
        });

        test('должен иметь начальные значения', () => {
            expect(messageHandlerManager.messageListener).toBeNull();
        });

        test('должен иметь performanceMetrics Map', () => {
            expect(messageHandlerManager.performanceMetrics).toBeInstanceOf(Map);
        });
    });

    describe('init', () => {
        test('должен настраивать слушатель сообщений', () => {
            messageHandlerManager.init();

            expect(messageHandlerManager.messageListener).toBeDefined();
            expect(global.chrome.runtime.onMessage.addListener).toHaveBeenCalled();
        });

        test('должен удалять старый слушатель перед добавлением нового', () => {
            messageHandlerManager.init();
            const listener1 = messageHandlerManager.messageListener;

            messageHandlerManager.init();
            const listener2 = messageHandlerManager.messageListener;

            expect(global.chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
            expect(listener1).not.toBe(listener2);
        });
    });

    describe('_handleMessage', () => {
        let sendResponse;

        beforeEach(() => {
            sendResponse = jest.fn();
            messageHandlerManager.init();
        });

        test('должен обрабатывать ping сообщение', () => {
            messageHandlerManager._handleMessage(
                { type: 'ping' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                message: 'pong'
            });
        });

        test('должен обрабатывать getStatus сообщение', () => {
            statisticsManager.addEvent('active', 'test.com');

            messageHandlerManager._handleMessage(
                { type: 'getStatus' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    isOnline: true,
                    isTracking: true,
                    stats: expect.any(Object)
                })
            );
        });

        test('должен обрабатывать getTodayStats сообщение', () => {
            statisticsManager.addEvent('active', 'test.com');

            messageHandlerManager._handleMessage(
                { type: 'getTodayStats' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    events: expect.any(Number),
                    domains: expect.any(Number),
                    queue: expect.any(Number)
                })
            );
        });

        test('должен обрабатывать testConnection сообщение', () => {
            jest.spyOn(backendManager, 'testConnection').mockResolvedValue({ success: true });

            messageHandlerManager._handleMessage(
                { type: 'testConnection' },
                {},
                sendResponse
            );

            expect(backendManager.testConnection).toHaveBeenCalled();
        });

        test('должен обрабатывать updateBackendUrl сообщение', async () => {
            const testUrl = 'http://newtest.com/api';
            jest.spyOn(storageManager, 'saveBackendUrl').mockResolvedValue(true);

            messageHandlerManager._handleMessage(
                { type: 'updateBackendUrl', url: testUrl },
                {},
                sendResponse
            );

            // Проматываем pending промисы
            await Promise.resolve();
            await Promise.resolve();

            expect(backendManager.backendUrl).toBe(testUrl);
        });

        test('должен обрабатывать неизвестные типы сообщений', () => {
            messageHandlerManager._handleMessage(
                { type: 'unknownType' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: expect.stringContaining('Unknown message type')
                })
            );
        });

        test('должен обрабатывать ошибки при обработке сообщений', () => {
            // Заставляем метод выбросить ошибку
            jest.spyOn(statisticsManager, 'getStatistics').mockImplementation(() => {
                throw new Error('Test error');
            });

            messageHandlerManager._handleMessage(
                { type: 'getStatus' },
                {},
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Test error'
                })
            );
        });
    });

    describe('removeListener', () => {
        test('должен удалять слушатель сообщений', () => {
            messageHandlerManager.init();
            expect(messageHandlerManager.messageListener).toBeDefined();

            messageHandlerManager.removeListener();

            expect(global.chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
            expect(messageHandlerManager.messageListener).toBeNull();
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            messageHandlerManager.init();
            messageHandlerManager.performanceMetrics.set('test', 100);

            messageHandlerManager.destroy();

            expect(messageHandlerManager.messageListener).toBeNull();
            expect(messageHandlerManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(messageHandlerManager.getState).toBeDefined();
            expect(messageHandlerManager.updateState).toBeDefined();
            expect(messageHandlerManager.destroy).toBeDefined();
        });
    });

    describe('Константы MESSAGE_TYPES', () => {
        test('должен иметь MESSAGE_TYPES', () => {
            expect(MessageHandlerManager.MESSAGE_TYPES).toBeDefined();
            expect(MessageHandlerManager.MESSAGE_TYPES.PING).toBe('ping');
            expect(MessageHandlerManager.MESSAGE_TYPES.GET_STATUS).toBe('getStatus');
        });
    });
});
