/**
 * Базовый класс для управления состоянием и константами.
 * Содержит общую логику для всех компонентов popup.
 * 
 * @class BaseManager
 */
class BaseManager {
    /**
     * Создает экземпляр BaseManager.
     * 
     * @param {Object} options - Опции конфигурации
     */
    constructor(options = {}) {
        this.CONSTANTS = {
            UPDATE_INTERVAL: 2000,
            NOTIFICATION_DURATION: 3000,
            PING_TIMEOUT: 5000,
            THROTTLE_DELAY: 1000
        };
        
        this.state = {
            isOnline: false,
            isTracking: false,
            lastUpdate: 0
        };
        
        this.options = { ...options };
    }

    /**
     * Обновляет внутреннее состояние.
     * 
     * @param {Object} newState - Новое состояние
     * @returns {void}
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Получает текущее состояние.
     * 
     * @returns {Object} Текущее состояние
     */
    getState() {
        return { ...this.state };
    }
}

/**
 * Менеджер для работы с DOM элементами.
 * Отвечает за кэширование и обновление UI элементов.
 * 
 * @class DOMManager
 * @extends BaseManager
 */
class DOMManager extends BaseManager {
    /**
     * Создает экземпляр DOMManager.
     * 
     * @param {Object} options - Опции конфигурации
     */
    constructor(options = {}) {
        super(options);
        this.elements = this.cacheDOMElements();
    }

    /**
     * Кэширует часто используемые DOM элементы для лучшей производительности.
     * 
     * @returns {Object} Объект, содержащий кэшированные DOM элементы
     */
    cacheDOMElements() {
        return {
            connectionStatus: document.getElementById('connectionStatus'),
            trackingStatus: document.getElementById('trackingStatus'),
            eventsCount: document.getElementById('eventsCount'),
            domainsCount: document.getElementById('domainsCount'),
            queueSize: document.getElementById('queueSize'),
            openSettings: document.getElementById('openSettings'),
            testConnection: document.getElementById('testConnection'),
            reloadExtension: document.getElementById('reloadExtension'),
            runDiagnostics: document.getElementById('runDiagnostics')
        };
    }

    /**
     * Обновляет отображение статуса подключения в popup.
     * 
     * @param {boolean} isOnline - Подключен ли интернет
     * @returns {void}
     */
    updateConnectionStatus(isOnline) {
        if (!this.elements.connectionStatus) return;
        
        if (isOnline) {
            this.elements.connectionStatus.textContent = 'Online';
            this.elements.connectionStatus.className = 'status-value online';
        } else {
            this.elements.connectionStatus.textContent = 'Offline';
            this.elements.connectionStatus.className = 'status-value offline';
        }
    }

    /**
     * Обновляет отображение статуса отслеживания в popup.
     * 
     * @param {boolean} isTracking - Активно ли отслеживание
     * @returns {void}
     */
    updateTrackingStatus(isTracking) {
        if (!this.elements.trackingStatus) return;
        
        if (isTracking) {
            this.elements.trackingStatus.textContent = 'Active';
            this.elements.trackingStatus.className = 'status-value active';
        } else {
            this.elements.trackingStatus.textContent = 'Inactive';
            this.elements.trackingStatus.className = 'status-value inactive';
        }
    }

    /**
     * Обновляет отображение статистики в popup.
     * 
     * @param {Object} stats - Объект статистики, содержащий данные отслеживания
     * @param {number} [stats.eventsTracked] - Количество отслеженных событий
     * @param {number} [stats.domainsVisited] - Количество посещенных доменов
     * @param {number} [stats.queueSize] - Размер очереди событий
     * @returns {void}
     */
    updateStats(stats) {
        if (!stats) return;
        
        const updates = {
            eventsCount: stats.eventsTracked || 0,
            domainsCount: stats.domainsVisited || 0,
            queueSize: stats.queueSize || 0
        };

        Object.entries(updates).forEach(([elementId, value]) => {
            const element = this.elements[elementId];
            if (element) {
                element.textContent = value;
            }
        });
    }

    /**
     * Устанавливает состояние кнопки (текст и статус отключения).
     * 
     * @param {HTMLElement} button - Элемент кнопки
     * @param {string} text - Текст кнопки
     * @param {boolean} disabled - Отключена ли кнопка
     * @returns {void}
     */
    setButtonState(button, text, disabled) {
        button.textContent = text;
        button.disabled = disabled;
    }
}

