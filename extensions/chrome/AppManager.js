const BaseManager = typeof window !== 'undefined' ? window.BaseManager : require('./src/app_manager/BaseManager.js');
const DOMManager = typeof window !== 'undefined' ? window.DOMManager : require('./src/app_manager/DOMManager.js');
const NotificationManager = typeof window !== 'undefined' ? window.NotificationManager : require('./src/app_manager/NotificationManager.js');
const ServiceWorkerManager = typeof window !== 'undefined' ? window.ServiceWorkerManager : require('./src/app_manager/ServiceWorkerManager.js');
const DiagnosticsManager = typeof window !== 'undefined' ? window.DiagnosticsManager : require('./src/app_manager/DiagnosticsManager.js');

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