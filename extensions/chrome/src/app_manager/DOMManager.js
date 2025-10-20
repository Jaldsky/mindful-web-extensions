const BaseManager = require('./BaseManager.js');

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
        this.updateState({ isOnline });
        const statusElement = this.elements.connectionStatus;
        if (statusElement) {
            statusElement.textContent = isOnline ? 'Подключено' : 'Отключено';
            statusElement.className = isOnline ? 'status-online' : 'status-offline';
        }
    }

    /**
     * Обновляет отображение статуса отслеживания в popup.
     * 
     * @param {boolean} isTracking - Активно ли отслеживание
     * @returns {void}
     */
    updateTrackingStatus(isTracking) {
        this.updateState({ isTracking });
        const statusElement = this.elements.trackingStatus;
        if (statusElement) {
            statusElement.textContent = isTracking ? 'Активно' : 'Неактивно';
            statusElement.className = isTracking ? 'status-active' : 'status-inactive';
        }
    }

    /**
     * Обновляет счетчики событий, доменов и очереди.
     * 
     * @param {Object} counters - Объект со счетчиками
     * @param {number} counters.events - Количество событий
     * @param {number} counters.domains - Количество доменов
     * @param {number} counters.queue - Размер очереди
     * @returns {void}
     */
    updateCounters(counters) {
        const { events = 0, domains = 0, queue = 0 } = counters;
        
        if (this.elements.eventsCount) {
            this.elements.eventsCount.textContent = events.toString();
        }
        if (this.elements.domainsCount) {
            this.elements.domainsCount.textContent = domains.toString();
        }
        if (this.elements.queueSize) {
            this.elements.queueSize.textContent = queue.toString();
        }
    }

    /**
     * Устанавливает состояние кнопки (текст и активность).
     * 
     * @param {HTMLElement} button - Элемент кнопки
     * @param {string} text - Текст кнопки
     * @param {boolean} disabled - Заблокирована ли кнопка
     * @returns {void}
     */
    setButtonState(button, text, disabled) {
        if (button) {
            button.textContent = text;
            button.disabled = disabled;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMManager;
}

if (typeof window !== 'undefined') {
    window.DOMManager = DOMManager;
}
