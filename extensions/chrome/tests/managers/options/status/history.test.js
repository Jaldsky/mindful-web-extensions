/**
 * Тесты для StatusHistory
 */

const StatusHistory = require('../../../../src/managers/options/status/History.js');

describe('StatusHistory', () => {
    test('по умолчанию включена, размер 0', () => {
        const history = new StatusHistory();
        expect(history.enableHistory).toBe(true);
        expect(history.size()).toBe(0);
        expect(history.get()).toEqual([]);
    });

    test('add: добавляет запись и увеличивает size', () => {
        const history = new StatusHistory({ maxHistorySize: 10 });
        history.add('success', 'ok', 1000);
        const items = history.get();
        expect(history.size()).toBe(1);
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ type: 'success', message: 'ok', duration: 1000 });
        expect(typeof items[0].timestamp).toBe('string');
    });

    test('enableHistory=false: не добавляет записи', () => {
        const history = new StatusHistory({ enableHistory: false });
        history.add('error', 'nope', 500);
        expect(history.size()).toBe(0);
        expect(history.get()).toHaveLength(0);
    });

    test('ограничение maxHistorySize: лишние записи удаляются с начала', () => {
        const history = new StatusHistory({ maxHistorySize: 3 });
        history.add('info', '1', 10);
        history.add('info', '2', 10);
        history.add('info', '3', 10);
        history.add('info', '4', 10);
        const items = history.get();
        expect(items).toHaveLength(3);
        expect(items.map(i => i.message)).toEqual(['2', '3', '4']);
    });

    test('get: фильтр по type', () => {
        const history = new StatusHistory();
        history.add('success', 'A', 10);
        history.add('error', 'B', 10);
        history.add('success', 'C', 10);
        const onlySuccess = history.get({ type: 'success' });
        expect(onlySuccess).toHaveLength(2);
        expect(onlySuccess.every(e => e.type === 'success')).toBe(true);
    });

    test('get: ограничение по limit', () => {
        const history = new StatusHistory();
        history.add('info', '1', 10);
        history.add('info', '2', 10);
        history.add('info', '3', 10);
        const limited = history.get({ limit: 2 });
        expect(limited).toHaveLength(2);
        expect(limited.map(i => i.message)).toEqual(['2', '3']);
    });

    test('clear: очищает и возвращает количество удалённых', () => {
        const history = new StatusHistory();
        history.add('info', '1', 10);
        history.add('info', '2', 10);
        const removed = history.clear();
        expect(removed).toBe(2);
        expect(history.size()).toBe(0);
        expect(history.get()).toEqual([]);
    });

    test('устойчивость к ошибкам в get/clear', () => {
        const history = new StatusHistory();
        history.add('info', '1', 10);
        // Ломаем внутренний массив
        history.history = null;
        expect(history.get()).toEqual([]);
        expect(history.clear()).toBe(0);
    });
});
