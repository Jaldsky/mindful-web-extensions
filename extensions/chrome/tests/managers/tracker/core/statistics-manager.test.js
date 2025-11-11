/**
 * Тесты для StatisticsManager
 */

const StatisticsManager = require('../../../../src/managers/tracker/core/StatisticsManager.js');

describe('StatisticsManager', () => {
    let statisticsManager;

    beforeEach(() => {
        statisticsManager = new StatisticsManager({ enableLogging: false });
    });

    afterEach(() => {
        if (statisticsManager) {
            statisticsManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(statisticsManager).toBeInstanceOf(StatisticsManager);
        });

        test('должен иметь начальные значения', () => {
            expect(statisticsManager.eventsTracked).toBe(0);
            expect(statisticsManager.activeEvents).toBe(0);
            expect(statisticsManager.inactiveEvents).toBe(0);
            expect(statisticsManager.isTracking).toBe(true);
            expect(statisticsManager.domainsVisited).toBeInstanceOf(Set);
            expect(statisticsManager.domainsVisited.size).toBe(0);
        });

        test('должен иметь performanceMetrics Map', () => {
            expect(statisticsManager.performanceMetrics).toBeInstanceOf(Map);
        });
    });

    describe('addEvent', () => {
        test('должен добавлять событие active', () => {
            statisticsManager.addEvent('active', 'test.com');

            expect(statisticsManager.eventsTracked).toBe(1);
            expect(statisticsManager.activeEvents).toBe(1);
            expect(statisticsManager.inactiveEvents).toBe(0);
            expect(statisticsManager.domainsVisited.has('test.com')).toBe(true);
        });

        test('должен добавлять событие inactive', () => {
            statisticsManager.addEvent('inactive', 'example.com');

            expect(statisticsManager.eventsTracked).toBe(1);
            expect(statisticsManager.activeEvents).toBe(0);
            expect(statisticsManager.inactiveEvents).toBe(1);
            expect(statisticsManager.domainsVisited.has('example.com')).toBe(true);
        });

        test('должен отслеживать уникальные домены', () => {
            statisticsManager.addEvent('active', 'test.com');
            statisticsManager.addEvent('inactive', 'test.com');
            statisticsManager.addEvent('active', 'test.com');

            expect(statisticsManager.eventsTracked).toBe(3);
            expect(statisticsManager.domainsVisited.size).toBe(1);
        });

        test('должен отслеживать несколько доменов', () => {
            statisticsManager.addEvent('active', 'test1.com');
            statisticsManager.addEvent('active', 'test2.com');
            statisticsManager.addEvent('active', 'test3.com');

            expect(statisticsManager.domainsVisited.size).toBe(3);
        });

        test('должен обновлять состояние', () => {
            const initialState = statisticsManager.getState();
            
            statisticsManager.addEvent('active', 'test.com');
            
            const newState = statisticsManager.getState();
            expect(newState.eventsTracked).toBe(1);
            expect(newState.domainsVisited).toBe(1);
        });
    });

    describe('updateQueueSize', () => {
        test('должен обновлять размер очереди в состоянии', () => {
            statisticsManager.updateQueueSize(5);

            const state = statisticsManager.getState();
            expect(state.queueSize).toBe(5);
        });
    });

    describe('getStatistics', () => {
        test('должен возвращать статистику', () => {
            statisticsManager.addEvent('active', 'test1.com');
            statisticsManager.addEvent('inactive', 'test2.com');
            statisticsManager.updateQueueSize(3);

            const stats = statisticsManager.getStatistics();

            expect(stats).toEqual({
                eventsTracked: 2,
                domainsVisited: 2,
                activeEvents: 1,
                inactiveEvents: 1,
                queueSize: 3,
                isTracking: true
            });
        });
    });

    describe('getDetailedStatistics', () => {
        test('должен возвращать детальную статистику с доменами', () => {
            statisticsManager.addEvent('active', 'test1.com');
            statisticsManager.addEvent('inactive', 'test2.com');

            const stats = statisticsManager.getDetailedStatistics();

            expect(stats).toHaveProperty('domains');
            expect(stats.domains).toEqual(['test1.com', 'test2.com']);
        });
    });

    describe('enableTracking / disableTracking', () => {
        test('должен включать отслеживание', () => {
            statisticsManager.disableTracking();
            expect(statisticsManager.isTrackingEnabled()).toBe(false);

            statisticsManager.enableTracking();
            expect(statisticsManager.isTrackingEnabled()).toBe(true);
        });

        test('должен выключать отслеживание', () => {
            expect(statisticsManager.isTrackingEnabled()).toBe(true);

            statisticsManager.disableTracking();
            expect(statisticsManager.isTrackingEnabled()).toBe(false);
        });
    });

    describe('reset', () => {
        test('должен сбрасывать всю статистику', () => {
            statisticsManager.addEvent('active', 'test1.com');
            statisticsManager.addEvent('inactive', 'test2.com');
            statisticsManager.updateQueueSize(5);

            statisticsManager.reset();

            expect(statisticsManager.eventsTracked).toBe(0);
            expect(statisticsManager.activeEvents).toBe(0);
            expect(statisticsManager.inactiveEvents).toBe(0);
            expect(statisticsManager.domainsVisited.size).toBe(0);

            const state = statisticsManager.getState();
            expect(state.eventsTracked).toBe(0);
            expect(state.queueSize).toBe(0);
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            statisticsManager.addEvent('active', 'test.com');
            statisticsManager.destroy();

            expect(statisticsManager.domainsVisited.size).toBe(0);
            expect(statisticsManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(statisticsManager.getState).toBeDefined();
            expect(statisticsManager.updateState).toBeDefined();
            expect(statisticsManager.destroy).toBeDefined();
        });
    });
});
