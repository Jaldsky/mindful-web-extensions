/**
 * Тесты для DomainExceptionsManager (tracker/queue)
 */

const DomainExceptionsManager = require('../../../../src/managers/tracker/queue/DomainExceptionsManager.js');

describe('DomainExceptionsManager (tracker/queue)', () => {
    let domainExceptionsManager;

    beforeEach(() => {
        domainExceptionsManager = new DomainExceptionsManager({ enableLogging: false });
    });

    afterEach(() => {
        if (domainExceptionsManager) {
            domainExceptionsManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с пустым Set', () => {
            expect(domainExceptionsManager.domainExceptions).toBeInstanceOf(Set);
            expect(domainExceptionsManager.domainExceptions.size).toBe(0);
        });

        test('должен обновлять состояние с количеством исключений', () => {
            const state = domainExceptionsManager.getState();
            expect(state.domainExceptionsCount).toBe(0);
        });

        test('должен работать без параметров', () => {
            const manager = new DomainExceptionsManager();
            expect(manager.domainExceptions).toBeInstanceOf(Set);
            manager.destroy();
        });

        test('должен работать с пустым объектом options', () => {
            const manager = new DomainExceptionsManager({});
            expect(manager.domainExceptions).toBeInstanceOf(Set);
            manager.destroy();
        });
    });

    describe('isDomainExcluded', () => {
        test('должен возвращать false для пустого домена', () => {
            expect(domainExceptionsManager.isDomainExcluded('')).toBe(false);
            expect(domainExceptionsManager.isDomainExcluded(null)).toBe(false);
            expect(domainExceptionsManager.isDomainExcluded(undefined)).toBe(false);
        });

        test('должен возвращать false для невалидного домена', () => {
            expect(domainExceptionsManager.isDomainExcluded('invalid..domain')).toBe(false);
        });

        test('должен возвращать false когда normalizeDomain возвращает null для невалидного типа', () => {
            expect(domainExceptionsManager.isDomainExcluded(123)).toBe(false);
            expect(domainExceptionsManager.isDomainExcluded({})).toBe(false);
            expect(domainExceptionsManager.isDomainExcluded([])).toBe(false);
        });

        test('должен возвращать false когда normalizeDomain возвращает null для пустой строки после trim', () => {
            expect(domainExceptionsManager.isDomainExcluded('   ')).toBe(false);
        });

        test('должен возвращать false для домена не в списке исключений', () => {
            expect(domainExceptionsManager.isDomainExcluded('example.com')).toBe(false);
        });

        test('должен возвращать true для домена в списке исключений', () => {
            domainExceptionsManager.setDomainExceptions(['example.com']);
            expect(domainExceptionsManager.isDomainExcluded('example.com')).toBe(true);
        });

        test('должен нормализовать домен перед проверкой', () => {
            domainExceptionsManager.setDomainExceptions(['Example.COM']);
            expect(domainExceptionsManager.isDomainExcluded('example.com')).toBe(true);
            expect(domainExceptionsManager.isDomainExcluded('EXAMPLE.COM')).toBe(true);
        });
    });

    describe('setDomainExceptions', () => {
        test('должен устанавливать список исключений', () => {
            const result = domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);

            expect(domainExceptionsManager.domainExceptions.size).toBe(2);
            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('test.com')).toBe(true);
            expect(result.count).toBe(2);
        });

        test('должен обрабатывать null как пустой массив', () => {
            const result = domainExceptionsManager.setDomainExceptions(null);

            expect(domainExceptionsManager.domainExceptions.size).toBe(0);
            expect(result.count).toBe(0);
        });

        test('должен обрабатывать undefined как пустой массив', () => {
            const result = domainExceptionsManager.setDomainExceptions(undefined);

            expect(domainExceptionsManager.domainExceptions.size).toBe(0);
            expect(result.count).toBe(0);
        });

        test('должен нормализовать домены', () => {
            const result = domainExceptionsManager.setDomainExceptions(['Example.COM', 'TEST.com']);

            expect(domainExceptionsManager.domainExceptions.has('example.com')).toBe(true);
            expect(domainExceptionsManager.domainExceptions.has('test.com')).toBe(true);
            expect(result.count).toBe(2);
        });

        test('должен удалять дубликаты', () => {
            const result = domainExceptionsManager.setDomainExceptions(['example.com', 'Example.com', 'example.COM']);

            expect(domainExceptionsManager.domainExceptions.size).toBe(1);
            expect(result.count).toBe(1);
        });

        test('должен обновлять состояние с новым количеством', () => {
            domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);
            const state = domainExceptionsManager.getState();
            expect(state.domainExceptionsCount).toBe(2);
        });
    });

    describe('getDomainExceptions', () => {
        test('должен возвращать пустой массив для пустого списка', () => {
            const exceptions = domainExceptionsManager.getDomainExceptions();
            expect(exceptions).toEqual([]);
        });

        test('должен возвращать массив исключений', () => {
            domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);
            const exceptions = domainExceptionsManager.getDomainExceptions();

            expect(exceptions).toHaveLength(2);
            expect(exceptions).toContain('example.com');
            expect(exceptions).toContain('test.com');
        });
    });

    describe('filterEvents', () => {
        test('должен возвращать все события если нет исключений', () => {
            const events = [
                { event: 'active', domain: 'example.com', timestamp: '2024-01-01T00:00:00Z' },
                { event: 'inactive', domain: 'test.com', timestamp: '2024-01-01T00:00:01Z' }
            ];

            const result = domainExceptionsManager.filterEvents(events);

            expect(result.filteredEvents).toHaveLength(2);
            expect(result.skippedCount).toBe(0);
        });

        test('должен фильтровать события для исключенных доменов', () => {
            domainExceptionsManager.setDomainExceptions(['example.com']);
            const events = [
                { event: 'active', domain: 'example.com', timestamp: '2024-01-01T00:00:00Z' },
                { event: 'inactive', domain: 'test.com', timestamp: '2024-01-01T00:00:01Z' }
            ];

            const result = domainExceptionsManager.filterEvents(events);

            expect(result.filteredEvents).toHaveLength(1);
            expect(result.filteredEvents[0].domain).toBe('test.com');
            expect(result.skippedCount).toBe(1);
        });

        test('должен фильтровать все события если все домены исключены', () => {
            domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);
            const events = [
                { event: 'active', domain: 'example.com', timestamp: '2024-01-01T00:00:00Z' },
                { event: 'inactive', domain: 'test.com', timestamp: '2024-01-01T00:00:01Z' }
            ];

            const result = domainExceptionsManager.filterEvents(events);

            expect(result.filteredEvents).toHaveLength(0);
            expect(result.skippedCount).toBe(2);
        });

        test('должен обрабатывать пустой массив событий', () => {
            const result = domainExceptionsManager.filterEvents([]);

            expect(result.filteredEvents).toHaveLength(0);
            expect(result.skippedCount).toBe(0);
        });

        test('должен нормализовать домены при фильтрации', () => {
            domainExceptionsManager.setDomainExceptions(['Example.COM']);
            const events = [
                { event: 'active', domain: 'example.com', timestamp: '2024-01-01T00:00:00Z' }
            ];

            const result = domainExceptionsManager.filterEvents(events);

            expect(result.filteredEvents).toHaveLength(0);
            expect(result.skippedCount).toBe(1);
        });
    });

    describe('clear', () => {
        test('должен очищать список исключений', () => {
            domainExceptionsManager.setDomainExceptions(['example.com', 'test.com']);
            domainExceptionsManager.clear();

            expect(domainExceptionsManager.domainExceptions.size).toBe(0);
            const state = domainExceptionsManager.getState();
            expect(state.domainExceptionsCount).toBe(0);
        });
    });

    describe('destroy', () => {
        test('должен очищать исключения и вызывать super.destroy', () => {
            domainExceptionsManager.setDomainExceptions(['example.com']);
            const clearSpy = jest.spyOn(domainExceptionsManager.domainExceptions, 'clear');

            domainExceptionsManager.destroy();

            expect(clearSpy).toHaveBeenCalled();
        });
    });
});
