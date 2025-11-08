const BaseManager = require('../../base/BaseManager.js');

/**
 * Менеджер для обработки запросов статуса и статистики.
 * Отвечает за получение и отправку информации о состоянии трекера.
 * 
 * @class StatusHandlerManager
 * @extends BaseManager
 */
class StatusHandlerManager extends BaseManager {
    /**
     * Создает экземпляр StatusHandlerManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.statisticsManager - Менеджер статистики
     * @param {Object} dependencies.eventQueueManager - Менеджер очереди событий
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.statisticsManager || !dependencies.eventQueueManager) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.statusHandler.dependenciesRequired'));
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
        
        this._log({ key: 'logs.statusHandler.created' });
    }

    /**
     * Обрабатывает ping запрос.
     * 
     * Используется для проверки доступности Service Worker.
     * Всегда возвращает успешный ответ с сообщением 'pong'.
     * 
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handlePing(sendResponse) {
        this._log({ key: 'logs.statusHandler.pingReceived' });
        const t = this._getTranslateFn();
        sendResponse({ 
            success: true, 
            message: t('logs.statusHandler.pongMessage')
        });
    }

    /**
     * Обрабатывает запрос статуса.
     * 
     * Возвращает текущий статус трекера: статус подключения, статус отслеживания,
     * количество отслеженных событий, количество посещенных доменов и размер очереди.
     * 
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleGetStatus(sendResponse) {
        const stats = this.statisticsManager.getStatistics();
        const isOnline = this.eventQueueManager.state.isOnline;
        
        const response = {
            isOnline: isOnline,
            isTracking: stats.isTracking,
            stats: {
                eventsTracked: stats.eventsTracked,
                domainsVisited: stats.domainsVisited,
                queueSize: this.eventQueueManager.getQueueSize()
            }
        };

        this._log({ key: 'logs.statusHandler.statusSent' }, response);
        sendResponse(response);
    }

    /**
     * Обрабатывает запрос статистики за сегодня.
     * 
     * Возвращает упрощенную статистику: количество событий, количество доменов
     * и размер очереди событий.
     * 
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleGetTodayStats(sendResponse) {
        const stats = this.statisticsManager.getStatistics();
        
        const response = {
            events: stats.eventsTracked,
            domains: stats.domainsVisited,
            queue: this.eventQueueManager.getQueueSize()
        };

        this._log({ key: 'logs.statusHandler.statsSent' }, response);
        sendResponse(response);
    }

    /**
     * Обрабатывает запрос подробной статистики за сегодня.
     * 
     * Возвращает детальную статистику: количество событий (активных/неактивных),
     * список посещенных доменов, размер очереди и статус отслеживания.
     * 
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleGetDetailedStats(sendResponse) {
        const detailed = this.statisticsManager.getDetailedStatistics();
        const response = {
            eventsTracked: detailed.eventsTracked,
            activeEvents: detailed.activeEvents,
            inactiveEvents: detailed.inactiveEvents,
            domainsVisited: detailed.domainsVisited,
            domains: detailed.domains || [],
            queueSize: this.eventQueueManager.getQueueSize(),
            isTracking: detailed.isTracking
        };

        this._log({ key: 'logs.statusHandler.detailedStatsSent' }, response);
        sendResponse(response);
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.statisticsManager = null;
        this.eventQueueManager = null;
        super.destroy();
        this._log({ key: 'logs.statusHandler.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusHandlerManager;
    module.exports.default = StatusHandlerManager;
}

if (typeof window !== 'undefined') {
    window.StatusHandlerManager = StatusHandlerManager;
}
