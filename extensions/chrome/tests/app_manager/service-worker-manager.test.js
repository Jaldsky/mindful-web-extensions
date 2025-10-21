/**
 * Тесты для ServiceWorkerManager класса
 * Тестирует функциональность коммуникации с Service Worker
 */

const ServiceWorkerManager = require('../../src/app_manager/ServiceWorkerManager.js');

describe('ServiceWorkerManager', () => {
    let serviceWorkerManager;
    let mockChromeRuntime;
    let consoleErrorSpy;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        mockChromeRuntime = {
            onMessage: {
                addListener: jest.fn(),
                removeListener: jest.fn()
            },
            sendMessage: jest.fn()
        };

        global.chrome = {
            runtime: mockChromeRuntime
        };

        serviceWorkerManager = new ServiceWorkerManager();
    });

    afterEach(() => {
        if (serviceWorkerManager) {
            serviceWorkerManager.destroy();
        }
        consoleErrorSpy.mockRestore();
        delete global.chrome;
        jest.clearAllMocks();
    });

    describe('static properties', () => {
        test('should have MESSAGE_TYPES constants', () => {
            expect(ServiceWorkerManager.MESSAGE_TYPES).toBeDefined();
            expect(ServiceWorkerManager.MESSAGE_TYPES.PING).toBe('ping');
            expect(ServiceWorkerManager.MESSAGE_TYPES.CHECK_CONNECTION).toBe('checkConnection');
            expect(ServiceWorkerManager.MESSAGE_TYPES.GET_TRACKING_STATUS).toBe('getTrackingStatus');
            expect(ServiceWorkerManager.MESSAGE_TYPES.GET_TODAY_STATS).toBe('getTodayStats');
        });
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(serviceWorkerManager).toBeDefined();
            expect(serviceWorkerManager.messageHandlers).toBeInstanceOf(Map);
            expect(serviceWorkerManager.messageListener).not.toBeNull();
        });

        test('should set default messageTimeout', () => {
            expect(serviceWorkerManager.messageTimeout).toBe(5000);
        });

        test('should accept custom messageTimeout', () => {
            const manager = new ServiceWorkerManager({ messageTimeout: 3000 });
            expect(manager.messageTimeout).toBe(3000);
            manager.destroy();
        });

        test('should setup message listener', () => {
            expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
        });

        test('should initialize empty message handlers', () => {
            expect(serviceWorkerManager.messageHandlers.size).toBe(0);
        });
    });

    describe('_setupMessageListener', () => {
        test('should create message listener', () => {
            expect(serviceWorkerManager.messageListener).toBeDefined();
            expect(typeof serviceWorkerManager.messageListener).toBe('function');
        });

        test('should remove previous listener before adding new one', () => {
            const oldListener = serviceWorkerManager.messageListener;
            
            serviceWorkerManager._setupMessageListener();

            expect(mockChromeRuntime.onMessage.removeListener).toHaveBeenCalledWith(oldListener);
            expect(mockChromeRuntime.onMessage.addListener).toHaveBeenCalled();
        });

        test('should handle invalid messages', () => {
            const listener = serviceWorkerManager.messageListener;
            
            const result1 = listener(null, {}, jest.fn());
            const result2 = listener({ type: 123 }, {}, jest.fn());
            const result3 = listener({}, {}, jest.fn());

            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(result3).toBe(false);
        });

        test('should call registered handler for message type', () => {
            const mockHandler = jest.fn();
            const sendResponse = jest.fn();

            serviceWorkerManager.onMessage('testType', mockHandler);

            const listener = serviceWorkerManager.messageListener;
            listener({ type: 'testType', data: { test: 'data' } }, {}, sendResponse);

            expect(mockHandler).toHaveBeenCalledWith({ test: 'data' }, sendResponse);
        });

        test('should handle async handlers', async () => {
            const mockAsyncHandler = jest.fn().mockResolvedValue({ success: true });
            const sendResponse = jest.fn();

            serviceWorkerManager.onMessage('asyncType', mockAsyncHandler);

            const listener = serviceWorkerManager.messageListener;
            const result = listener({ type: 'asyncType', data: {} }, {}, sendResponse);

            expect(result).toBe(true);

            await Promise.resolve();
            await Promise.resolve();
            
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        }, 1000);

        test('should handle errors in async handlers', async () => {
            const mockAsyncHandler = jest.fn().mockRejectedValue(new Error('Handler error'));
            const sendResponse = jest.fn();

            serviceWorkerManager.onMessage('errorType', mockAsyncHandler);

            const listener = serviceWorkerManager.messageListener;
            listener({ type: 'errorType', data: {} }, {}, sendResponse);

            await Promise.resolve();
            await Promise.resolve();
            
            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Handler error'
            });
        }, 1000);

        test('should throw error if chrome.runtime is not available', () => {
            delete global.chrome;

            expect(() => {
                new ServiceWorkerManager();
            }).toThrow();
        });
    });

    describe('onMessage', () => {
        test('should register message handler', () => {
            const handler = jest.fn();
            
            serviceWorkerManager.onMessage('testMessage', handler);

            expect(serviceWorkerManager.messageHandlers.has('testMessage')).toBe(true);
            expect(serviceWorkerManager.messageHandlers.get('testMessage')).toBe(handler);
        });

        test('should throw error for invalid type', () => {
            const handler = jest.fn();

            expect(() => {
                serviceWorkerManager.onMessage('', handler);
            }).toThrow(TypeError);

            expect(() => {
                serviceWorkerManager.onMessage(null, handler);
            }).toThrow(TypeError);

            expect(() => {
                serviceWorkerManager.onMessage(123, handler);
            }).toThrow(TypeError);
        });

        test('should throw error for invalid handler', () => {
            expect(() => {
                serviceWorkerManager.onMessage('test', null);
            }).toThrow(TypeError);

            expect(() => {
                serviceWorkerManager.onMessage('test', 'not a function');
            }).toThrow(TypeError);
        });

        test('should allow multiple handlers for different types', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            serviceWorkerManager.onMessage('type1', handler1);
            serviceWorkerManager.onMessage('type2', handler2);

            expect(serviceWorkerManager.messageHandlers.size).toBe(2);
        });

        test('should overwrite existing handler for same type', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            serviceWorkerManager.onMessage('type1', handler1);
            serviceWorkerManager.onMessage('type1', handler2);

            expect(serviceWorkerManager.messageHandlers.get('type1')).toBe(handler2);
        });
    });

    describe('sendMessage', () => {
        test('should send message to service worker', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({ success: true });

            const result = await serviceWorkerManager.sendMessage('testType', { data: 'test' });

            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'testType',
                data: { data: 'test' }
            });
            expect(result).toEqual({ success: true });
        });

        test('should use default empty data if not provided', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({ success: true });

            await serviceWorkerManager.sendMessage('testType');

            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'testType',
                data: {}
            });
        });

        test('should throw error for invalid type', async () => {
            await expect(
                serviceWorkerManager.sendMessage('')
            ).rejects.toThrow(TypeError);

            await expect(
                serviceWorkerManager.sendMessage(null)
            ).rejects.toThrow(TypeError);
        });

        test('should handle timeout', async () => {
            jest.useFakeTimers();

            mockChromeRuntime.sendMessage.mockImplementation(() => {
                return new Promise(() => {});
            });

            const promise = serviceWorkerManager.sendMessage('testType', {}, 1000);

            jest.advanceTimersByTime(1000);

            await expect(promise).rejects.toThrow('Таймаут');

            jest.useRealTimers();
        });

        test('should use custom timeout if provided', async () => {
            jest.useFakeTimers();

            mockChromeRuntime.sendMessage.mockImplementation(() => {
                return new Promise(() => {});
            });

            const promise = serviceWorkerManager.sendMessage('testType', {}, 2000);

            jest.advanceTimersByTime(1999);
            
            jest.advanceTimersByTime(1);

            await expect(promise).rejects.toThrow();

            jest.useRealTimers();
        });

        test('should handle sendMessage errors', async () => {
            mockChromeRuntime.sendMessage.mockRejectedValue(new Error('Send failed'));

            await expect(
                serviceWorkerManager.sendMessage('testType')
            ).rejects.toThrow('Send failed');
        });
    });

    describe('checkConnection', () => {
        test('should return true when connection check succeeds', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({ success: true });

            const result = await serviceWorkerManager.checkConnection();

            expect(result).toBe(true);
            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'checkConnection',
                data: {}
            });
        });

        test('should return false when connection check fails', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({ success: false });

            const result = await serviceWorkerManager.checkConnection();

            expect(result).toBe(false);
        });

        test('should return false on error', async () => {
            mockChromeRuntime.sendMessage.mockRejectedValue(new Error('Network error'));

            const result = await serviceWorkerManager.checkConnection();

            expect(result).toBe(false);
        });

        test('should return false for null response', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue(null);

            const result = await serviceWorkerManager.checkConnection();

            expect(result).toBe(false);
        });
    });

    describe('getTrackingStatus', () => {
        test('should return tracking status', async () => {
            const expectedStatus = {
                isTracking: true,
                isOnline: true
            };

            mockChromeRuntime.sendMessage.mockResolvedValue(expectedStatus);

            const result = await serviceWorkerManager.getTrackingStatus();

            expect(result).toEqual(expectedStatus);
            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'getTrackingStatus',
                data: {}
            });
        });

        test('should normalize boolean values', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({
                isTracking: 1,
                isOnline: 0
            });

            const result = await serviceWorkerManager.getTrackingStatus();

            expect(result.isTracking).toBe(true);
            expect(result.isOnline).toBe(false);
        });

        test('should return default status on error', async () => {
            mockChromeRuntime.sendMessage.mockRejectedValue(new Error('Failed'));

            const result = await serviceWorkerManager.getTrackingStatus();

            expect(result).toEqual({
                isTracking: false,
                isOnline: false
            });
        });

        test('should return default status for invalid response', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue(null);

            const result = await serviceWorkerManager.getTrackingStatus();

            expect(result).toEqual({
                isTracking: false,
                isOnline: false
            });
        });
    });

    describe('getTodayStats', () => {
        test('should return today stats', async () => {
            const expectedStats = {
                events: 100,
                domains: 5,
                queue: 2
            };

            mockChromeRuntime.sendMessage.mockResolvedValue(expectedStats);

            const result = await serviceWorkerManager.getTodayStats();

            expect(result).toEqual(expectedStats);
            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'getTodayStats',
                data: {}
            });
        });

        test('should normalize numeric values', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({
                events: '100',
                domains: '5',
                queue: null
            });

            const result = await serviceWorkerManager.getTodayStats();

            expect(result.events).toBe(100);
            expect(result.domains).toBe(5);
            expect(result.queue).toBe(0);
        });

        test('should return default stats on error', async () => {
            mockChromeRuntime.sendMessage.mockRejectedValue(new Error('Failed'));

            const result = await serviceWorkerManager.getTodayStats();

            expect(result).toEqual({
                events: 0,
                domains: 0,
                queue: 0
            });
        });

        test('should return default stats for invalid response', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue('invalid');

            const result = await serviceWorkerManager.getTodayStats();

            expect(result).toEqual({
                events: 0,
                domains: 0,
                queue: 0
            });
        });
    });

    describe('ping', () => {
        test('should return true when ping succeeds', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({ success: true });

            const result = await serviceWorkerManager.ping();

            expect(result).toBe(true);
            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'ping',
                data: {}
            });
        });

        test('should return false when ping fails', async () => {
            mockChromeRuntime.sendMessage.mockRejectedValue(new Error('Timeout'));

            const result = await serviceWorkerManager.ping();

            expect(result).toBe(false);
        });

        test('should use 3000ms timeout', async () => {
            jest.useFakeTimers();

            mockChromeRuntime.sendMessage.mockImplementation(() => {
                return new Promise(() => {});
            });

            const promise = serviceWorkerManager.ping();

            jest.advanceTimersByTime(3000);

            await expect(promise).resolves.toBe(false);

            jest.useRealTimers();
        });
    });

    describe('destroy', () => {
        test('should remove message listener', () => {
            const listener = serviceWorkerManager.messageListener;

            serviceWorkerManager.destroy();

            expect(mockChromeRuntime.onMessage.removeListener).toHaveBeenCalledWith(listener);
        });

        test('should set messageListener to null', () => {
            serviceWorkerManager.destroy();

            expect(serviceWorkerManager.messageListener).toBeNull();
        });

        test('should clear message handlers', () => {
            serviceWorkerManager.onMessage('test1', jest.fn());
            serviceWorkerManager.onMessage('test2', jest.fn());

            expect(serviceWorkerManager.messageHandlers.size).toBe(2);

            serviceWorkerManager.destroy();

            expect(serviceWorkerManager.messageHandlers.size).toBe(0);
        });

        test('should not throw errors', () => {
            expect(() => serviceWorkerManager.destroy()).not.toThrow();
        });

        test('should call super.destroy', () => {
            const superDestroySpy = jest.spyOn(
                Object.getPrototypeOf(ServiceWorkerManager.prototype),
                'destroy'
            );

            serviceWorkerManager.destroy();

            expect(superDestroySpy).toHaveBeenCalled();
            superDestroySpy.mockRestore();
        });

        test('should handle errors gracefully', () => {
            mockChromeRuntime.onMessage.removeListener.mockImplementation(() => {
                throw new Error('Remove failed');
            });

            expect(() => serviceWorkerManager.destroy()).not.toThrow();
        });
    });

    describe('inheritance from BaseManager', () => {
        test('should have BaseManager methods', () => {
            expect(typeof serviceWorkerManager.updateState).toBe('function');
            expect(typeof serviceWorkerManager.getState).toBe('function');
            expect(typeof serviceWorkerManager._log).toBe('function');
            expect(typeof serviceWorkerManager._logError).toBe('function');
        });

        test('should have CONSTANTS property', () => {
            expect(serviceWorkerManager.CONSTANTS).toBeDefined();
            expect(serviceWorkerManager.CONSTANTS.PING_TIMEOUT).toBe(5000);
        });

        test('should support custom constants', () => {
            const manager = new ServiceWorkerManager({
                constants: { PING_TIMEOUT: 10000 }
            });

            expect(manager.CONSTANTS.PING_TIMEOUT).toBe(10000);
            manager.destroy();
        });
    });

    describe('error handling', () => {
        test('should handle errors in message listener setup', () => {
            mockChromeRuntime.onMessage.addListener.mockImplementation(() => {
                throw new Error('Setup failed');
            });

            expect(() => {
                new ServiceWorkerManager();
            }).toThrow('Setup failed');
        });

        test('should log errors when handler registration fails', () => {
            serviceWorkerManager.messageHandlers.set = () => {
                throw new Error('Bad handler');
            };

            expect(() => {
                serviceWorkerManager.onMessage('test', jest.fn());
            }).toThrow('Bad handler');
        });
    });

    describe('integration', () => {
        test('should handle complete message flow', async () => {
            const handler = jest.fn((data, sendResponse) => {
                sendResponse({ received: data });
            });

            serviceWorkerManager.onMessage('testFlow', handler);

            const listener = serviceWorkerManager.messageListener;
            const sendResponse = jest.fn();

            listener(
                { type: 'testFlow', data: { test: 'data' } },
                {},
                sendResponse
            );

            expect(handler).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith({
                received: { test: 'data' }
            });
        });

        test('should handle multiple concurrent messages', async () => {
            mockChromeRuntime.sendMessage
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ isTracking: true, isOnline: true })
                .mockResolvedValueOnce({ events: 10, domains: 2, queue: 0 });

            const [connection, status, stats] = await Promise.all([
                serviceWorkerManager.checkConnection(),
                serviceWorkerManager.getTrackingStatus(),
                serviceWorkerManager.getTodayStats()
            ]);

            expect(connection).toBe(true);
            expect(status.isTracking).toBe(true);
            expect(stats.events).toBe(10);
        });

        test('should work after recreation of listener', () => {
            const handler1 = jest.fn();
            
            serviceWorkerManager.onMessage('type1', handler1);
            serviceWorkerManager._setupMessageListener();

            const listener = serviceWorkerManager.messageListener;
            listener({ type: 'type1', data: {} }, {}, jest.fn());

            expect(handler1).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        test('should handle undefined data in sendMessage', async () => {
            mockChromeRuntime.sendMessage.mockResolvedValue({ success: true });

            await serviceWorkerManager.sendMessage('test', undefined);

            expect(mockChromeRuntime.sendMessage).toHaveBeenCalledWith({
                type: 'test',
                data: {}
            });
        });

        test('should handle message without registered handler', () => {
            const listener = serviceWorkerManager.messageListener;
            const result = listener(
                { type: 'unregistered', data: {} },
                {},
                jest.fn()
            );

            expect(result).toBe(false);
        });

        test('should handle race condition in timeout', async () => {
            jest.useFakeTimers();

            let resolveMessage;
            mockChromeRuntime.sendMessage.mockImplementation(() => {
                return new Promise(resolve => {
                    resolveMessage = resolve;
                });
            });

            const promise = serviceWorkerManager.sendMessage('test', {}, 1000);

            jest.advanceTimersByTime(500);
            resolveMessage({ success: true });

            const result = await promise;
            expect(result).toEqual({ success: true });

            jest.useRealTimers();
        });
    });
});
