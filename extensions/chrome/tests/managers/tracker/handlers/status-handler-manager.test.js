/**
 * Тесты для StatusHandlerManager
 */

const StatusHandlerManager = require('../../../../src/managers/tracker/handlers/StatusHandlerManager.js');

describe('StatusHandlerManager', () => {
    let statusHandlerManager;
    let mockStatisticsManager;
    let mockEventQueueManager;
    let sendResponse;

    beforeEach(() => {
        sendResponse = jest.fn();
        
        mockStatisticsManager = {
            getStatistics: jest.fn(() => ({
                isTracking: true,
                eventsTracked: 100,
                domainsVisited: 10
            })),
            getDetailedStatistics: jest.fn(() => ({
                eventsTracked: 100,
                activeEvents: 80,
                inactiveEvents: 20,
                domainsVisited: 10,
                domains: ['example.com', 'test.com'],
                isTracking: true
            }))
        };

        mockEventQueueManager = {
            state: {
                isOnline: true
            },
            getQueueSize: jest.fn(() => 5)
        };
    });

    afterEach(() => {
        if (statusHandlerManager) {
            statusHandlerManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с зависимостями', () => {
            statusHandlerManager = new StatusHandlerManager(
                {
                    statisticsManager: mockStatisticsManager,
                    eventQueueManager: mockEventQueueManager
                },
                { enableLogging: false }
            );

            expect(statusHandlerManager).toBeInstanceOf(StatusHandlerManager);
            expect(statusHandlerManager.statisticsManager).toBe(mockStatisticsManager);
            expect(statusHandlerManager.eventQueueManager).toBe(mockEventQueueManager);
        });

        test('должен выбрасывать ошибку без dependencies', () => {
            expect(() => {
                new StatusHandlerManager(null, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку без statisticsManager', () => {
            expect(() => {
                new StatusHandlerManager(
                    { eventQueueManager: mockEventQueueManager },
                    { enableLogging: false }
                );
            }).toThrow();
        });

        test('должен выбрасывать ошибку без eventQueueManager', () => {
            expect(() => {
                new StatusHandlerManager(
                    { statisticsManager: mockStatisticsManager },
                    { enableLogging: false }
                );
            }).toThrow();
        });
    });

    describe('handlePing', () => {
        beforeEach(() => {
            statusHandlerManager = new StatusHandlerManager(
                {
                    statisticsManager: mockStatisticsManager,
                    eventQueueManager: mockEventQueueManager
                },
                { enableLogging: false }
            );
        });

        test('должен отправлять pong ответ', () => {
            statusHandlerManager.handlePing(sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                message: expect.any(String)
            });
        });
    });

    describe('handleGetStatus', () => {
        beforeEach(() => {
            statusHandlerManager = new StatusHandlerManager(
                {
                    statisticsManager: mockStatisticsManager,
                    eventQueueManager: mockEventQueueManager
                },
                { enableLogging: false }
            );
        });

        test('должен возвращать статус с онлайн статусом', () => {
            mockEventQueueManager.state.isOnline = true;
            statusHandlerManager.handleGetStatus(sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({
                isOnline: true,
                isTracking: true,
                stats: {
                    eventsTracked: 100,
                    domainsVisited: 10,
                    queueSize: 5
                }
            });
        });

        test('должен возвращать статус с офлайн статусом', () => {
            mockEventQueueManager.state.isOnline = false;
            statusHandlerManager.handleGetStatus(sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({
                isOnline: false,
                isTracking: true,
                stats: {
                    eventsTracked: 100,
                    domainsVisited: 10,
                    queueSize: 5
                }
            });
        });
    });

    describe('handleGetTodayStats', () => {
        beforeEach(() => {
            statusHandlerManager = new StatusHandlerManager(
                {
                    statisticsManager: mockStatisticsManager,
                    eventQueueManager: mockEventQueueManager
                },
                { enableLogging: false }
            );
        });

        test('должен возвращать упрощенную статистику', () => {
            statusHandlerManager.handleGetTodayStats(sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({
                events: 100,
                domains: 10,
                queue: 5
            });
        });
    });

    describe('handleGetDetailedStats', () => {
        beforeEach(() => {
            statusHandlerManager = new StatusHandlerManager(
                {
                    statisticsManager: mockStatisticsManager,
                    eventQueueManager: mockEventQueueManager
                },
                { enableLogging: false }
            );
        });

        test('должен возвращать детальную статистику с доменами', () => {
            statusHandlerManager.handleGetDetailedStats(sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({
                eventsTracked: 100,
                activeEvents: 80,
                inactiveEvents: 20,
                domainsVisited: 10,
                domains: ['example.com', 'test.com'],
                queueSize: 5,
                isTracking: true
            });
        });

        test('должен возвращать пустой массив если domains отсутствует', () => {
            mockStatisticsManager.getDetailedStatistics.mockReturnValue({
                eventsTracked: 100,
                activeEvents: 80,
                inactiveEvents: 20,
                domainsVisited: 10,
                isTracking: true
            });

            statusHandlerManager.handleGetDetailedStats(sendResponse);

            expect(sendResponse).toHaveBeenCalledWith({
                eventsTracked: 100,
                activeEvents: 80,
                inactiveEvents: 20,
                domainsVisited: 10,
                domains: [],
                queueSize: 5,
                isTracking: true
            });
        });
    });

    describe('destroy', () => {
        test('должен очищать зависимости', () => {
            statusHandlerManager = new StatusHandlerManager(
                {
                    statisticsManager: mockStatisticsManager,
                    eventQueueManager: mockEventQueueManager
                },
                { enableLogging: false }
            );

            statusHandlerManager.destroy();

            expect(statusHandlerManager.statisticsManager).toBeNull();
            expect(statusHandlerManager.eventQueueManager).toBeNull();
        });
    });
});
