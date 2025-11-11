const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для обработки запросов проверки соединения.
 * Отвечает за проверку доступности backend и тестирование соединения.
 * 
 * @class ConnectionHandlerManager
 * @extends BaseManager
 */
class ConnectionHandlerManager extends BaseManager {
    /**
     * Типы сообщений
     * @readonly
     * @static
     */
    static MESSAGE_TYPES = CONFIG.MESSAGE_TYPES;

    /**
     * Создает экземпляр ConnectionHandlerManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.backendManager - Менеджер backend
     * @param {Object} dependencies.eventQueueManager - Менеджер очереди событий
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.backendManager || !dependencies.eventQueueManager) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.connectionHandler.dependenciesRequired'));
        }

        /** 
         * Менеджер backend для проверки соединения
         * @type {Object}
         */
        this.backendManager = dependencies.backendManager;
        
        /** 
         * Менеджер очереди событий для управления очередью
         * @type {Object}
         */
        this.eventQueueManager = dependencies.eventQueueManager;
    }

    /**
     * Обрабатывает запрос проверки/тестирования соединения.
     * 
     * CHECK_CONNECTION - использует healthcheck (не отправляет события)
     * TEST_CONNECTION - отправляет накопленные реальные события из очереди
     * 
     * @param {Function} sendResponse - Функция для отправки ответа
     * @param {string} messageType - Тип сообщения
     * @returns {void}
     */
    async handleTestConnection(sendResponse, messageType) {
        const isCheckConnection = messageType === ConnectionHandlerManager.MESSAGE_TYPES.CHECK_CONNECTION;
        
        if (isCheckConnection) {
            this._log({ key: 'logs.connectionHandler.healthcheckChecking' });
            
            this.backendManager.checkHealth(false)
                .then(result => {
                    if (result.tooFrequent) {
                        this._log({ key: 'logs.connectionHandler.healthcheckResult' }, result);
                    } else if (result.success) {
                        this._log({ key: 'logs.connectionHandler.healthcheckResult' }, result);
                    } else {
                        const error = new Error(result.error || 'Healthcheck failed');
                        if (result.status !== undefined) error.status = result.status;
                        if (result.method !== undefined) error.method = result.method;
                        if (result.url !== undefined) error.url = result.url;
                        if (result.errorText !== undefined) error.errorText = result.errorText;
                        if (result.name !== undefined) error.name = result.name;
                        this._logError({ key: 'logs.connectionHandler.healthcheckError' }, error);
                    }
                    // Убеждаемся, что tooFrequent передается в ответе
                    sendResponse({
                        success: result.success || false,
                        tooFrequent: result.tooFrequent || false,
                        error: result.error || null
                    });
                })
                .catch(error => {
                    this._logError({ key: 'logs.connectionHandler.healthcheckError' }, error);
                    sendResponse({ 
                        success: false, 
                        tooFrequent: false,
                        error: error.message 
                    });
                });
        } else {
            const queueSize = this.eventQueueManager.getQueueSize();
            
            if (queueSize === 0) {
                this._log({ key: 'logs.connectionHandler.queueEmpty' });
                // Не передаем force = true, чтобы throttling работал и показывал "too frequent"
                this.backendManager.checkHealth(false)
                    .then(result => {
                        const t = this._getTranslateFn();
                        sendResponse({ 
                            success: result.success, 
                            tooFrequent: result.tooFrequent || false,
                            message: t('logs.connectionHandler.queueEmptyMessage'),
                            queueSize: 0
                        });
                    })
                    .catch(error => {
                        sendResponse({ 
                            success: false, 
                            tooFrequent: false,
                            error: error.message 
                        });
                    });
            } else {
                this._log({ key: 'logs.connectionHandler.forceSendEvents', params: { queueSize } });
                
                this.eventQueueManager.processQueue()
                    .then(() => {
                        const remainingQueueSize = this.eventQueueManager.getQueueSize();
                        const sentCount = queueSize - remainingQueueSize;
                        this._log({ key: 'logs.connectionHandler.eventsSentSuccess', params: { sent: sentCount, remaining: remainingQueueSize } });
                        const t = this._getTranslateFn();
                        sendResponse({ 
                            success: true,
                            message: t('logs.connectionHandler.eventsSentSuccessMessage', { sent: sentCount }),
                            sentEvents: sentCount,
                            remainingInQueue: remainingQueueSize
                        });
                    })
                    .catch(error => {
                        this._logError({ key: 'logs.connectionHandler.eventsSendError' }, error);
                        sendResponse({ 
                            success: false, 
                            error: error.message,
                            queueSize: this.eventQueueManager.getQueueSize()
                        });
                    });
            }
        }
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.backendManager = null;
        this.eventQueueManager = null;
        super.destroy();
        this._log({ key: 'logs.connectionHandler.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConnectionHandlerManager;
    module.exports.default = ConnectionHandlerManager;
}

if (typeof window !== 'undefined') {
    window.ConnectionHandlerManager = ConnectionHandlerManager;
}
