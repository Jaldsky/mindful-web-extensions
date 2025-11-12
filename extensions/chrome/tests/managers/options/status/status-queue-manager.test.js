/**
 * Тесты для StatusQueueManager
 */

const StatusQueueManager = require('../../../../src/managers/options/status/StatusQueueManager.js');

describe('StatusQueueManager', () => {
    let statusQueueManager;
    let mockLog;
    let mockLogError;
    let mockOnUpdate;

    beforeEach(() => {
        jest.useFakeTimers();
        mockLog = jest.fn();
        mockLogError = jest.fn();
        mockOnUpdate = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с настройками по умолчанию', () => {
            statusQueueManager = new StatusQueueManager();

            expect(statusQueueManager.enableQueue).toBe(false);
            expect(statusQueueManager.maxQueueSize).toBe(5);
            expect(statusQueueManager.items).toEqual([]);
            expect(statusQueueManager.isProcessing).toBe(false);
        });

        test('должен создавать экземпляр с переданными опциями', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                maxQueueSize: 10,
                log: mockLog,
                logError: mockLogError,
                onUpdate: mockOnUpdate
            });

            expect(statusQueueManager.enableQueue).toBe(true);
            expect(statusQueueManager.maxQueueSize).toBe(10);
            expect(statusQueueManager._log).toBe(mockLog);
            expect(statusQueueManager._logError).toBe(mockLogError);
            expect(statusQueueManager.onUpdate).toBe(mockOnUpdate);
        });

        test('должен устанавливать enableQueue только если true', () => {
            statusQueueManager = new StatusQueueManager({ enableQueue: 'truthy' });

            expect(statusQueueManager.enableQueue).toBe(false);
        });

        test('должен работать без параметров', () => {
            statusQueueManager = new StatusQueueManager();

            expect(statusQueueManager).toBeInstanceOf(StatusQueueManager);
        });
    });

    describe('enqueue', () => {
        test('должен возвращать false если очередь отключена', () => {
            statusQueueManager = new StatusQueueManager({ enableQueue: false });

            const result = statusQueueManager.enqueue('message', 'success', 1000);

            expect(result).toBe(false);
            expect(statusQueueManager.items.length).toBe(0);
        });

        test('должен добавлять сообщение в очередь когда очередь включена', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                log: mockLog
            });

            const result = statusQueueManager.enqueue('message', 'success', 1000);

            expect(result).toBe(true);
            expect(statusQueueManager.items.length).toBe(1);
            expect(statusQueueManager.items[0].message).toBe('message');
            expect(statusQueueManager.items[0].type).toBe('success');
            expect(statusQueueManager.items[0].duration).toBe(1000);
        });

        test('должен возвращать false если очередь полна', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                maxQueueSize: 2,
                log: mockLog
            });

            statusQueueManager.enqueue('msg1', 'success', 1000);
            statusQueueManager.enqueue('msg2', 'success', 1000);
            const result = statusQueueManager.enqueue('msg3', 'success', 1000);

            expect(result).toBe(false);
            expect(statusQueueManager.items.length).toBe(2);
        });

        test('должен вызывать onUpdate при добавлении', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                onUpdate: mockOnUpdate
            });

            statusQueueManager.enqueue('message', 'success', 1000);

            expect(mockOnUpdate).toHaveBeenCalledWith(1);
        });

        test('не должен вызывать onUpdate если он не установлен', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                onUpdate: null
            });

            statusQueueManager.enqueue('message', 'success', 1000);

            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при добавлении', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                logError: mockLogError
            });
            statusQueueManager.items.push = jest.fn(() => {
                throw new Error('Push error');
            });

            const result = statusQueueManager.enqueue('message', 'success', 1000);

            expect(result).toBe(false);
            expect(mockLogError).toHaveBeenCalled();
        });
    });

    describe('process', () => {
        let processItemFn;

        beforeEach(() => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                log: mockLog,
                logError: mockLogError,
                onUpdate: mockOnUpdate
            });
            processItemFn = jest.fn().mockResolvedValue(true);
        });

        test('не должен обрабатывать если очередь пуста', async () => {
            await statusQueueManager.process(processItemFn);

            expect(processItemFn).not.toHaveBeenCalled();
        });

        test('не должен обрабатывать если уже обрабатывается', async () => {
            statusQueueManager.isProcessing = true;
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 0 });

            await statusQueueManager.process(processItemFn);

            expect(processItemFn).not.toHaveBeenCalled();
        });

        test('должен обрабатывать все элементы очереди', async () => {
            statusQueueManager.items.push(
                { message: 'msg1', type: 'success', duration: 0 },
                { message: 'msg2', type: 'error', duration: 0 }
            );

            await statusQueueManager.process(processItemFn);

            expect(processItemFn).toHaveBeenCalledTimes(2);
            expect(statusQueueManager.items.length).toBe(0);
            expect(statusQueueManager.isProcessing).toBe(false);
        });

        test('должен обрабатывать элемент с duration > 0', async () => {
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 100 });

            const processPromise = statusQueueManager.process(processItemFn);
            // Ждем выполнения setTimeout
            await jest.advanceTimersByTimeAsync(100);
            await processPromise;

            expect(processItemFn).toHaveBeenCalled();
        });

        test('должен обрабатывать элемент с duration = 0', async () => {
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 0 });

            await statusQueueManager.process(processItemFn);

            expect(processItemFn).toHaveBeenCalled();
        });

        test('должен считать обработанные и неудачные элементы', async () => {
            processItemFn
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false)
                .mockResolvedValueOnce(true);
            
            statusQueueManager.items.push(
                { message: 'msg1', type: 'success', duration: 0 },
                { message: 'msg2', type: 'error', duration: 0 },
                { message: 'msg3', type: 'success', duration: 0 }
            );

            await statusQueueManager.process(processItemFn);

            expect(mockLog).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.status.queueProcessCompleted' }),
                expect.objectContaining({ processed: 2, failed: 1 })
            );
        });

        test('должен вызывать onUpdate при обработке', async () => {
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 0 });

            await statusQueueManager.process(processItemFn);

            expect(mockOnUpdate).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при обработке', async () => {
            processItemFn.mockRejectedValue(new Error('Process error'));
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 0 });

            await statusQueueManager.process(processItemFn);

            expect(mockLogError).toHaveBeenCalled();
            expect(statusQueueManager.isProcessing).toBe(false);
        });

        test('должен пропускать null элементы', async () => {
            statusQueueManager.items.push(null, { message: 'msg', type: 'success', duration: 0 });

            await statusQueueManager.process(processItemFn);

            expect(processItemFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('clear', () => {
        test('должен очищать очередь', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                log: mockLog,
                onUpdate: mockOnUpdate
            });
            statusQueueManager.items.push(
                { message: 'msg1', type: 'success', duration: 0 },
                { message: 'msg2', type: 'error', duration: 0 }
            );

            const count = statusQueueManager.clear();

            expect(count).toBe(2);
            expect(statusQueueManager.items.length).toBe(0);
            expect(mockOnUpdate).toHaveBeenCalledWith(0);
        });

        test('должен вызывать onUpdate при очистке', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                onUpdate: mockOnUpdate
            });
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 0 });

            statusQueueManager.clear();

            expect(mockOnUpdate).toHaveBeenCalledWith(0);
        });

        test('не должен вызывать onUpdate если он не установлен', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                onUpdate: null
            });
            statusQueueManager.items.push({ message: 'msg', type: 'success', duration: 0 });

            statusQueueManager.clear();

            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при очистке', () => {
            statusQueueManager = new StatusQueueManager({
                enableQueue: true,
                logError: mockLogError
            });
            
            // Мокируем присваивание items чтобы вызвать ошибку
            const originalItems = statusQueueManager.items;
            Object.defineProperty(statusQueueManager, 'items', {
                get: () => originalItems,
                set: () => {
                    throw new Error('Clear error');
                },
                configurable: true
            });

            const result = statusQueueManager.clear();

            expect(result).toBe(0);
            expect(mockLogError).toHaveBeenCalled();
            
            // Восстанавливаем
            Object.defineProperty(statusQueueManager, 'items', {
                value: [],
                writable: true,
                configurable: true
            });
        });
    });

    describe('size', () => {
        test('должен возвращать размер очереди', () => {
            statusQueueManager = new StatusQueueManager({ enableQueue: true });
            statusQueueManager.items.push(
                { message: 'msg1', type: 'success', duration: 0 },
                { message: 'msg2', type: 'error', duration: 0 }
            );

            expect(statusQueueManager.size()).toBe(2);
        });

        test('должен возвращать 0 для пустой очереди', () => {
            statusQueueManager = new StatusQueueManager({ enableQueue: true });

            expect(statusQueueManager.size()).toBe(0);
        });

        test('должен обрабатывать ошибки', () => {
            statusQueueManager = new StatusQueueManager({ enableQueue: true });
            statusQueueManager.items = {
                get length() {
                    throw new Error('Size error');
                }
            };

            const result = statusQueueManager.size();

            expect(result).toBe(0);
        });
    });
});
