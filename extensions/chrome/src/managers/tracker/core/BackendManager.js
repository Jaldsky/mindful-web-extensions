const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../../config.js');

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
     * @param {string} [options.userId] - ID пользователя (может быть установлен позже через setUserId)
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
         * ID пользователя для идентификации в запросах
         * @type {string|null}
         */
        this.userId = options.userId || null;
        
        /** 
         * Метрики производительности операций
         * @type {Map<string, number>}
         */
        this.performanceMetrics = new Map();
        
        this.updateState({
            backendUrl: this.backendUrl,
            userId: this.userId
        });
        
        this._log({ key: 'logs.backend.created' }, { 
            backendUrl: this.backendUrl,
            userId: this.userId 
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
        this._log({ key: 'logs.backend.backendUrlUpdated', params: { backendUrl: url } });
    }

    /**
     * Устанавливает ID пользователя.
     * Обновляет внутреннее состояние и логирует изменение.
     * ID пользователя используется в заголовке X-User-ID при отправке событий.
     * 
     * @param {string} userId - ID пользователя
     * @returns {void}
     * @throws {TypeError} Если userId не является строкой
     */
    setUserId(userId) {
        this.userId = userId;
        this.updateState({ userId });
        this._log({ key: 'logs.backend.userIdUpdated', params: { userId } });
    }

    /**
     * Отправляет события на backend.
     * 
     * Отправляет массив событий на backend API через POST запрос.
     * События оборачиваются в объект с ключом 'data'.
     * В заголовке X-User-ID передается userId (должен быть установлен заранее).
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

                if (!this.userId) {
                    const t = this._getTranslateFn();
                    const errorMessage = t('logs.backend.userIdNotSet');
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
                    userId: this.userId,
                    payload: payload
                });

                const response = await fetch(this.backendUrl, {
                    method: CONFIG.BACKEND.METHODS.POST,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON,
                        [CONFIG.BACKEND.HEADERS.USER_ID]: this.userId
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
                    this._logError({ key: 'logs.backend.backendResponseError' }, { 
                        method: CONFIG.BACKEND.METHODS.POST,
                        status: response.status,
                        errorText 
                    });
                    return { 
                        success: false, 
                        error: errorMessage 
                    };
                }

                if (response.status === CONFIG.BACKEND.STATUS_CODES.NO_CONTENT) {
                    this._log({ key: 'logs.backend.eventsSentSuccess', params: { eventsCount: events.length } });
                    return { success: true };
                }

                const responseData = await response.json();
                this._log({ key: 'logs.backend.eventsSentSuccess', params: { eventsCount: events.length } }, { 
                    response: responseData 
                });
                
                return { success: true, data: responseData };
            } catch (error) {
                this._logError({ key: 'logs.backend.eventsSendError' }, error);
                const t = this._getTranslateFn();
                return { 
                    success: false, 
                    error: error.message || t('logs.backend.unknownError') 
                };
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
     * @async
     * @returns {Promise<TestConnectionResult>} Результат проверки доступности
     *
     */
    async checkHealth() {
        return await this._executeWithTimingAsync('checkHealth', async () => {
            try {
                const healthcheckUrl = CONFIG.BACKEND.HEALTHCHECK_URL;
                
                this._log({ key: 'logs.backend.checkingHealth' }, { 
                    method: CONFIG.BACKEND.METHODS.GET,
                    url: healthcheckUrl
                });

                const response = await fetch(healthcheckUrl, {
                    method: CONFIG.BACKEND.METHODS.GET,
                    headers: {
                        [CONFIG.BACKEND.HEADERS.CONTENT_TYPE]: CONFIG.BACKEND.HEADER_VALUES.CONTENT_TYPE_JSON
                    }
                });

                this._log({ key: 'logs.backend.healthcheckResponse' }, { 
                    method: CONFIG.BACKEND.METHODS.GET,
                    status: response.status,
                    statusText: response.statusText 
                });

                if (response.ok) {
                    const responseText = await response.text();
                    this._log({ key: 'logs.backend.backendAvailable' }, { response: responseText });
                    return { success: true };
                } else {
                    const errorText = await response.text();
                    this._logError({ key: 'logs.backend.backendUnavailable' }, { 
                        method: CONFIG.BACKEND.METHODS.GET,
                        status: response.status,
                        errorText 
                    });
                    const errorMessage = CONFIG.BACKEND.ERROR_MESSAGE_TEMPLATE
                        .replace('{status}', response.status)
                        .replace('{message}', errorText || response.statusText);
                    return { 
                        success: false, 
                        error: errorMessage 
                    };
                }
            } catch (error) {
                this._logError({ key: 'logs.backend.healthcheckError' }, error);
                return { 
                    success: false, 
                    error: `${error.name}: ${error.message}` 
                };
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
     * обнуляет backendUrl и userId, затем вызывает destroy() родительского класса.
     * 
     * @returns {void}
     */
    destroy() {
        this.performanceMetrics.clear();
        this.backendUrl = null;
        this.userId = null;
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
