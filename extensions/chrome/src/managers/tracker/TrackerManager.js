const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');
const StorageManager = require('./core/StorageManager.js');
const StatisticsManager = require('./core/StatisticsManager.js');
const BackendManager = require('./core/BackendManager.js');
const EventQueueManager = require('./queue/EventQueueManager.js');
const TabTrackingManager = require('./tracking/TabTrackingManager.js');
const MessageHandlerManager = require('./handlers/MessageHandlerManager.js');

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

        /** @type {boolean} */
        this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;

        this.storageManager = new StorageManager({ enableLogging });
        this.statisticsManager = new StatisticsManager({ enableLogging });
        this.backendManager = new BackendManager({ enableLogging });

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

        this.tabTrackingManager = new TabTrackingManager(
            {
                eventQueueManager: this.eventQueueManager
            },
            { enableLogging }
        );

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
            this._log({ key: 'logs.tracker.alreadyInitialized' });
            return;
        }

        await this._executeWithTimingAsync('init', async () => {
            try {
                const userId = await this.storageManager.getOrCreateUserId();
                this.backendManager.setUserId(userId);

                const backendUrl = await this.storageManager.loadBackendUrl();
                this.backendManager.setBackendUrl(backendUrl);

                const domainExceptions = await this.storageManager.loadDomainExceptions();

                await this.eventQueueManager.restoreQueue();
                this.eventQueueManager.resetFailureState();

                await this.eventQueueManager.setDomainExceptions(domainExceptions);

                const trackingEnabled = await this.storageManager.loadTrackingEnabled();
                this.trackingEnabled = trackingEnabled;

                this.messageHandlerManager.init();

                if (trackingEnabled) {
                    await this.tabTrackingManager.init();
                    this.statisticsManager.enableTracking();
                    this._log({ key: 'logs.tracker.tabTrackingInitialized' });
                } else {
                    this.statisticsManager.disableTracking();
                    this._log({ key: 'logs.tracker.trackingDisabledNotStarted' });
                }

                this.eventQueueManager.startBatchProcessor();

                this._setupOnlineMonitoring();

                this._setupLifecycleHandlers();

                this.isInitialized = true;
                this.updateState({
                    isInitialized: true,
                    isTracking: trackingEnabled,
                    trackingEnabled
                });
            } catch (error) {
                this._logError({ key: 'logs.tracker.initError' }, error);
                throw error;
            }
        });
    }

    /**
     * Устанавливает состояние отслеживания согласно запросу.
     * 
     * @param {boolean} isEnabled - Требуемое состояние отслеживания
     * @returns {Promise<{success: boolean, isTracking: boolean}>} Результат операции
     * @throws {TypeError} Если isEnabled не является булевым значением
     */
    async setTrackingEnabled(isEnabled) {
        if (typeof isEnabled !== 'boolean') {
            const t = this._getTranslateFn();
            throw new TypeError(t('logs.tracker.isEnabledMustBeBoolean'));
        }

        return isEnabled ? await this.enableTracking() : await this.disableTracking();
    }

    /**
     * Включает отслеживание, если оно отключено.
     * 
     * Запускает отслеживание вкладок, включает статистику, сбрасывает состояние
     * ошибок и запускает batch processor.
     * 
     * @returns {Promise<{success: boolean, isTracking: boolean}>} Результат операции
     */
    async enableTracking() {
        if (this.trackingEnabled) {
            this._log({ key: 'logs.tracker.alreadyEnabled' });
            return { success: true, isTracking: true };
        }

        try {
            await this.tabTrackingManager.startTracking();
            this.statisticsManager.enableTracking();
            this.eventQueueManager.resetFailureState();
            this.eventQueueManager.startBatchProcessor();

            const saved = await this.storageManager.saveTrackingEnabled(true);
            if (!saved) {
                const t = this._getTranslateFn();
                const errorMessage = t('logs.tracker.saveTrackingStateFailed');
                this._logError({ key: 'logs.tracker.saveTrackingStateFailed' });
                return { success: false, isTracking: this.trackingEnabled, error: errorMessage };
            }

            this.trackingEnabled = true;
            this.updateState({ isTracking: true, trackingEnabled: true });
            this._log({ key: 'logs.tracker.enabledByUser' });

            return { success: true, isTracking: true };
        } catch (error) {
            this._logError({ key: 'logs.tracker.enableError' }, error);
            return { success: false, isTracking: this.trackingEnabled };
        }
    }

    /**
     * Выключает отслеживание, если оно включено.
     * 
     * Останавливает отслеживание вкладок и отключает статистику.
     * 
     * @returns {Promise<{success: boolean, isTracking: boolean}>} Результат операции
     */
    async disableTracking() {
        if (!this.trackingEnabled) {
            this._log({ key: 'logs.tracker.alreadyDisabled' });
            return { success: true, isTracking: false };
        }

        try {
            this.tabTrackingManager.stopTracking();
            this.statisticsManager.disableTracking();

            const saved = await this.storageManager.saveTrackingEnabled(false);
            if (!saved) {
                const t = this._getTranslateFn();
                const errorMessage = t('logs.tracker.saveTrackingStateFailed');
                this._logError({ key: 'logs.tracker.saveTrackingStateFailed' });
                return { success: false, isTracking: this.trackingEnabled, error: errorMessage };
            }

            this.trackingEnabled = false;
            this.updateState({ isTracking: false, trackingEnabled: false });
            this._log({ key: 'logs.tracker.disabledByUser' });

            return { success: true, isTracking: false };
        } catch (error) {
            this._logError({ key: 'logs.tracker.disableError' }, error);
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
        const isOnline = navigator.onLine;
        this.eventQueueManager.setOnlineStatus(isOnline);

        if (isOnline) {
            this.eventQueueManager.processQueue();
        }

        setInterval(() => {
            const currentOnlineStatus = navigator.onLine;
            const wasOnline = this.eventQueueManager.state.isOnline;

            if (currentOnlineStatus !== wasOnline) {
                this._log({ key: 'logs.tracker.connectionStatusChanged', params: { wasOnline, isOnline: currentOnlineStatus } });
                this.eventQueueManager.setOnlineStatus(currentOnlineStatus);
            }
        }, CONFIG.TRACKER.ONLINE_CHECK_INTERVAL);
    }

    /**
     * Настраивает обработчики lifecycle событий расширения.
     * 
     * @private
     * @returns {void}
     */
    _setupLifecycleHandlers() {
        chrome.runtime.onInstalled.addListener((details) => {
            this._log({ key: 'logs.tracker.extensionInstalledUpdated', params: { reason: details.reason } });
            if (details.reason === CONFIG.TRACKER.INSTALL_REASONS.INSTALL) {
                this._log({ key: 'logs.tracker.firstTimeInstallation' });
            } else if (details.reason === CONFIG.TRACKER.INSTALL_REASONS.UPDATE) {
                this._log({ key: 'logs.tracker.extensionUpdated' });
            }
        });

        chrome.runtime.onStartup.addListener(() => {
            this._log({ key: 'logs.tracker.extensionStarted' });
        });

        chrome.runtime.onSuspend.addListener(() => {
            this._log({ key: 'logs.tracker.extensionSuspending' });
            this.eventQueueManager.saveQueue();
        });
    }

    /**
     * Получает общую статистику трекера.
     * 
     * Возвращает объединенную статистику из всех менеджеров:
     * статистика событий, размер очереди, статус инициализации,
     * User ID и Backend URL.
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
     * Возвращает полную диагностическую информацию о состоянии всех менеджеров,
     * включая статистику, состояние хранилища, backend, очереди и отслеживания.
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
     * Собирает метрики производительности из всех подчиненных менеджеров
     * для анализа производительности системы.
     * 
     * @returns {Object} Метрики производительности всех менеджеров
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
     * Уничтожает все подчиненные менеджеры в обратном порядке инициализации
     * и очищает внутреннее состояние.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.tracker.destroying' });

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

        this.isInitialized = false;
        this.trackingEnabled = StorageManager.DEFAULT_TRACKING_ENABLED;

        super.destroy();
        this._log({ key: 'logs.tracker.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackerManager;
    module.exports.default = TrackerManager;
}

if (typeof window !== 'undefined') {
    window.TrackerManager = TrackerManager;
}
