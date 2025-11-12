/**
 * @jest-environment jsdom
 */

const PerformanceManager = require('../../src/base/PerformanceManager.js');

describe('PerformanceManager', () => {
    let performanceManager;

    beforeEach(() => {
        performanceManager = new PerformanceManager({
            enablePerformanceTracking: true,
            logError: jest.fn(),
            log: jest.fn()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с настройками', () => {
            expect(performanceManager.enablePerformanceTracking).toBe(true);
            expect(performanceManager.performanceMetrics).toBeInstanceOf(Map);
        });

        test('создает экземпляр без опций', () => {
            const manager = new PerformanceManager();
            expect(manager.enablePerformanceTracking).toBe(true);
        });
    });

    describe('_executeWithTiming', () => {
        test('выполняет операцию и собирает метрики', () => {
            const result = performanceManager._executeWithTiming('testOp', () => 42);
            
            expect(result).toBe(42);
            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.testOp_lastDuration).toBeDefined();
        });

        test('не собирает метрики если tracking выключен', () => {
            const manager = new PerformanceManager({
                enablePerformanceTracking: false
            });
            
            manager._executeWithTiming('testOp', () => 42);
            
            const metrics = manager.getPerformanceMetrics();
            expect(metrics.testOp_lastDuration).toBeUndefined();
        });

        test('пробрасывает ошибки', () => {
            expect(() => {
                performanceManager._executeWithTiming('testOp', () => {
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
        });
    });

    describe('_executeWithTimingAsync', () => {
        test('выполняет асинхронную операцию и собирает метрики', async () => {
            const result = await performanceManager._executeWithTimingAsync('testAsyncOp', async () => 'result');
            
            expect(result).toBe('result');
            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.testAsyncOp_lastDuration).toBeDefined();
        });

        test('не собирает метрики если tracking выключен', async () => {
            const manager = new PerformanceManager({
                enablePerformanceTracking: false
            });
            
            await manager._executeWithTimingAsync('testAsyncOp', async () => 'result');
            
            const metrics = manager.getPerformanceMetrics();
            expect(metrics.testAsyncOp_lastDuration).toBeUndefined();
        });

        test('пробрасывает ошибки', async () => {
            await expect(
                performanceManager._executeWithTimingAsync('testAsyncOp', async () => {
                    throw new Error('Async error');
                })
            ).rejects.toThrow('Async error');
        });
    });

    describe('getPerformanceMetrics', () => {
        test('возвращает объект метрик', () => {
            performanceManager._executeWithTiming('op1', () => 1);
            
            const metrics = performanceManager.getPerformanceMetrics();
            
            expect(typeof metrics).toBe('object');
            expect(metrics.op1_lastDuration).toBeDefined();
        });

        test('обрабатывает ошибки и возвращает пустой объект', () => {
            Object.defineProperty(performanceManager, 'performanceMetrics', {
                get() {
                    throw new Error('Metrics error');
                }
            });
            
            const metrics = performanceManager.getPerformanceMetrics();
            
            expect(metrics).toEqual({});
            expect(performanceManager.logError).toHaveBeenCalled();
        });

        test('не логирует ошибки если logError не определен', () => {
            const manager = new PerformanceManager({
                enablePerformanceTracking: true
            });
            Object.defineProperty(manager, 'performanceMetrics', {
                get() {
                    throw new Error('Metrics error');
                }
            });
            
            const metrics = manager.getPerformanceMetrics();
            
            expect(metrics).toEqual({});
        });
    });

    describe('_clearPerformanceMetrics', () => {
        test('очищает метрики', () => {
            performanceManager._executeWithTiming('testOp', () => 1);
            
            expect(performanceManager.performanceMetrics.size).toBeGreaterThan(0);
            
            performanceManager._clearPerformanceMetrics();
            
            expect(performanceManager.performanceMetrics.size).toBe(0);
        });

        test('логирует очистку если log определен', () => {
            performanceManager._clearPerformanceMetrics();
            
            expect(performanceManager.log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.baseManager.performanceMetricsCleared' })
            );
        });

        test('не логирует если log не определен', () => {
            const manager = new PerformanceManager({
                enablePerformanceTracking: true
            });
            
            expect(() => manager._clearPerformanceMetrics()).not.toThrow();
        });

        test('обрабатывает ошибки при очистке', () => {
            performanceManager.performanceMetrics.clear = jest.fn(() => {
                throw new Error('Clear error');
            });
            
            expect(() => performanceManager._clearPerformanceMetrics()).not.toThrow();
            expect(performanceManager.logError).toHaveBeenCalled();
        });

        test('обрабатывает отсутствие performanceMetrics', () => {
            performanceManager.performanceMetrics = null;
            
            expect(() => performanceManager._clearPerformanceMetrics()).not.toThrow();
        });
    });
});
