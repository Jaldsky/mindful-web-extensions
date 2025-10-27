const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');

/**
 * @typedef {Object} SendEventsResult
 * @property {boolean} success - Успешность отправки
 * @property {*} [data] - Данные ответа от сервера
 * @property {string} [error] - Сообщение об ошибке
 */

/**
 * @typedef {Object} TestConnectionResult
 * @property {boolean} success - Успешность подключения
 * @property {string} [error] - Сообщение об ошибке
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
     * @param {string} [options.backendUrl] - URL backend API
     * @param {string} [options.userId] - ID пользователя
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {string} */
        this.backendUrl = options.backendUrl || CONFIG.BACKEND.DEFAULT_URL;
        
        /** @type {string|null} */
        this.userId = options.userId || null;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this.updateState({
            backendUrl: this.backendUrl,
            userId: this.userId
        });
        
        this._log('BackendManager инициализирован', { 
            backendUrl: this.backendUrl,
            userId: this.userId 
        });
    }

    /**
     * Устанавливает URL backend API.
     * 
     * @param {string} url - Новый URL
     * @returns {void}
     */
    setBackendUrl(url) {
        this.backendUrl = url;
        this.updateState({ backendUrl: url });
        this._log('Backend URL обновлен', { backendUrl: url });
    }

    /**
     * Устанавливает ID пользователя.
     * 
     * @param {string} userId - ID пользователя
     * @returns {void}
     */
    setUserId(userId) {
        this.userId = userId;
        this.updateState({ userId });
        this._log('User ID обновлен', { userId });
    }

    /**
     * Отправляет события на backend.
     * 
     * @async
     * @param {Array<Object>} events - Массив событий для отправки
     * @returns {Promise<SendEventsResult>} Результат отправки
     */
    async sendEvents(events) {
        return await this._executeWithTimingAsync('sendEvents', async () => {
            try {
                if (!events || events.length === 0) {
                    return { success: true, data: { message: 'No events to send' } };
                }

                if (!this.userId) {
                    throw new Error('User ID не установлен');
                }

                const payload = { data: events };
                
                this._log('Отправка событий на backend', { 
                    url: this.backendUrl,
                    eventsCount: events.length,
                    userId: this.userId
                });

                const response = await fetch(this.backendUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': this.userId
                    },
                    body: JSON.stringify(payload)
                });

                this._log('Ответ от backend', { status: response.status });

                if (!response.ok) {
                    const errorText = await response.text();
                    this._logError('Ошибка ответа от backend', { 
                        status: response.status,
                        errorText 
                    });
                    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                }

                const responseData = await response.json();
                this._log('События успешно отправлены', { 
                    eventsCount: events.length,
                    response: responseData 
                });
                
                return { success: true, data: responseData };
            } catch (error) {
                this._logError('Ошибка отправки событий', error);
                return { 
                    success: false, 
                    error: error.message || 'Unknown error' 
                };
            }
        });
    }

    /**
     * Проверяет доступность backend через healthcheck endpoint.
     * 
     * @async
     * @returns {Promise<TestConnectionResult>} Результат проверки
     */
    async checkHealth() {
        return await this._executeWithTimingAsync('checkHealth', async () => {
            try {
                const healthcheckUrl = CONFIG.BACKEND.HEALTHCHECK_URL;
                
                this._log('Проверка доступности backend через healthcheck', { 
                    url: healthcheckUrl
                });

                const response = await fetch(healthcheckUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                this._log('Ответ healthcheck', { 
                    status: response.status,
                    statusText: response.statusText 
                });

                if (response.ok) {
                    const responseText = await response.text();
                    this._log('Backend доступен', { response: responseText });
                    return { success: true };
                } else {
                    const errorText = await response.text();
                    this._logError('Backend недоступен', { 
                        status: response.status,
                        errorText 
                    });
                    return { 
                        success: false, 
                        error: `HTTP ${response.status}: ${errorText || response.statusText}` 
                    };
                }
            } catch (error) {
                this._logError('Ошибка проверки доступности backend', error);
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
     * @returns {string} URL backend
     */
    getBackendUrl() {
        return this.backendUrl;
    }

    /**
     * Получает текущий User ID.
     * 
     * @returns {string|null} User ID
     */
    getUserId() {
        return this.userId;
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.performanceMetrics.clear();
        this.backendUrl = null;
        this.userId = null;
        super.destroy();
        this._log('BackendManager уничтожен');
    }
}

module.exports = BackendManager;
