const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * Менеджер уведомлений для отображения сообщений пользователю.
 * Отвечает за создание, отображение и удаление уведомлений.
 * 
 * @class NotificationManager
 * @extends BaseManager
 */
class NotificationManager extends BaseManager {
    /**
     * Типы уведомлений
     * @readonly
     * @enum {string}
     */
    static NOTIFICATION_TYPES = CONFIG.STATUS_TYPES;

    /**
     * Создает экземпляр NotificationManager.
     * 
     * @param {Object} options - Опции конфигурации
     * @param {boolean} options.autoClear - Автоматически очищать предыдущие уведомления
     * @param {number} options.maxNotifications - Максимальное количество уведомлений
     * @param {string} options.position - Позиция уведомлений ('top-right', 'top-left', 'bottom-right', 'bottom-left')
     * @param {Function} [options.translateFn] - Функция для получения переводов
     */
    constructor(options = {}) {
        super(options);

        /** @type {Set<HTMLElement>} */
        this.notifications = new Set();
        
        /** @type {boolean} */
        this.autoClear = options.autoClear !== undefined ? options.autoClear : CONFIG.NOTIFICATIONS.AUTO_CLEAR;
        
        /** @type {number} */
        this.maxNotifications = Math.max(1, options.maxNotifications || CONFIG.NOTIFICATIONS.MAX_COUNT);
        
        /** @type {string} */
        this.position = options.position || CONFIG.NOTIFICATIONS.POSITION;
        
        /** @type {Map<HTMLElement, number>} */
        this.timeouts = new Map();
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        /** @type {Map<string, number>} */
        this.notificationStats = new Map([
            ['total', 0],
            ['success', 0],
            ['error', 0],
            ['warning', 0],
            ['info', 0]
        ]);

        /** @type {Function} Функция для получения переводов */
        this.translateFn = options.translateFn || (() => '');

    }

    /**
     * Показывает уведомление пользователю.
     * 
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления (из NOTIFICATION_TYPES)
     * @param {Object} options - Дополнительные опции
     * @param {number} options.duration - Длительность отображения в мс
     * @param {boolean} options.closable - Можно ли закрыть уведомление кликом
     * @returns {HTMLElement} Созданный элемент уведомления
     */
    showNotification(message, type = NotificationManager.NOTIFICATION_TYPES.INFO, options = {}) {
        if (!message || typeof message !== 'string') {
            this._log({ key: 'logs.notification.warnMessageRequired' });
            return null;
        }

        if (!Object.values(NotificationManager.NOTIFICATION_TYPES).includes(type)) {
            this._log({ key: 'logs.notification.warnInvalidType', params: { type } });
            type = NotificationManager.NOTIFICATION_TYPES.INFO;
        }

        try {
            if (this.autoClear) {
                this.clearNotifications();
            }

            while (this.notifications.size >= this.maxNotifications) {
                const oldestNotification = this.notifications.values().next().value;
                this.removeNotification(oldestNotification);
            }

            const notification = this._createNotificationElement(message, type, options);
            this._positionNotification(notification);
            this._addNotificationToDOM(notification);
            this._animateIn(notification);
            this._scheduleRemoval(notification, options.duration);

            this.notificationStats.set('total', this.notificationStats.get('total') + 1);
            this.notificationStats.set(type, (this.notificationStats.get(type) || 0) + 1);

            this._log({ key: 'logs.notification.notificationCreated', params: { type } }, { message, options });

            return notification;
        } catch (error) {
            this._logError({ key: 'logs.notification.creationError' }, error);
            return null;
        }
    }

    /**
     * Создает элемент уведомления.
     * 
     * @private
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления
     * @param {Object} options - Опции
     * @returns {HTMLElement} Элемент уведомления
     */
    _createNotificationElement(message, type, options) {
        const notification = document.createElement('div');
        const classes = ['notification', `notification-${type}`];
        
        if (options.closable !== false) {
            classes.push('closable');
            notification.addEventListener('click', () => this.removeNotification(notification));
        }
        
        notification.className = classes.join(' ');
        notification.textContent = message;
        notification.setAttribute('data-type', type);
        notification.setAttribute('data-timestamp', Date.now().toString());

        return notification;
    }

