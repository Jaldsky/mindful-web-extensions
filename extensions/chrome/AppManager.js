const BaseManager = typeof window !== 'undefined' ? window.BaseManager : require('./src/app_manager/BaseManager.js');
const DOMManager = typeof window !== 'undefined' ? window.DOMManager : require('./src/app_manager/DOMManager.js');

/**
 * Менеджер уведомлений для отображения сообщений пользователю.
 * Отвечает за создание, отображение и удаление уведомлений.
 * 
 * @class NotificationManager
 * @extends BaseManager
 */
class NotificationManager extends BaseManager {
    /**
     * Создает экземпляр NotificationManager.
     * 
     * @param {Object} options - Опции конфигурации
     */
    constructor(options = {}) {
        super(options);
    }

    /**
     * Показывает уведомление пользователю.
     * 
     * @param {string} message - Текст уведомления
     * @param {string} type - Тип уведомления ('success', 'error', 'info', 'warning')
     * @returns {void}
     */
    showNotification(message, type = 'info') {
        // Очищаем предыдущие уведомления
        this.clearNotifications();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Стили для уведомления
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Цвета в зависимости от типа
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.style.color = 'white';
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Автоматическое удаление
        setTimeout(() => {
            this.removeNotification(notification);
        }, this.CONSTANTS.NOTIFICATION_DURATION);
    }

    /**
     * Удаляет конкретное уведомление.
     * 
     * @param {HTMLElement} notification - Элемент уведомления
     * @returns {void}
     */
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    /**
     * Очищает все уведомления.
     * 
     * @returns {void}
     */
    clearNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }
}

/**
 * Менеджер для работы с Service Worker.
 * Отвечает за коммуникацию с фоновым скриптом.
 * 
 * @class ServiceWorkerManager
 * @extends BaseManager
 */
class ServiceWorkerManager extends BaseManager {
    /**
     * Создает экземпляр ServiceWorkerManager.
     * 
     * @param {Object} options - Опции конфигурации
     */
    constructor(options = {}) {
        super(options);
        this.messageHandlers = new Map();
        this.setupMessageListener();
    }

    /**
     * Настраивает слушатель сообщений от Service Worker.
     * 
     * @returns {void}
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message.data, sendResponse);
            }
        });
    }

    /**
     * Регистрирует обработчик сообщений.
     * 
     * @param {string} type - Тип сообщения
     * @param {Function} handler - Обработчик сообщения
     * @returns {void}
     */
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    /**
     * Отправляет сообщение в Service Worker.
     * 
     * @param {string} type - Тип сообщения
     * @param {Object} data - Данные сообщения
     * @returns {Promise} Промис с ответом
     */
    async sendMessage(type, data = {}) {
        try {
            return await chrome.runtime.sendMessage({type, data});
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            throw error;
        }
    }

    /**
     * Проверяет подключение к серверу.
     * 
     * @returns {Promise<boolean>} Статус подключения
     */
    async checkConnection() {
        try {
            const response = await this.sendMessage('checkConnection');
            return response?.success || false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Получает текущий статус отслеживания.
     * 
     * @returns {Promise<Object>} Статус отслеживания
     */
    async getTrackingStatus() {
        try {
            const response = await this.sendMessage('getTrackingStatus');
            return response || { isTracking: false, isOnline: false };
        } catch (error) {
            return { isTracking: false, isOnline: false };
        }
    }

    /**
     * Получает статистику за сегодня.
     * 
     * @returns {Promise<Object>} Статистика
     */
    async getTodayStats() {
        try {
            const response = await this.sendMessage('getTodayStats');
            return response || { events: 0, domains: 0, queue: 0 };
        } catch (error) {
            return { events: 0, domains: 0, queue: 0 };
        }
    }
}

/**
 * Менеджер диагностики для проверки состояния расширения.
 * Отвечает за запуск и отображение результатов диагностики.
 * 
 * @class DiagnosticsManager
 * @extends BaseManager
 */
class DiagnosticsManager extends BaseManager {
    /**
     * Создает экземпляр DiagnosticsManager.
     * 
     * @param {ServiceWorkerManager} serviceWorkerManager - Менеджер Service Worker
     * @param {NotificationManager} notificationManager - Менеджер уведомлений
     * @param {Object} options - Опции конфигурации
     */
    constructor(serviceWorkerManager, notificationManager, options = {}) {
        super(options);
        this.serviceWorkerManager = serviceWorkerManager;
        this.notificationManager = notificationManager;
    }

    /**
     * Запускает полную диагностику системы.
     * 
     * @returns {Promise<Object>} Результаты диагностики
     */
    async runDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            checks: {}
        };

        try {
            // Проверка подключения к Service Worker
            results.checks.serviceWorker = await this.checkServiceWorker();
            
            // Проверка подключения к серверу
            results.checks.connection = await this.checkServerConnection();
            
            // Проверка состояния отслеживания
            results.checks.tracking = await this.checkTrackingStatus();
            
            // Проверка статистики
            results.checks.stats = await this.checkStats();
            
            // Общий статус
            results.overall = this.calculateOverallStatus(results.checks);
            
            return results;
        } catch (error) {
            results.error = error.message;
            results.overall = 'error';
            return results;
        }
    }

