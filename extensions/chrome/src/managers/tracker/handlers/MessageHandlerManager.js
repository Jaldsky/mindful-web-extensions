const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');
const StatusHandlerManager = require('./StatusHandlerManager.js');
const ConnectionHandlerManager = require('./ConnectionHandlerManager.js');
const SettingsHandlerManager = require('./SettingsHandlerManager.js');
const DebugHandlerManager = require('./DebugHandlerManager.js');
const AuthHandlerManager = require('./AuthHandlerManager.js');

/**
 * @typedef {Object} MessageResponse
 * @property {boolean} [success] - Успешность операции
 * @property {*} [data] - Данные ответа
 * @property {string} [error] - Сообщение об ошибке
 */

/**
 * Менеджер для обработки сообщений от других компонентов расширения.
 * Отвечает за коммуникацию между Service Worker и UI компонентами.
 * Использует композицию для разделения ответственности между специализированными обработчиками.
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
     * @param {Object} dependencies.trackingController - Контроллер трекера
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.statisticsManager || !dependencies.eventQueueManager || 
            !dependencies.backendManager || !dependencies.storageManager || !dependencies.trackingController) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.messageHandler.dependenciesRequired') || 'MessageHandlerManager requires all managers');
        }

        /** 
         * Менеджер статистики для получения статистики
         * @type {Object}
         */
        this.statisticsManager = dependencies.statisticsManager;
        
        /** 
         * Менеджер очереди событий для управления очередью
         * @type {Object}
         */
        this.eventQueueManager = dependencies.eventQueueManager;
        
        /** 
         * Менеджер backend для отправки событий и проверки соединения
         * @type {Object}
         */
        this.backendManager = dependencies.backendManager;
        
        /** 
         * Менеджер хранилища для сохранения/загрузки данных
         * @type {Object}
         */
        this.storageManager = dependencies.storageManager;

        /** 
         * Контроллер трекера для управления состоянием отслеживания
         * @type {Object}
         */
        this.trackingController = dependencies.trackingController;
        
        /** 
         * Функция-слушатель сообщений Chrome API
         * @type {Function|null}
         */
        this.messageListener = null;

        /** 
         * Менеджер обработки статуса и статистики
         * @type {StatusHandlerManager}
         */
        this.statusHandler = new StatusHandlerManager(
            {
                statisticsManager: this.statisticsManager,
                eventQueueManager: this.eventQueueManager
            },
            { enableLogging: this.enableLogging }
        );

        /** 
         * Менеджер обработки проверки соединения
         * @type {ConnectionHandlerManager}
         */
        this.connectionHandler = new ConnectionHandlerManager(
            {
                backendManager: this.backendManager,
                eventQueueManager: this.eventQueueManager
            },
            { enableLogging: this.enableLogging }
        );

        /** 
         * Менеджер обработки настроек
         * @type {SettingsHandlerManager}
         */
        this.settingsHandler = new SettingsHandlerManager(
            {
                backendManager: this.backendManager,
                storageManager: this.storageManager,
                eventQueueManager: this.eventQueueManager,
                trackingController: this.trackingController
            },
            { enableLogging: this.enableLogging }
        );

        /** 
         * Менеджер обработки отладочных функций
         * @type {DebugHandlerManager}
         */
        this.debugHandler = new DebugHandlerManager(
            {
                statisticsManager: this.statisticsManager
            },
            { enableLogging: this.enableLogging }
        );

        this.authHandler = new AuthHandlerManager(
            {
                backendManager: this.backendManager,
                storageManager: this.storageManager
            },
            { enableLogging: this.enableLogging }
        );
    }

    /**
     * Инициализирует обработчик сообщений.
     * Настраивает слушатель сообщений Chrome API для обработки входящих сообщений
     * от других компонентов расширения (Service Worker, UI компоненты).
     * 
     * Если слушатель уже существует, он удаляется перед созданием нового.
     * 
     * @returns {void}
     */
    init() {
        this._executeWithTiming('init', () => {
            if (this.messageListener) {
                chrome.runtime.onMessage.removeListener(this.messageListener);
            }

            this.messageListener = (request, sender, sendResponse) => {
                this._handleMessage(request, sender, sendResponse);
                return true;
            };

            chrome.runtime.onMessage.addListener(this.messageListener);
        });
    }

    /**
     * Обрабатывает входящее сообщение.
     * 
     * Проверяет тип сообщения, блокирует неслужебные сообщения при отключенном трекинге
     * или офлайн режиме, и направляет сообщение соответствующему обработчику.
     * 
     * @private
     * @param {Object} request - Объект запроса с полями type/action и data
     * @param {Object} sender - Отправитель сообщения (Chrome API)
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    _handleMessage(request, sender, sendResponse) {
        const messageType = request.type || request.action;
        
        const isSystemMessage = this._isSystemMessage(messageType, MessageHandlerManager.MESSAGE_TYPES);
        if (!isSystemMessage) {
            this._log({ key: 'logs.messageHandler.messageReceived' }, { type: messageType, request });
        }

        try {
            const blockCheck = this._shouldBlockMessage(
                messageType,
                MessageHandlerManager.MESSAGE_TYPES,
                () => this.statisticsManager.isTrackingEnabled(),
                () => this.eventQueueManager.state.isOnline
            );

            if (blockCheck.shouldBlock) {
                const isTracking = this.statisticsManager.isTrackingEnabled();
                const isOnline = this.eventQueueManager.state.isOnline;
                
                this._log({ key: 'logs.messageHandler.messageBlocked', params: { messageType, reason: blockCheck.reason } });
                
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
                    this.statusHandler.handlePing(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GET_STATUS:
                case MessageHandlerManager.MESSAGE_TYPES.GET_TRACKING_STATUS:
                    this.statusHandler.handleGetStatus(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GET_TODAY_STATS:
                    this.statusHandler.handleGetTodayStats(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GET_DETAILED_STATS:
                    this.statusHandler.handleGetDetailedStats(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.TEST_CONNECTION:
                case MessageHandlerManager.MESSAGE_TYPES.CHECK_CONNECTION:
                    this.connectionHandler.handleTestConnection(sendResponse, messageType);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GENERATE_RANDOM_DOMAINS:
                    this.debugHandler.handleGenerateRandomDomains(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.UPDATE_BACKEND_URL:
                    this.settingsHandler.handleUpdateBackendUrl(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.UPDATE_DOMAIN_EXCEPTIONS:
                    this.settingsHandler.handleUpdateDomainExceptions(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.SET_TRACKING_ENABLED:
                    this.settingsHandler.handleSetTrackingEnabled(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.AUTH_LOGIN:
                    this.authHandler.handleLogin(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.AUTH_LOGOUT:
                    this.authHandler.handleLogout(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.GET_AUTH_STATUS:
                    this.authHandler.handleGetAuthStatus(sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.AUTH_REGISTER:
                    this.authHandler.handleRegister(request, sendResponse);
                    break;
                case MessageHandlerManager.MESSAGE_TYPES.AUTH_VERIFY:
                    this.authHandler.handleVerify(request, sendResponse);
                    break;
                case MessageHandlerManager.MESSAGE_TYPES.AUTH_RESEND_CODE:
                    this.authHandler.handleResendCode(request, sendResponse);
                    break;

                case MessageHandlerManager.MESSAGE_TYPES.CLEAR_SESSION:
                    this.authHandler.handleClearSession(sendResponse);
                    break;

                default: {
                    this._log({ key: 'logs.messageHandler.unknownMessageType', params: { messageType } });
                    const t = this._getTranslateFn();
                    sendResponse({ 
                        success: false, 
                        error: t('logs.messageHandler.unknownMessageType', { messageType }) 
                    });
                }
            }
        } catch (error) {
            this._logError({ key: 'logs.messageHandler.messageProcessingError' }, error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }

    /**
     * Удаляет слушатель сообщений.
     * 
     * Удаляет зарегистрированный слушатель сообщений Chrome API.
     * Используется при уничтожении менеджера или переинициализации.
     * 
     * @returns {void}
     */
    removeListener() {
        if (this.messageListener) {
            chrome.runtime.onMessage.removeListener(this.messageListener);
            this.messageListener = null;
            this._log({ key: 'logs.messageHandler.listenerRemoved' });
        }
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * Удаляет слушатель сообщений Chrome API и очищает все внутренние данные.
     * Уничтожает все вложенные обработчики.
     * 
     * @returns {void}
     */
    destroy() {
        this.removeListener();
        
        if (this.statusHandler) {
            this.statusHandler.destroy();
        }
        if (this.connectionHandler) {
            this.connectionHandler.destroy();
        }
        if (this.settingsHandler) {
            this.settingsHandler.destroy();
        }
        if (this.debugHandler) {
            this.debugHandler.destroy();
        }
        
        super.destroy();
        this._log({ key: 'logs.messageHandler.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageHandlerManager;
    module.exports.default = MessageHandlerManager;
}

if (typeof window !== 'undefined') {
    window.MessageHandlerManager = MessageHandlerManager;
}
