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
                this.backendManager.clearAuthSession();
                const { anonToken } = await this.storageManager.loadAnonymousSession();
                if (anonToken) {
                    this.backendManager.setAuthToken(anonToken);
                    sendResponse({ success: true });
                    return;
                }

                const anonResult = await this.backendManager.createAnonymousSession();
                if (anonResult.success) {
                    await this.storageManager.saveAnonymousSession(anonResult.anonId, anonResult.anonToken);
                    this.backendManager.setAuthToken(anonResult.anonToken);
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
     * Возвращает статус авторизации.
     *
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleGetAuthStatus(sendResponse) {
        this.storageManager.loadAuthSession()
            .then(session => {
                sendResponse({
                    success: true,
                    isAuthenticated: Boolean(session?.accessToken),
                    hasRefreshToken: Boolean(session?.refreshToken)
                });
            })
            .catch(error => {
                this._logError({ key: 'logs.authHandler.statusError' }, error);
                sendResponse({ success: false, error: error.message });
            });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthHandlerManager;
    module.exports.default = AuthHandlerManager;
}

if (typeof window !== 'undefined') {
    window.AuthHandlerManager = AuthHandlerManager;
}
