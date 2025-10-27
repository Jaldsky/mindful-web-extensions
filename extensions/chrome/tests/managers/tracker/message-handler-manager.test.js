/**
 * Тесты для MessageHandlerManager
 */

const MessageHandlerManager = require('../../../src/managers/tracker/MessageHandlerManager.js');
const EventQueueManager = require('../../../src/managers/tracker/EventQueueManager.js');
const BackendManager = require('../../../src/managers/tracker/BackendManager.js');
const StatisticsManager = require('../../../src/managers/tracker/StatisticsManager.js');
const StorageManager = require('../../../src/managers/tracker/StorageManager.js');

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

        test('должен обрабатывать checkConnection через healthcheck', () => {
            jest.spyOn(backendManager, 'checkHealth').mockResolvedValue({ success: true });

            messageHandlerManager._handleMessage(
                { type: 'checkConnection' },
                {},
                sendResponse
            );

            expect(backendManager.checkHealth).toHaveBeenCalled();
        });

        test('должен обрабатывать testConnection с пустой очередью', () => {
            jest.spyOn(backendManager, 'checkHealth').mockResolvedValue({ success: true });
            jest.spyOn(eventQueueManager, 'getQueueSize').mockReturnValue(0);

            messageHandlerManager._handleMessage(
                { type: 'testConnection' },
                {},
                sendResponse
            );

            expect(eventQueueManager.getQueueSize).toHaveBeenCalled();
            expect(backendManager.checkHealth).toHaveBeenCalled();
        });

        test('должен обрабатывать testConnection с событиями в очереди', () => {
            jest.spyOn(eventQueueManager, 'getQueueSize').mockReturnValue(5);
            jest.spyOn(eventQueueManager, 'processQueue').mockResolvedValue();

            messageHandlerManager._handleMessage(
                { type: 'testConnection' },
                {},
                sendResponse
            );

            expect(eventQueueManager.getQueueSize).toHaveBeenCalled();
            expect(eventQueueManager.processQueue).toHaveBeenCalled();
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

    describe('Branch Coverage - Дополнительные ветки', () => {
        test('init - должен удалять существующий слушатель перед добавлением нового', () => {
            // Инициализируем первый раз
            messageHandlerManager.init();
            const firstListener = messageHandlerManager.messageListener;
            
            // Инициализируем второй раз
            messageHandlerManager.init();
            
            expect(global.chrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(firstListener);
            expect(messageHandlerManager.messageListener).toBeDefined();
            expect(messageHandlerManager.messageListener).not.toBe(firstListener);
        });

        test('messageListener - должен вызывать _handleMessage и возвращать true', () => {
            messageHandlerManager.init();
            
            jest.spyOn(messageHandlerManager, '_handleMessage');
            const sendResponse = jest.fn();
            
            const result = messageHandlerManager.messageListener(
                { type: 'ping' },
                {},
                sendResponse
            );
            
            expect(messageHandlerManager._handleMessage).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        test('_handleTestConnection - CHECK_CONNECTION с ошибкой healthcheck', async () => {
            const healthCheckError = new Error('Healthcheck failed');
            jest.spyOn(backendManager, 'checkHealth').mockRejectedValue(healthCheckError);
            
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleTestConnection(sendResponse, 'checkConnection');
            
            // Сразу проверяем после вызова без ожидания
            await Promise.resolve();
            
            expect(backendManager.checkHealth).toHaveBeenCalled();
        });

        test('_handleTestConnection - TEST_CONNECTION с пустой очередью', () => {
            jest.spyOn(eventQueueManager, 'getQueueSize').mockReturnValue(0);
            jest.spyOn(backendManager, 'checkHealth').mockResolvedValue({ success: true });
            
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleTestConnection(sendResponse, 'testConnection');
            
            expect(eventQueueManager.getQueueSize).toHaveBeenCalled();
        });

        test('_handleTestConnection - TEST_CONNECTION с событиями в очереди', () => {
            jest.spyOn(eventQueueManager, 'getQueueSize').mockReturnValue(5);
            jest.spyOn(eventQueueManager, 'processQueue').mockResolvedValue();
            
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleTestConnection(sendResponse, 'testConnection');
            
            expect(eventQueueManager.getQueueSize).toHaveBeenCalled();
        });

        test('_handleUpdateBackendUrl - без URL в запросе', () => {
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleUpdateBackendUrl({}, sendResponse);
            
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'URL is required'
                })
            );
        });

        test('_handleUpdateBackendUrl - с URL в request.url', () => {
            jest.spyOn(storageManager, 'saveBackendUrl').mockResolvedValue(true);
            jest.spyOn(backendManager, 'setBackendUrl');
            
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleUpdateBackendUrl(
                { url: 'http://new-backend.com' },
                sendResponse
            );
            
            expect(backendManager.setBackendUrl).toHaveBeenCalledWith('http://new-backend.com');
        });

        test('_handleUpdateBackendUrl - с URL в request.data.url', () => {
            jest.spyOn(storageManager, 'saveBackendUrl').mockResolvedValue(true);
            
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleUpdateBackendUrl(
                { data: { url: 'http://new-backend.com' } },
                sendResponse
            );
            
            expect(storageManager.saveBackendUrl).toHaveBeenCalledWith('http://new-backend.com');
        });

        test('_handleMessage - должен обрабатывать неизвестный тип сообщения', () => {
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleMessage(
                { type: 'unknownType' },
                {},
                sendResponse
            );
            
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Unknown message type: unknownType'
                })
            );
        });

        test('_handleMessage - должен использовать action если type отсутствует', () => {
            const sendResponse = jest.fn();
            
            messageHandlerManager._handleMessage(
                { action: 'ping' },
                {},
                sendResponse
            );
            
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'pong'
                })
            );
        });
    });
});
