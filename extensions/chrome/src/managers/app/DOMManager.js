const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement|null} connectionStatus - Элемент статуса подключения
 * @property {HTMLElement|null} trackingStatus - Элемент статуса отслеживания
 * @property {HTMLElement|null} eventsCount - Элемент счетчика событий
 * @property {HTMLElement|null} domainsCount - Элемент счетчика доменов
 * @property {HTMLElement|null} openSettings - Кнопка открытия настроек
 * @property {HTMLElement|null} testConnection - Кнопка тестирования подключения
 * @property {HTMLElement|null} toggleTracking - Кнопка переключения отслеживания
 */

/**
 * @typedef {Object} Counters
 * @property {number} events - Количество событий
 * @property {number} domains - Количество доменов
 * @property {number} queue - Размер очереди
 */

/**
 * Менеджер для работы с DOM элементами.
 * Отвечает за кэширование и обновление UI элементов.
 * 
 * @class DOMManager
 * @extends BaseManager
 */
class DOMManager extends BaseManager {
    /**
     * CSS классы для статусов
     * Эти классы определены в styles/common.css
     * @readonly
     * @static
     */
    static CSS_CLASSES = CONFIG.APP_DOM.CSS_CLASSES;

    /**
     * ID элементов DOM
     * @readonly
     * @static
     */
    static ELEMENT_IDS = CONFIG.APP_DOM.ELEMENT_IDS;

    /**
     * Создает экземпляр DOMManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @param {boolean} [options.strictMode=false] - Строгий режим (выбрасывать ошибки при отсутствии элементов)
     * @param {Function} [options.translateFn] - Функция для получения переводов
     */
    constructor(options = {}) {
        super(options);
        
        const t = this._getTranslateFn();
        
        /** @type {boolean} */
        this.strictMode = options.strictMode || false;
        
        /** @type {DOMElements} */
        this.elements = {};
        
        /** @type {Function} Функция для получения переводов */
        this.translateFn = options.translateFn || (() => '');
        
        if (!this.translateFn || typeof this.translateFn !== 'function') {
            throw new TypeError(t('logs.dom.validation.translateFnMustBeFunction'));
        }
 
        this.CONSTANTS.CONNECTION_MESSAGE_TIMEOUT = this.CONSTANTS.CONNECTION_MESSAGE_TIMEOUT || 2000;
        this.connectionMessageTimer = null;
 
        try {
            this._validateDOMAvailability();
            this._initializeElements();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('logs.dom.initializationError');
            throw new Error(errorMessage);
        }
    }

    /**
     * Проверяет доступность DOM API.
     * 
     * @private
     * @throws {Error} Если document недоступен
     * @returns {void}
     */
    _validateDOMAvailability() {
        const t = this._getTranslateFn();
        
        if (typeof document === 'undefined') {
            throw new Error(t('logs.dom.documentApiUnavailable'));
        }
        
        if (typeof document.getElementById !== 'function') {
            throw new Error(t('logs.dom.getElementByIdUnavailable'));
        }
    }

    /**
     * Инициализирует и кэширует DOM элементы.
     * 
     * @private
     * @returns {void}
     */
    _initializeElements() {
        try {
            this.elements = this._cacheDOMElements();

            if (this.strictMode) {
                this._validateElements();
            }
        } catch (error) {
            this._logError({ key: 'logs.dom.initializationError' }, error);
            if (this.strictMode) {
                throw error;
            }
        }
    }

