const BaseManager = require('../BaseManager.js');

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
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this.updateState({
            eventsTracked: this.eventsTracked,
            domainsVisited: this.domainsVisited.size,
            isTracking: this.isTracking
        });
        
        this._log('StatisticsManager инициализирован');
    }

    /**
     * Добавляет событие в статистику.
     * 
     * @param {string} eventType - Тип события ('active' или 'inactive')
     * @param {string} domain - Домен
     * @returns {void}
     */
    addEvent(eventType, domain) {
        this._executeWithTiming('addEvent', () => {
            this.eventsTracked++;
            this.domainsVisited.add(domain);
            
            if (eventType === 'active') {
                this.activeEvents++;
            } else if (eventType === 'inactive') {
                this.inactiveEvents++;
            }
            
            this.updateState({
                eventsTracked: this.eventsTracked,
                domainsVisited: this.domainsVisited.size,
                activeEvents: this.activeEvents,
                inactiveEvents: this.inactiveEvents
            });
            
            this._log('Событие добавлено в статистику', { 
                eventType, 
                domain, 
                totalEvents: this.eventsTracked,
                totalDomains: this.domainsVisited.size
            });
        });
    }

    /**
     * Обновляет размер очереди в статистике.
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
     * @returns {Object} Подробная статистика
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
     * @returns {void}
     */
    enableTracking() {
        this.isTracking = true;
        this.updateState({ isTracking: true });
        this._log('Отслеживание включено');
    }

    /**
     * Выключает отслеживание.
     * 
     * @returns {void}
     */
    disableTracking() {
        this.isTracking = false;
        this.updateState({ isTracking: false });
        this._log('Отслеживание выключено');
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
            
            this._log('Статистика сброшена');
        });
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.domainsVisited.clear();
        this.performanceMetrics.clear();
        super.destroy();
        this._log('StatisticsManager уничтожен');
    }
}

module.exports = StatisticsManager;
