/**
 * Тесты для BatchProcessor
 */

const BatchProcessor = require('../../../../src/managers/tracker/queue/BatchProcessor.js');

describe('BatchProcessor', () => {
    let batchProcessor;
    let processQueueFn;
    let getQueueSizeFn;

    beforeEach(() => {
        jest.useFakeTimers();
        processQueueFn = jest.fn();
        getQueueSizeFn = jest.fn(() => 0);
    });

    afterEach(() => {
        if (batchProcessor) {
            batchProcessor.destroy();
        }
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с зависимостями', () => {
            batchProcessor = new BatchProcessor(
                { processQueueFn, getQueueSizeFn },
                { enableLogging: false }
            );

            expect(batchProcessor).toBeInstanceOf(BatchProcessor);
            expect(batchProcessor.processQueueFn).toBe(processQueueFn);
            expect(batchProcessor.getQueueSizeFn).toBe(getQueueSizeFn);
        });

        test('должен выбрасывать ошибку без dependencies', () => {
            expect(() => {
                new BatchProcessor(null, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку без processQueueFn', () => {
            expect(() => {
                new BatchProcessor({ getQueueSizeFn }, { enableLogging: false });
            }).toThrow();
        });

        test('должен выбрасывать ошибку если processQueueFn не функция', () => {
            expect(() => {
                new BatchProcessor({ processQueueFn: 'not a function' }, { enableLogging: false });
            }).toThrow();
        });

        test('должен использовать функцию по умолчанию для getQueueSizeFn если не передана', () => {
            batchProcessor = new BatchProcessor(
                { processQueueFn },
                { enableLogging: false }
            );

            expect(batchProcessor.getQueueSizeFn).toBeDefined();
            expect(typeof batchProcessor.getQueueSizeFn).toBe('function');
            expect(batchProcessor.getQueueSizeFn()).toBe(0);
        });

        test('должен использовать DEFAULT_BATCH_TIMEOUT если batchTimeout не указан', () => {
            batchProcessor = new BatchProcessor(
                { processQueueFn, getQueueSizeFn },
                { enableLogging: false }
            );

            expect(batchProcessor.batchTimeout).toBe(BatchProcessor.DEFAULT_BATCH_TIMEOUT);
        });

        test('должен использовать переданный batchTimeout', () => {
            const customTimeout = 5000;
            batchProcessor = new BatchProcessor(
                { processQueueFn, getQueueSizeFn },
                { batchTimeout: customTimeout, enableLogging: false }
            );

            expect(batchProcessor.batchTimeout).toBe(customTimeout);
        });
    });

    describe('start', () => {
        beforeEach(() => {
            batchProcessor = new BatchProcessor(
                { processQueueFn, getQueueSizeFn },
                { enableLogging: false }
            );
        });

        test('должен запускать периодическую обработку', () => {
            batchProcessor.start();

            expect(batchProcessor.batchInterval).toBeDefined();
            expect(batchProcessor.getState().isRunning).toBe(true);
        });

        test('должен вызывать processQueueFn когда очередь не пуста', () => {
            getQueueSizeFn.mockReturnValue(5);
            batchProcessor.start();

            jest.advanceTimersByTime(batchProcessor.batchTimeout);

            expect(processQueueFn).toHaveBeenCalled();
        });

        test('не должен вызывать processQueueFn когда очередь пуста', () => {
            getQueueSizeFn.mockReturnValue(0);
            batchProcessor.start();

            jest.advanceTimersByTime(batchProcessor.batchTimeout);

            expect(processQueueFn).not.toHaveBeenCalled();
        });

        test('не должен запускать повторно если уже запущен', () => {
            batchProcessor.start();
            const firstInterval = batchProcessor.batchInterval;

            batchProcessor.start();

            expect(batchProcessor.batchInterval).toBe(firstInterval);
        });

        test('должен вызывать processQueueFn периодически', () => {
            getQueueSizeFn.mockReturnValue(3);
            batchProcessor.start();

            jest.advanceTimersByTime(batchProcessor.batchTimeout * 3);

            expect(processQueueFn).toHaveBeenCalledTimes(3);
        });
    });

    describe('stop', () => {
        beforeEach(() => {
            batchProcessor = new BatchProcessor(
                { processQueueFn, getQueueSizeFn },
                { enableLogging: false }
            );
        });

        test('должен останавливать обработку', () => {
            batchProcessor.start();
            const intervalId = batchProcessor.batchInterval;
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            batchProcessor.stop();

            expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
            expect(batchProcessor.batchInterval).toBeNull();
            expect(batchProcessor.getState().isRunning).toBe(false);

            clearIntervalSpy.mockRestore();
        });

        test('не должен делать ничего если не запущен', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            batchProcessor.stop();

            expect(clearIntervalSpy).not.toHaveBeenCalled();

            clearIntervalSpy.mockRestore();
        });
    });

    describe('destroy', () => {
        test('должен останавливать обработку и очищать ресурсы', () => {
            batchProcessor = new BatchProcessor(
                { processQueueFn, getQueueSizeFn },
                { enableLogging: false }
            );
            batchProcessor.start();
            const stopSpy = jest.spyOn(batchProcessor, 'stop');

            batchProcessor.destroy();

            expect(stopSpy).toHaveBeenCalled();
            expect(batchProcessor.processQueueFn).toBeNull();
            expect(batchProcessor.getQueueSizeFn).toBeNull();
        });
    });
});