    /**
     * Кэширует часто используемые DOM элементы для лучшей производительности.
     * 
     * @private
     * @returns {DOMElements} Объект, содержащий кэшированные DOM элементы
     */
    _cacheDOMElements() {
        const getElement = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                this._log({ key: 'logs.dom.elementNotFound', params: { id } });
            }
            return element;
        };

        return {
            connectionStatus: getElement(DOMManager.ELEMENT_IDS.CONNECTION_STATUS),
            trackingStatus: getElement(DOMManager.ELEMENT_IDS.TRACKING_STATUS),
            eventsCount: getElement(DOMManager.ELEMENT_IDS.EVENTS_COUNT),
            domainsCount: getElement(DOMManager.ELEMENT_IDS.DOMAINS_COUNT),
            openSettings: getElement(DOMManager.ELEMENT_IDS.OPEN_SETTINGS),
            testConnection: getElement(DOMManager.ELEMENT_IDS.TEST_CONNECTION),
            toggleTracking: getElement(DOMManager.ELEMENT_IDS.TOGGLE_TRACKING)
        };
    }

    /**
     * Валидирует наличие критичных элементов.
     * 
     * @private
     * @throws {Error} Если критичные элементы отсутствуют
     * @returns {void}
     */
    _validateElements() {
        const missingElements = [];
        
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                missingElements.push(key);
            }
        });
        
        if (missingElements.length > 0) {
            const elements = missingElements.join(', ');
            throw new Error(this.translateFn('logs.dom.criticalElementsMissing', { elements }));
        }
    }

    /**
     * Безопасно обновляет элемент DOM.
     * 
     * @private
     * @param {HTMLElement|null} element - DOM элемент
     * @param {Function} updateFn - Функция обновления
     * @param {string} [elementName='element'] - Название элемента для логирования
     * @returns {boolean} true если обновление успешно
     */
    _safeUpdateElement(element, updateFn, elementName = 'element') {
        if (!element) {
            this._log({ key: 'logs.dom.updateImpossible', params: { elementName } });
            return false;
        }

        try {
            updateFn(element);
            return true;
        } catch (error) {
            this._logError({ key: 'logs.dom.elementUpdateError', params: { elementName } }, error);
            return false;
        }
    }

    /**
     * Обновляет отображение статуса подключения в app.
     * 
     * @param {boolean} isOnline - Подключен ли интернет
     * @throws {TypeError} Если isOnline не является булевым значением
     * @returns {boolean} true если обновление успешно
     */
    updateConnectionStatus(isOnline) {
        if (typeof isOnline !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.isOnlineMustBeBoolean'));
        }

        try {
            this.updateState({ isOnline });
            this._clearConnectionMessageTimer();
            
            const elementName = this.translateFn('logs.dom.elementNames.connectionStatus');
            
            return this._safeUpdateElement(
                this.elements.connectionStatus,
                (element) => {
                    const statusText = isOnline 
                        ? this.translateFn('app.status.online')
                        : this.translateFn('app.status.offline');
                    
                    element.textContent = statusText;
                    element.dataset.originalText = statusText;
                    element.className = '';
                    element.className = isOnline 
                        ? DOMManager.CSS_CLASSES.STATUS_ONLINE 
                        : DOMManager.CSS_CLASSES.STATUS_OFFLINE;
                },
                elementName
            );
        } catch (error) {
            this._logError({ key: 'logs.dom.connectionStatusUpdateError' }, error);
            return false;
        }
    }

    showConnectionStatusMessage(message, type = 'info') {
        if (!message || typeof message !== 'string') {
            return;
        }

        const element = this.elements.connectionStatus;
        if (!element) {
            return;
        }

        const className = type === 'success'
            ? DOMManager.CSS_CLASSES.STATUS_ONLINE
            : type === 'error'
                ? DOMManager.CSS_CLASSES.STATUS_OFFLINE
                : DOMManager.CSS_CLASSES.STATUS_INACTIVE;

        element.textContent = message;
        element.className = '';
        element.className = className;

        this._clearConnectionMessageTimer();
        this.connectionMessageTimer = setTimeout(() => {
            this._clearConnectionMessageTimer();
            const isOnline = Boolean(this.state?.isOnline);
            this.updateConnectionStatus(isOnline);
        }, this.CONSTANTS.CONNECTION_MESSAGE_TIMEOUT || 2000);
    }

    _clearConnectionMessageTimer() {
        if (this.connectionMessageTimer) {
            clearTimeout(this.connectionMessageTimer);
            this.connectionMessageTimer = null;
        }
    }

    /**
     * Обновляет отображение статуса отслеживания в app.
     * 
     * @param {boolean} isTracking - Активно ли отслеживание
     * @throws {TypeError} Если isTracking не является булевым значением
     * @returns {boolean} true если обновление успешно
     */
    updateTrackingStatus(isTracking) {
        if (typeof isTracking !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.isTrackingMustBeBoolean'));
        }

        try {
            this.updateState({ isTracking });
            
            const elementName = this.translateFn('logs.dom.elementNames.trackingStatus');
            
            return this._safeUpdateElement(
                this.elements.trackingStatus,
                (element) => {
                    element.textContent = isTracking 
                        ? this.translateFn('app.status.active')
                        : this.translateFn('app.status.inactive');
                    element.className = '';
                    element.className = isTracking 
                        ? DOMManager.CSS_CLASSES.STATUS_ACTIVE 
                        : DOMManager.CSS_CLASSES.STATUS_INACTIVE;
                },
                elementName
            );
        } catch (error) {
            this._logError({ key: 'logs.dom.trackingStatusUpdateError' }, error);
            return false;
        }
    }

    /**
     * Обновляет отображение кнопки переключения отслеживания.
     * 
     * @param {boolean} isTracking - Активно ли отслеживание в данный момент
     * @param {Object} [options={}]
     * @param {boolean} [options.disabled=false] - Заблокирована ли кнопка
     * @returns {boolean} true если обновление успешно
     */
    updateTrackingToggle(isTracking, options = {}) {
        if (typeof isTracking !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.isTrackingMustBeBoolean'));
        }

        const disabled = Boolean(options.disabled);
        const button = this.elements.toggleTracking;

        const labelKey = isTracking ? 'app.buttons.disableTracking' : 'app.buttons.enableTracking';
        const label = this.translateFn(labelKey);

        const elementName = this.translateFn('logs.dom.elementNames.trackingToggle');

        return this._safeUpdateElement(
            button,
            (element) => {
                element.textContent = label;
                element.disabled = disabled;
                element.classList.remove('toggle-btn--disable', 'toggle-btn--enable');
                element.classList.add(isTracking ? 'toggle-btn--disable' : 'toggle-btn--enable');
            },
            elementName
        );
    }

    /**
     * Переводит кнопку переключения отслеживания в состояние загрузки.
     * 
     * @returns {boolean} true если обновление успешно
     */
    setTrackingToggleLoading(targetIsTracking) {
        if (typeof targetIsTracking !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.targetIsTrackingMustBeBoolean'));
        }

        const button = this.elements.toggleTracking;
        const labelKey = targetIsTracking
            ? 'app.buttons.trackingEnableLoading'
            : 'app.buttons.trackingDisableLoading';
        const label = this.translateFn(labelKey);

        return this.setButtonState(button, label, true);
    }

    /**
     * Обновляет счетчики событий, доменов и очереди.
     * 
     * @param {Counters} counters - Объект со счетчиками
     * @throws {TypeError} Если counters не является объектом
     * @returns {Object} Объект с результатами обновления каждого счетчика
     */
    updateCounters(counters) {
        if (!counters || typeof counters !== 'object') {
            throw new TypeError(this.translateFn('logs.dom.validation.countersMustBeObject'));
        }

        const { events = 0, domains = 0 } = counters;

        const validEvents = Number.isFinite(events) ? Math.max(0, events) : 0;
        const validDomains = Number.isFinite(domains) ? Math.max(0, domains) : 0;

        const results = {
            events: this._safeUpdateElement(
                this.elements.eventsCount,
                (element) => { element.textContent = validEvents.toString(); },
                this.translateFn('logs.dom.elementNames.eventsCounter')
            ),
            domains: this._safeUpdateElement(
                this.elements.domainsCount,
                (element) => { element.textContent = validDomains.toString(); },
                this.translateFn('logs.dom.elementNames.domainsCounter')
            )
        };

        return results;
    }

    /**
     * Устанавливает состояние кнопки (текст и активность).
     * 
     * @param {HTMLElement|null} button - Элемент кнопки
     * @param {string} text - Текст кнопки
     * @param {boolean} disabled - Заблокирована ли кнопка
     * @throws {TypeError} Если параметры имеют неверный тип
     * @returns {boolean} true если обновление успешно
     */
    setButtonState(button, text, disabled) {
        if (typeof text !== 'string') {
            throw new TypeError(this.translateFn('logs.dom.validation.textMustBeString'));
        }
        
        if (typeof disabled !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.disabledMustBeBoolean'));
        }

        return this._safeUpdateElement(
            button,
            (element) => {
                element.textContent = text;
                element.disabled = disabled;
            },
            this.translateFn('logs.dom.elementNames.button')
        );
    }

    /**
     * Перезагружает кэш DOM элементов.
     * Полезно если DOM был изменен динамически.
     * 
     * @returns {void}
     */
    reloadElements() {
        this._log({ key: 'logs.dom.elementsReload' });
        this._initializeElements();
    }
    
    /**
     * Получает статистику доступности элементов.
     * 
     * @returns {Object} Статистика элементов
     */
    getElementsStatistics() {
        try {
            const stats = {
                total: 0,
                available: 0,
                missing: [],
                inDOM: 0,
                notInDOM: []
            };

            Object.entries(this.elements).forEach(([key, element]) => {
                stats.total++;
                
                if (element) {
                    stats.available++;
                    
                    if (document.body && document.body.contains(element)) {
                        stats.inDOM++;
                    } else {
                        stats.notInDOM.push(key);
                    }
                } else {
                    stats.missing.push(key);
                }
            });

            return stats;
        } catch (error) {
            this._logError({ key: 'logs.dom.elementsStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Устанавливает функцию локализации.
     * 
     * @param {Function} translateFn - Функция для получения переводов
     * @returns {void}
     */
    setTranslateFn(translateFn) {
        const t = this._getTranslateFn();
        
        if (typeof translateFn !== 'function') {
            throw new TypeError(t('logs.dom.validation.translateFnMustBeFunction'));
        }
        this.translateFn = translateFn;
    }

    /**
     * Обновляет все статусы с текущей локализацией.
     * Используется при смене языка.
     * 
     * @returns {void}
     */
    refreshStatuses() {
        if (this.state.isOnline !== undefined) {
            this.updateConnectionStatus(this.state.isOnline);
        }
        if (this.state.isTracking !== undefined) {
            this.updateTrackingStatus(this.state.isTracking);
            this.updateTrackingToggle(this.state.isTracking);
        }
        this._log({ key: 'logs.dom.statusesRefreshed' });
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.dom.cleanupStart' });
        this._clearConnectionMessageTimer();
        this.elements = {};
        this.translateFn = null;
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMManager;
    module.exports.default = DOMManager;
}

if (typeof window !== 'undefined') {
    window.DOMManager = DOMManager;
}
