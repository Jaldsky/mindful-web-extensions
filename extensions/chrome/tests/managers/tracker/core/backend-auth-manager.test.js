/**
 * Тесты для BackendAuthManager
 */

const CONFIG = require('../../../../src/config/config.js');
const BackendAuthManager = require('../../../../src/managers/tracker/core/BackendAuthManager.js');

describe('BackendAuthManager', () => {
    let backend;
    let authManager;

    beforeEach(() => {
        global.fetch = jest.fn();

        backend = {
            backendUrl: 'http://test.com/api/v1/events/save',
            authToken: 'initial-token',
            refreshToken: null,
            state: {},
            updateState: jest.fn((nextState) => {
                backend.state = { ...backend.state, ...nextState };
            }),
            _log: jest.fn(),
            _logError: jest.fn(),
            _getAcceptLanguageAsync: jest.fn().mockResolvedValue('en'),
            _getTranslateFn: jest.fn(() => (key) => {
                if (key === 'logs.backend.unknownError') return 'Unknown error';
                if (key === 'logs.backend.authLoginInvalidResponse') return 'Invalid login response';
                if (key === 'logs.backend.authRefreshInvalidResponse') return 'Invalid refresh response';
                if (key === 'logs.backend.authRegisterInvalidResponse') return 'Invalid register response';
                if (key === 'logs.backend.authSessionInvalidResponse') return 'Invalid session response';
                return key;
            }),
            _executeWithTimingAsync: jest.fn(async (_name, callback) => callback())
        };

        authManager = new BackendAuthManager(backend);
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete global.fetch;
    });

    test('setAuthToken валидирует тип токена', () => {
        expect(() => authManager.setAuthToken(123)).toThrow(TypeError);
    });

    test('setAuthSession устанавливает access/refresh токены', () => {
        authManager.setAuthSession('access-token', 'refresh-token');

        expect(backend.authToken).toBe('access-token');
        expect(backend.refreshToken).toBe('refresh-token');
        expect(backend.updateState).toHaveBeenCalledWith({ authTokenSet: true });
    });

    test('setAuthSession без refresh сохраняет null', () => {
        authManager.setAuthSession('access-token');
        expect(backend.refreshToken).toBeNull();
    });

    test('clearAuthSession очищает токены', () => {
        authManager.clearAuthSession();

        expect(backend.authToken).toBeNull();
        expect(backend.refreshToken).toBeNull();
        expect(backend.updateState).toHaveBeenCalledWith({ authTokenSet: false });
    });

    test('login возвращает access и refresh токены при успехе', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: 'a-token', refresh_token: 'r-token' })
        });

        const result = await authManager.login('user', 'pass');

        expect(result).toEqual({ success: true, accessToken: 'a-token', refreshToken: 'r-token' });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(CONFIG.BACKEND.AUTH_LOGIN_PATH),
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('login возвращает detail из JSON ошибки', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            text: async () => JSON.stringify({ detail: 'Bad credentials' })
        });

        const result = await authManager.login('bad-user', 'bad-pass');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Bad credentials');
    });

    test('login возвращает unknown error когда detail не извлечен', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            text: async () => 'not-json'
        });

        const result = await authManager.login('bad-user', 'bad-pass');

        expect(result).toEqual({ success: false, error: 'Unknown error' });
    });

    test('login обрабатывает ошибку fetch', async () => {
        global.fetch.mockRejectedValue(new Error('network down'));

        const result = await authManager.login('u', 'p');
        expect(result).toEqual({ success: false, error: 'network down' });
    });

    test('login обрабатывает невалидный success payload', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: 'only-access' })
        });

        const result = await authManager.login('u', 'p');
        expect(result).toEqual({ success: false, error: 'Invalid login response' });
    });

    test('refreshAccessToken возвращает обновленные токены', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' })
        });

        const result = await authManager.refreshAccessToken('refresh-token');

        expect(result).toEqual({ success: true, accessToken: 'new-access', refreshToken: 'new-refresh' });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(CONFIG.BACKEND.AUTH_REFRESH_PATH),
            expect.objectContaining({ method: 'POST' })
        );
    });

    test('refreshAccessToken отправляет пустой body без refreshToken', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ access_token: 'new-access' })
        });

        await authManager.refreshAccessToken();

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({ body: undefined })
        );
    });

    test('refreshAccessToken обрабатывает HTTP ошибку', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 401,
            statusText: 'Unauthorized',
            text: async () => 'Expired'
        });

        const result = await authManager.refreshAccessToken('bad-refresh');
        expect(result.success).toBe(false);
        expect(result.error).toContain('HTTP 401');
    });

    test('refreshAccessToken обрабатывает network ошибку', async () => {
        global.fetch.mockRejectedValue(new Error('refresh failed'));
        const result = await authManager.refreshAccessToken('x');
        expect(result).toEqual({ success: false, error: 'refresh failed' });
    });

    test('refreshAccessToken обрабатывает невалидный payload', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({})
        });

        const result = await authManager.refreshAccessToken('x');
        expect(result).toEqual({ success: false, error: 'Invalid refresh response' });
    });

    test('register форматирует ошибку со статусом', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            text: async () => JSON.stringify({ detail: 'User exists' })
        });

        const result = await authManager.register('user', 'user@example.com', 'pass');

        expect(result.success).toBe(false);
        expect(result.error).toBe('[400] User exists');
    });

    test('register успешный кейс возвращает userId', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ user_id: 'u-123' })
        });

        const result = await authManager.register('user', 'mail@test.com', 'pass');
        expect(result).toEqual({ success: true, userId: 'u-123' });
    });

    test('register обрабатывает невалидный success payload', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({})
        });

        const result = await authManager.register('user', 'mail@test.com', 'pass');
        expect(result).toEqual({ success: false, error: 'Invalid register response' });
    });

    test('verify и resendCode возвращают success при 2xx', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true });

        await expect(authManager.verify('mail@test.com', '123456')).resolves.toEqual({ success: true });
        await expect(authManager.resendCode('mail@test.com')).resolves.toEqual({ success: true });
    });

    test('verify форматирует ошибку и включает status', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 422,
            statusText: 'Unprocessable Entity',
            text: async () => JSON.stringify({ detail: 'Invalid code' })
        });

        const result = await authManager.verify('mail@test.com', '111111');
        expect(result.success).toBe(false);
        expect(result.error).toBe('[422] Invalid code');
        expect(result.status).toBe(422);
    });

    test('resendCode обрабатывает network ошибку', async () => {
        global.fetch.mockRejectedValue(new Error('no connection'));
        const result = await authManager.resendCode('mail@test.com');
        expect(result).toEqual({ success: false, error: 'no connection' });
    });

    test('logout возвращает ошибку при неуспешном ответе', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Server Error',
            text: async () => 'failed'
        });

        const result = await authManager.logout();
        expect(result.success).toBe(false);
        expect(result.error).toContain('HTTP 500');
    });

    test('logout обрабатывает исключение fetch', async () => {
        global.fetch.mockRejectedValue(new Error('logout failed'));
        const result = await authManager.logout();
        expect(result).toEqual({ success: false, error: 'logout failed' });
    });

    test('getSession возвращает данные сессии', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ status: 'authenticated', user_id: 'u1', anon_id: null })
        });

        const result = await authManager.getSession();

        expect(result).toEqual({
            success: true,
            status: 'authenticated',
            userId: 'u1',
            anonId: null
        });
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(CONFIG.BACKEND.AUTH_SESSION_PATH),
            expect.objectContaining({ method: 'GET' })
        );
    });

    test('getSession обрабатывает HTTP ошибку', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            text: async () => 'denied'
        });

        const result = await authManager.getSession();
        expect(result.success).toBe(false);
        expect(result.error).toContain('HTTP 403');
    });

    test('getSession обрабатывает невалидный payload', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ user_id: 'u' })
        });

        const result = await authManager.getSession();
        expect(result).toEqual({ success: false, error: 'Invalid session response' });
    });

    test('getSession обрабатывает network исключение', async () => {
        global.fetch.mockRejectedValue(new Error('session crashed'));
        const result = await authManager.getSession();
        expect(result).toEqual({ success: false, error: 'session crashed' });
    });

    test('_extractErrorDetail покрывает массивы и вложенные форматы', () => {
        expect(authManager._extractErrorDetail({ detail: ['first detail'] })).toBe('first detail');
        expect(authManager._extractErrorDetail({ detail: [{ msg: 'nested msg' }] })).toBe('nested msg');
        expect(authManager._extractErrorDetail({ details: [{ message: 'details message' }] })).toBe('details message');
        expect(authManager._extractErrorDetail({ detail: 123 })).toBe('123');
        expect(authManager._extractErrorDetail(null)).toBe('');
    });
});
