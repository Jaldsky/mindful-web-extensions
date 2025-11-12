/**
 * Тесты для StatusHistoryManager
 */

const StatusHistoryManager = require('../../../../src/managers/options/status/StatusHistoryManager.js');

describe('StatusHistoryManager', () => {
    let statusHistoryManager;
    let mockLog;
    let mockLogError;
    let mockOnUpdate;

    beforeEach(() => {
        mockLog = jest.fn();
        mockLogError = jest.fn();
        mockOnUpdate = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с настройками по умолчанию', () => {
            statusHistoryManager = new StatusHistoryManager();

            expect(statusHistoryManager.enableHistory).toBe(true);
            expect(statusHistoryManager.maxHistorySize).toBe(50);
            expect(statusHistoryManager.history).toEqual([]);
        });

        test('должен создавать экземпляр с переданными опциями', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                maxHistorySize: 100,
                log: mockLog,
                logError: mockLogError,
                onUpdate: mockOnUpdate
            });

            expect(statusHistoryManager.enableHistory).toBe(true);
            expect(statusHistoryManager.maxHistorySize).toBe(100);
            expect(statusHistoryManager._log).toBe(mockLog);
            expect(statusHistoryManager._logError).toBe(mockLogError);
            expect(statusHistoryManager.onUpdate).toBe(mockOnUpdate);
        });

        test('должен устанавливать enableHistory только если не false', () => {
            statusHistoryManager = new StatusHistoryManager({ enableHistory: false });

            expect(statusHistoryManager.enableHistory).toBe(false);
        });

        test('должен устанавливать enableHistory в true для других значений', () => {
            statusHistoryManager = new StatusHistoryManager({ enableHistory: 'truthy' });

            expect(statusHistoryManager.enableHistory).toBe(true);
        });

        test('должен работать без параметров', () => {
            statusHistoryManager = new StatusHistoryManager();

            expect(statusHistoryManager).toBeInstanceOf(StatusHistoryManager);
        });
    });

    describe('add', () => {
        test('должен возвращать без действий если история отключена', () => {
            statusHistoryManager = new StatusHistoryManager({ enableHistory: false });

            statusHistoryManager.add('success', 'message', 1000);

            expect(statusHistoryManager.history.length).toBe(0);
        });

        test('должен добавлять запись в историю', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                log: mockLog
            });

            statusHistoryManager.add('success', 'message', 1000);

            expect(statusHistoryManager.history.length).toBe(1);
            expect(statusHistoryManager.history[0].type).toBe('success');
            expect(statusHistoryManager.history[0].message).toBe('message');
            expect(statusHistoryManager.history[0].duration).toBe(1000);
            expect(statusHistoryManager.history[0].timestamp).toBeDefined();
        });

        test('должен удалять старые записи при превышении maxHistorySize', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                maxHistorySize: 2,
                log: mockLog
            });

            statusHistoryManager.add('success', 'msg1', 1000);
            statusHistoryManager.add('error', 'msg2', 1000);
            statusHistoryManager.add('warning', 'msg3', 1000);

            expect(statusHistoryManager.history.length).toBe(2);
            expect(statusHistoryManager.history[0].message).toBe('msg2');
            expect(statusHistoryManager.history[1].message).toBe('msg3');
        });

        test('должен вызывать onUpdate при добавлении', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                onUpdate: mockOnUpdate
            });

            statusHistoryManager.add('success', 'message', 1000);

            expect(mockOnUpdate).toHaveBeenCalledWith(1);
        });

        test('не должен вызывать onUpdate если он не установлен', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                onUpdate: null
            });

            statusHistoryManager.add('success', 'message', 1000);

            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при добавлении', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                logError: mockLogError
            });
            statusHistoryManager.history.push = jest.fn(() => {
                throw new Error('Push error');
            });

            statusHistoryManager.add('success', 'message', 1000);

            expect(mockLogError).toHaveBeenCalled();
        });
    });

    describe('get', () => {
        beforeEach(() => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                logError: mockLogError
            });
            statusHistoryManager.add('success', 'msg1', 1000);
            statusHistoryManager.add('error', 'msg2', 1000);
            statusHistoryManager.add('success', 'msg3', 1000);
        });

        test('должен возвращать всю историю без фильтров', () => {
            const history = statusHistoryManager.get();

            expect(history).toHaveLength(3);
        });

        test('должен фильтровать по типу', () => {
            const history = statusHistoryManager.get({ type: 'success' });

            expect(history).toHaveLength(2);
            expect(history.every(e => e.type === 'success')).toBe(true);
        });

        test('должен возвращать пустой массив для несуществующего типа', () => {
            const history = statusHistoryManager.get({ type: 'warning' });

            expect(history).toHaveLength(0);
        });

        test('должен ограничивать количество записей', () => {
            const history = statusHistoryManager.get({ limit: 2 });

            expect(history).toHaveLength(2);
            expect(history[0].message).toBe('msg2');
            expect(history[1].message).toBe('msg3');
        });

        test('должен комбинировать фильтр по типу и лимит', () => {
            const history = statusHistoryManager.get({ type: 'success', limit: 1 });

            expect(history).toHaveLength(1);
            expect(history[0].type).toBe('success');
        });

        test('не должен применять лимит если он не валиден', () => {
            const history1 = statusHistoryManager.get({ limit: 0 });
            const history2 = statusHistoryManager.get({ limit: -1 });
            const history3 = statusHistoryManager.get({ limit: 'not a number' });

            expect(history1).toHaveLength(3);
            expect(history2).toHaveLength(3);
            expect(history3).toHaveLength(3);
        });

        test('должен обрабатывать ошибки', () => {
            statusHistoryManager.history = {
                slice: jest.fn(() => {
                    throw new Error('Get error');
                })
            };

            const history = statusHistoryManager.get();

            expect(history).toEqual([]);
            expect(mockLogError).toHaveBeenCalled();
        });
    });

    describe('clear', () => {
        test('должен очищать историю', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                log: mockLog,
                onUpdate: mockOnUpdate
            });
            statusHistoryManager.add('success', 'msg1', 1000);
            statusHistoryManager.add('error', 'msg2', 1000);

            const count = statusHistoryManager.clear();

            expect(count).toBe(2);
            expect(statusHistoryManager.history.length).toBe(0);
            expect(mockOnUpdate).toHaveBeenCalledWith(0);
        });

        test('должен вызывать onUpdate при очистке', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                onUpdate: mockOnUpdate
            });
            statusHistoryManager.add('success', 'msg', 1000);

            statusHistoryManager.clear();

            expect(mockOnUpdate).toHaveBeenCalledWith(0);
        });

        test('не должен вызывать onUpdate если он не установлен', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                onUpdate: null
            });
            statusHistoryManager.add('success', 'msg', 1000);

            statusHistoryManager.clear();

            expect(mockOnUpdate).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при очистке', () => {
            statusHistoryManager = new StatusHistoryManager({
                enableHistory: true,
                logError: mockLogError
            });
            statusHistoryManager.add('success', 'msg1', 1000);
            statusHistoryManager.add('error', 'msg2', 1000);
            
            // Мокируем присваивание history чтобы вызвать ошибку
            const originalHistory = statusHistoryManager.history;
            Object.defineProperty(statusHistoryManager, 'history', {
                get: () => originalHistory,
                set: () => {
                    throw new Error('Clear error');
                },
                configurable: true
            });

            const count = statusHistoryManager.clear();

            expect(count).toBe(0);
            expect(mockLogError).toHaveBeenCalled();
            
            // Восстанавливаем
            Object.defineProperty(statusHistoryManager, 'history', {
                value: [],
                writable: true,
                configurable: true
            });
        });
    });

    describe('size', () => {
        test('должен возвращать размер истории', () => {
            statusHistoryManager = new StatusHistoryManager({ enableHistory: true });
            statusHistoryManager.add('success', 'msg1', 1000);
            statusHistoryManager.add('error', 'msg2', 1000);

            expect(statusHistoryManager.size()).toBe(2);
        });

        test('должен возвращать 0 для пустой истории', () => {
            statusHistoryManager = new StatusHistoryManager({ enableHistory: true });

            expect(statusHistoryManager.size()).toBe(0);
        });
    });
});
