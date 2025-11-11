const CONFIG = require('../config/config.js');

/**
 * Базовый менеджер для работы с сообщениями.
 * 
 * @class MessageManager
 */
class MessageManager {
    /**
     * Создает экземпляр MessageManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {Function} [options.getTranslateFn] - Функция получения функции перевода
     */
    constructor(options = {}) {
        this.getTranslateFn = options.getTranslateFn;
    }

    /**
     * Получает список служебных сообщений, которые обрабатываются независимо от статуса отслеживания.
     * 
     * @protected
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @returns {Array<string>} Массив типов служебных сообщений
     */
    _getSystemMessages(messageTypes) {
        if (!messageTypes || typeof messageTypes !== 'object') {
            return [];
        }

        if (CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES && Array.isArray(CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES)) {
            return CONFIG.MESSAGE_TYPES.SYSTEM_MESSAGES
                .map(typeKey => messageTypes[typeKey])
                .filter(Boolean);
        }

        return [
            messageTypes.PING,
            messageTypes.GET_STATUS,
            messageTypes.GET_TRACKING_STATUS,
            messageTypes.GET_TODAY_STATS,
            messageTypes.GET_DETAILED_STATS,
            messageTypes.SET_TRACKING_ENABLED,
            messageTypes.CHECK_CONNECTION,
            messageTypes.UPDATE_BACKEND_URL,
            messageTypes.UPDATE_DOMAIN_EXCEPTIONS
        ].filter(Boolean);
    }

    /**
     * Проверяет, является ли сообщение служебным.
     * 
     * @protected
     * @param {string} messageType - Тип сообщения
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @returns {boolean} true, если сообщение служебное
     */
    _isSystemMessage(messageType, messageTypes) {
        if (!messageType || typeof messageType !== 'string') {
            return false;
        }

        const systemMessages = this._getSystemMessages(messageTypes);
        return systemMessages.includes(messageType);
    }

    /**
     * Проверяет, нужно ли блокировать сообщение на основе статуса отслеживания и подключения.
     * 
     * @protected
     * @param {string} messageType - Тип сообщения
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @param {Function} getTrackingStatus - Функция, возвращающая статус отслеживания (boolean)
     * @param {Function} getOnlineStatus - Функция, возвращающая статус подключения (boolean)
     * @param {Object} [state] - Состояние менеджера
     * @returns {{shouldBlock: boolean, reason?: string, reasonKey?: string}} Результат проверки
     */
    _shouldBlockMessage(messageType, messageTypes, getTrackingStatus, getOnlineStatus, state) {
        if (this._isSystemMessage(messageType, messageTypes)) {
            return { shouldBlock: false };
        }

        const translate = this.getTranslateFn ? this.getTranslateFn() : null;

        const isTracking = typeof getTrackingStatus === 'function' 
            ? getTrackingStatus() 
            : (state?.isTracking !== undefined ? Boolean(state.isTracking) : true);

        if (!isTracking) {
            const reasonKey = 'logs.baseManager.trackingDisabled';
            return { 
                shouldBlock: true, 
                reason: translate ? translate(reasonKey) : 'Tracking is disabled',
                reasonKey
            };
        }

        const isOnline = typeof getOnlineStatus === 'function' 
            ? getOnlineStatus() 
            : (state?.isOnline !== undefined ? Boolean(state.isOnline) : true);

        if (!isOnline) {
            const reasonKey = 'logs.baseManager.noConnection';
            return { 
                shouldBlock: true, 
                reason: translate ? translate(reasonKey) : 'No connection',
                reasonKey
            };
        }

        return { shouldBlock: false };
    }

    /**
     * Проверяет, является ли ошибка связанной с блокировкой сообщения
     * (отслеживание отключено или нет подключения).
     * 
     * @protected
     * @param {Error} error - Объект ошибки
     * @returns {boolean} true, если ошибка связана с блокировкой сообщения
     */
    _isBlockingError(error) {
        if (!error || !error.message) {
            return false;
        }

        const message = String(error.message).toLowerCase();
        return CONFIG.MESSAGE_TYPES.BLOCKING_ERROR_PATTERNS.some(pattern => 
            message.includes(pattern.toLowerCase())
        );
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageManager;
    module.exports.default = MessageManager;
}
