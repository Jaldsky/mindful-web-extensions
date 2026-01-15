const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

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
        
        this._log({ key: 'logs.backend.created' }, { 
            backendUrl: this.backendUrl,
            authTokenSet: Boolean(this.authToken)
        });
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
        if (typeof token !== 'string') {
            throw new TypeError('Auth token must be a string');
        }
        this.authToken = token;
        this.updateState({ authTokenSet: true });
        this._log({ key: 'logs.backend.authTokenUpdated' });
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

                if (!this.authToken) {
                    const t = this._getTranslateFn();
                    const errorMessage = t('logs.backend.authTokenNotSet');
                    this._logError({ key: 'logs.backend.eventsSendError' }, new Error(errorMessage));
                    return { 
                        success: false, 
                        error: errorMessage 
                    };
                }

                const payload = { [CONFIG.BACKEND.PAYLOAD_KEYS.DATA]: events };
                
                this._log({ key: 'logs.backend.sendingEvents', params: { eventsCount: events.length } }, { 
                    method: CONFIG.BACKEND.METHODS.POST,
                    url: this.backendUrl,
                    eventsCount: events.length,
                    payload: payload
                });

                const response = await fetch(this.backendUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.AUTHORIZATION]: `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify(payload)
                });

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
     * @returns {Promise<{success: boolean, anonId?: string, anonToken?: string, error?: string}>}
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

                const response = await fetch(anonUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON
                    }
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
                if (!data || !data.anon_id || !data.anon_token) {
                    const t = this._getTranslateFn();
                    const errorMessage = t('logs.backend.anonymousSessionInvalidResponse');
                    this._logError({ key: 'logs.backend.anonymousSessionError' }, new Error(errorMessage));
                    return { success: false, error: errorMessage };
                }

                return { success: true, anonId: data.anon_id, anonToken: data.anon_token };
            } catch (error) {
                this._logError({ key: 'logs.backend.anonymousSessionError' }, error);
                const t = this._getTranslateFn();
                const errorMessage = error.message || t('logs.backend.unknownError');
                return { success: false, error: errorMessage };
            }
        });
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

                let response;
                try {
                    response = await fetch(healthcheckUrl, {
                        method: CONFIG.BACKEND.METHODS.GET,
                        headers: {
                            [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON
                        }
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
