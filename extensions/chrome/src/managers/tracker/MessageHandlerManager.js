const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');
const { normalizeDomainList } = require('../../utils/domainUtils.js');

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
            !dependencies.backendManager || !dependencies.storageManager || !dependencies.trackingController) {
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

        /** @type {Object} */
        this.trackingController = dependencies.trackingController;
        
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

            // Проверяем статус отслеживания и подключения для неслужебных сообщений
            const blockCheck = this._shouldBlockMessage(
                messageType,
                MessageHandlerManager.MESSAGE_TYPES,
                () => this.statisticsManager.isTrackingEnabled(),
                () => this.eventQueueManager.state.isOnline
            );

            if (blockCheck.shouldBlock) {
                const isTracking = this.statisticsManager.isTrackingEnabled();
                const isOnline = this.eventQueueManager.state.isOnline;
                
                this._log('Сообщение заблокировано', { 
                    messageType, 
                    reason: blockCheck.reason 
                });
                
                sendResponse({ 
                    success: false, 
                    error: blockCheck.reason,
                    isTracking: !isTracking ? false : undefined,
                    isOnline: !isOnline ? false : undefined
                });
                return;
            }

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

                case MessageHandlerManager.MESSAGE_TYPES.GET_DETAILED_STATS:
                    this._handleGetDetailedStats(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.TEST_CONNECTION:
                case MessageHandlerManager.MESSAGE_TYPES.CHECK_CONNECTION:
                    this._handleTestConnection(sendResponse, messageType);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GENERATE_RANDOM_DOMAINS:
                    this._handleGenerateRandomDomains(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.UPDATE_BACKEND_URL:
                    this._handleUpdateBackendUrl(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.UPDATE_DOMAIN_EXCEPTIONS:
                    this._handleUpdateDomainExceptions(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.SET_TRACKING_ENABLED:
                    this._handleSetTrackingEnabled(request, sendResponse);
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
     * Генерирует случайные домены и добавляет события (для отладки).
     * @private
     * @param {{data?:{count?:number}}} request
     * @param {Function} sendResponse
     */
    _handleGenerateRandomDomains(request, sendResponse) {
        try {
            const count = Math.max(1, Math.min(1000, Number(request?.data?.count) || 100));
            const generated = new Set();
            const tlds = ['com', 'net', 'org', 'io', 'app', 'dev', 'site'];
            const randStr = (len) => Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
            for (let i = 0; i < count; i++) {
                const domain = `${randStr(5 + Math.floor(Math.random() * 5))}.${tlds[Math.floor(Math.random() * tlds.length)]}`;
                if (generated.has(domain)) {
                    i--; // ensure uniqueness
                    continue;
                }
                generated.add(domain);
                this.statisticsManager.addEvent('active', domain);
            }
            this._log('Сгенерированы домены', { count: generated.size });
            sendResponse({ success: true, generated: generated.size });
        } catch (error) {
            this._logError('Ошибка генерации доменов', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Обрабатывает запрос подробной статистики за сегодня.
     * 
     * @private
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleGetDetailedStats(sendResponse) {
        const detailed = this.statisticsManager.getDetailedStatistics();
        const response = {
            eventsTracked: detailed.eventsTracked,
            activeEvents: detailed.activeEvents,
            inactiveEvents: detailed.inactiveEvents,
            domainsVisited: detailed.domainsVisited,
            domains: detailed.domains || [],
            queueSize: this.eventQueueManager.getQueueSize(),
            isTracking: detailed.isTracking
        };

        this._log('Отправка подробной статистики', response);
        sendResponse(response);
    }

    /**
     * Обрабатывает запрос проверки/тестирования соединения.
     * 
     * CHECK_CONNECTION - использует healthcheck (не отправляет события)
     * TEST_CONNECTION - отправляет накопленные реальные события из очереди
     * 
     * @private
     * @param {Function} sendResponse - Функция для отправки ответа
     * @param {string} messageType - Тип сообщения
     * @returns {void}
     */
    _handleTestConnection(sendResponse, messageType) {
        const isCheckConnection = messageType === MessageHandlerManager.MESSAGE_TYPES.CHECK_CONNECTION;
        
        if (isCheckConnection) {
            // Легковесная проверка через healthcheck
            this._log('Проверка доступности (healthcheck)');
            
            this.backendManager.checkHealth()
                .then(result => {
                    this._log('Результат healthcheck', result);
                    sendResponse(result);
                })
                .catch(error => {
                    this._logError('Ошибка healthcheck', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message 
                    });
                });
        } else {
            // TEST_CONNECTION - отправляем накопленные реальные события
            const queueSize = this.eventQueueManager.getQueueSize();
            
            if (queueSize === 0) {
                this._log('Очередь пуста, проверяем healthcheck');
                // Если нет событий, просто проверим healthcheck
                this.backendManager.checkHealth()
                    .then(result => {
                        sendResponse({ 
                            success: result.success, 
                            message: 'No events in queue, backend is available',
                            queueSize: 0
                        });
                    })
                    .catch(error => {
                        sendResponse({ 
                            success: false, 
                            error: error.message 
                        });
                    });
            } else {
                this._log('Принудительная отправка событий из очереди', { queueSize });
                
                // Отправляем все накопленные события
                this.eventQueueManager.processQueue()
                    .then(() => {
                        const remainingQueueSize = this.eventQueueManager.getQueueSize();
                        this._log('События успешно отправлены', { 
                            sent: queueSize - remainingQueueSize,
                            remaining: remainingQueueSize 
                        });
                        sendResponse({ 
                            success: true,
                            message: `Successfully sent ${queueSize - remainingQueueSize} events`,
                            sentEvents: queueSize - remainingQueueSize,
                            remainingInQueue: remainingQueueSize
                        });
                    })
                    .catch(error => {
                        this._logError('Ошибка отправки событий', error);
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

    _handleUpdateDomainExceptions(request, sendResponse) {
        try {
            const incoming = Array.isArray(request.domains)
                ? request.domains
                : (Array.isArray(request.data?.domains) ? request.data.domains : []);

            const normalized = normalizeDomainList(incoming);
            this._log('Обновление исключений доменов', { count: normalized.length });

            this.storageManager.saveDomainExceptions(normalized)
                .then(success => {
                    if (!success) {
                        throw new Error('Failed to save domain exceptions');
                    }
                    return this.eventQueueManager.setDomainExceptions(normalized);
                })
                .then(result => {
                    sendResponse({
                        success: true,
                        count: normalized.length,
                        removedFromQueue: result?.removedFromQueue || 0
                    });
                })
                .catch(error => {
                    this._logError('Ошибка обновления исключений доменов', error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                });
        } catch (error) {
            this._logError('Ошибка обработки запроса исключений доменов', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    _handleSetTrackingEnabled(request, sendResponse) {
        try {
            const enabled = typeof request.enabled === 'boolean'
                ? request.enabled
                : (typeof request.data?.enabled === 'boolean' ? request.data.enabled : null);

            if (enabled === null) {
                this._log('Поле enabled отсутствует в запросе изменения отслеживания');
                sendResponse({
                    success: false,
                    error: 'enabled flag is required'
                });
                return;
            }

            this._log('Запрос изменения состояния отслеживания', { enabled });

            this.trackingController.setTrackingEnabled(enabled)
                .then(result => {
                    sendResponse({
                        success: Boolean(result?.success),
                        isTracking: Boolean(result?.isTracking)
                    });
                })
                .catch(error => {
                    this._logError('Ошибка изменения состояния отслеживания', error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                });
        } catch (error) {
            this._logError('Ошибка обработки запроса изменения отслеживания', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
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
