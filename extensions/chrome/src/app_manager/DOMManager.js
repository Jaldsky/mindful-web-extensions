const BaseManager = require('../BaseManager.js');

/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement|null} connectionStatus - Элемент статуса подключения
 * @property {HTMLElement|null} trackingStatus - Элемент статуса отслеживания
 * @property {HTMLElement|null} eventsCount - Элемент счетчика событий
 * @property {HTMLElement|null} domainsCount - Элемент счетчика доменов
 * @property {HTMLElement|null} queueSize - Элемент размера очереди
 * @property {HTMLElement|null} openSettings - Кнопка открытия настроек
 * @property {HTMLElement|null} testConnection - Кнопка тестирования подключения
 * @property {HTMLElement|null} reloadExtension - Кнопка перезагрузки расширения
 * @property {HTMLElement|null} runDiagnostics - Кнопка запуска диагностики
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
     * @readonly
     * @enum {string}
     */
    static CSS_CLASSES = {
        STATUS_ONLINE: 'status-online',
        STATUS_OFFLINE: 'status-offline',
        STATUS_ACTIVE: 'status-active',
        STATUS_INACTIVE: 'status-inactive'
    };

    /**
     * ID элементов DOM
     * @readonly
     * @enum {string}
     */
    static ELEMENT_IDS = {
        CONNECTION_STATUS: 'connectionStatus',
        TRACKING_STATUS: 'trackingStatus',
        EVENTS_COUNT: 'eventsCount',
        DOMAINS_COUNT: 'domainsCount',
        QUEUE_SIZE: 'queueSize',
        OPEN_SETTINGS: 'openSettings',
        TEST_CONNECTION: 'testConnection',
        RELOAD_EXTENSION: 'reloadExtension',
        RUN_DIAGNOSTICS: 'runDiagnostics'
    };

    /**
     * Создает экземпляр DOMManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @param {boolean} [options.strictMode=false] - Строгий режим (выбрасывать ошибки при отсутствии элементов)
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {boolean} */
        this.strictMode = options.strictMode || false;
        
        /** @type {DOMElements} */
        this.elements = {};
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
        
        this._validateDOMAvailability();
        this._initializeElements();
    }
    
    /**
     * Проверяет доступность DOM API.
     * 
     * @private
     * @throws {Error} Если document недоступен
     * @returns {void}
     */
    _validateDOMAvailability() {
        if (typeof document === 'undefined') {
            throw new Error('document API недоступен');
        }
        
        if (typeof document.getElementById !== 'function') {
            throw new Error('document.getElementById недоступен');
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
            this._log('DOM элементы инициализированы', this.elements);
            
            // Проверка в строгом режиме
            if (this.strictMode) {
                this._validateElements();
            }
        } catch (error) {
            this._logError('Ошибка инициализации DOM элементов', error);
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
                this._log(`Элемент с ID "${id}" не найден`);
            }
            return element;
        };

        return {
            connectionStatus: getElement(DOMManager.ELEMENT_IDS.CONNECTION_STATUS),
            trackingStatus: getElement(DOMManager.ELEMENT_IDS.TRACKING_STATUS),
            eventsCount: getElement(DOMManager.ELEMENT_IDS.EVENTS_COUNT),
            domainsCount: getElement(DOMManager.ELEMENT_IDS.DOMAINS_COUNT),
            queueSize: getElement(DOMManager.ELEMENT_IDS.QUEUE_SIZE),
            openSettings: getElement(DOMManager.ELEMENT_IDS.OPEN_SETTINGS),
            testConnection: getElement(DOMManager.ELEMENT_IDS.TEST_CONNECTION),
            reloadExtension: getElement(DOMManager.ELEMENT_IDS.RELOAD_EXTENSION),
            runDiagnostics: getElement(DOMManager.ELEMENT_IDS.RUN_DIAGNOSTICS)
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
            throw new Error(
                `Отсутствуют критичные DOM элементы: ${missingElements.join(', ')}`
            );
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
            this._log(`Невозможно обновить ${elementName}: элемент не найден`);
            return false;
        }

        try {
            updateFn(element);
            this._log(`${elementName} обновлен успешно`);
            return true;
        } catch (error) {
            this._logError(`Ошибка обновления ${elementName}`, error);
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
            throw new TypeError('isOnline должен быть булевым значением');
        }

        try {
            this.updateState({ isOnline });
            
            return this._safeUpdateElement(
                this.elements.connectionStatus,
                (element) => {
                    element.textContent = isOnline ? 'Connected' : 'Disconnected';
                    element.className = isOnline 
                        ? DOMManager.CSS_CLASSES.STATUS_ONLINE 
                        : DOMManager.CSS_CLASSES.STATUS_OFFLINE;
                },
                'статус подключения'
            );
        } catch (error) {
            this._logError('Ошибка обновления статуса подключения', error);
            return false;
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
            throw new TypeError('isTracking должен быть булевым значением');
        }

        try {
            this.updateState({ isTracking });
            
            return this._safeUpdateElement(
                this.elements.trackingStatus,
                (element) => {
                    element.textContent = isTracking ? 'Active' : 'Inactive';
                    element.className = isTracking 
                        ? DOMManager.CSS_CLASSES.STATUS_ACTIVE 
                        : DOMManager.CSS_CLASSES.STATUS_INACTIVE;
                },
                'статус отслеживания'
            );
        } catch (error) {
            this._logError('Ошибка обновления статуса отслеживания', error);
            return false;
        }
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
            throw new TypeError('counters должен быть объектом');
        }

        const { events = 0, domains = 0, queue = 0 } = counters;

        const validEvents = Number.isFinite(events) ? Math.max(0, events) : 0;
        const validDomains = Number.isFinite(domains) ? Math.max(0, domains) : 0;
        const validQueue = Number.isFinite(queue) ? Math.max(0, queue) : 0;

        const results = {
            events: this._safeUpdateElement(
                this.elements.eventsCount,
                (element) => { element.textContent = validEvents.toString(); },
                'счетчик событий'
            ),
            domains: this._safeUpdateElement(
                this.elements.domainsCount,
                (element) => { element.textContent = validDomains.toString(); },
                'счетчик доменов'
            ),
            queue: this._safeUpdateElement(
                this.elements.queueSize,
                (element) => { element.textContent = validQueue.toString(); },
                'размер очереди'
            )
        };

        this._log('Счетчики обновлены', { events: validEvents, domains: validDomains, queue: validQueue });
        
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
            throw new TypeError('text должен быть строкой');
        }
        
        if (typeof disabled !== 'boolean') {
            throw new TypeError('disabled должен быть булевым значением');
        }

        return this._safeUpdateElement(
            button,
            (element) => {
                element.textContent = text;
                element.disabled = disabled;
            },
            'кнопка'
        );
    }

    /**
     * Перезагружает кэш DOM элементов.
     * Полезно если DOM был изменен динамически.
     * 
     * @returns {void}
     */
    reloadElements() {
        this._log('Перезагрузка DOM элементов');
        this._initializeElements();
    }
    
    /**
     * Получает метрики производительности.
     * 
     * @returns {Object} Метрики производительности
     */
    getPerformanceMetrics() {
        const metrics = {};
        this.performanceMetrics.forEach((value, key) => {
            metrics[key] = value;
        });
        return metrics;
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
            this._logError('Ошибка получения статистики элементов', error);
            return {};
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов DOMManager');
        this.elements = {};
        this.performanceMetrics.clear();
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
