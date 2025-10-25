const BaseManager = require('../BaseManager.js');

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

        /** @type {Set<HTMLElement>} */
        this.notifications = new Set();
        
        /** @type {boolean} */
        this.autoClear = options.autoClear !== false;
        
        /** @type {number} */
        this.maxNotifications = Math.max(1, options.maxNotifications || 3);
        
        /** @type {string} */
        this.position = options.position || 'top-right';
        
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

        this._initializeStyles();
        this._log('NotificationManager инициализирован', {
            autoClear: this.autoClear,
            maxNotifications: this.maxNotifications,
            position: this.position
        });
    }

    /**
     * Логирует предупреждения.
     * 
     * @private
     * @param {string} message - Сообщение для логирования
     * @returns {void}
     */
    _logWarning(message) {
        // eslint-disable-next-line no-console
        console.warn(`[NotificationManager] ${message}`);
    }

    /**
     * Инициализирует CSS стили для уведомлений.
     * 
     * @private
     * @returns {void}
     */
    _initializeStyles() {
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
            this._logWarning('message обязателен и должен быть строкой');
            return null;
        }

        if (!Object.values(NotificationManager.NOTIFICATION_TYPES).includes(type)) {
            this._logWarning(`Неверный тип "${type}", используется INFO`);
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
            
            // Обновляем статистику
            this.notificationStats.set('total', this.notificationStats.get('total') + 1);
            this.notificationStats.set(type, (this.notificationStats.get(type) || 0) + 1);

            this._log(`Уведомление создано: ${type}`, { message, options });

            return notification;
        } catch (error) {
            this._logError('Ошибка создания уведомления', error);
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
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('data-type', type);
        notification.setAttribute('data-timestamp', Date.now().toString());

        if (options.closable !== false) {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', () => this.removeNotification(notification));
        }

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
     * 
     * @private
     * @param {HTMLElement} notification - Элемент уведомления
     * @returns {void}
     */
    _addNotificationToDOM(notification) {
        if (!document.body) {
            throw new Error('document.body недоступен');
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
            this._log('Уведомление не найдено или уже удалено');
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
            notification.style.transform = 'translateX(100%)';

            setTimeout(() => {
                try {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                    this._log('Уведомление удалено из DOM');
                } catch (error) {
                    this._logError('Ошибка при удалении уведомления из DOM', error);
                }
            }, 300);

            return true;
        } catch (error) {
            this._logError('Ошибка удаления уведомления', error);
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
                    this._logError('Ошибка удаления уведомления', error);
                }
            });

            this.notifications.clear();
            this._log(`Очищено уведомлений: ${count}`);
            
            return count;
        } catch (error) {
            this._logError('Ошибка очистки уведомлений', error);
            return 0;
        }
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
     * @param {boolean} [options.autoClear] - Автоматически очищать предыдущие уведомления
     * @param {number} [options.maxNotifications] - Максимальное количество уведомлений
     * @param {string} [options.position] - Позиция уведомлений
     * @throws {TypeError} Если options не является объектом
     * @returns {void}
     */
    updateSettings(options) {
        if (!options || typeof options !== 'object') {
            throw new TypeError('options должен быть объектом');
        }

        try {
            if (typeof options.autoClear === 'boolean') {
                this.autoClear = options.autoClear;
                this._log(`autoClear обновлен: ${this.autoClear}`);
            }
            
            if (typeof options.maxNotifications === 'number' && options.maxNotifications > 0) {
                this.maxNotifications = Math.max(1, Math.floor(options.maxNotifications));
                this._log(`maxNotifications обновлен: ${this.maxNotifications}`);
            }
            
            if (typeof options.position === 'string') {
                this.position = options.position;
                this._log(`position обновлен: ${this.position}`);
            }
        } catch (error) {
            this._logError('Ошибка обновления настроек', error);
            throw error;
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
        this._log('Очистка ресурсов NotificationManager');
        
        try {
            this.clearNotifications();
            this.notifications.clear();
            this.timeouts.clear();
            this.performanceMetrics.clear();
            this.notificationStats.clear();
            
            this._log('NotificationManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении NotificationManager', error);
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
