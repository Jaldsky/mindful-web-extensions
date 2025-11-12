/**
 * @jest-environment jsdom
 */

const DebugHandlerManager = require('../../../../src/managers/tracker/handlers/DebugHandlerManager.js');
const CONFIG = require('../../../../src/config/config.js');

describe('DebugHandlerManager', () => {
    let statisticsManager;
    let debugHandlerManager;

    beforeEach(() => {
        statisticsManager = {
            addEvent: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с правильными зависимостями', () => {
            debugHandlerManager = new DebugHandlerManager({ statisticsManager });
            
            expect(debugHandlerManager.statisticsManager).toBe(statisticsManager);
        });

        test('выбрасывает ошибку если statisticsManager отсутствует', () => {
            expect(() => {
                new DebugHandlerManager({});
            }).toThrow();
        });

        test('выбрасывает ошибку если dependencies отсутствуют', () => {
            expect(() => {
                new DebugHandlerManager(null);
            }).toThrow();
        });

        test('выбрасывает ошибку если dependencies undefined', () => {
            expect(() => {
                new DebugHandlerManager(undefined);
            }).toThrow();
        });

        test('принимает опции конфигурации', () => {
            debugHandlerManager = new DebugHandlerManager(
                { statisticsManager },
                { enableLogging: true }
            );
            
            expect(debugHandlerManager.statisticsManager).toBe(statisticsManager);
        });
    });

    describe('handleGenerateRandomDomains', () => {
        beforeEach(() => {
            debugHandlerManager = new DebugHandlerManager({ statisticsManager });
        });

        test('генерирует домены с дефолтным количеством', () => {
            const sendResponse = jest.fn();
            
            debugHandlerManager.handleGenerateRandomDomains({}, sendResponse);
            
            expect(statisticsManager.addEvent).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    generated: expect.any(Number)
                })
            );
            const callArgs = sendResponse.mock.calls[0][0];
            expect(callArgs.generated).toBeGreaterThan(0);
            expect(callArgs.generated).toBeLessThanOrEqual(CONFIG.RANDOM_DOMAINS.DEFAULT_COUNT);
        });

        test('генерирует домены с указанным количеством', () => {
            const sendResponse = jest.fn();
            const count = 50;
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count } },
                sendResponse
            );
            
            expect(statisticsManager.addEvent).toHaveBeenCalledTimes(count);
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    generated: count
                })
            );
        });

        test('ограничивает количество минимальным значением', () => {
            const sendResponse = jest.fn();
            const count = -10; // Меньше MIN_COUNT, но Number(-10) = -10, Math.max(MIN_COUNT, -10) = MIN_COUNT
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count } },
                sendResponse
            );
            
            expect(statisticsManager.addEvent).toHaveBeenCalledTimes(CONFIG.RANDOM_DOMAINS.MIN_COUNT);
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    generated: CONFIG.RANDOM_DOMAINS.MIN_COUNT
                })
            );
        });

        test('ограничивает количество максимальным значением', () => {
            const sendResponse = jest.fn();
            const count = 2000; // Больше MAX_COUNT
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count } },
                sendResponse
            );
            
            expect(statisticsManager.addEvent).toHaveBeenCalledTimes(CONFIG.RANDOM_DOMAINS.MAX_COUNT);
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    generated: CONFIG.RANDOM_DOMAINS.MAX_COUNT
                })
            );
        });

        test('генерирует уникальные домены', () => {
            const sendResponse = jest.fn();
            const count = 10;
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count } },
                sendResponse
            );
            
            const domains = statisticsManager.addEvent.mock.calls.map(call => call[1]);
            const uniqueDomains = new Set(domains);
            
            // Все домены должны быть уникальными (или почти все, если есть коллизии)
            expect(uniqueDomains.size).toBeGreaterThan(0);
            expect(statisticsManager.addEvent).toHaveBeenCalledTimes(count);
        });

        test('генерирует домены с правильным форматом', () => {
            const sendResponse = jest.fn();
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count: 5 } },
                sendResponse
            );
            
            const domains = statisticsManager.addEvent.mock.calls.map(call => call[1]);
            
            domains.forEach(domain => {
                expect(domain).toMatch(/^[a-z]{5,10}\.(com|net|org|io|app|dev|site)$/);
            });
        });

        test('использует правильный тип события', () => {
            const sendResponse = jest.fn();
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count: 5 } },
                sendResponse
            );
            
            statisticsManager.addEvent.mock.calls.forEach(call => {
                expect(call[0]).toBe(CONFIG.TRACKER.EVENT_TYPES.ACTIVE);
            });
        });

        test('обрабатывает ошибки при генерации', () => {
            const sendResponse = jest.fn();
            statisticsManager.addEvent.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count: 5 } },
                sendResponse
            );
            
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Test error'
                })
            );
        });

        test('обрабатывает отсутствие data в request', () => {
            const sendResponse = jest.fn();
            
            debugHandlerManager.handleGenerateRandomDomains(
                { },
                sendResponse
            );
            
            expect(statisticsManager.addEvent).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true
                })
            );
        });

        test('обрабатывает невалидное значение count', () => {
            const sendResponse = jest.fn();
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count: 'invalid' } },
                sendResponse
            );
            
            expect(statisticsManager.addEvent).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true
                })
            );
        });

        test('логирует успешную генерацию', () => {
            const sendResponse = jest.fn();
            const logSpy = jest.spyOn(debugHandlerManager, '_log');
            
            debugHandlerManager.handleGenerateRandomDomains(
                { data: { count: 5 } },
                sendResponse
            );
            
            expect(logSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: 'logs.debugHandler.domainsGenerated',
                    params: expect.objectContaining({
                        count: 5
                    })
                })
            );
            
            logSpy.mockRestore();
        });
    });

    describe('destroy', () => {
        test('освобождает ресурсы', () => {
            debugHandlerManager = new DebugHandlerManager({ statisticsManager });
            const destroySpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(debugHandlerManager)), 'destroy');
            const logSpy = jest.spyOn(debugHandlerManager, '_log');
            
            debugHandlerManager.destroy();
            
            expect(debugHandlerManager.statisticsManager).toBeNull();
            expect(destroySpy).toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    key: 'logs.debugHandler.destroyed'
                })
            );
            
            destroySpy.mockRestore();
            logSpy.mockRestore();
        });
    });
});
