const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');
const BackendAuthManager = require('./BackendAuthManager.js');

/**
 * @typedef {Object} SendEventsResult
 * @property {boolean} success - Успешность отправки
 * @property {*} [data] - Данные ответа от сервера (если сервер вернул данные)
 * @property {string} [error] - Сообщение об ошибке (если отправка не удалась)
 */

/**
 * @typedef {Object} TestConnectionResult
 * @property {boolean} success - Успешность подключения
 * @property {string} [error] - Сообщение об ошибке (если проверка не удалась)
 */

/**
 * Менеджер для коммуникации с backend API.
 * Отвечает за отправку событий и тестирование соединения.
 * 
 * @class BackendManager
 * @extends BaseManager
 */
class BackendManager extends BaseManager {
    /**
     * Создает экземпляр BackendManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {string} [options.backendUrl] - URL backend API (по умолчанию из CONFIG.BACKEND.DEFAULT_URL)
     * @param {string} [options.authToken] - JWT токен для отправки событий
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(options = {}) {
        super(options);
        
        /** 
         * URL backend API для отправки событий
         * @type {string}
         */
        this.backendUrl = options.backendUrl || CONFIG.BACKEND.DEFAULT_URL;
        
        /**
         * JWT токен для авторизации запросов
         * @type {string|null}
         */
        this.authToken = options.authToken || null;
        
        /** 
         * Refresh токен для обновления авторизации
         * @type {string|null}
         */
        this.refreshToken = options.refreshToken || null;
        
        /** 
         * Метрики производительности операций
         * @type {Map<string, number>}
         */
        this.performanceMetrics = new Map();
        
        /** 
         * Время последнего вызова checkHealth
         * @type {number|null}
         */
        this.lastHealthCheckTime = null;
        
        /** 
         * Минимальный интервал между проверками здоровья (мс)
         * @type {number}
         */
        this.healthCheckInterval = CONFIG.BASE.UPDATE_INTERVAL;
        
        this.updateState({
            backendUrl: this.backendUrl,
            authTokenSet: Boolean(this.authToken)
        });

        this.backendAuthManager = new BackendAuthManager(this);
        
