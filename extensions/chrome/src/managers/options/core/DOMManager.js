const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

/**
 * @typedef {Object} DOMElements
 * @property {HTMLFormElement|null} settingsForm - Форма настроек
 * @property {HTMLInputElement|null} backendUrl - Поле ввода URL бэкенда
 * @property {HTMLButtonElement|null} saveBtn - Кнопка сохранения
 * @property {HTMLButtonElement|null} resetBtn - Кнопка сброса
 * @property {HTMLButtonElement|null} runDiagnostics - Кнопка диагностики
 * @property {HTMLButtonElement|null} toggleDeveloperTools - Кнопка переключения developer tools
 */

/**
 * Менеджер для работы с DOM элементами страницы настроек.
 * Отвечает за кэширование и базовые операции с элементами UI.
 * Включает измерение производительности и верификацию операций.
 * 
 * @class DOMManager
 * @extends BaseManager
 */
class DOMManager extends BaseManager {
    /**
     * ID элементов DOM (для обратной совместимости, ссылается на CONFIG.OPTIONS_DOM.ELEMENT_IDS)
     * @readonly
     * @static
     */
    static ELEMENT_IDS = CONFIG.OPTIONS_DOM.ELEMENT_IDS;

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

        this._validateDOMAvailability();
        
        this._initializeElements();
    }

    /**
     * Проверяет доступность DOM API.
     * 
     * @private
     * @throws {Error} Если DOM API недоступен
     * @returns {void}
     */
    _validateDOMAvailability() {
        const t = this._getTranslateFn();
        
        if (typeof document === 'undefined' || !document.getElementById) {
            const error = new Error(t('logs.optionsDom.domApiUnavailable'));
            this._logError({ key: 'logs.optionsDom.criticalInitializationError' }, error);
            throw error;
        }
        
        if (!document.body) {
            this._log({ key: 'logs.optionsDom.bodyNotAvailable' });
        }
        
        this._log({ key: 'logs.optionsDom.domApiAvailable' });
    }

    /**
     * Инициализирует и кэширует DOM элементы с измерением производительности.
     * 
     * @private
     * @returns {void}
     */
    _initializeElements() {
        this._executeWithTiming('initializeElements', () => {
            try {
                this.elements = this._cacheDOMElements();
                
                const foundElements = Object.entries(this.elements)
                    .filter(([, el]) => el !== null).length;
                const totalElements = Object.keys(this.elements).length;
                
                this._log({ key: 'logs.optionsDom.elementsInitialized' }, {
                    found: `${foundElements}/${totalElements}`,
                    elements: Object.keys(this.elements).filter(key => this.elements[key])
                });

                if (this.strictMode) {
                    this._validateElements();
                }
            } catch (error) {
                this._logError({ key: 'logs.optionsDom.initializationError' }, error);
                if (this.strictMode) {
                    throw error;
                }
            }
        });
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
                this._log({ key: 'logs.optionsDom.elementNotFound', params: { id } });
            }
            return element;
        };

        return {
            settingsForm: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.SETTINGS_FORM),
            backendUrl: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.BACKEND_URL),
            saveBtn: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.SAVE_BTN),
            resetBtn: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.RESET_BTN),
            status: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.STATUS),
            runDiagnostics: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.RUN_DIAGNOSTICS),
            toggleDeveloperTools: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.TOGGLE_DEVELOPER_TOOLS),
            domainExceptionInput: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.DOMAIN_EXCEPTION_INPUT),
            addDomainExceptionBtn: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.ADD_DOMAIN_EXCEPTION_BTN),
            domainExceptionsList: getElement(CONFIG.OPTIONS_DOM.ELEMENT_IDS.DOMAIN_EXCEPTIONS_LIST)
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
        const t = this._getTranslateFn();
        const missingElements = [];

        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                missingElements.push(key);
            }
        });

        if (missingElements.length > 0) {
            throw new Error(
                t('logs.optionsDom.missingElements', { elements: missingElements.join(', ') })
            );
        }
    }

    /**
     * Безопасно обновляет элемент DOM с верификацией и измерением времени.
     * 
     * @private
     * @param {HTMLElement|null} element - DOM элемент
     * @param {Function} updateFn - Функция обновления
     * @param {Function} [verifyFn] - Функция верификации (optional)
     * @param {string} [elementName='element'] - Название элемента для логирования
     * @returns {boolean} true если обновление успешно
     */
    _safeUpdateElement(element, updateFn, verifyFn, elementName = CONFIG.OPTIONS_DOM.DEFAULT_ELEMENT_NAMES.ELEMENT) {
        if (!element) {
            this._log({ key: 'logs.optionsDom.updateElementNotFound', params: { elementName } });
            return false;
        }

        if (!document.body.contains(element)) {
            this._logError({ key: 'logs.optionsDom.elementNotInDOM', params: { elementName } });
            return false;
        }

        const startTime = performance.now();

        try {
            updateFn(element);

            if (verifyFn && !verifyFn(element)) {
                this._logError({ key: 'logs.optionsDom.verificationFailed', params: { elementName } });
                return false;
            }
            
            const duration = Math.round(performance.now() - startTime);
            this._log({ key: 'logs.optionsDom.updateSuccess', params: { elementName, duration } });
            
            return true;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this._logError({ key: 'logs.optionsDom.updateError', params: { elementName, duration } }, error);
            return false;
        }
    }

    /**
     * Получает значение поля URL бэкенда с измерением производительности.
     * 
     * @returns {string} Значение поля URL
     */
    getBackendUrlValue() {
        return this._executeWithTiming('getBackendUrlValue', () => {
            if (!this.elements.backendUrl) {
                this._log({ key: 'logs.optionsDom.backendUrlNotFound' });
                return '';
            }
            
            const value = this.elements.backendUrl.value.trim();
            this._log({ key: 'logs.optionsDom.urlValueRetrieved' }, { length: value.length });
            
            return value;
        });
    }

    /**
     * Устанавливает значение поля URL бэкенда с верификацией.
     * 
     * @param {string} url - URL для установки
     * @throws {TypeError} Если url не является строкой
     * @returns {boolean} true если установка успешна
     */
    setBackendUrlValue(url) {
        const t = this._getTranslateFn();
        
        if (typeof url !== 'string') {
            throw new TypeError(t('logs.optionsDom.urlMustBeString'));
        }

        return this._executeWithTiming('setBackendUrlValue', () => {
            return this._safeUpdateElement(
                this.elements.backendUrl,
                (element) => {
                    element.value = url;
                },
                (element) => element.value === url,
                CONFIG.OPTIONS_DOM.DEFAULT_ELEMENT_NAMES.BACKEND_URL_FIELD
            );
        });
    }

    /**
     * Устанавливает состояние кнопки (текст и активность) с верификацией.
     * 
     * @param {HTMLButtonElement|null} button - Элемент кнопки
     * @param {string} text - Текст кнопки
     * @param {boolean} disabled - Заблокирована ли кнопка
     * @throws {TypeError} Если параметры имеют неверный тип
     * @returns {boolean} true если обновление успешно
     */
    setButtonState(button, text, disabled) {
        const t = this._getTranslateFn();
        
        if (typeof text !== 'string') {
            throw new TypeError(t('logs.optionsDom.textMustBeString'));
        }

        if (typeof disabled !== 'boolean') {
            throw new TypeError(t('logs.optionsDom.disabledMustBeBoolean'));
        }

        return this._executeWithTiming('setButtonState', () => {
            return this._safeUpdateElement(
                button,
                (element) => {
                    element.textContent = text;
                    element.disabled = disabled;
                },
                (element) => {
                    return element.textContent === text && element.disabled === disabled;
                },
                CONFIG.OPTIONS_DOM.DEFAULT_ELEMENT_NAMES.BUTTON
            );
        });
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
            this._logError({ key: 'logs.optionsDom.getStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.optionsDom.destroyStart' });
        
        try {
            this.elements = {};
            
            this._log({ key: 'logs.optionsDom.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.optionsDom.destroyError' }, error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMManager;
    module.exports.default = DOMManager;
}

if (typeof window !== 'undefined') {
    window.OptionsDOMManager = DOMManager;
}