    /**
     * Проверяет доступность Service Worker.
     * 
     * @returns {Promise<Object>} Результат проверки
     */
    async checkServiceWorker() {
        try {
            const response = await this.serviceWorkerManager.sendMessage('ping');
            return {
                status: 'ok',
                message: 'Service Worker доступен',
                response: response
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Service Worker недоступен',
                error: error.message
            };
        }
    }

    /**
     * Проверяет подключение к серверу.
     * 
     * @returns {Promise<Object>} Результат проверки
     */
    async checkServerConnection() {
        try {
            const isOnline = await this.serviceWorkerManager.checkConnection();
            return {
                status: isOnline ? 'ok' : 'error',
                message: isOnline ? 'Сервер доступен' : 'Сервер недоступен',
                isOnline: isOnline
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Ошибка проверки подключения',
                error: error.message
            };
        }
    }

    /**
     * Проверяет состояние отслеживания.
     * 
     * @returns {Promise<Object>} Результат проверки
     */
    async checkTrackingStatus() {
        try {
            const status = await this.serviceWorkerManager.getTrackingStatus();
            return {
                status: 'ok',
                message: 'Статус отслеживания получен',
                isTracking: status.isTracking,
                isOnline: status.isOnline
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Ошибка получения статуса',
                error: error.message
            };
        }
    }

    /**
     * Проверяет статистику.
     * 
     * @returns {Promise<Object>} Результат проверки
     */
    async checkStats() {
        try {
            const stats = await this.serviceWorkerManager.getTodayStats();
            return {
                status: 'ok',
                message: 'Статистика получена',
                stats: stats
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Ошибка получения статистики',
                error: error.message
            };
        }
    }

    /**
     * Вычисляет общий статус диагностики.
     * 
     * @param {Object} checks - Результаты проверок
     * @returns {string} Общий статус
     */
    calculateOverallStatus(checks) {
        const statuses = Object.values(checks).map(check => check.status);
        
        if (statuses.every(status => status === 'ok')) {
            return 'ok';
        } else if (statuses.some(status => status === 'error')) {
            return 'error';
        } else {
            return 'warning';
        }
    }

    /**
     * Отображает результаты диагностики.
     * 
     * @param {Object} results - Результаты диагностики
     * @returns {void}
     */
    displayDiagnosticResults(results) {
        const statusEmoji = {
            ok: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        const emoji = statusEmoji[results.overall] || '❓';
        const message = `${emoji} Диагностика завершена: ${results.overall}`;
        
        this.notificationManager.showNotification(message, results.overall === 'ok' ? 'success' : 'error');
        
        console.log('Diagnostics completed:', results);
    }
}

/**
 * Главный менеджер popup, координирующий работу всех компонентов.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class PopupManager
 * @extends BaseManager
 */
class PopupManager extends BaseManager {
    /**
     * Создает экземпляр PopupManager.
     * Инициализирует все необходимые менеджеры и настраивает их взаимодействие.
     */
    constructor() {
        super();
        
        // Инициализируем менеджеры
        this.domManager = new DOMManager();
        this.notificationManager = new NotificationManager();
        this.serviceWorkerManager = new ServiceWorkerManager();
        this.diagnosticsManager = new DiagnosticsManager(
            this.serviceWorkerManager, 
            this.notificationManager
        );
        
        // Управление интервалами
        this.updateInterval = null;
        
        this.init();
    }

