const BaseManager = require('../../../base/BaseManager.js');

/**
 * Менеджер для обработки авторизации.
 * Отвечает за логин/логаут и работу с токенами.
 *
 * @class AuthHandlerManager
 * @extends BaseManager
 */
class AuthHandlerManager extends BaseManager {
    /**
     * Создает экземпляр AuthHandlerManager.
     *
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.backendManager - Менеджер backend
     * @param {Object} dependencies.storageManager - Менеджер хранилища
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.backendManager || !dependencies.storageManager) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.authHandler.dependenciesRequired') || 'AuthHandlerManager requires backendManager and storageManager');
        }

        this.backendManager = dependencies.backendManager;
        this.storageManager = dependencies.storageManager;
        /** @type {string|null} redirect_uri для ожидающего OAuth callback (сохраняем между AUTH_OAUTH_START и OAUTH_CALLBACK) */
        this._pendingOAuthRedirectUri = null;
    }

    /**
     * Выполняет логин пользователя.
     *
     * @param {Object} request - Объект запроса
     * @param {Object} [request.data] - Данные запроса
     * @param {string} [request.data.username] - Логин или email
     * @param {string} [request.data.password] - Пароль
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleLogin(request, sendResponse) {
        const username = request?.data?.username;
        const password = request?.data?.password;

        if (!username || !password) {
            const t = this._getTranslateFn();
            sendResponse({ success: false, error: t('logs.authHandler.credentialsRequired') });
            return;
        }

        this.backendManager.login(username, password)
            .then(async result => {
                if (!result?.success) {
                    sendResponse({ success: false, error: result?.error });
                    return;
                }

                const saved = await this.storageManager.saveAuthSession(result.accessToken, result.refreshToken);
                if (!saved) {
                    const t = this._getTranslateFn();
                    sendResponse({ success: false, error: t('logs.authHandler.sessionSaveError') });
                    return;
                }

                this.backendManager.setAuthSession(result.accessToken, result.refreshToken);
                sendResponse({ success: true });
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.loginError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }

    /**
     * Запускает OAuth-авторизацию: открывает вкладку с URL авторизации и сохраняет redirect_uri для callback.
     *
     * @param {Object} request - Объект запроса
     * @param {Object} [request.data] - Данные запроса
     * @param {string} [request.data.redirectUri] - redirect_uri для callback (фронт)
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleOAuthStart(request, sendResponse) {
        const redirectUri = request?.data?.redirectUri;
        if (!redirectUri || typeof redirectUri !== 'string') {
            const t = this._getTranslateFn();
            sendResponse({ success: false, error: t('logs.authHandler.oauthRedirectRequired') || 'redirect_uri required' });
            return;
        }

        try {
            const authorizeUrl = this.backendManager.getOAuthStartUrl('google');
            if (!authorizeUrl) {
                const t = this._getTranslateFn();
                sendResponse({ success: false, error: t('logs.authHandler.oauthUrlError') || 'Failed to get OAuth URL' });
                return;
            }

            this._pendingOAuthRedirectUri = redirectUri;

            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: authorizeUrl });
            }
            sendResponse({ success: true });
        } catch (error) {
            this._pendingOAuthRedirectUri = null;
            this._logError({ key: 'logs.authHandler.oauthStartError' }, error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Обрабатывает OAuth callback: обменивает code/state на токены, сохраняет сессию и закрывает вкладку.
     *
     * @param {Object} request - Объект запроса (от content script)
     * @param {string} [request.code] - Код авторизации
     * @param {string} [request.state] - state
     * @param {Object} sender - Отправитель (Chrome API), для закрытия вкладки sender.tab.id
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleOAuthCallback(request, sender, sendResponse) {
        const code = request?.code;
        const state = request?.state;

        if (!code || !state) {
            sendResponse({ success: false, error: 'code and state required' });
            return;
        }

        const redirectUri = this._pendingOAuthRedirectUri;
        this._pendingOAuthRedirectUri = null;

        if (!redirectUri) {
            sendResponse({ success: false, error: 'No pending OAuth flow' });
            return;
        }

        this.backendManager.oauthLogin('google', code, state, redirectUri)
            .then(async result => {
                if (!result?.success) {
                    sendResponse({ success: false, error: result?.error });
                    return;
                }

                const saved = await this.storageManager.saveAuthSession(result.accessToken, result.refreshToken);
                if (!saved) {
                    const t = this._getTranslateFn();
                    sendResponse({ success: false, error: t('logs.authHandler.sessionSaveError') });
                    return;
                }

                this.backendManager.setAuthSession(result.accessToken, result.refreshToken);

                if (sender?.tab?.id && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.remove) {
                    chrome.tabs.remove(sender.tab.id).catch(() => {});
                }
                sendResponse({ success: true });
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.oauthCallbackError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }

    /**
     * Регистрация пользователя.
     *
     * @param {Object} request - Объект запроса
     * @param {Object} [request.data] - Данные запроса
     * @param {string} [request.data.username] - Логин
     * @param {string} [request.data.email] - Email
     * @param {string} [request.data.password] - Пароль
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleRegister(request, sendResponse) {
        const username = request?.data?.username;
        const email = request?.data?.email;
        const password = request?.data?.password;

        if (!username || !email || !password) {
            const t = this._getTranslateFn();
            sendResponse({ success: false, error: t('logs.authHandler.registrationRequired') });
            return;
        }

        this.backendManager.register(username, email, password)
            .then(result => {
                if (!result?.success) {
                    sendResponse({ success: false, error: result?.error });
                    return;
                }
                sendResponse({ success: true, userId: result.userId });
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.registerError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }

    /**
     * Выполняет выход пользователя и возвращает к анонимной сессии.
     *
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleLogout(sendResponse) {
        this.storageManager.clearAuthSession()
            .then(async () => {
                await this.backendManager.logout().catch(error => {
                    this._logError({ key: 'logs.authHandler.logoutError' }, error);
                });
                this.backendManager.clearAuthSession();
                const anonResult = await this.backendManager.createAnonymousSession();
                if (anonResult.success) {
                    await this.storageManager.saveAnonymousSession(anonResult.anonId);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: anonResult.error });
                }
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.logoutError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }

    /**
     * Подтверждение email по коду.
     *
     * @param {Object} request - Объект запроса
     * @param {Object} [request.data] - Данные запроса
     * @param {string} [request.data.email] - Email
     * @param {string} [request.data.code] - Код подтверждения
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleVerify(request, sendResponse) {
        const email = request?.data?.email;
        const code = request?.data?.code;

        if (!email || !code) {
            const t = this._getTranslateFn();
            sendResponse({ success: false, error: t('logs.authHandler.verifyRequired') });
            return;
        }

        this.backendManager.verify(email, code)
            .then(result => {
                if (!result?.success) {
                    sendResponse({ success: false, error: result?.error });
                    return;
                }
                sendResponse({ success: true });
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.verifyError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }

    /**
     * Повторная отправка кода подтверждения.
     *
     * @param {Object} request - Объект запроса
     * @param {Object} [request.data] - Данные запроса
     * @param {string} [request.data.email] - Email
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleResendCode(request, sendResponse) {
        const email = request?.data?.email;

        if (!email) {
            const t = this._getTranslateFn();
            sendResponse({ success: false, error: t('logs.authHandler.resendCodeRequired') });
            return;
        }

        this.backendManager.resendCode(email)
            .then(result => {
                if (!result?.success) {
                    sendResponse({ success: false, error: result?.error });
                    return;
                }
                sendResponse({ success: true });
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.resendCodeError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }

    /**
     * Декодирует JWT токен и извлекает данные из payload.
     *
     * @private
     * @param {string} token - JWT токен
     * @returns {Object|null} Декодированный payload или null
     */
    _decodeJWT(token) {
        try {
            if (!token || typeof token !== 'string') {
                return null;
            }
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const decoded = atob(padded);
            return JSON.parse(decoded);
        } catch (error) {
            this._logError({ key: 'logs.authHandler.jwtDecodeError' }, error);
            return null;
        }
    }

    /**
     * Возвращает статус авторизации и информацию о пользователе.
     *
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleGetAuthStatus(sendResponse) {
        (async () => {
            try {
                const sessionResult = await this.backendManager.getSession();
                
                if (sessionResult?.success) {
                    if (sessionResult.status === 'authenticated') {
                        const refreshResult = await this.backendManager.refreshAccessToken();
                        if (refreshResult?.success && refreshResult.accessToken) {
                            await this.storageManager.saveAuthSession(
                                refreshResult.accessToken,
                                refreshResult.refreshToken || null
                            );
                            this.backendManager.setAuthSession(
                                refreshResult.accessToken,
                                refreshResult.refreshToken || null
                            );
                        }
                        const payload = refreshResult?.accessToken 
                            ? this._decodeJWT(refreshResult.accessToken)
                            : null;
                        sendResponse({
                            success: true,
                            isAuthenticated: true,
                            hasRefreshToken: Boolean(refreshResult?.refreshToken),
                            username: payload ? (payload.username || payload.sub || payload.user_id || null) : null,
                            anonId: null
                        });
                        return;
                    } else if (sessionResult.status === 'anonymous') {
                        await this.storageManager.clearAuthSession();
                        await this.storageManager.clearAnonymousSession();
                        this.backendManager.clearAuthSession();
                        sendResponse({
                            success: true,
                            isAuthenticated: false,
                            hasRefreshToken: false,
                            username: null,
                            anonId: sessionResult.anonId || null
                        });
                        return;
                    }
                }

                let [session, anonSession] = await Promise.all([
                    this.storageManager.loadAuthSession(),
                    this.storageManager.loadAnonymousSession()
                ]);

                if (!session?.accessToken) {
                    const refreshResult = await this.backendManager.refreshAccessToken();
                    if (refreshResult?.success && refreshResult.accessToken) {
                        await this.storageManager.saveAuthSession(
                            refreshResult.accessToken,
                            refreshResult.refreshToken || null
                        );
                        this.backendManager.setAuthSession(
                            refreshResult.accessToken,
                            refreshResult.refreshToken || null
                        );
                        session = {
                            accessToken: refreshResult.accessToken,
                            refreshToken: refreshResult.refreshToken || null
                        };
                    }
                }

                const isAuthenticated = Boolean(session?.accessToken);
                let username = null;
                let anonId = null;

                if (isAuthenticated && session.accessToken) {
                    const payload = this._decodeJWT(session.accessToken);
                    if (payload) {
                        username = payload.username || payload.sub || payload.user_id || null;
                    }
                } else if (anonSession?.anonId) {
                    anonId = anonSession.anonId;
                }

                sendResponse({
                    success: true,
                    isAuthenticated,
                    hasRefreshToken: Boolean(session?.refreshToken),
                    username: username,
                    anonId: anonId
                });
            } catch (error) {
                this._logError({ key: 'logs.authHandler.statusError' }, error);
                sendResponse({ success: false, error: error.message });
            }
        })();
    }

    /**
     * Сбрасывает сессию в памяти и на бэкенде (после очистки storage со стороны options).
     * Вызывается после «Очистить все данные», чтобы при следующем открытии попапа показывалось приветственное окно:
     * без logout сервер по куки возвращал бы ту же сессию, и попап снова показывал «авторизованную» сессию.
     *
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleClearSession(sendResponse) {
        (async () => {
            try {
                await this.storageManager.clearAnonymousSession();
                await this.storageManager.clearAuthSession();
                this.backendManager.clearAuthSession();
                await this.backendManager.logout().catch((err) => {
                    this._logError({ key: 'logs.authHandler.logoutError' }, err);
                });
                sendResponse({ success: true });
            } catch (error) {
                this._logError({ key: 'logs.authHandler.statusError' }, error);
                sendResponse({ success: false, error: error.message });
            }
        })();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthHandlerManager;
    module.exports.default = AuthHandlerManager;
}

if (typeof window !== 'undefined') {
    window.AuthHandlerManager = AuthHandlerManager;
}
