const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для обработки отладочных запросов.
 * Отвечает за генерацию тестовых данных и другие отладочные функции.
 * 
 * @class DebugHandlerManager
 * @extends BaseManager
 */
class DebugHandlerManager extends BaseManager {
    /**
     * Создает экземпляр DebugHandlerManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.statisticsManager - Менеджер статистики
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        if (!dependencies || !dependencies.statisticsManager) {
            const t = this._getTranslateFn();
            throw new Error(t('logs.debugHandler.dependenciesRequired'));
        }

        /** 
         * Менеджер статистики для добавления событий
         * @type {Object}
         */
        this.statisticsManager = dependencies.statisticsManager;
    }

    /**
     * Генерирует случайные домены и добавляет события (для отладки).
     * 
     * @param {Object} request - Объект запроса
     * @param {Object} [request.data] - Данные запроса
     * @param {number} [request.data.count] - Количество доменов для генерации
     * @param {Function} sendResponse - Функция для отправки ответа
     * @returns {void}
     */
    handleGenerateRandomDomains(request, sendResponse) {
        try {
            const count = Math.max(
                CONFIG.RANDOM_DOMAINS.MIN_COUNT,
                Math.min(
                    CONFIG.RANDOM_DOMAINS.MAX_COUNT,
                    Number(request?.data?.count) || CONFIG.RANDOM_DOMAINS.DEFAULT_COUNT
                )
            );
            const generated = new Set();
            const tlds = CONFIG.RANDOM_DOMAINS.TLDs;
            const minLength = CONFIG.RANDOM_DOMAINS.MIN_DOMAIN_LENGTH;
            const maxLength = CONFIG.RANDOM_DOMAINS.MAX_DOMAIN_LENGTH;
            
            const randStr = (len) => Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
            
            for (let i = 0; i < count; i++) {
                const domainLength = minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
                const domain = `${randStr(domainLength)}.${tlds[Math.floor(Math.random() * tlds.length)]}`;
                if (generated.has(domain)) {
                    i--;
                    continue;
                }
                generated.add(domain);
                this.statisticsManager.addEvent(CONFIG.TRACKER.EVENT_TYPES.ACTIVE, domain);
            }
            this._log({ key: 'logs.debugHandler.domainsGenerated', params: { count: generated.size } });
            sendResponse({ success: true, generated: generated.size });
        } catch (error) {
            this._logError({ key: 'logs.debugHandler.domainsGenerationError' }, error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.statisticsManager = null;
        super.destroy();
        this._log({ key: 'logs.debugHandler.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugHandlerManager;
    module.exports.default = DebugHandlerManager;
}

if (typeof window !== 'undefined') {
    window.DebugHandlerManager = DebugHandlerManager;
}