    /**
     * Инициализирует менеджер popup.
     * Загружает начальный статус, настраивает обработчики событий и запускает периодические обновления статуса.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Загружаем начальный статус
            await this.loadInitialStatus();
            
            // Настраиваем обработчики событий
            this.setupEventHandlers();
            
            // Запускаем периодические обновления
            this.startPeriodicUpdates();
            
            console.log('Popup manager initialized successfully');
        } catch (error) {
            console.error('Ошибка инициализации popup:', error);
            this.notificationManager.showNotification('Ошибка инициализации', 'error');
        }
    }

    /**
     * Загружает начальный статус системы.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadInitialStatus() {
        try {
            // Проверяем подключение
            const isOnline = await this.serviceWorkerManager.checkConnection();
            this.domManager.updateConnectionStatus(isOnline);
            
            // Получаем статус отслеживания
            const trackingStatus = await this.serviceWorkerManager.getTrackingStatus();
            this.domManager.updateTrackingStatus(trackingStatus.isTracking);
            
            // Получаем статистику
            const stats = await this.serviceWorkerManager.getTodayStats();
            this.domManager.updateCounters(stats);
            
            console.log('Initial status loaded:', { isOnline, trackingStatus, stats });
        } catch (error) {
            console.error('Ошибка загрузки начального статуса:', error);
            this.notificationManager.showNotification('Ошибка загрузки статуса', 'error');
        }
    }

    /**
     * Настраивает обработчики событий для кнопок.
     * 
     * @returns {void}
     */
    setupEventHandlers() {
        // Кнопка настроек
        if (this.domManager.elements.openSettings) {
            this.domManager.elements.openSettings.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
        }
        
        // Кнопка тестирования подключения
        if (this.domManager.elements.testConnection) {
            this.domManager.elements.testConnection.addEventListener('click', async () => {
                await this.testConnection();
            });
        }
        
        // Кнопка перезагрузки расширения
        if (this.domManager.elements.reloadExtension) {
            this.domManager.elements.reloadExtension.addEventListener('click', () => {
                chrome.runtime.reload();
            });
        }
        
        // Кнопка диагностики
        if (this.domManager.elements.runDiagnostics) {
            this.domManager.elements.runDiagnostics.addEventListener('click', async () => {
                await this.runDiagnostics();
            });
        }
    }

    /**
     * Запускает периодические обновления статуса.
     * 
     * @returns {void}
     */
    startPeriodicUpdates() {
        this.updateInterval = setInterval(async () => {
            await this.updateStatus();
        }, this.CONSTANTS.UPDATE_INTERVAL);
    }

    /**
     * Останавливает периодические обновления.
     * 
     * @returns {void}
     */
    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Обновляет текущий статус системы.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async updateStatus() {
        try {
            // Проверяем подключение
            const isOnline = await this.serviceWorkerManager.checkConnection();
            this.domManager.updateConnectionStatus(isOnline);
            
            // Получаем статус отслеживания
            const trackingStatus = await this.serviceWorkerManager.getTrackingStatus();
            this.domManager.updateTrackingStatus(trackingStatus.isTracking);
            
            // Получаем статистику
            const stats = await this.serviceWorkerManager.getTodayStats();
            this.domManager.updateCounters(stats);
            
            // Обновляем время последнего обновления
            this.updateState({ lastUpdate: Date.now() });
            
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
        }
    }

    /**
     * Тестирует подключение к серверу.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async testConnection() {
        try {
            this.domManager.setButtonState(
                this.domManager.elements.testConnection, 
                'Testing...', 
                true
            );
            
            const isOnline = await this.serviceWorkerManager.checkConnection();
            
            if (isOnline) {
                this.notificationManager.showNotification('Подключение успешно!', 'success');
                this.domManager.updateConnectionStatus(true);
            } else {
                this.notificationManager.showNotification('Подключение не удалось', 'error');
                this.domManager.updateConnectionStatus(false);
            }
            
        } catch (error) {
            console.error('Ошибка тестирования подключения:', error);
            this.notificationManager.showNotification('Ошибка тестирования', 'error');
            this.domManager.updateConnectionStatus(false);
        } finally {
            this.domManager.setButtonState(
                this.domManager.elements.testConnection, 
                'Test Connection', 
                false
            );
        }
    }

    /**
     * Запускает диагностику системы.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async runDiagnostics() {
        try {
            this.domManager.setButtonState(
                this.domManager.elements.runDiagnostics, 
                'Running...', 
                true
            );
            
            const results = await this.diagnosticsManager.runDiagnostics();
            this.diagnosticsManager.displayDiagnosticResults(results);
            
        } catch (error) {
            console.error('Ошибка диагностики:', error);
            this.notificationManager.showNotification('Ошибка диагностики', 'error');
        } finally {
            this.domManager.setButtonState(
                this.domManager.elements.runDiagnostics, 
                'Run Diagnostics', 
                false
            );
        }
    }

    /**
     * Очищает ресурсы при закрытии popup.
     * 
     * @returns {void}
     */
    destroy() {
        this.stopPeriodicUpdates();
        console.log('Popup manager destroyed');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.popupManager = new PopupManager();
});

window.addEventListener('beforeunload', () => {
    if (window.popupManager) {
        window.popupManager.destroy();
    }
});