        this._log({ key: 'logs.backend.created' }, { 
            backendUrl: this.backendUrl,
            authTokenSet: Boolean(this.authToken)
        });
    }

    /**
     * Возвращает текущую локаль для заголовка Accept-Language (асинхронно).
     * Читает из chrome.storage.local (как фронт из localStorage), чтобы в service worker
     * использовалась локаль, выбранная в настройках расширения. Формат как на фронте: "ru" | "en".
     *
     * @returns {Promise<string>} 'en' | 'ru'
     */
    async _getAcceptLanguageAsync() {
        const supported = CONFIG.LOCALE?.AVAILABLE || ['en', 'ru'];

        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get([CONFIG.LOCALE.STORAGE_KEY], (items) => {
                        resolve(items[CONFIG.LOCALE.STORAGE_KEY] || null);
                    });
                });
                if (result && supported.includes(result)) return result;
            }
        } catch (e) {
            // ignore
        }

        try {
            if (typeof localStorage !== 'undefined') {
                const cached = localStorage.getItem(CONFIG.LOCALE.CACHE_KEY) || localStorage.getItem(CONFIG.LOCALE.STORAGE_KEY);
                if (cached && supported.includes(cached)) return cached;
            }
        } catch (e) {
            // ignore
        }

        const detected = BaseManager.detectBrowserLocale();
        if (detected && supported.includes(detected)) return detected;

        return BaseManager.DEFAULT_LOCALE || 'en';
    }

    /**
     * Устанавливает URL backend API.
     * Обновляет внутреннее состояние и логирует изменение.
     * 
     * @param {string} url - Новый URL backend API
     * @returns {void}
     * @throws {TypeError} Если url не является строкой
     */
    setBackendUrl(url) {
        this.backendUrl = url;
        this.updateState({ backendUrl: url });
    }

    /**
     * Устанавливает JWT токен авторизации.
     * Обновляет внутреннее состояние и логирует изменение.
     *
     * @param {string} token - JWT токен
     * @returns {void}
     * @throws {TypeError} Если token не является строкой
     */
    setAuthToken(token) {
        return this.backendAuthManager.setAuthToken(token);
    }

    /**
     * Устанавливает access и refresh токены авторизации.
     *
     * @param {string} accessToken - JWT access токен
     * @param {string|null} refreshToken - JWT refresh токен
     * @returns {void}
     */
    setAuthSession(accessToken, refreshToken = null) {
        return this.backendAuthManager.setAuthSession(accessToken, refreshToken);
    }

    /**
     * Сбрасывает авторизационные токены.
     *
     * @returns {void}
     */
    clearAuthSession() {
        return this.backendAuthManager.clearAuthSession();
    }

    /**
     * Отправляет события на backend.
     * 
     * Отправляет массив событий на backend API через POST запрос.
     * События оборачиваются в объект с ключом 'data'.
     * В заголовке Authorization передается Bearer токен.
     * 
     * @async
     * @param {Array<Object>} events - Массив событий для отправки
     * @returns {Promise<SendEventsResult>} Результат отправки
     */
    async sendEvents(events) {
        return await this._executeWithTimingAsync('sendEvents', async () => {
            try {
                if (!events || events.length === 0) {
                    const t = this._getTranslateFn();
                    return { success: true, data: { message: t('logs.backend.noEventsToSend') } };
                }

                const payload = { [CONFIG.BACKEND.PAYLOAD_KEYS.DATA]: events };
                
                this._log({ key: 'logs.backend.sendingEvents', params: { eventsCount: events.length } }, { 
                    method: CONFIG.BACKEND.METHODS.POST,
                    url: this.backendUrl,
                    eventsCount: events.length,
                    payload: payload
                });

                const acceptLanguage = await this._getAcceptLanguageAsync();
                const sendRequest = async () => {
                    const headers = {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    };
                    if (this.authToken) {
                        headers[CONFIG.BACKEND.HEADERS.AUTHORIZATION] = `Bearer ${this.authToken}`;
                    }
                    return await fetch(this.backendUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers,
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });
                };

                let response = await sendRequest();

                if (response.status === 401 && this.refreshToken) {
                    const refreshResult = await this.refreshAccessToken(this.refreshToken);
                    if (refreshResult.success) {
                        this.setAuthSession(refreshResult.accessToken, refreshResult.refreshToken || this.refreshToken);
                        response = await sendRequest();
                    }
                }

                this._log({ key: 'logs.backend.backendResponse' }, { 
                    method: CONFIG.BACKEND.METHODS.POST,
                    status: response.status 
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.method = CONFIG.BACKEND.METHODS.POST;
                    error.errorText = errorText;
                    this._logError({ key: 'logs.backend.backendResponseError' }, error);
                    return { 
                        success: false, 
                        error: errorMessage,
                        status: response.status,
                        method: CONFIG.BACKEND.METHODS.POST,
                        errorText: errorText
                    };
                }

                if (response.status === CONFIG.BACKEND.STATUS_CODES.NO_CONTENT) {
                    this._log({ key: 'logs.backend.eventsSentSuccess', params: { eventsCount: events.length } }, { 
                        status: response.status 
                    });
                    return { success: true };
                }

                const responseData = await response.json();
                this._log({ key: 'logs.backend.eventsSentSuccess', params: { eventsCount: events.length } }, { 
                    status: response.status,
                    response: responseData 
                });
                
                return { success: true, data: responseData };
            } catch (error) {
                this._logError({ key: 'logs.backend.eventsSendError' }, error);
                const t = this._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { 
                    success: false, 
                    error: errorMessage,
                    method: CONFIG.BACKEND.METHODS.POST,
                    code: error.code,
                    name: error.name && error.name !== 'Error' ? error.name : undefined,
                    url: error.url || this.backendUrl
                };
            }
        });
    }

    /**
     * Создает анонимную сессию через backend.
     *
     * @async
     * @returns {Promise<{success: boolean, anonId?: string, error?: string}>}
     */
    async createAnonymousSession() {
        return await this._executeWithTimingAsync('createAnonymousSession', async () => {
            try {
                const backendUrlObj = new URL(this.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.AUTH_ANON_PATH;
                const anonUrl = backendUrlObj.toString();

                this._log({ key: 'logs.backend.creatingAnonymousSession' }, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    url: anonUrl
                });

                const acceptLanguage = await this._getAcceptLanguageAsync();
                const response = await fetch(anonUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                    },
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    this._logError({ key: 'logs.backend.anonymousSessionError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                const data = await response.json();
                if (!data || !data.anon_id) {
                    const t = this._getTranslateFn();
                    const errorMessage = t('logs.backend.anonymousSessionInvalidResponse');
                    this._logError({ key: 'logs.backend.anonymousSessionError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return { success: true, anonId: data.anon_id };
            } catch (error) {
                this._logError({ key: 'logs.backend.anonymousSessionError' }, error);
                const t = this._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { success: false, error: errorMessage };
            }
        });
    }

    /**
     * Извлекает текст ошибки из JSON ответа API (detail/message/error, в т.ч. массив как в FastAPI).
     * @private
     * @param {Object} obj - Объект ответа об ошибке
     * @returns {string}
     */
    _extractErrorDetail(obj) {
        return this.backendAuthManager._extractErrorDetail(obj);
    }

    /**
     * Логин пользователя.
     *
     * @async
     * @param {string} username - Логин или email
     * @param {string} password - Пароль
     * @returns {Promise<{success: boolean, accessToken?: string, refreshToken?: string, error?: string}>}
     */
    async login(username, password) {
        return await this.backendAuthManager.login(username, password);
    }

    /**
     * Обновляет access токен.
     *
     * @async
     * @param {string} refreshToken - Refresh токен
     * @returns {Promise<{success: boolean, accessToken?: string, refreshToken?: string, error?: string}>}
     */
    async refreshAccessToken(refreshToken = null) {
        return await this.backendAuthManager.refreshAccessToken(refreshToken);
    }

    /**
     * Регистрация пользователя.
     *
     * @async
     * @param {string} username - Логин
     * @param {string} email - Email
     * @param {string} password - Пароль
     * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
     */
    async register(username, email, password) {
        return await this.backendAuthManager.register(username, email, password);
    }

    /**
     * Подтверждение email по коду.
     *
     * @async
     * @param {string} email - Email пользователя
     * @param {string} code - 6-значный код подтверждения
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async verify(email, code) {
        return await this.backendAuthManager.verify(email, code);
    }

    /**
     * Повторная отправка кода подтверждения.
     *
     * @async
     * @param {string} email - Email пользователя
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async resendCode(email) {
        return await this.backendAuthManager.resendCode(email);
    }

    /**
     * Логаут пользователя (очистка cookies).
     *
     * @async
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async logout() {
        return await this.backendAuthManager.logout();
    }

    /**
     * Проверяет текущую сессию через cookies.
     *
     * @async
     * @returns {Promise<{success: boolean, status?: string, userId?: string, anonId?: string, error?: string}>}
     */
    async getSession() {
        return await this.backendAuthManager.getSession();
    }

    /**
     * Проверяет доступность backend через healthcheck endpoint.
     * 
     * Выполняет GET запрос к healthcheck endpoint для проверки доступности backend.
     * Не требует установленного userId, так как это служебный запрос.
     * Использует URL из CONFIG.BACKEND.HEALTHCHECK_URL.
     * 
     * Throttling: ограничивает частоту вызовов до одного раза в UPDATE_INTERVAL (20 секунд).
     * Если запрос был выполнен недавно, пропускает выполнение и возвращает ошибку "too frequent".
     * 
     * @async
     * @param {boolean} [force=false] - Принудительно выполнить запрос, игнорируя throttling
     * @returns {Promise<TestConnectionResult>} Результат проверки доступности
     *
     */
    async checkHealth(force = false) {
        const now = Date.now();

        if (!force && this.lastHealthCheckTime !== null) {
            const timeSinceLastCheck = now - this.lastHealthCheckTime;
            if (timeSinceLastCheck < this.healthCheckInterval) {
                return { 
                    success: false, 
                    tooFrequent: true,
                    error: 'Health check request too frequent. Please wait before retrying.' 
                };
            }
        }
        
        return await this._executeWithTimingAsync('checkHealth', async () => {
            try {
                const backendUrlObj = new URL(this.backendUrl);
                backendUrlObj.pathname = CONFIG.BACKEND.HEALTHCHECK_PATH;
                const healthcheckUrl = backendUrlObj.toString();
                
                this._log({ key: 'logs.backend.checkingHealth' }, { 
                    method: CONFIG.BACKEND.METHODS.GET,
                    url: healthcheckUrl
                });

                const acceptLanguage = await this._getAcceptLanguageAsync();
                let response;
                try {
                    response = await fetch(healthcheckUrl, {
                        method: CONFIG.BACKEND.METHODS.GET,
                        headers: {
                            [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                            [CONFIG.BACKEND.HEADERS.ACCEPT_LANGUAGE]: acceptLanguage
                        },
                        credentials: 'include'
                    });
                } catch (fetchError) {
                    const error = fetchError instanceof Error 
                        ? fetchError 
                        : new Error(fetchError.message || fetchError.toString());
                    error.url = healthcheckUrl;
                    if (fetchError.code !== undefined) error.code = fetchError.code;
                    if (fetchError.name && fetchError.name !== 'Error') error.name = fetchError.name;
                    this._logError({ key: 'logs.backend.healthcheckError' }, error);
                    this.lastHealthCheckTime = Date.now();
                    return { 
                        success: false, 
                        error: `Network error: ${error.message || error.toString()}`,
                        url: healthcheckUrl,
                        method: CONFIG.BACKEND.METHODS.GET,
                        name: error.name && error.name !== 'Error' ? error.name : undefined
                    };
                }

                this._log({ key: 'logs.backend.healthcheckResponse' }, { 
                    method: CONFIG.BACKEND.METHODS.GET,
                    status: response.status,
                    statusText: response.statusText 
                });

                let result;

                if (response.ok) {
                    const responseText = await response.text();
                    this._log({ key: 'logs.backend.backendAvailable' }, { response: responseText });
                    result = { success: true };
                } else {
                    const errorText = await response.text();
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    const error = new Error(errorMessage);
                    error.status = response.status;
                    error.method = CONFIG.BACKEND.METHODS.GET;
                    error.errorText = errorText;
                    this._logError({ key: 'logs.backend.backendUnavailable' }, error);
                    result = { 
                        success: false, 
                        error: errorMessage,
                        status: response.status,
                        method: CONFIG.BACKEND.METHODS.GET,
                        errorText: errorText
                    };
                }

                this.lastHealthCheckTime = Date.now();
                
                return result;
            } catch (error) {
                this._logError({ key: 'logs.backend.healthcheckError' }, error);
                const result = { 
                    success: false, 
                    error: `${error.name}: ${error.message}`,
                    method: CONFIG.BACKEND.METHODS.GET,
                    url: error.url,
                    name: error.name && error.name !== 'Error' ? error.name : undefined
                };

                this.lastHealthCheckTime = Date.now();
                
                return result;
            }
        });
    }

    /**
     * Получает текущий URL backend.
     * 
     * @returns {string} Текущий URL backend API
     */
    getBackendUrl() {
        return this.backendUrl;
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * Очищает все внутренние данные, метрики производительности,
     * обнуляет backendUrl и authToken, затем вызывает destroy() родительского класса.
     * 
     * @returns {void}
     */
    destroy() {
        this.performanceMetrics.clear();
        this.backendUrl = null;
        this.authToken = null;
        this.refreshToken = null;
        super.destroy();
        this._log({ key: 'logs.backend.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackendManager;
    module.exports.default = BackendManager;
}

if (typeof window !== 'undefined') {
    window.BackendManager = BackendManager;
}