/**
 * Менеджер для работы с уведомлениями.
 * Отвечает за отображение и управление уведомлениями пользователю.
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
     * Показывает временное уведомление пользователю с улучшенной стилизацией.
     * 
     * @param {string} message - Текст уведомления
     * @param {'success'|'error'} type - Тип уведомления (успех или ошибка)
     * @returns {void}
     */
    showNotification(message, type) {
        // Удаляем существующие уведомления
        this.clearNotifications();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = this.getNotificationStyles(type);
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Автоматическое удаление уведомления
        setTimeout(() => {
            this.removeNotification(notification);
        }, this.CONSTANTS.NOTIFICATION_DURATION);
    }

    /**
     * Получает стили уведомления в зависимости от типа.
     * 
     * @param {'success'|'error'} type - Тип уведомления
     * @returns {string} CSS стили
     */
    getNotificationStyles(type) {
        const baseStyles = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            padding: 12px;
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: opacity 0.3s ease;
        `;
        
        const typeStyles = type === 'success' 
            ? 'background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;'
            : 'background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;';
        
        return baseStyles + typeStyles;
    }

    /**
     * Очищает все существующие уведомления.
     * 
     * @returns {void}
     */
    clearNotifications() {
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => this.removeNotification(notification));
    }

    /**
     * Удаляет конкретное уведомление.
     * 
     * @param {HTMLElement} notification - Элемент уведомления для удаления
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
}

/**
 * Менеджер для работы с service worker.
 * Отвечает за коммуникацию с background script.
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
    }

    /**
     * Отправляет ping в service worker с обработкой таймаутов.
     * 
     * @async
     * @returns {Promise<boolean>} true если service worker отвечает, false в противном случае
     */
    async pingServiceWorker() {
        try {
            const response = await Promise.race([
                chrome.runtime.sendMessage({ action: 'ping' }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Ping timeout')), this.CONSTANTS.PING_TIMEOUT)
                )
            ]);
            
            return response && response.success;
        } catch (error) {
            console.error('Ping failed:', error);
            return false;
        }
    }

    /**
     * Получает статус из service worker с обработкой таймаутов.
     * 
     * @async
     * @returns {Promise<Object|null>} Ответ статуса или null при ошибке
     */
    async getStatusFromServiceWorker() {
        try {
            return await chrome.runtime.sendMessage({action: 'getStatus'});
        } catch (error) {
            console.error('Failed to get status from service worker:', error);
            return null;
        }
    }

    /**
     * Тестирует подключение к бэкенду.
     * 
     * @async
     * @returns {Promise<Object>} Результат теста подключения
     */
    async testConnection() {
        try {
            return await chrome.runtime.sendMessage({action: 'testConnection'});
        } catch (error) {
            console.error('Connection test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Перезагружает расширение.
     * 
     * @returns {void}
     */
    reloadExtension() {
        try {
            chrome.runtime.reload();
        } catch (error) {
            console.error('Error reloading extension:', error);
            throw error;
        }
    }
}

/**
 * Менеджер для диагностики системы.
 * Отвечает за комплексную проверку состояния расширения.
 * 
 * @class DiagnosticsManager
 * @extends BaseManager
 */
class DiagnosticsManager extends BaseManager {
    /**
     * Создает экземпляр DiagnosticsManager.
     * 
     * @param {ServiceWorkerManager} serviceWorkerManager - Менеджер service worker
     * @param {NotificationManager} notificationManager - Менеджер уведомлений
     * @param {Object} options - Опции конфигурации
     */
    constructor(serviceWorkerManager, notificationManager, options = {}) {
        super(options);
        this.serviceWorkerManager = serviceWorkerManager;
        this.notificationManager = notificationManager;
    }

    /**
     * Запускает комплексную диагностику с улучшенной обработкой ошибок и отчетностью.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async runDiagnostics() {
        try {
            console.log('Running diagnostics...');
            
            const diagnostics = await this.runDiagnosticTests();
            this.displayDiagnosticResults(diagnostics);
            
        } catch (error) {
            console.error('Diagnostics error:', error);
            this.notificationManager.showNotification(`Diagnostics failed: ${error.message}`, 'error');
        }
    }

    /**
     * Запускает все диагностические тесты.
     * 
     * @async
     * @returns {Promise<Object>} Результаты диагностики
     */
    async runDiagnosticTests() {
        // Проверяем доступность Chrome APIs
        if (typeof chrome === 'undefined') {
            throw new Error('Chrome APIs not available. This popup is not running in extension context.');
        }
        
        if (!chrome.runtime) {
            throw new Error('chrome.runtime not available. Extension may not be properly loaded.');
        }
        
        console.log('Chrome APIs available, testing service worker...');
        
        const tests = [
            { name: 'Service Worker', test: () => this.testServiceWorker() },
            { name: 'Status API', test: () => this.testStatusAPI() },
            { name: 'Backend API', test: () => this.testBackendAPI() }
        ];
        
        const results = {};
        
        for (const { name, test } of tests) {
            try {
                results[name] = await test();
            } catch (error) {
                results[name] = { success: false, error: error.message };
            }
        }
        
        return results;
    }

    /**
     * Тестирует подключение к service worker.
     * 
     * @async
     * @returns {Promise<Object>} Результат теста
     */
    async testServiceWorker() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'ping' });
            return { success: response && response.success };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Тестирует API статуса.
     * 
     * @async
     * @returns {Promise<Object>} Результат теста
     */
    async testStatusAPI() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
            return { success: !!response };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Тестирует API бэкенда.
     * 
     * @async
     * @returns {Promise<Object>} Результат теста
     */
    async testBackendAPI() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'testConnection' });
            return { 
                success: response && response.success,
                error: response && !response.success ? response.error : null
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Отображает результаты диагностики.
     * 
     * @param {Object} results - Результаты диагностики
     * @returns {void}
     */
    displayDiagnosticResults(results) {
        const resultMessages = [];
        let allGood = true;
        
        Object.entries(results).forEach(([name, result]) => {
            const status = result.success ? '✅ OK' : `❌ FAILED${result.error ? ` (${result.error})` : ''}`;
            resultMessages.push(`${name}: ${status}`);
            if (!result.success) allGood = false;
        });
        
        const message = resultMessages.join('\n');
        
        if (allGood) {
            this.notificationManager.showNotification('All diagnostics passed! ✅', 'success');
        } else {
            this.notificationManager.showNotification(`Diagnostics completed:\n${message}`, 'error');
        }
        
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
            await this.loadStatus();
            this.setupEventListeners();
            this.startPeriodicUpdates();
        } catch (error) {
            console.error('Failed to initialize popup manager:', error);
            this.notificationManager.showNotification('Failed to initialize popup', 'error');
        }
    }

    /**
     * Настраивает обработчики событий для кнопок popup с улучшенной обработкой ошибок.
     * 
     * @returns {void}
     */
    setupEventListeners() {
        const eventHandlers = {
            openSettings: () => chrome.runtime.openOptionsPage(),
            testConnection: () => this.testConnection(),
            reloadExtension: () => this.reloadExtension(),
            runDiagnostics: () => this.runDiagnostics()
        };

        Object.entries(eventHandlers).forEach(([elementId, handler]) => {
            const element = this.domManager.elements[elementId];
            if (element) {
                element.addEventListener('click', handler);
            } else {
                console.warn(`Element with id '${elementId}' not found`);
            }
        });
    }

    /**
     * Запускает периодические обновления статуса с оптимизированным управлением интервалами.
     * 
     * @returns {void}
     */
    startPeriodicUpdates() {
        // Очищаем существующий интервал
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.loadStatus();
        }, this.CONSTANTS.UPDATE_INTERVAL);
    }

    /**
     * Загружает и отображает текущий статус из service worker.
     * Обновляет статус подключения, статус отслеживания и статистику с ограничением частоты.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadStatus() {
        const now = Date.now();
        
        // Ограничиваем частоту обновлений для предотвращения избыточных API вызовов
        if (now - this.state.lastUpdate < this.CONSTANTS.THROTTLE_DELAY) {
            return;
        }
        
        this.updateState({ lastUpdate: now });

        try {
            const pingResponse = await this.serviceWorkerManager.pingServiceWorker();
            
            if (pingResponse) {
                const response = await this.serviceWorkerManager.getStatusFromServiceWorker();
                
                if (response) {
                    this.updateUI(response);
                } else {
                    this.setOfflineState();
                }
            } else {
                this.setOfflineState();
            }
        } catch (error) {
            console.error('Error loading status:', error);
            this.setOfflineState();
        }
    }

    /**
     * Обновляет UI новыми данными статуса.
     * 
     * @param {Object} response - Ответ статуса от service worker
     * @param {boolean} response.isOnline - Подключен ли интернет
     * @param {boolean} response.isTracking - Активно ли отслеживание
     * @param {Object} response.stats - Объект статистики
     * @returns {void}
     */
    updateUI(response) {
        this.domManager.updateConnectionStatus(response.isOnline);
        this.domManager.updateTrackingStatus(response.isTracking);
        this.domManager.updateStats(response.stats);
        
        // Обновляем внутреннее состояние
        this.updateState({
            isOnline: response.isOnline,
            isTracking: response.isTracking
        });
    }

    /**
     * Устанавливает UI в состояние офлайн.
     * 
     * @returns {void}
     */
    setOfflineState() {
        this.domManager.updateConnectionStatus(false);
        this.domManager.updateTrackingStatus(false);
        this.updateState({
            isOnline: false,
            isTracking: false
        });
    }

    /**
     * Тестирует подключение к серверу бэкенда с улучшенным UX.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async testConnection() {
        if (!this.domManager.elements.testConnection) return;
        
        const button = this.domManager.elements.testConnection;
        const originalText = button.textContent;
        
        this.domManager.setButtonState(button, 'Testing...', true);
        
        try {
            console.log('Starting connection test...');
            
            const pingResponse = await this.serviceWorkerManager.pingServiceWorker();
            
            if (!pingResponse) {
                this.notificationManager.showNotification('Service worker not responding. Please reload the extension.', 'error');
                return;
            }
            
            const response = await this.serviceWorkerManager.testConnection();
            console.log('Connection test response:', response);
            
            this.handleConnectionTestResponse(response);
            
        } catch (error) {
            console.error('Connection test error:', error);
            this.handleConnectionTestError(error);
        } finally {
            this.domManager.setButtonState(button, originalText, false);
        }
    }

    /**
     * Обрабатывает ответ теста подключения.
     * 
     * @param {Object} response - Ответ от теста подключения
     * @returns {void}
     */
    handleConnectionTestResponse(response) {
        if (response && response.success) {
            this.notificationManager.showNotification('Connection successful!', 'success');
        } else if (response) {
            this.notificationManager.showNotification(`Backend connection failed: ${response.error}`, 'error');
        } else {
            this.notificationManager.showNotification('No response from service worker', 'error');
        }
    }

    /**
     * Обрабатывает ошибки теста подключения.
     * 
     * @param {Error} error - Ошибка от теста подключения
     * @returns {void}
     */
    handleConnectionTestError(error) {
        if (error.message.includes('Receiving end does not exist')) {
            this.notificationManager.showNotification('Extension not active. Please reload the extension.', 'error');
        } else {
            this.notificationManager.showNotification(`Connection test failed: ${error.message}`, 'error');
        }
    }

    /**
     * Перезагружает расширение для перезапуска service worker.
     * 
     * @returns {void}
     */
    reloadExtension() {
        try {
            this.serviceWorkerManager.reloadExtension();
            this.notificationManager.showNotification('Extension reloaded!', 'success');
        } catch (error) {
            console.error('Error reloading extension:', error);
            this.notificationManager.showNotification('Failed to reload extension', 'error');
        }
    }

    /**
     * Запускает комплексную диагностику с улучшенной обработкой ошибок и отчетностью.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async runDiagnostics() {
        if (!this.domManager.elements.runDiagnostics) return;
        
        const button = this.domManager.elements.runDiagnostics;
        const originalText = button.textContent;
        
        this.domManager.setButtonState(button, 'Running...', true);
        
        try {
            await this.diagnosticsManager.runDiagnostics();
        } catch (error) {
            console.error('Diagnostics error:', error);
            this.notificationManager.showNotification(`Diagnostics failed: ${error.message}`, 'error');
        } finally {
            this.domManager.setButtonState(button, originalText, false);
        }
    }

    /**
     * Метод очистки для удаления интервалов и обработчиков событий.
     * 
     * @returns {void}
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.notificationManager.clearNotifications();
    }
}

/**
 * Инициализирует PopupManager при загрузке DOM.
 * Это гарантирует, что все DOM элементы доступны перед настройкой обработчиков событий.
 */
document.addEventListener('DOMContentLoaded', () => {
    window.popupManager = new PopupManager();
});

/**
 * Очистка ресурсов при выгрузке страницы.
 * Вызывает метод destroy() для правильной очистки интервалов и уведомлений.
 */
window.addEventListener('beforeunload', () => {
    if (window.popupManager) {
        window.popupManager.destroy();
    }
});