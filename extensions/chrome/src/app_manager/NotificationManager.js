const BaseManager = require('./BaseManager.js');

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
    static NOTIFICATION_TYPES = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    /**
     * Создает экземпляр NotificationManager.
     * 
     * @param {Object} options - Опции конфигурации
     * @param {boolean} options.autoClear - Автоматически очищать предыдущие уведомления
     * @param {number} options.maxNotifications - Максимальное количество уведомлений
     * @param {string} options.position - Позиция уведомлений ('top-right', 'top-left', 'bottom-right', 'bottom-left')
     */
    constructor(options = {}) {
        super(options);

        this.notifications = new Set();
        this.autoClear = options.autoClear !== false;
        this.maxNotifications = options.maxNotifications || 3;
        this.position = options.position || 'top-right';
        this.timeouts = new Map();

        this.initializeStyles();
    }

    /**
     * Логирует предупреждения (можно переопределить для кастомного логирования).
     * 
     * @param {string} message - Сообщение для логирования
     */
    logWarning(message) {
        console.warn(message);
    }

    /**
     * Инициализирует CSS стили для уведомлений.
     */
    initializeStyles() {
        if (document.getElementById('notification-styles')) return;

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 500;
                max-width: 350px;
                word-wrap: break-word;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                user-select: none;
            }
            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            .notification.notification-success {
                background-color: #4CAF50;
                color: white;
            }
            .notification.notification-error {
                background-color: #f44336;
                color: white;
            }
            .notification.notification-warning {
                background-color: #ff9800;
                color: white;
            }
            .notification.notification-info {
                background-color: #2196F3;
                color: white;
            }
        `;
        document.head.appendChild(style);
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
            this.logWarning('NotificationManager: message is required and must be a string');
            return null;
        }

        if (!Object.values(NotificationManager.NOTIFICATION_TYPES).includes(type)) {
            this.logWarning(`NotificationManager: invalid type "${type}", using INFO`);
            type = NotificationManager.NOTIFICATION_TYPES.INFO;
        }

        if (this.autoClear) {
            this.clearNotifications();
        }

        while (this.notifications.size >= this.maxNotifications) {
            const oldestNotification = this.notifications.values().next().value;
            this.notifications.delete(oldestNotification);
            this.removeNotification(oldestNotification);
        }

        const notification = this.createNotificationElement(message, type, options);
        this.positionNotification(notification);
        this.addNotificationToDOM(notification);
        this.animateIn(notification);
        this.scheduleRemoval(notification, options.duration);

        return notification;
    }

    /**
     * Создает элемент уведомления.
     */
    createNotificationElement(message, type, options) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('data-type', type);
        notification.setAttribute('data-timestamp', Date.now());

        if (options.closable !== false) {
            notification.addEventListener('click', () => this.removeNotification(notification));
        }

        return notification;
    }

    /**
     * Позиционирует уведомление в зависимости от настроек.
     */
    positionNotification(notification) {
        const positions = {
            'top-right': { top: '20px', right: '20px' },
            'top-left': { top: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' }
        };

        const position = positions[this.position] || positions['top-right'];
        Object.assign(notification.style, position);
    }

    /**
     * Добавляет уведомление в DOM.
     */
    addNotificationToDOM(notification) {
        document.body.appendChild(notification);
        this.notifications.add(notification);
    }

    /**
     * Анимирует появление уведомления.
     */
    animateIn(notification) {
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    }

    /**
     * Планирует удаление уведомления.
     */
    scheduleRemoval(notification, duration) {
        const timeoutDuration = duration || this.CONSTANTS.NOTIFICATION_DURATION;
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
            return false;
        }

        const timeoutId = this.timeouts.get(notification);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeouts.delete(notification);
        }

        notification.classList.remove('show');
        notification.style.transform = 'translateX(100%)';

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(notification);
        }, 300);

        return true;
    }

    /**
     * Очищает все уведомления.
     * 
     * @returns {number} Количество удаленных уведомлений
     */
    clearNotifications() {
        const count = this.notifications.size;

        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeouts.clear();

        this.notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });

        this.notifications.clear();
        return count;
    }

    /**
     * Получает количество активных уведомлений.
     * 
     * @returns {number} Количество активных уведомлений
     */
    getActiveNotificationsCount() {
        return this.notifications.size;
    }

    /**
     * Проверяет, есть ли активные уведомления.
     * 
     * @returns {boolean} Есть ли активные уведомления
     */
    hasActiveNotifications() {
        return this.notifications.size > 0;
    }

    /**
     * Получает все активные уведомления.
     * 
     * @returns {Array<HTMLElement>} Массив активных уведомлений
     */
    getActiveNotifications() {
        return Array.from(this.notifications);
    }

    /**
     * Получает уведомления по типу.
     * 
     * @param {string} type - Тип уведомления
     * @returns {Array<HTMLElement>} Массив уведомлений указанного типа
     */
    getNotificationsByType(type) {
        return Array.from(this.notifications).filter(
            notification => notification.getAttribute('data-type') === type
        );
    }

    /**
     * Обновляет настройки менеджера.
     * 
     * @param {Object} options - Новые настройки
     * @param {boolean} options.autoClear - Автоматически очищать предыдущие уведомления
     * @param {number} options.maxNotifications - Максимальное количество уведомлений
     * @param {string} options.position - Позиция уведомлений
     */
    updateSettings(options) {
        if (typeof options.autoClear === 'boolean') {
            this.autoClear = options.autoClear;
        }
        if (typeof options.maxNotifications === 'number' && options.maxNotifications > 0) {
            this.maxNotifications = options.maxNotifications;
        }
        if (typeof options.position === 'string') {
            this.position = options.position;
        }
    }

    /**
     * Показывает уведомление об успехе.
     * 
     * @param {string} message - Текст уведомления
     * @param {Object} options - Дополнительные опции
     * @returns {HTMLElement} Созданный элемент уведомления
     */
    showSuccess(message, options = {}) {
        return this.showNotification(message, NotificationManager.NOTIFICATION_TYPES.SUCCESS, options);
    }

    /**
     * Показывает уведомление об ошибке.
     * 
     * @param {string} message - Текст уведомления
     * @param {Object} options - Дополнительные опции
     * @returns {HTMLElement} Созданный элемент уведомления
     */
    showError(message, options = {}) {
        return this.showNotification(message, NotificationManager.NOTIFICATION_TYPES.ERROR, options);
    }

    /**
     * Показывает предупреждение.
     * 
     * @param {string} message - Текст уведомления
     * @param {Object} options - Дополнительные опции
     * @returns {HTMLElement} Созданный элемент уведомления
     */
    showWarning(message, options = {}) {
        return this.showNotification(message, NotificationManager.NOTIFICATION_TYPES.WARNING, options);
    }

    /**
     * Показывает информационное уведомление.
     * 
     * @param {string} message - Текст уведомления
     * @param {Object} options - Дополнительные опции
     * @returns {HTMLElement} Созданный элемент уведомления
     */
    showInfo(message, options = {}) {
        return this.showNotification(message, NotificationManager.NOTIFICATION_TYPES.INFO, options);
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     */
    destroy() {
        this.clearNotifications();
        this.notifications.clear();
        this.timeouts.clear();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}

if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}
