const BaseManager = require('../../../base/BaseManager.js');
const { normalizeDomain, normalizeDomainList } = require('../../../utils/domainUtils.js');

/**
 * Менеджер для управления исключениями доменов.
 * Отвечает за проверку и управление списком исключенных доменов.
 * 
 * @class DomainExceptionsManager
 * @extends BaseManager
 */
class DomainExceptionsManager extends BaseManager {
    /**
     * Создает экземпляр DomainExceptionsManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(options = {}) {
        super(options);

        /** 
         * Множество исключенных доменов (не отслеживаются)
         * @type {Set<string>}
         */
        this.domainExceptions = new Set();
        
        this.updateState({ domainExceptionsCount: this.domainExceptions.size });
        
        this._log({ key: 'logs.domainExceptions.created' });
    }

    /**
     * Проверяет, исключен ли домен из отслеживания.
     * 
     * @param {string} domain - Домен для проверки
     * @returns {boolean} true, если домен исключен
     */
    isDomainExcluded(domain) {
        if (!domain) {
            return false;
        }
        const normalized = normalizeDomain(domain);
        if (!normalized) {
            return false;
        }
        return this.domainExceptions.has(normalized);
    }

    /**
     * Устанавливает список исключенных доменов.
     * 
     * @param {Array<string>} domains - Массив доменов для исключения
     * @returns {Object} Результат операции с количеством исключений
     */
    setDomainExceptions(domains) {
        const normalized = normalizeDomainList(domains || []);
        this.domainExceptions = new Set(normalized);
        this.updateState({ domainExceptionsCount: this.domainExceptions.size });
        
        return {
            count: this.domainExceptions.size
        };
    }

    /**
     * Получает список исключенных доменов.
     * 
     * @returns {Array<string>} Массив исключенных доменов
     */
    getDomainExceptions() {
        return Array.from(this.domainExceptions);
    }

    /**
     * Фильтрует события, удаляя события для исключенных доменов.
     * 
     * @param {Array<Object>} events - Массив событий для фильтрации
     * @returns {Object} Объект с отфильтрованными событиями и количеством пропущенных
     */
    filterEvents(events) {
        const filteredEvents = events.filter(event => !this.isDomainExcluded(event.domain));
        const skippedCount = events.length - filteredEvents.length;
        
        return {
            filteredEvents,
            skippedCount
        };
    }

    /**
     * Очищает список исключенных доменов.
     * 
     * @returns {void}
     */
    clear() {
        this.domainExceptions.clear();
        this.updateState({ domainExceptionsCount: 0 });
        this._log({ key: 'logs.domainExceptions.cleared' });
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.domainExceptions.clear();
        super.destroy();
        this._log({ key: 'logs.domainExceptions.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DomainExceptionsManager;
    module.exports.default = DomainExceptionsManager;
}

if (typeof window !== 'undefined') {
    window.DomainExceptionsManager = DomainExceptionsManager;
}
