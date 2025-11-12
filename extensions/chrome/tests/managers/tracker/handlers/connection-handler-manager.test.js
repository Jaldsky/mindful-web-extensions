/**
 * @jest-environment jsdom
 */

const ConnectionHandlerManager = require('../../../../src/managers/tracker/handlers/ConnectionHandlerManager.js');
const CONFIG = require('../../../../src/config/config.js');

describe('ConnectionHandlerManager', () => {
    let backendManager;
    let eventQueueManager;
    let connectionHandlerManager;

    beforeEach(() => {
        backendManager = {
            checkHealth: jest.fn()
        };
        
        eventQueueManager = {
            getQueueSize: jest.fn(() => 0),
            processQueue: jest.fn().mockResolvedValue()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с правильными зависимостями', () => {
            connectionHandlerManager = new ConnectionHandlerManager({
                backendManager,
                eventQueueManager
            });
            
            expect(connectionHandlerManager.backendManager).toBe(backendManager);
            expect(connectionHandlerManager.eventQueueManager).toBe(eventQueueManager);
        });

        test('выбрасывает ошибку если backendManager отсутствует', () => {
            expect(() => {
                new ConnectionHandlerManager({
                    eventQueueManager
                });
            }).toThrow();
        });

        test('выбрасывает ошибку если eventQueueManager отсутствует', () => {
            expect(() => {
                new ConnectionHandlerManager({
                    backendManager
                });
            }).toThrow();
        });

        test('выбрасывает ошибку если dependencies отсутствуют', () => {
            expect(() => {
                new ConnectionHandlerManager(null);
            }).toThrow();
        });

        test('принимает опции конфигурации', () => {
            connectionHandlerManager = new ConnectionHandlerManager(
                { backendManager, eventQueueManager },
                { enableLogging: true }
            );
            
            expect(connectionHandlerManager.backendManager).toBe(backendManager);
        });
    });

    describe('handleTestConnection', () => {
        beforeEach(() => {
            connectionHandlerManager = new ConnectionHandlerManager({
                backendManager,
                eventQueueManager
            });
        });

        describe('CHECK_CONNECTION', () => {
            test('выполняет healthcheck при CHECK_CONNECTION', async () => {
                const sendResponse = jest.fn();
                backendManager.checkHealth.mockResolvedValue({
                    success: true
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.CHECK_CONNECTION
                );
                
                expect(backendManager.checkHealth).toHaveBeenCalledWith(false);
            });

            test('отправляет успешный ответ при успешном healthcheck', async () => {
                const sendResponse = jest.fn();
                backendManager.checkHealth.mockResolvedValue({
                    success: true
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.CHECK_CONNECTION
                );
                
                // Ждем выполнения промиса
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith({
                    success: true,
                    tooFrequent: false,
                    error: null
                });
            });

            test('обрабатывает tooFrequent результат', async () => {
                const sendResponse = jest.fn();
                backendManager.checkHealth.mockResolvedValue({
                    success: false,
                    tooFrequent: true
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.CHECK_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith({
                    success: false,
                    tooFrequent: true,
                    error: null
                });
            });

            test('обрабатывает неуспешный healthcheck', async () => {
                const sendResponse = jest.fn();
                backendManager.checkHealth.mockResolvedValue({
                    success: false,
                    error: 'Connection failed'
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.CHECK_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith({
                    success: false,
                    tooFrequent: false,
                    error: 'Connection failed'
                });
            });

            test('обрабатывает ошибки healthcheck с дополнительными полями', async () => {
                const sendResponse = jest.fn();
                backendManager.checkHealth.mockResolvedValue({
                    success: false,
                    error: 'Error',
                    status: 500,
                    method: 'GET',
                    url: 'https://test.com',
                    errorText: 'Server error',
                    name: 'Error'
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.CHECK_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalled();
            });

            test('обрабатывает исключения при healthcheck', async () => {
                const sendResponse = jest.fn();
                const error = new Error('Network error');
                backendManager.checkHealth.mockRejectedValue(error);
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.CHECK_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith({
                    success: false,
                    tooFrequent: false,
                    error: 'Network error'
                });
            });
        });

        describe('TEST_CONNECTION с пустой очередью', () => {
            test('выполняет healthcheck если очередь пуста', async () => {
                const sendResponse = jest.fn();
                eventQueueManager.getQueueSize.mockReturnValue(0);
                backendManager.checkHealth.mockResolvedValue({
                    success: true
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.TEST_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(backendManager.checkHealth).toHaveBeenCalledWith(false);
                expect(sendResponse).toHaveBeenCalled();
            });

            test('отправляет сообщение о пустой очереди', async () => {
                const sendResponse = jest.fn();
                eventQueueManager.getQueueSize.mockReturnValue(0);
                backendManager.checkHealth.mockResolvedValue({
                    success: true
                });
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.TEST_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith(
                    expect.objectContaining({
                        queueSize: 0
                    })
                );
            });

            test('обрабатывает ошибки при healthcheck с пустой очередью', async () => {
                const sendResponse = jest.fn();
                eventQueueManager.getQueueSize.mockReturnValue(0);
                backendManager.checkHealth.mockRejectedValue(new Error('Test error'));
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.TEST_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith({
                    success: false,
                    tooFrequent: false,
                    error: 'Test error'
                });
            });
        });

        describe('TEST_CONNECTION с событиями в очереди', () => {
            test('обрабатывает очередь если есть события', async () => {
                const sendResponse = jest.fn();
                eventQueueManager.getQueueSize.mockReturnValue(5);
                eventQueueManager.processQueue.mockResolvedValue();
                eventQueueManager.getQueueSize.mockReturnValueOnce(5).mockReturnValueOnce(0);
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.TEST_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(eventQueueManager.processQueue).toHaveBeenCalled();
                expect(sendResponse).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        sentEvents: 5,
                        remainingInQueue: 0
                    })
                );
            });

            test('отправляет информацию о количестве отправленных событий', async () => {
                const sendResponse = jest.fn();
                eventQueueManager.getQueueSize
                    .mockReturnValueOnce(10)
                    .mockReturnValueOnce(3);
                eventQueueManager.processQueue.mockResolvedValue();
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.TEST_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: true,
                        sentEvents: 7,
                        remainingInQueue: 3
                    })
                );
            });

            test('обрабатывает ошибки при обработке очереди', async () => {
                const sendResponse = jest.fn();
                eventQueueManager.getQueueSize.mockReturnValue(5);
                eventQueueManager.processQueue.mockRejectedValue(new Error('Queue error'));
                eventQueueManager.getQueueSize.mockReturnValueOnce(5).mockReturnValueOnce(5);
                
                await connectionHandlerManager.handleTestConnection(
                    sendResponse,
                    CONFIG.MESSAGE_TYPES.TEST_CONNECTION
                );
                
                await Promise.resolve();
                
                expect(sendResponse).toHaveBeenCalledWith({
                    success: false,
                    error: 'Queue error',
                    queueSize: 5
                });
            });
        });
    });

    describe('destroy', () => {
        test('освобождает ресурсы', () => {
            connectionHandlerManager = new ConnectionHandlerManager({
                backendManager,
                eventQueueManager
            });
            const destroySpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(connectionHandlerManager)), 'destroy');
            const logSpy = jest.spyOn(connectionHandlerManager, '_log');
            
            connectionHandlerManager.destroy();
            
            expect(connectionHandlerManager.backendManager).toBeNull();
            expect(connectionHandlerManager.eventQueueManager).toBeNull();
            expect(destroySpy).toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: 'logs.connectionHandler.destroyed'
                })
            );
            
            destroySpy.mockRestore();
            logSpy.mockRestore();
        });
    });
});
