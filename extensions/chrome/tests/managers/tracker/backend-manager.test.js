/**
 * Тесты для BackendManager
 */

const BackendManager = require('../../../src/managers/tracker/core/BackendManager.js');

describe('BackendManager', () => {
    let backendManager;
    let fetchMock;

    beforeEach(() => {
        // Мокируем fetch
        fetchMock = jest.fn();
        global.fetch = fetchMock;

        backendManager = new BackendManager({
            userId: 'test-user-id',
            backendUrl: 'http://test.com/api',
            enableLogging: false
        });
    });

    afterEach(() => {
        if (backendManager) {
            backendManager.destroy();
        }
        jest.clearAllMocks();
        delete global.fetch;
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(backendManager).toBeInstanceOf(BackendManager);
        });

        test('должен иметь начальные значения', () => {
            expect(backendManager.backendUrl).toBe('http://test.com/api');
            expect(backendManager.userId).toBe('test-user-id');
        });

        test('должен использовать URL по умолчанию если не указан', () => {
            const manager = new BackendManager({ enableLogging: false });
            expect(manager.backendUrl).toBe('http://localhost:8000/api/v1/events/send');
            manager.destroy();
        });

        test('должен иметь performanceMetrics Map', () => {
            expect(backendManager.performanceMetrics).toBeInstanceOf(Map);
        });
    });

    describe('setBackendUrl', () => {
        test('должен устанавливать новый URL', () => {
            backendManager.setBackendUrl('http://newtest.com/api');

            expect(backendManager.backendUrl).toBe('http://newtest.com/api');
            expect(backendManager.getState().backendUrl).toBe('http://newtest.com/api');
        });
    });

    describe('setUserId', () => {
        test('должен устанавливать новый userId', () => {
            backendManager.setUserId('new-user-id');

            expect(backendManager.userId).toBe('new-user-id');
            expect(backendManager.getState().userId).toBe('new-user-id');
        });
    });

    describe('sendEvents', () => {
        test('должен отправлять события на backend', async () => {
            const testEvents = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];

            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ success: true })
            });

            const result = await backendManager.sendEvents(testEvents);

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalledWith(
                'http://test.com/api',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-User-ID': 'test-user-id'
                    }),
                    body: JSON.stringify({ data: testEvents })
                })
            );
        });

        test('должен возвращать success для пустого массива событий', async () => {
            const result = await backendManager.sendEvents([]);

            expect(result.success).toBe(true);
            expect(fetchMock).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки HTTP', async () => {
            const testEvents = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];

            fetchMock.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => 'Server error'
            });

            const result = await backendManager.sendEvents(testEvents);

            expect(result.success).toBe(false);
            expect(result.error).toContain('HTTP 500');
        });

        test('должен обрабатывать ошибки сети', async () => {
            const testEvents = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];

            fetchMock.mockRejectedValue(new Error('Network error'));

            const result = await backendManager.sendEvents(testEvents);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
        });

        test('должен требовать userId', async () => {
            backendManager.userId = null;
            const testEvents = [{ event: 'active', domain: 'test.com', timestamp: '2024-01-01' }];

            const result = await backendManager.sendEvents(testEvents);

            expect(result.success).toBe(false);
            expect(result.error).toContain('User ID не установлен');
        });
    });

    describe('checkHealth', () => {
        test('должен успешно проверять доступность через healthcheck', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => 'OK'
            });

            const result = await backendManager.checkHealth();

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalled();
            // Проверяем что использован метод GET
            expect(fetchMock.mock.calls[0][1].method).toBe('GET');
        });

        test('должен обрабатывать неуспешные ответы', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable',
                text: async () => 'Service unavailable'
            });

            const result = await backendManager.checkHealth();

            expect(result.success).toBe(false);
            expect(result.error).toContain('HTTP 503');
        });

        test('должен обрабатывать ошибки сети', async () => {
            fetchMock.mockRejectedValue(new Error('Connection refused'));

            const result = await backendManager.checkHealth();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Connection refused');
        });

        test('не требует userId для healthcheck', async () => {
            backendManager.userId = null;

            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => 'OK'
            });

            const result = await backendManager.checkHealth();

            // Healthcheck должен работать без userId
            expect(result.success).toBe(true);
        });
    });

    describe('getBackendUrl', () => {
        test('getBackendUrl должен возвращать текущий URL', () => {
            expect(backendManager.getBackendUrl()).toBe('http://test.com/api');
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            backendManager.performanceMetrics.set('test', 100);
            backendManager.backendUrl = 'http://test.com';
            backendManager.userId = 'test-id';

            backendManager.destroy();

            expect(backendManager.performanceMetrics.size).toBe(0);
            expect(backendManager.backendUrl).toBeNull();
            expect(backendManager.userId).toBeNull();
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(backendManager.getState).toBeDefined();
            expect(backendManager.updateState).toBeDefined();
            expect(backendManager.destroy).toBeDefined();
        });

        test('должен иметь CONSTANTS', () => {
            expect(backendManager.CONSTANTS).toBeDefined();
        });
    });
});
