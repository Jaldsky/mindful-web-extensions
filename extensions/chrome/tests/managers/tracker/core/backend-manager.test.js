/**
 * Тесты для BackendManager
 */

const BackendManager = require('../../../../src/managers/tracker/core/BackendManager.js');
const BaseManager = require('../../../../src/base/BaseManager.js');
const CONFIG = require('../../../../src/config/config.js');

describe('BackendManager', () => {
    let backendManager;
    let fetchMock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock;

        backendManager = new BackendManager({
            authToken: 'test-auth-token',
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
            expect(backendManager.authToken).toBe('test-auth-token');
        });

        test('должен использовать URL по умолчанию если не указан', () => {
            const manager = new BackendManager({ enableLogging: false });
            expect(manager.backendUrl).toBe('http://localhost:8000/api/v1/events/save');
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

    describe('setAuthToken', () => {
        test('должен устанавливать новый authToken', () => {
            backendManager.setAuthToken('new-auth-token');

            expect(backendManager.authToken).toBe('new-auth-token');
            expect(backendManager.getState().authTokenSet).toBe(true);
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
                        'Authorization': 'Bearer test-auth-token',
                        'Accept-Language': expect.stringMatching(/^(en|ru)$/)
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

        test('должен отправлять события без authToken (cookie-only)', async () => {
            backendManager.authToken = null;
            const testEvents = [{ event: 'active', domain: 'test.com', timestamp: '2024-01-01' }];

            fetchMock.mockResolvedValue({
                ok: true,
                status: 204,
                text: async () => ''
            });

            const result = await backendManager.sendEvents(testEvents);

            expect(result.success).toBe(true);
        });

        test('должен обновлять токен и повторять запрос при 401', async () => {
            backendManager.refreshToken = 'refresh-token';
            fetchMock
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    text: async () => 'Expired'
                })
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true, retried: true })
                });

            jest.spyOn(backendManager, 'refreshAccessToken').mockResolvedValue({
                success: true,
                accessToken: 'new-access',
                refreshToken: 'new-refresh'
            });

            const result = await backendManager.sendEvents([{ event: 'active' }]);

            expect(result.success).toBe(true);
            expect(backendManager.refreshAccessToken).toHaveBeenCalledWith('refresh-token');
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(backendManager.authToken).toBe('new-access');
            expect(backendManager.refreshToken).toBe('new-refresh');
        });

        test('не повторяет запрос если refresh неуспешен', async () => {
            backendManager.refreshToken = 'refresh-token';
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Expired'
            });

            jest.spyOn(backendManager, 'refreshAccessToken').mockResolvedValue({
                success: false,
                error: 'refresh failed'
            });

            const result = await backendManager.sendEvents([{ event: 'active' }]);

            expect(result.success).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(1);
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
            backendManager.authToken = null;

            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                text: async () => 'OK'
            });

            const result = await backendManager.checkHealth();

            // Healthcheck должен работать без userId
            expect(result.success).toBe(true);
        });

        test('должен возвращать tooFrequent при частых вызовах', async () => {
            backendManager.lastHealthCheckTime = Date.now();
            const result = await backendManager.checkHealth();
            expect(result.tooFrequent).toBe(true);
            expect(result.success).toBe(false);
        });

        test('должен отрабатывать внешний catch с форматом ошибки', async () => {
            jest.spyOn(global, 'URL').mockImplementationOnce(() => {
                throw new Error('Bad URL');
            });

            const result = await backendManager.checkHealth(true);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Error: Bad URL');
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
            backendManager.authToken = 'test-id';

            backendManager.destroy();

            expect(backendManager.performanceMetrics.size).toBe(0);
            expect(backendManager.backendUrl).toBeNull();
            expect(backendManager.authToken).toBeNull();
        });
    });

    describe('setAuthSession', () => {
        test('должен устанавливать access и refresh токены', () => {
            backendManager.setAuthSession('access-token', 'refresh-token');

            expect(backendManager.authToken).toBe('access-token');
            expect(backendManager.refreshToken).toBe('refresh-token');
        });

        test('должен устанавливать только access токен если refresh не передан', () => {
            backendManager.setAuthSession('access-token');

            expect(backendManager.authToken).toBe('access-token');
            expect(backendManager.refreshToken).toBeNull();
        });
    });

    describe('clearAuthSession', () => {
        test('должен очищать auth и refresh токены', () => {
            backendManager.setAuthSession('access-token', 'refresh-token');
            backendManager.clearAuthSession();

            expect(backendManager.authToken).toBeNull();
            expect(backendManager.refreshToken).toBeNull();
            expect(backendManager.getState().authTokenSet).toBe(false);
        });
    });

    describe('createAnonymousSession', () => {
        test('должен создавать анонимную сессию', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ anon_id: 'test-anon-id' })
            });

            const result = await backendManager.createAnonymousSession();

            expect(result.success).toBe(true);
            expect(result.anonId).toBe('test-anon-id');
            expect(fetchMock).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при создании анонимной сессии', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => 'Server error'
            });

            const result = await backendManager.createAnonymousSession();

            expect(result.success).toBe(false);
            expect(result.error).toContain('HTTP 500');
        });

        test('должен обрабатывать невалидный ответ', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({})
            });

            const result = await backendManager.createAnonymousSession();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('login', () => {
        test('должен успешно логинить пользователя', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ access_token: 'access-token', refresh_token: 'refresh-token' })
            });

            const result = await backendManager.login('username', 'password');

            expect(result.success).toBe(true);
            expect(result.accessToken).toBe('access-token');
            expect(result.refreshToken).toBe('refresh-token');
            expect(fetchMock).toHaveBeenCalled();
            const fetchCall = fetchMock.mock.calls[0];
            expect(fetchCall[1].headers['Accept-Language']).toMatch(/^(en|ru)$/);
        });

        test('должен обрабатывать ошибки логина', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Invalid credentials'
            });

            const result = await backendManager.login('username', 'wrong-password');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('должен обрабатывать невалидный ответ', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({})
            });

            const result = await backendManager.login('username', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('register', () => {
        test('должен успешно регистрировать пользователя', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 201,
                json: async () => ({ user_id: 'user-123' })
            });

            const result = await backendManager.register('username', 'email@test.com', 'password');

            expect(result.success).toBe(true);
            expect(result.userId).toBe('user-123');
            expect(fetchMock).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки регистрации с детальным сообщением', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => JSON.stringify({ detail: 'User already exists' })
            });

            const result = await backendManager.register('username', 'email@test.com', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toContain('[400]');
            expect(result.error).toContain('User already exists');
            expect(result.status).toBe(400);
        });

        test('должен обрабатывать ошибки регистрации без детального сообщения', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => 'Bad Request'
            });

            const result = await backendManager.register('username', 'email@test.com', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toContain('[400]');
        });
    });

    describe('verify', () => {
        test('должен успешно подтверждать email', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({})
            });

            const result = await backendManager.verify('email@test.com', '123456');

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки верификации с детальным сообщением', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => JSON.stringify({ detail: 'Invalid verification code' })
            });

            const result = await backendManager.verify('email@test.com', 'wrong-code');

            expect(result.success).toBe(false);
            expect(result.error).toContain('[400]');
            expect(result.error).toContain('Invalid verification code');
            expect(result.status).toBe(400);
        });

        test('должен обрабатывать ошибки сети', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'));

            const result = await backendManager.verify('email@test.com', '123456');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('resendCode', () => {
        test('должен успешно отправлять код повторно', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({})
            });

            const result = await backendManager.resendCode('email@test.com');

            expect(result.success).toBe(true);
            expect(fetchMock).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки повторной отправки с детальным сообщением', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                text: async () => JSON.stringify({ detail: 'Too many requests. Please wait.' })
            });

            const result = await backendManager.resendCode('email@test.com');

            expect(result.success).toBe(false);
            expect(result.error).toContain('[429]');
            expect(result.error).toContain('Too many requests');
            expect(result.status).toBe(429);
        });

        test('должен обрабатывать ошибки сети', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'));

            const result = await backendManager.resendCode('email@test.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('refreshAccessToken', () => {
        test('должен успешно обновлять access токен', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ access_token: 'new-access-token', refresh_token: 'new-refresh-token' })
            });

            const result = await backendManager.refreshAccessToken('refresh-token');

            expect(result.success).toBe(true);
            expect(result.accessToken).toBe('new-access-token');
            expect(result.refreshToken).toBe('new-refresh-token');
            expect(fetchMock).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки обновления токена', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                text: async () => 'Token expired'
            });

            const result = await backendManager.refreshAccessToken('expired-token');

            expect(result.success).toBe(false);
            expect(result.error).toContain('HTTP 401');
        });

        test('должен обрабатывать невалидный ответ', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({})
            });

            const result = await backendManager.refreshAccessToken('refresh-token');

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
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

    describe('Accept-Language header', () => {
        test('_getAcceptLanguageAsync должен возвращать локаль (en или ru)', async () => {
            const locale = await backendManager._getAcceptLanguageAsync();
            expect(['en', 'ru']).toContain(locale);
        });

        test('_getAcceptLanguageAsync должен брать ru из chrome.storage при наличии', async () => {
            const chromeGet = jest.fn((keys, cb) => cb({ mindful_locale: 'ru' }));
            global.chrome = { storage: { local: { get: chromeGet } } };
            const manager = new BackendManager({ backendUrl: 'http://test.com/api', enableLogging: false });
            const locale = await manager._getAcceptLanguageAsync();
            manager.destroy();
            expect(locale).toBe('ru');
            delete global.chrome;
        });

        test('createAnonymousSession должен отправлять Accept-Language в заголовках', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ anon_id: 'anon-123' })
            });
            await backendManager.createAnonymousSession();
            expect(fetchMock).toHaveBeenCalled();
            expect(fetchMock.mock.calls[0][1].headers['Accept-Language']).toMatch(/^(en|ru)$/);
        });

        test('_getAcceptLanguageAsync должен возвращать DEFAULT_LOCALE при отсутствии данных', async () => {
            const chromeGet = jest.fn((keys, cb) => cb({ mindful_locale: 'de' }));
            global.chrome = { storage: { local: { get: chromeGet } } };
            const originalDetect = BaseManager.detectBrowserLocale;
            BaseManager.detectBrowserLocale = jest.fn(() => 'de');
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('mindful_locale');
                localStorage.removeItem('mindful_locale_cache');
                localStorage.removeItem('mindfulweb_locale');
                localStorage.removeItem('mindfulweb_locale_cache');
                localStorage.removeItem(CONFIG.LOCALE.STORAGE_KEY);
                localStorage.removeItem(CONFIG.LOCALE.CACHE_KEY);
            }

            const manager = new BackendManager({ backendUrl: 'http://test.com/api', enableLogging: false });
            const locale = await manager._getAcceptLanguageAsync();
            manager.destroy();

            expect(locale).toBe(BaseManager.DEFAULT_LOCALE || 'en');

            BaseManager.detectBrowserLocale = originalDetect;
            delete global.chrome;
        });
    });
});