    /**
     * Позиционирует уведомление в зависимости от настроек.
     * 
     * @private
     * @param {HTMLElement} notification - Элемент уведомления
     * @returns {void}
     */
    _positionNotification(notification) {
        const positionClass = `position-${this.position || 'top-right'}`;
        notification.classList.add(positionClass);
    }

    /**
     * Добавляет уведомление в DOM.
     * 
     * @private
     * @param {HTMLElement} notification - Элемент уведомления
     * @returns {void}
     */
    _addNotificationToDOM(notification) {
        if (!document.body) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.notification.documentBodyUnavailable'));
        }
        
        document.body.appendChild(notification);
        this.notifications.add(notification);
    }

    /**
     * Анимирует появление уведомления.
     * 
     * @private
     * @param {HTMLElement} notification - Элемент уведомления
     * @returns {void}
     */
    _animateIn(notification) {
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    }

    /**
     * Планирует удаление уведомления.
     * 
     * @private
     * @param {HTMLElement} notification - Элемент уведомления
     * @param {number} [duration] - Длительность в мс
     * @returns {void}
     */
    _scheduleRemoval(notification, duration) {
        const timeoutDuration = Number.isFinite(duration) && duration > 0
            ? duration
            : this.CONSTANTS.NOTIFICATION_DURATION;
            
        const timeoutId = setTimeout(() => {
            this.removeNotification(notification);
        }, timeoutDuration);
        
        this.timeouts.set(notification, timeoutId);
    }

    /**
     * Удаляет конкретное уведомление.
     * 
     * @param {HTMLElement} notification - Элемент уведомления
     * @returns {boolean} Успешно ли удалено уведомление
     */
    removeNotification(notification) {
        if (!notification || !this.notifications.has(notification)) {
            this._log({ key: 'logs.notification.notificationNotFound' });
            return false;
        }

        try {
            const timeoutId = this.timeouts.get(notification);
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.timeouts.delete(notification);
            }

            this.notifications.delete(notification);

            notification.classList.remove('show');
            notification.classList.add('hiding');

            setTimeout(() => {
                try {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                    this._log({ key: 'logs.notification.notificationRemoved' });
                } catch (error) {
                    this._logError({ key: 'logs.notification.removalError' }, error);
                }
            }, 300);

            return true;
        } catch (error) {
            this._logError({ key: 'logs.notification.removeError' }, error);
            return false;
        }
    }

    /**
     * Очищает все уведомления.
     * 
     * @returns {number} Количество удаленных уведомлений
     */
    clearNotifications() {
        const count = this.notifications.size;

        try {

            this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
            this.timeouts.clear();

            this.notifications.forEach(notification => {
                try {
                    if (notification && notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                } catch (error) {
                    this._logError({ key: 'logs.notification.removeError' }, error);
                }
            });

            this.notifications.clear();
            this._log({ key: 'logs.notification.cleared', params: { count } });
            
            return count;
        } catch (error) {
            this._logError({ key: 'logs.notification.clearError' }, error);
            return 0;
        }
    }

    /**
     * Получает метрики производительности.
     * 
     * @returns {Object} Метрики производительности
     */
    getPerformanceMetrics() {
        const metrics = {};
        this.performanceMetrics.forEach((value, key) => {
            metrics[key] = value;
        });
        return metrics;
    }
    
    /**
     * Получает статистику уведомлений.
     * 
     * @returns {Object} Статистика уведомлений
     */
    getNotificationStatistics() {
        const stats = {};
        this.notificationStats.forEach((value, key) => {
            stats[key] = value;
        });
        stats.currentActive = this.notifications.size;
        return stats;
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.notification.cleanupStart' });
        
        try {
            this.clearNotifications();
            this.notifications.clear();
            this.timeouts.clear();
            this.performanceMetrics.clear();
            this.notificationStats.clear();
            
            this._log({ key: 'logs.notification.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.notification.destroyError' }, error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
    module.exports.default = NotificationManager;
}

if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}
