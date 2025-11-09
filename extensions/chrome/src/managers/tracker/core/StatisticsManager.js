const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

/**
 * @typedef {Object} Statistics
 * @property {number} eventsTracked - Общее количество отслеженных событий
 * @property {number} domainsVisited - Количество уникальных доменов
 * @property {number} activeEvents - Количество событий "active"
 * @property {number} inactiveEvents - Количество событий "inactive"
 * @property {number} queueSize - Текущий размер очереди событий
 */

/**
 * Менеджер для сбора и управления статистикой отслеживания.
 * 
 * @class StatisticsManager
 * @extends BaseManager
 */
class StatisticsManager extends BaseManager {
    /**
     * Создает экземпляр StatisticsManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {number} */
        this.eventsTracked = 0;
        
        /** @type {Set<string>} */
        this.domainsVisited = new Set();
        
        /** @type {number} */
        this.activeEvents = 0;
        
        /** @type {number} */
        this.inactiveEvents = 0;
        
        /** @type {boolean} */
        this.isTracking = true;
        
        this.updateState({
            eventsTracked: this.eventsTracked,
            domainsVisited: this.domainsVisited.size,
            isTracking: this.isTracking
        });
        
        this._log({ key: 'logs.statistics.created' });
    }

    /**
     * Добавляет событие в статистику.
     * 
     * Увеличивает счетчики событий, добавляет домен в список посещенных доменов
     * и обновляет состояние менеджера.
     * 
     * @param {string} eventType - Тип события (CONFIG.TRACKER.EVENT_TYPES.ACTIVE или CONFIG.TRACKER.EVENT_TYPES.INACTIVE)
     * @param {string} domain - Домен
     * @returns {void}
     */
    addEvent(eventType, domain) {
        this._executeWithTiming('addEvent', () => {
            this.eventsTracked++;
            this.domainsVisited.add(domain);
            
            if (eventType === CONFIG.TRACKER.EVENT_TYPES.ACTIVE) {
                this.activeEvents++;
            } else if (eventType === CONFIG.TRACKER.EVENT_TYPES.INACTIVE) {
                this.inactiveEvents++;
            }
            
            this.updateState({
                eventsTracked: this.eventsTracked,
                domainsVisited: this.domainsVisited.size,
                activeEvents: this.activeEvents,
                inactiveEvents: this.inactiveEvents
            });
            
            this._log({ key: 'logs.statistics.eventAdded', params: { eventType, domain, totalEvents: this.eventsTracked, totalDomains: this.domainsVisited.size } });
        });
    }

    /**
     * Обновляет размер очереди в статистике.
     * 
     * Обновляет размер очереди событий в состоянии менеджера.
     * Используется для синхронизации статистики с текущим состоянием очереди.
     * 
     * @param {number} queueSize - Текущий размер очереди
     * @returns {void}
     */
    updateQueueSize(queueSize) {
        this.updateState({ queueSize });
    }

    /**
     * Получает текущую статистику.
     * 
     * Возвращает объект с текущими значениями статистики:
     * количество отслеженных событий, количество посещенных доменов,
     * количество активных/неактивных событий, размер очереди и статус отслеживания.
     * 
     * @returns {Statistics} Объект со статистикой
     */
    getStatistics() {
        return {
            eventsTracked: this.eventsTracked,
            domainsVisited: this.domainsVisited.size,
            activeEvents: this.activeEvents,
            inactiveEvents: this.inactiveEvents,
            queueSize: this.state.queueSize || 0,
            isTracking: this.isTracking
        };
    }

    /**
     * Получает подробную статистику с доменами.
     * 
     * Возвращает расширенную статистику, включающую список всех посещенных доменов
     * в дополнение к базовой статистике.
     * 
     * @returns {Object} Подробная статистика с полем domains (массив доменов)
     */
    getDetailedStatistics() {
        return {
            ...this.getStatistics(),
            domains: Array.from(this.domainsVisited)
        };
    }

    /**
     * Включает отслеживание.
     * 
     * Устанавливает флаг отслеживания в true и обновляет состояние менеджера.
     * 
     * @returns {void}
     */
    enableTracking() {
        this.isTracking = true;
        this.updateState({ isTracking: true });
        this._log({ key: 'logs.statistics.trackingEnabled' });
    }

    /**
     * Выключает отслеживание.
     * 
     * Устанавливает флаг отслеживания в false и обновляет состояние менеджера.
     * 
     * @returns {void}
     */
    disableTracking() {
        this.isTracking = false;
        this.updateState({ isTracking: false });
    }

    /**
     * Проверяет, включено ли отслеживание.
     * 
     * @returns {boolean} Статус отслеживания
     */
    isTrackingEnabled() {
        return this.isTracking;
    }

    /**
     * Сбрасывает статистику.
     * 
     * Обнуляет все счетчики событий, очищает список посещенных доменов
     * и обновляет состояние менеджера.
     * 
     * @returns {void}
     */
    reset() {
        this._executeWithTiming('reset', () => {
            this.eventsTracked = 0;
            this.domainsVisited.clear();
            this.activeEvents = 0;
            this.inactiveEvents = 0;
            
            this.updateState({
                eventsTracked: 0,
                domainsVisited: 0,
                activeEvents: 0,
                inactiveEvents: 0,
                queueSize: 0
            });
            
            this._log({ key: 'logs.statistics.reset' });
        });
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * Очищает список посещенных доменов и освобождает все внутренние данные.
     * 
     * @returns {void}
     */
    destroy() {
        this.domainsVisited.clear();
        super.destroy();
        this._log({ key: 'logs.statistics.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsManager;
    module.exports.default = StatisticsManager;
}

if (typeof window !== 'undefined') {
    window.StatisticsManager = StatisticsManager;
}
