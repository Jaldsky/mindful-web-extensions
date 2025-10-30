/**
 * Тесты для StatusQueue
 */

const StatusQueue = require('../../../../src/managers/options/status/Queue.js');

describe('StatusQueue', () => {
    test('по умолчанию очередь выключена', () => {
        const q = new StatusQueue();
        expect(q.enableQueue).toBe(false);
        expect(q.size()).toBe(0);
    });

    test('enqueue: добавляет элементы когда enableQueue=true', () => {
        const q = new StatusQueue({ enableQueue: true, maxQueueSize: 3 });
        expect(q.enqueue('m1', 'success', 100)).toBe(true);
        expect(q.enqueue('m2', 'error', 0)).toBe(true);
        expect(q.size()).toBe(2);
        expect(q.items[0]).toMatchObject({ message: 'm1', type: 'success', duration: 100 });
    });

    test('enqueue: отказывает при переполнении', () => {
        const q = new StatusQueue({ enableQueue: true, maxQueueSize: 1 });
        expect(q.enqueue('m1', 'success', 100)).toBe(true);
        expect(q.enqueue('m2', 'success', 100)).toBe(false);
        expect(q.size()).toBe(1);
    });

    test('process: обрабатывает элементы последовательно', async () => {
        const q = new StatusQueue({ enableQueue: true });
        q.enqueue('a', 'success', 0);
        q.enqueue('b', 'error', 0);

        const processed = [];
        await q.process(async (item) => {
            processed.push(item.message);
            return true;
        });

        expect(processed).toEqual(['a', 'b']);
        expect(q.size()).toBe(0);
        expect(q.isProcessing).toBe(false);
    });

    test('process: учитывает duration между элементами', async () => {
        jest.useFakeTimers();
        try {
            const q = new StatusQueue({ enableQueue: true });
            q.enqueue('a', 'success', 1000);
            let calls = 0;

            const promise = q.process(async () => {
                calls += 1;
                return true;
            });

            expect(calls).toBe(1);

            await jest.advanceTimersByTimeAsync(1000);
            await promise;
            expect(q.isProcessing).toBe(false);
        } finally {
            jest.useRealTimers();
        }
    });

    test('process: устойчив к ошибкам обработчика', async () => {
        const q = new StatusQueue({ enableQueue: true });
        q.enqueue('a', 'success', 0);
        await q.process(async () => { throw new Error('boom'); });
        expect(q.isProcessing).toBe(false);
    });

    test('clear: очищает очередь и возвращает количество', () => {
        const q = new StatusQueue({ enableQueue: true });
        q.enqueue('a', 'success', 0);
        q.enqueue('b', 'success', 0);
        const count = q.clear();
        expect(count).toBe(2);
        expect(q.size()).toBe(0);
    });
});
