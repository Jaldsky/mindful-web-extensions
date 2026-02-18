/**
 * @jest-environment jsdom
 */

const AuthHandlerManager = require('../../../../src/managers/tracker/handlers/AuthHandlerManager.js');

// Helper function to flush all pending promises (optimized for speed)
async function flushPromises() {
    // Run enough iterations to flush chained microtasks
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

describe('AuthHandlerManager', () => {
    let authHandlerManager;
    let backendManager;
    let storageManager;
    let sendResponse;

    beforeEach(() => {
        sendResponse = jest.fn();

        backendManager = {
            login: jest.fn(),
            register: jest.fn(),
            verify: jest.fn(),
            resendCode: jest.fn(),
            // cookie-only: AuthHandlerManager сначала пробует getSession()/logout()
            getSession: jest.fn().mockResolvedValue({ success: false }),
            logout: jest.fn().mockResolvedValue({ success: true }),
            refreshAccessToken: jest.fn().mockResolvedValue({ success: false }),
            setAuthSession: jest.fn(),
            clearAuthSession: jest.fn(),
            setAuthToken: jest.fn(),
            createAnonymousSession: jest.fn()
        };

        storageManager = {
            saveAuthSession: jest.fn(),
            clearAuthSession: jest.fn(),
            clearAnonymousSession: jest.fn(),
            loadAuthSession: jest.fn(),
            loadAnonymousSession: jest.fn(),
            saveAnonymousSession: jest.fn()
        };

        authHandlerManager = new AuthHandlerManager(
            { backendManager, storageManager },
            { enableLogging: false }
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с правильными зависимостями', () => {
            expect(authHandlerManager.backendManager).toBe(backendManager);
            expect(authHandlerManager.storageManager).toBe(storageManager);
        });

        test('выбрасывает ошибку если backendManager отсутствует', () => {
            expect(() => {
                new AuthHandlerManager({
                    storageManager
                });
            }).toThrow();
        });

        test('выбрасывает ошибку если storageManager отсутствует', () => {
            expect(() => {
                new AuthHandlerManager({
                    backendManager
                });
            }).toThrow();
        });

        test('выбрасывает ошибку если dependencies отсутствуют', () => {
            expect(() => {
                new AuthHandlerManager(null);
            }).toThrow();
        });
    });

    describe('handleLogin', () => {
        test('выполняет логин при валидных данных', async () => {
            backendManager.login.mockResolvedValue({
                success: true,
                accessToken: 'access-token',
                refreshToken: 'refresh-token'
            });
            storageManager.saveAuthSession.mockResolvedValue(true);

            authHandlerManager.handleLogin(
                { data: { username: 'testuser', password: 'password123' } },
                sendResponse
            );

            // Wait for all promises to resolve
            await flushPromises();

            expect(backendManager.login).toHaveBeenCalledWith('testuser', 'password123');
            expect(storageManager.saveAuthSession).toHaveBeenCalledWith('access-token', 'refresh-token');
            expect(backendManager.setAuthSession).toHaveBeenCalledWith('access-token', 'refresh-token');
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('возвращает ошибку если username отсутствует', () => {
            authHandlerManager.handleLogin(
                { data: { password: 'password123' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.login).not.toHaveBeenCalled();
        });

        test('возвращает ошибку если password отсутствует', () => {
            authHandlerManager.handleLogin(
                { data: { username: 'testuser' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.login).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибку логина', async () => {
            backendManager.login.mockRejectedValue(new Error('Login failed'));

            authHandlerManager.handleLogin(
                { data: { username: 'testuser', password: 'password123' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Login failed'
            });
        });

        test('обрабатывает неуспешный результат логина', async () => {
            backendManager.login.mockResolvedValue({
                success: false,
                error: 'Invalid credentials'
            });

            authHandlerManager.handleLogin(
                { data: { username: 'testuser', password: 'password123' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid credentials'
            });
        });

        test('обрабатывает ошибку сохранения сессии', async () => {
            backendManager.login.mockResolvedValue({
                success: true,
                accessToken: 'access-token',
                refreshToken: 'refresh-token'
            });
            storageManager.saveAuthSession.mockResolvedValue(false);

            authHandlerManager.handleLogin(
                { data: { username: 'testuser', password: 'password123' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
        });
    });

    describe('handleRegister', () => {
        test('выполняет регистрацию при валидных данных', async () => {
            backendManager.register.mockResolvedValue({
                success: true,
                userId: 'user-123'
            });

            authHandlerManager.handleRegister(
                { data: { username: 'testuser', email: 'test@example.com', password: 'password123' } },
                sendResponse
            );

            await flushPromises();

            expect(backendManager.register).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123');
            expect(sendResponse).toHaveBeenCalledWith({ success: true, userId: 'user-123' });
        });

        test('возвращает ошибку если username отсутствует', () => {
            authHandlerManager.handleRegister(
                { data: { email: 'test@example.com', password: 'password123' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.register).not.toHaveBeenCalled();
        });

        test('возвращает ошибку если email отсутствует', () => {
            authHandlerManager.handleRegister(
                { data: { username: 'testuser', password: 'password123' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.register).not.toHaveBeenCalled();
        });

        test('возвращает ошибку если password отсутствует', () => {
            authHandlerManager.handleRegister(
                { data: { username: 'testuser', email: 'test@example.com' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.register).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибку регистрации', async () => {
            backendManager.register.mockRejectedValue(new Error('Registration failed'));

            authHandlerManager.handleRegister(
                { data: { username: 'testuser', email: 'test@example.com', password: 'password123' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Registration failed'
            });
        });

        test('обрабатывает неуспешный результат регистрации', async () => {
            backendManager.register.mockResolvedValue({
                success: false,
                error: 'User already exists'
            });

            authHandlerManager.handleRegister(
                { data: { username: 'testuser', email: 'test@example.com', password: 'password123' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'User already exists'
            });
        });
    });

    describe('handleLogout', () => {
        test('выполняет выход и возвращает к анонимной сессии', async () => {
            storageManager.clearAuthSession.mockResolvedValue();
            backendManager.createAnonymousSession.mockResolvedValue({
                success: true,
                anonId: 'anon-id'
            });
            storageManager.saveAnonymousSession.mockResolvedValue();

            authHandlerManager.handleLogout(sendResponse);

            await flushPromises();

            expect(storageManager.clearAuthSession).toHaveBeenCalled();
            expect(backendManager.clearAuthSession).toHaveBeenCalled();
            expect(backendManager.createAnonymousSession).toHaveBeenCalled();
            expect(storageManager.saveAnonymousSession).toHaveBeenCalledWith('anon-id');
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('создает новую анонимную сессию если старая отсутствует', async () => {
            storageManager.clearAuthSession.mockResolvedValue();
            backendManager.createAnonymousSession.mockResolvedValue({
                success: true,
                anonId: 'anon-id'
            });
            storageManager.saveAnonymousSession.mockResolvedValue();

            authHandlerManager.handleLogout(sendResponse);

            await flushPromises();

            expect(backendManager.createAnonymousSession).toHaveBeenCalled();
            expect(storageManager.saveAnonymousSession).toHaveBeenCalledWith('anon-id');
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('обрабатывает ошибку создания анонимной сессии', async () => {
            storageManager.clearAuthSession.mockResolvedValue();
            storageManager.loadAnonymousSession.mockResolvedValue({});
            backendManager.createAnonymousSession.mockResolvedValue({
                success: false,
                error: 'Failed to create session'
            });

            authHandlerManager.handleLogout(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Failed to create session'
            });
        });

        test('обрабатывает ошибку при выходе', async () => {
            storageManager.clearAuthSession.mockRejectedValue(new Error('Logout failed'));

            authHandlerManager.handleLogout(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Logout failed'
            });
        });
    });

    describe('handleVerify', () => {
        test('выполняет верификацию при валидных данных', async () => {
            backendManager.verify.mockResolvedValue({
                success: true
            });

            authHandlerManager.handleVerify(
                { data: { email: 'test@example.com', code: '123456' } },
                sendResponse
            );

            await flushPromises();

            expect(backendManager.verify).toHaveBeenCalledWith('test@example.com', '123456');
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('возвращает ошибку если email отсутствует', () => {
            authHandlerManager.handleVerify(
                { data: { code: '123456' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.verify).not.toHaveBeenCalled();
        });

        test('возвращает ошибку если code отсутствует', () => {
            authHandlerManager.handleVerify(
                { data: { email: 'test@example.com' } },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.verify).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибку верификации', async () => {
            backendManager.verify.mockRejectedValue(new Error('Verification failed'));

            authHandlerManager.handleVerify(
                { data: { email: 'test@example.com', code: '123456' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Verification failed'
            });
        });

        test('обрабатывает неуспешный результат верификации', async () => {
            backendManager.verify.mockResolvedValue({
                success: false,
                error: 'Invalid code'
            });

            authHandlerManager.handleVerify(
                { data: { email: 'test@example.com', code: '123456' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Invalid code'
            });
        });
    });

    describe('handleResendCode', () => {
        test('выполняет повторную отправку кода при валидном email', async () => {
            backendManager.resendCode.mockResolvedValue({
                success: true
            });

            authHandlerManager.handleResendCode(
                { data: { email: 'test@example.com' } },
                sendResponse
            );

            await flushPromises();

            expect(backendManager.resendCode).toHaveBeenCalledWith('test@example.com');
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('возвращает ошибку если email отсутствует', () => {
            authHandlerManager.handleResendCode(
                { data: {} },
                sendResponse
            );

            expect(sendResponse).toHaveBeenCalledWith(
                expect.objectContaining({ success: false })
            );
            expect(backendManager.resendCode).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибку повторной отправки', async () => {
            backendManager.resendCode.mockRejectedValue(new Error('Resend failed'));

            authHandlerManager.handleResendCode(
                { data: { email: 'test@example.com' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Resend failed'
            });
        });

        test('обрабатывает неуспешный результат повторной отправки', async () => {
            backendManager.resendCode.mockResolvedValue({
                success: false,
                error: 'Too many requests'
            });

            authHandlerManager.handleResendCode(
                { data: { email: 'test@example.com' } },
                sendResponse
            );

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Too many requests'
            });
        });
    });

    describe('_decodeJWT', () => {
        test('декодирует валидный JWT токен', () => {
            // Создаем валидный JWT токен (header.payload.signature)
            const payload = { username: 'testuser', sub: 'user123' };
            const encodedPayload = btoa(JSON.stringify(payload));
            const token = `header.${encodedPayload}.signature`;

            const result = authHandlerManager._decodeJWT(token);

            expect(result).toEqual(payload);
        });

        test('возвращает null для невалидного токена (не строка)', () => {
            expect(authHandlerManager._decodeJWT(null)).toBeNull();
            expect(authHandlerManager._decodeJWT(undefined)).toBeNull();
            expect(authHandlerManager._decodeJWT(123)).toBeNull();
            expect(authHandlerManager._decodeJWT({})).toBeNull();
        });

        test('возвращает null для токена с неправильным количеством частей', () => {
            expect(authHandlerManager._decodeJWT('invalid')).toBeNull();
            expect(authHandlerManager._decodeJWT('invalid.token')).toBeNull();
            expect(authHandlerManager._decodeJWT('invalid.token.with.too.many.parts')).toBeNull();
        });

        test('обрабатывает base64url символы в токене', () => {
            const payload = { username: 'test-user_123' };
            // Используем base64url кодирование (- вместо +, _ вместо /)
            const jsonStr = JSON.stringify(payload);
            const base64 = btoa(jsonStr);
            const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            const token = `header.${base64url}.signature`;

            const result = authHandlerManager._decodeJWT(token);

            expect(result).toEqual(payload);
        });

        test('возвращает null при ошибке парсинга JSON', () => {
            // Создаем токен с невалидным JSON в payload
            const invalidPayload = btoa('invalid json {');
            const token = `header.${invalidPayload}.signature`;

            const result = authHandlerManager._decodeJWT(token);

            expect(result).toBeNull();
        });
    });

    describe('handleGetAuthStatus', () => {
        test('возвращает статус авторизации когда пользователь авторизован', async () => {
            storageManager.loadAuthSession.mockResolvedValue({
                accessToken: 'access-token',
                refreshToken: 'refresh-token'
            });
            storageManager.loadAnonymousSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true,
                anonId: null,
                username: null
            });
        });

        test('извлекает username из поля username в JWT', async () => {
            const payload = { username: 'testuser' };
            const encodedPayload = btoa(JSON.stringify(payload));
            const token = `header.${encodedPayload}.signature`;

            storageManager.loadAuthSession.mockResolvedValue({
                accessToken: token,
                refreshToken: 'refresh-token'
            });
            storageManager.loadAnonymousSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true,
                anonId: null,
                username: 'testuser'
            });
        });

        test('извлекает username из поля sub в JWT', async () => {
            const payload = { sub: 'user123' };
            const encodedPayload = btoa(JSON.stringify(payload));
            const token = `header.${encodedPayload}.signature`;

            storageManager.loadAuthSession.mockResolvedValue({
                accessToken: token,
                refreshToken: 'refresh-token'
            });
            storageManager.loadAnonymousSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true,
                anonId: null,
                username: 'user123'
            });
        });

        test('извлекает username из поля user_id в JWT', async () => {
            const payload = { user_id: 'userid456' };
            const encodedPayload = btoa(JSON.stringify(payload));
            const token = `header.${encodedPayload}.signature`;

            storageManager.loadAuthSession.mockResolvedValue({
                accessToken: token,
                refreshToken: 'refresh-token'
            });
            storageManager.loadAnonymousSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true,
                anonId: null,
                username: 'userid456'
            });
        });

        test('возвращает anonId когда пользователь не авторизован', async () => {
            storageManager.loadAuthSession.mockResolvedValue(null);
            storageManager.loadAnonymousSession.mockResolvedValue({
                anonId: 'anon-123'
            });

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: false,
                hasRefreshToken: false,
                anonId: 'anon-123',
                username: null
            });
        });

        test('возвращает статус неавторизован когда сессия отсутствует', async () => {
            storageManager.loadAuthSession.mockResolvedValue(null);
            storageManager.loadAnonymousSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: false,
                hasRefreshToken: false,
                anonId: null,
                username: null
            });
        });

        test('возвращает статус неавторизован когда accessToken отсутствует', async () => {
            storageManager.loadAuthSession.mockResolvedValue({
                refreshToken: 'refresh-token'
            });
            storageManager.loadAnonymousSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: false,
                hasRefreshToken: true,
                anonId: null,
                username: null
            });
        });

        test('обрабатывает ошибку загрузки сессии', async () => {
            storageManager.loadAuthSession.mockRejectedValue(new Error('Load failed'));

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Load failed'
            });
        });

        test('использует cookie-сессию authenticated и refreshAccessToken', async () => {
            const payload = { username: 'cookie-user' };
            const token = `header.${btoa(JSON.stringify(payload))}.signature`;
            backendManager.getSession.mockResolvedValue({ success: true, status: 'authenticated' });
            backendManager.refreshAccessToken.mockResolvedValue({
                success: true,
                accessToken: token,
                refreshToken: 'cookie-refresh'
            });
            storageManager.saveAuthSession.mockResolvedValue(true);

            authHandlerManager.handleGetAuthStatus(sendResponse);
            await flushPromises();

            expect(storageManager.saveAuthSession).toHaveBeenCalledWith(token, 'cookie-refresh');
            expect(backendManager.setAuthSession).toHaveBeenCalledWith(token, 'cookie-refresh');
            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true,
                username: 'cookie-user',
                anonId: null
            });
        });

        test('обрабатывает cookie-сессию anonymous и очищает auth', async () => {
            backendManager.getSession.mockResolvedValue({
                success: true,
                status: 'anonymous',
                anonId: 'anon-cookie'
            });

            authHandlerManager.handleGetAuthStatus(sendResponse);
            await flushPromises();

            expect(storageManager.clearAuthSession).toHaveBeenCalled();
            expect(storageManager.clearAnonymousSession).toHaveBeenCalled();
            expect(backendManager.clearAuthSession).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: false,
                hasRefreshToken: false,
                username: null,
                anonId: 'anon-cookie'
            });
        });

        test('fallback: обновляет accessToken через refresh если в storage его нет', async () => {
            const payload = { sub: 'refreshed-user' };
            const token = `header.${btoa(JSON.stringify(payload))}.signature`;
            backendManager.getSession.mockResolvedValue({ success: false });
            storageManager.loadAuthSession.mockResolvedValue({ accessToken: null, refreshToken: null });
            storageManager.loadAnonymousSession.mockResolvedValue(null);
            backendManager.refreshAccessToken.mockResolvedValue({
                success: true,
                accessToken: token,
                refreshToken: 'new-refresh'
            });
            storageManager.saveAuthSession.mockResolvedValue(true);

            authHandlerManager.handleGetAuthStatus(sendResponse);
            await flushPromises();

            expect(storageManager.saveAuthSession).toHaveBeenCalledWith(token, 'new-refresh');
            expect(backendManager.setAuthSession).toHaveBeenCalledWith(token, 'new-refresh');
            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true,
                username: 'refreshed-user',
                anonId: null
            });
        });
    });

    describe('handleClearSession', () => {
        test('успешно очищает storage и отправляет success', async () => {
            storageManager.clearAnonymousSession.mockResolvedValue();
            storageManager.clearAuthSession.mockResolvedValue();
            backendManager.logout.mockResolvedValue({ success: true });

            authHandlerManager.handleClearSession(sendResponse);
            await flushPromises();

            expect(storageManager.clearAnonymousSession).toHaveBeenCalled();
            expect(storageManager.clearAuthSession).toHaveBeenCalled();
            expect(backendManager.clearAuthSession).toHaveBeenCalled();
            expect(backendManager.logout).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('возвращает success даже если backend logout завершился с ошибкой', async () => {
            storageManager.clearAnonymousSession.mockResolvedValue();
            storageManager.clearAuthSession.mockResolvedValue();
            backendManager.logout.mockRejectedValue(new Error('logout cookie failed'));

            authHandlerManager.handleClearSession(sendResponse);
            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('возвращает ошибку если очистка storage упала', async () => {
            storageManager.clearAnonymousSession.mockRejectedValue(new Error('clear failed'));

            authHandlerManager.handleClearSession(sendResponse);
            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'clear failed'
            });
        });
    });
});
