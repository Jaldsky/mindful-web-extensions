/**
 * Тесты для BaseManager
 */

const BaseManager = require('../../src/base/BaseManager.js');

describe('BaseManager', () => {
    let manager;

    beforeEach(() => {
        manager = new BaseManager({ enableLogging: false });
    });

    afterEach(() => {
        if (manager) {
            manager.destroy();
        }
    });

    describe('Инициализация', () => {
        test('должен создаваться с настройками по умолчанию', () => {
            expect(manager).toBeInstanceOf(BaseManager);
            expect(manager.enableLogging).toBe(false);
            expect(manager.enablePerformanceTracking).toBe(true);
            expect(manager.performanceMetrics).toBeInstanceOf(Map);
        });

        test('должен принимать пользовательские настройки', () => {
            const customManager = new BaseManager({
                enableLogging: true,
                enablePerformanceTracking: false,
                constants: { CUSTOM_TIMEOUT: 5000 }
            });

            expect(customManager.enableLogging).toBe(true);
            expect(customManager.enablePerformanceTracking).toBe(false);
            expect(customManager.CONSTANTS.CUSTOM_TIMEOUT).toBe(5000);

            customManager.destroy();
        });

        test('должен объединять кастомные константы с дефолтными', () => {
            const customManager = new BaseManager({
                constants: { CUSTOM_VALUE: 999 }
            });

            expect(customManager.CONSTANTS.UPDATE_INTERVAL).toBe(20000); // default
            expect(customManager.CONSTANTS.CUSTOM_VALUE).toBe(999); // custom

            customManager.destroy();
        });

        test('должен инициализировать начальное состояние', () => {
            const customManager = new BaseManager({
                initialState: { customField: 'test' }
            });

            expect(customManager.state.customField).toBe('test');
            expect(customManager.state.isOnline).toBe(false); // default

            customManager.destroy();
        });
    });

    describe('Логирование', () => {
        test('_log не должен выводить если logging выключен', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            manager._log('Test message');

            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('_log должен выводить если logging включен', () => {
            const loggingManager = new BaseManager({ enableLogging: true });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            loggingManager._log('Test message', { data: 123 });

            expect(consoleSpy).toHaveBeenCalledWith(
                '[BaseManager] Test message',
                { data: 123 }
            );

            consoleSpy.mockRestore();
            loggingManager.destroy();
        });

        test('_logError должен всегда выводить ошибки', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const error = new Error('Test error');

            manager._logError('Error occurred', error);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[BaseManager] Error occurred',
                error
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Управление состоянием', () => {
        test('updateState должен обновлять состояние', () => {
            manager.updateState({ isOnline: true, customField: 'value' });

            expect(manager.state.isOnline).toBe(true);
            expect(manager.state.customField).toBe('value');
        });

        test('updateState должен объединять новое состояние со старым', () => {
            manager.updateState({ isOnline: true });
            manager.updateState({ isTracking: true });

            expect(manager.state.isOnline).toBe(true);
            expect(manager.state.isTracking).toBe(true);
        });

        test('updateState должен выбрасывать ошибку для невалидного входа', () => {
            expect(() => manager.updateState(null)).toThrow(TypeError);
            expect(() => manager.updateState('string')).toThrow(TypeError);
            expect(() => manager.updateState(123)).toThrow(TypeError);
        });

        test('getState должен возвращать копию состояния', () => {
            manager.updateState({ isOnline: true });
            
            const state = manager.getState();
            state.isOnline = false; // изменяем копию

            expect(manager.state.isOnline).toBe(true); // оригинал не изменен
        });

        test('resetState должен сбрасывать состояние к начальному', () => {
            const customManager = new BaseManager({
                initialState: { customField: 'initial' }
            });

            customManager.updateState({ customField: 'changed' });
            customManager.resetState();

            expect(customManager.state.customField).toBe('initial');

            customManager.destroy();
        });
    });

    describe('Метрики производительности', () => {
        test('_executeWithTiming должен выполнять синхронную операцию', () => {
            const result = manager._executeWithTiming('testOp', () => {
                return 42;
            });

            expect(result).toBe(42);
        });

        test('_executeWithTiming должен собирать метрики', () => {
            manager._executeWithTiming('testOp', () => 'result');

            const metrics = manager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('testOp_lastDuration');
            expect(typeof metrics.testOp_lastDuration).toBe('number');
        });

        test('_executeWithTiming не должен собирать метрики если tracking выключен', () => {
            const noTrackingManager = new BaseManager({ 
                enableLogging: false,
                enablePerformanceTracking: false 
            });

            noTrackingManager._executeWithTiming('testOp', () => 'result');

            const metrics = noTrackingManager.getPerformanceMetrics();
            expect(metrics.testOp_lastDuration).toBeUndefined();

            noTrackingManager.destroy();
        });

        test('_executeWithTiming должен пробрасывать ошибки', () => {
            expect(() => {
                manager._executeWithTiming('testOp', () => {
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
        });

        test('_executeWithTimingAsync должен выполнять асинхронную операцию', async () => {
            const result = await manager._executeWithTimingAsync('testAsyncOp', async () => {
                return 'async result';
            });

            expect(result).toBe('async result');
        });

        test('_executeWithTimingAsync должен собирать метрики', async () => {
            await manager._executeWithTimingAsync('testAsyncOp', async () => {
                return 'result';
            });

            const metrics = manager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('testAsyncOp_lastDuration');
            expect(typeof metrics.testAsyncOp_lastDuration).toBe('number');
        });

        test('_executeWithTimingAsync не должен собирать метрики если tracking выключен', async () => {
            const noTrackingManager = new BaseManager({ 
                enableLogging: false,
                enablePerformanceTracking: false 
            });

            await noTrackingManager._executeWithTimingAsync('testAsyncOp', async () => 'result');

            const metrics = noTrackingManager.getPerformanceMetrics();
            expect(metrics.testAsyncOp_lastDuration).toBeUndefined();

            noTrackingManager.destroy();
        });

        test('_executeWithTimingAsync должен пробрасывать ошибки', async () => {
            await expect(
                manager._executeWithTimingAsync('testAsyncOp', async () => {
                    throw new Error('Async test error');
                })
            ).rejects.toThrow('Async test error');
        });

        test('getPerformanceMetrics должен возвращать объект метрик', () => {
            manager._executeWithTiming('op1', () => 1);
            manager._executeWithTiming('op2', () => 2);

            const metrics = manager.getPerformanceMetrics();

            expect(typeof metrics).toBe('object');
            expect(metrics).toHaveProperty('op1_lastDuration');
            expect(metrics).toHaveProperty('op2_lastDuration');
        });

        test('_clearPerformanceMetrics должен очищать метрики', () => {
            manager._executeWithTiming('testOp', () => 'result');
            
            expect(manager.performanceMetrics.size).toBeGreaterThan(0);

            manager._clearPerformanceMetrics();

            expect(manager.performanceMetrics.size).toBe(0);
        });
    });

    describe('getConstant', () => {
        test('должен возвращать значение константы', () => {
            const value = manager.getConstant('UPDATE_INTERVAL');

            expect(value).toBe(20000);
        });

        test('должен возвращать undefined для несуществующей константы', () => {
            const value = manager.getConstant('NON_EXISTENT');

            expect(value).toBeUndefined();
        });
    });

    describe('destroy', () => {
        test('должен очищать метрики производительности', () => {
            manager._executeWithTiming('testOp', () => 'result');
            
            manager.destroy();

            expect(manager.performanceMetrics.size).toBe(0);
        });

        test('должен сбрасывать состояние', () => {
            manager.updateState({ isOnline: true });
            
            manager.destroy();

            expect(manager.state.isOnline).toBe(false);
        });

        test('не должен выбрасывать ошибку при повторном вызове', () => {
            expect(() => {
                manager.destroy();
                manager.destroy();
            }).not.toThrow();
        });
    });

    describe('Наследование', () => {
        class CustomManager extends BaseManager {
            constructor(options) {
                super(options);
                this.customField = 'custom';
            }

            customMethod() {
                return this._executeWithTiming('customOp', () => {
                    return 'custom result';
                });
            }
        }

        test('дочерний класс должен наследовать функционал', () => {
            const custom = new CustomManager({ enableLogging: false });

            expect(custom).toBeInstanceOf(BaseManager);
            expect(custom).toBeInstanceOf(CustomManager);
            expect(custom.customField).toBe('custom');

            custom.destroy();
        });

        test('дочерний класс должен иметь доступ к метрикам', () => {
            const custom = new CustomManager({ enableLogging: false });

            const result = custom.customMethod();

            expect(result).toBe('custom result');
            expect(custom.getPerformanceMetrics()).toHaveProperty('customOp_lastDuration');

            custom.destroy();
        });

        test('дочерний класс должен правильно логировать с именем класса', () => {
            const custom = new CustomManager({ enableLogging: true });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            custom._log('Test from custom');

            expect(consoleSpy).toHaveBeenCalledWith(
                '[CustomManager] Test from custom',
                ''
            );

            consoleSpy.mockRestore();
            custom.destroy();
        });
    });
});
