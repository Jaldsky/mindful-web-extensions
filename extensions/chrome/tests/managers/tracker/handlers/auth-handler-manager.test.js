/**
 * @jest-environment jsdom
 */

const AuthHandlerManager = require('../../../../src/managers/tracker/handlers/AuthHandlerManager.js');

// Helper function to flush all pending promises (optimized for speed)
async function flushPromises() {
    // Use minimal iterations for faster execution
    for (let i = 0; i < 3; i++) {
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
            setAuthSession: jest.fn(),
            clearAuthSession: jest.fn(),
            setAuthToken: jest.fn(),
            createAnonymousSession: jest.fn()
        };

        storageManager = {
            saveAuthSession: jest.fn(),
            clearAuthSession: jest.fn(),
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
            storageManager.loadAnonymousSession.mockResolvedValue({
                anonToken: 'anon-token'
            });

            authHandlerManager.handleLogout(sendResponse);

            await flushPromises();

            expect(storageManager.clearAuthSession).toHaveBeenCalled();
            expect(backendManager.clearAuthSession).toHaveBeenCalled();
            expect(backendManager.setAuthToken).toHaveBeenCalledWith('anon-token');
            expect(sendResponse).toHaveBeenCalledWith({ success: true });
        });

        test('создает новую анонимную сессию если старая отсутствует', async () => {
            storageManager.clearAuthSession.mockResolvedValue();
            storageManager.loadAnonymousSession.mockResolvedValue({});
            backendManager.createAnonymousSession.mockResolvedValue({
                success: true,
                anonId: 'anon-id',
                anonToken: 'new-anon-token'
            });
            storageManager.saveAnonymousSession.mockResolvedValue();

            authHandlerManager.handleLogout(sendResponse);

            await flushPromises();

            expect(backendManager.createAnonymousSession).toHaveBeenCalled();
            expect(storageManager.saveAnonymousSession).toHaveBeenCalledWith('anon-id', 'new-anon-token');
            expect(backendManager.setAuthToken).toHaveBeenCalledWith('new-anon-token');
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

    describe('handleGetAuthStatus', () => {
        test('возвращает статус авторизации когда пользователь авторизован', async () => {
            storageManager.loadAuthSession.mockResolvedValue({
                accessToken: 'access-token',
                refreshToken: 'refresh-token'
            });

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: true,
                hasRefreshToken: true
            });
        });

        test('возвращает статус неавторизован когда сессия отсутствует', async () => {
            storageManager.loadAuthSession.mockResolvedValue(null);

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: false,
                hasRefreshToken: false
            });
        });

        test('возвращает статус неавторизован когда accessToken отсутствует', async () => {
            storageManager.loadAuthSession.mockResolvedValue({
                refreshToken: 'refresh-token'
            });

            authHandlerManager.handleGetAuthStatus(sendResponse);

            await flushPromises();

            expect(sendResponse).toHaveBeenCalledWith({
                success: true,
                isAuthenticated: false,
                hasRefreshToken: true
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
    });
});
