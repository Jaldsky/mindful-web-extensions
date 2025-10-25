const BaseManager = require('../BaseManager.js');
const CONFIG = require('../../config.js');

/**
 * @typedef {Object} MessageResponse
 * @property {boolean} [success] - Успешность операции
 * @property {*} [data] - Данные ответа
 * @property {string} [error] - Сообщение об ошибке
 */

/**
 * Менеджер для обработки сообщений от других компонентов расширения.
 * Отвечает за коммуникацию между Service Worker и UI компонентами.
 * 
 * @class MessageHandlerManager
 * @extends BaseManager
 */
class MessageHandlerManager extends BaseManager {
    /**
     * Типы сообщений
     * @readonly
     * @static
     */
    static MESSAGE_TYPES = CONFIG.MESSAGE_TYPES;

    /**
     * Создает экземпляр MessageHandlerManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.statisticsManager - Менеджер статистики
     * @param {Object} dependencies.eventQueueManager - Менеджер очереди событий
     * @param {Object} dependencies.backendManager - Менеджер backend
     * @param {Object} dependencies.storageManager - Менеджер хранилища
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        // Проверка зависимостей
        if (!dependencies || !dependencies.statisticsManager || !dependencies.eventQueueManager || 
            !dependencies.backendManager || !dependencies.storageManager) {
            throw new Error('MessageHandlerManager требует все менеджеры');
        }

        /** @type {Object} */
        this.statisticsManager = dependencies.statisticsManager;
        
        /** @type {Object} */
        this.eventQueueManager = dependencies.eventQueueManager;
        
        /** @type {Object} */
        this.backendManager = dependencies.backendManager;
        
        /** @type {Object} */
        this.storageManager = dependencies.storageManager;
        
        /** @type {Function|null} */
        this.messageListener = null;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this._log('MessageHandlerManager инициализирован');
    }

    /**
     * Инициализирует обработчик сообщений.
     * Настраивает слушатель сообщений Chrome API.
     * 
     * @returns {void}
     */
    init() {
        this._executeWithTiming('init', () => {
            // Удаляем старый слушатель, если есть
            if (this.messageListener) {
                chrome.runtime.onMessage.removeListener(this.messageListener);
            }

            // Создаем новый слушатель
            this.messageListener = (request, sender, sendResponse) => {
                this._handleMessage(request, sender, sendResponse);
                return true; // Асинхронный ответ
            };

            chrome.runtime.onMessage.addListener(this.messageListener);
            this._log('Слушатель сообщений настроен');
        });
    }

    /**
     * Обрабатывает входящее сообщение.
     * 
     * @private
     * @param {Object} request - Объект запроса
     * @param {Object} sender - Отправитель сообщения
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleMessage(request, sender, sendResponse) {
        this._log('Получено сообщение', { type: request.type || request.action, request });

        try {
            const messageType = request.type || request.action;

            switch (messageType) {
                case MessageHandlerManager.MESSAGE_TYPES.PING:
                    this._handlePing(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GET_STATUS:
                case MessageHandlerManager.MESSAGE_TYPES.GET_TRACKING_STATUS:
                    this._handleGetStatus(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GET_TODAY_STATS:
                    this._handleGetTodayStats(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.TEST_CONNECTION:
                case MessageHandlerManager.MESSAGE_TYPES.CHECK_CONNECTION:
                    this._handleTestConnection(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.UPDATE_BACKEND_URL:
                    this._handleUpdateBackendUrl(request, sendResponse);
                    break;

                default:
                    this._log('Неизвестный тип сообщения', { messageType });
                    sendResponse({ 
                        success: false, 
                        error: `Unknown message type: ${messageType}` 
                    });
            }
        } catch (error) {
            this._logError('Ошибка обработки сообщения', error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }

    /**
     * Обрабатывает ping запрос.
     * 
     * @private
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handlePing(sendResponse) {
        this._log('Ping запрос получен');
        sendResponse({ 
            success: true, 
            message: 'pong' 
        });
    }

    /**
     * Обрабатывает запрос статуса.
     * 
     * @private
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleGetStatus(sendResponse) {
        const stats = this.statisticsManager.getStatistics();
        const isOnline = this.eventQueueManager.state.isOnline;
        
        const response = {
            isOnline: isOnline,
            isTracking: stats.isTracking,
            stats: {
                eventsTracked: stats.eventsTracked,
                domainsVisited: stats.domainsVisited,
                queueSize: this.eventQueueManager.getQueueSize()
            }
        };

        this._log('Отправка статуса', response);
        sendResponse(response);
    }

    /**
     * Обрабатывает запрос статистики за сегодня.
     * 
     * @private
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleGetTodayStats(sendResponse) {
        const stats = this.statisticsManager.getStatistics();
        
        const response = {
            events: stats.eventsTracked,
            domains: stats.domainsVisited,
            queue: this.eventQueueManager.getQueueSize()
        };

        this._log('Отправка статистики', response);
        sendResponse(response);
    }

    /**
     * Обрабатывает запрос тестирования соединения.
     * 
     * @private
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleTestConnection(sendResponse) {
        this._log('Тестирование соединения');
        
        this.backendManager.testConnection()
            .then(result => {
                this._log('Результат тестирования соединения', result);
                sendResponse(result);
            })
            .catch(error => {
                this._logError('Ошибка тестирования соединения', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
    }

    /**
     * Обрабатывает запрос обновления URL backend.
     * 
     * @private
     * @param {Object} request - Объект запроса
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleUpdateBackendUrl(request, sendResponse) {
        const url = request.url || request.data?.url;
        
        if (!url) {
            this._log('URL не предоставлен в запросе');
            sendResponse({ 
                success: false, 
                error: 'URL is required' 
            });
            return;
        }

        this._log('Обновление Backend URL', { url });
        
        // Обновляем URL в BackendManager
        this.backendManager.setBackendUrl(url);
        
        // Сохраняем в storage
        this.storageManager.saveBackendUrl(url)
            .then(success => {
                if (success) {
                    this._log('Backend URL успешно обновлен');
                    sendResponse({ success: true });
                } else {
                    this._log('Ошибка сохранения Backend URL');
                    sendResponse({ 
                        success: false, 
                        error: 'Failed to save URL' 
                    });
                }
            })
            .catch(error => {
                this._logError('Ошибка обновления Backend URL', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            });
    }

    /**
     * Удаляет слушатель сообщений.
     * 
     * @returns {void}
     */
    removeListener() {
        if (this.messageListener) {
            chrome.runtime.onMessage.removeListener(this.messageListener);
            this.messageListener = null;
            this._log('Слушатель сообщений удален');
        }
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.removeListener();
        this.performanceMetrics.clear();
        super.destroy();
        this._log('MessageHandlerManager уничтожен');
    }
}

module.exports = MessageHandlerManager;
