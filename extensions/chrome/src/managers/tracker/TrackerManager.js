const BaseManager = require('../../base/BaseManager.js');
const StorageManager = require('./StorageManager.js');
const StatisticsManager = require('./StatisticsManager.js');
const BackendManager = require('./BackendManager.js');
const EventQueueManager = require('./EventQueueManager.js');
const TabTrackingManager = require('./TabTrackingManager.js');
const MessageHandlerManager = require('./MessageHandlerManager.js');

/**
 * Главный менеджер трекера, координирующий работу всех компонентов.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class TrackerManager
 * @extends BaseManager
 */
class TrackerManager extends BaseManager {
    /**
     * Создает экземпляр TrackerManager.
     * Инициализирует все необходимые менеджеры и настраивает их взаимодействие.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=true] - Включить логирование
     * @param {number} [options.batchSize] - Размер батча для отправки событий
     * @param {number} [options.batchTimeout] - Таймаут батча (мс)
     */
    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
            ...options
        });

        const enableLogging = this.enableLogging;

        /** @type {boolean} */
        this.isInitialized = false;

        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();

        /** @type {boolean} */
        this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;

        // Инициализация базовых менеджеров
        this.storageManager = new StorageManager({ enableLogging });
        this.statisticsManager = new StatisticsManager({ enableLogging });
        this.backendManager = new BackendManager({ enableLogging });

        // Инициализация менеджера очереди событий с зависимостями
        this.eventQueueManager = new EventQueueManager(
            {
                backendManager: this.backendManager,
                statisticsManager: this.statisticsManager,
                storageManager: this.storageManager,
                trackingController: this
            },
            {
                enableLogging,
                batchSize: options.batchSize,
                batchTimeout: options.batchTimeout
            }
        );

        // Инициализация менеджера отслеживания вкладок с зависимостями
        this.tabTrackingManager = new TabTrackingManager(
            {
                eventQueueManager: this.eventQueueManager
            },
            { enableLogging }
        );

        // Инициализация менеджера обработки сообщений с зависимостями
        this.messageHandlerManager = new MessageHandlerManager(
            {
                statisticsManager: this.statisticsManager,
                eventQueueManager: this.eventQueueManager,
                backendManager: this.backendManager,
                storageManager: this.storageManager,
                trackingController: this
            },
            { enableLogging }
        );

        this.updateState({
            isInitialized: false,
            isTracking: false,
            isOnline: true,
            trackingEnabled: this.trackingEnabled
        });

        this._log('TrackerManager создан');
        
        // Автоматическая инициализация
        this.init();
    }

    /**
     * Инициализирует трекер.
     * Загружает настройки, восстанавливает очередь, запускает отслеживание.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log('TrackerManager уже инициализирован');
            return;
        }

        await this._executeWithTimingAsync('init', async () => {
            try {
                this._log('Начало инициализации TrackerManager');

                // 1. Получаем или создаем User ID
                const userId = await this.storageManager.getOrCreateUserId();
                this.backendManager.setUserId(userId);
                this._log('User ID инициализирован', { userId });

                // 2. Загружаем Backend URL
                const backendUrl = await this.storageManager.loadBackendUrl();
                this.backendManager.setBackendUrl(backendUrl);
                this._log('Backend URL загружен', { backendUrl });

                const domainExceptions = await this.storageManager.loadDomainExceptions();
                this._log('Исключения доменов загружены', { count: domainExceptions.length });

                // 3. Восстанавливаем очередь событий
                await this.eventQueueManager.restoreQueue();
                this.eventQueueManager.resetFailureState();
                this._log('Очередь событий восстановлена');

                await this.eventQueueManager.setDomainExceptions(domainExceptions);

                // 4. Загружаем статус отслеживания
                const trackingEnabled = await this.storageManager.loadTrackingEnabled();
                this.trackingEnabled = trackingEnabled;
                this._log('Статус отслеживания восстановлен', { trackingEnabled });

                // 5. Настраиваем обработчики сообщений
                this.messageHandlerManager.init();
                this._log('Обработчики сообщений настроены');

                // 6. Инициализируем отслеживание вкладок при необходимости
                if (trackingEnabled) {
                    await this.tabTrackingManager.init();
                    this.statisticsManager.enableTracking();
                    this._log('Отслеживание вкладок инициализировано');
                } else {
                    this.statisticsManager.disableTracking();
                    this._log('Отслеживание отключено, отслеживание вкладок не запускается');
                }

                // 7. Запускаем периодическую обработку батчей
                this.eventQueueManager.startBatchProcessor();
                this._log('Batch processor запущен');

                // 8. Настраиваем мониторинг онлайн/офлайн статуса
                this._setupOnlineMonitoring();
                this._log('Мониторинг онлайн/офлайн настроен');

                // 9. Настраиваем обработчики lifecycle событий
                this._setupLifecycleHandlers();
                this._log('Lifecycle handlers настроены');

                this.isInitialized = true;
                this.updateState({
                    isInitialized: true,
                    isTracking: trackingEnabled,
                    trackingEnabled
                });

                this._log('TrackerManager инициализирован успешно', {
                    userId,
                    backendUrl,
                    queueSize: this.eventQueueManager.getQueueSize(),
                    trackingEnabled
                });
            } catch (error) {
                this._logError('Ошибка инициализации TrackerManager', error);
                throw error;
            }
        });
    }

    /**
     * Устанавливает состояние отслеживания согласно запросу.
     * 
     * @param {boolean} isEnabled - Требуемое состояние отслеживания
     * @returns {Promise<{success: boolean, isTracking: boolean}>}
     */
    async setTrackingEnabled(isEnabled) {
        if (typeof isEnabled !== 'boolean') {
            throw new TypeError('isEnabled должен быть булевым значением');
        }

        return isEnabled ? await this.enableTracking() : await this.disableTracking();
    }

    /**
     * Включает отслеживание, если оно отключено.
     * 
     * @returns {Promise<{success: boolean, isTracking: boolean}>}
     */
    async enableTracking() {
        if (this.trackingEnabled) {
            this._log('Отслеживание уже включено');
            return { success: true, isTracking: true };
        }

        try {
            await this.tabTrackingManager.startTracking();
            this.statisticsManager.enableTracking();
            this.eventQueueManager.resetFailureState();
            this.eventQueueManager.startBatchProcessor();

            const saved = await this.storageManager.saveTrackingEnabled(true);
            if (!saved) {
                throw new Error('Не удалось сохранить состояние отслеживания');
            }

            this.trackingEnabled = true;
            this.updateState({ isTracking: true, trackingEnabled: true });
            this._log('Отслеживание включено пользователем');

            return { success: true, isTracking: true };
        } catch (error) {
            this._logError('Ошибка включения отслеживания', error);
            return { success: false, isTracking: this.trackingEnabled };
        }
    }

    /**
     * Выключает отслеживание, если оно включено.
     * 
     * @returns {Promise<{success: boolean, isTracking: boolean}>}
     */
    async disableTracking() {
        if (!this.trackingEnabled) {
            this._log('Отслеживание уже отключено');
            return { success: true, isTracking: false };
        }

        try {
            this.tabTrackingManager.stopTracking();
            this.statisticsManager.disableTracking();

            const saved = await this.storageManager.saveTrackingEnabled(false);
            if (!saved) {
                throw new Error('Не удалось сохранить состояние отслеживания');
            }

            this.trackingEnabled = false;
            this.updateState({ isTracking: false, trackingEnabled: false });
            this._log('Отслеживание отключено пользователем');

            return { success: true, isTracking: false };
        } catch (error) {
            this._logError('Ошибка отключения отслеживания', error);
            return { success: false, isTracking: this.trackingEnabled };
        }
    }

    /**
     * Настраивает мониторинг онлайн/офлайн статуса.
     * 
     * @private
     * @returns {void}
     */
    _setupOnlineMonitoring() {
        // В Service Worker нет window объекта, используем navigator.onLine
        const isOnline = navigator.onLine;
        this.eventQueueManager.setOnlineStatus(isOnline);

        // Если онлайн, обрабатываем очередь
        if (isOnline) {
            this.eventQueueManager.processQueue();
        }

        // Периодическая проверка статуса подключения (каждые 30 секунд)
        setInterval(() => {
            const currentOnlineStatus = navigator.onLine;
            const wasOnline = this.eventQueueManager.state.isOnline;

            if (currentOnlineStatus !== wasOnline) {
                this._log('Статус подключения изменился', { 
                    wasOnline, 
                    isOnline: currentOnlineStatus 
                });
                this.eventQueueManager.setOnlineStatus(currentOnlineStatus);
            }
        }, 30000);
    }

    /**
     * Настраивает обработчики lifecycle событий расширения.
     * 
     * @private
     * @returns {void}
     */
    _setupLifecycleHandlers() {
        // Обработчик установки/обновления расширения
        chrome.runtime.onInstalled.addListener((details) => {
            this._log('Extension installed/updated', { reason: details.reason });
            if (details.reason === 'install') {
                this._log('First time installation');
            } else if (details.reason === 'update') {
                this._log('Extension updated');
            }
        });

        // Обработчик запуска расширения
        chrome.runtime.onStartup.addListener(() => {
            this._log('Extension started');
        });

        // Сохраняем очередь событий при выключении расширения
        chrome.runtime.onSuspend.addListener(() => {
            this._log('Extension suspending, saving event queue');
            this.eventQueueManager.saveQueue();
        });
    }

    /**
     * Получает общую статистику трекера.
     * 
     * @returns {Object} Объект со статистикой
     */
    getStatistics() {
        const stats = this.statisticsManager.getStatistics();
        const queueSize = this.eventQueueManager.getQueueSize();
        
        return {
            ...stats,
            queueSize,
            isInitialized: this.isInitialized,
            userId: this.storageManager.getUserId(),
            backendUrl: this.backendManager.getBackendUrl()
        };
    }

    /**
     * Получает диагностическую информацию.
     * 
     * @returns {Object} Диагностическая информация
     */
    getDiagnostics() {
        return {
            isInitialized: this.isInitialized,
            state: this.getState(),
            trackingEnabled: this.trackingEnabled,
            statistics: this.getStatistics(),
            storageState: this.storageManager.getState(),
            backendState: this.backendManager.getState(),
            queueState: this.eventQueueManager.getState(),
            trackingState: this.tabTrackingManager.getState(),
            performanceMetrics: this.getPerformanceMetrics(),
            domainExceptions: this.storageManager.getDomainExceptions(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Получает метрики производительности всех менеджеров.
     * 
     * @returns {Object} Метрики производительности
     */
    getAllPerformanceMetrics() {
        return {
            tracker: this.getPerformanceMetrics(),
            storage: this.storageManager.getPerformanceMetrics(),
            backend: this.backendManager.getPerformanceMetrics(),
            eventQueue: this.eventQueueManager.getPerformanceMetrics(),
            tabTracking: this.tabTrackingManager.getPerformanceMetrics(),
            messageHandler: this.messageHandlerManager.getPerformanceMetrics()
        };
    }

    /**
     * Уничтожает трекер и все менеджеры.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Уничтожение TrackerManager');

        // Уничтожаем менеджеры в обратном порядке инициализации
        if (this.messageHandlerManager) {
            this.messageHandlerManager.destroy();
        }
        if (this.tabTrackingManager) {
            this.tabTrackingManager.destroy();
        }
        if (this.eventQueueManager) {
            this.eventQueueManager.destroy();
        }
        if (this.backendManager) {
            this.backendManager.destroy();
        }
        if (this.statisticsManager) {
            this.statisticsManager.destroy();
        }
        if (this.storageManager) {
            this.storageManager.destroy();
        }

        this.performanceMetrics.clear();
        this.isInitialized = false;
        this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;

        super.destroy();
        this._log('TrackerManager уничтожен');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackerManager;
    module.exports.default = TrackerManager;
}

if (typeof window !== 'undefined') {
    window.TrackerManager = TrackerManager;
}
