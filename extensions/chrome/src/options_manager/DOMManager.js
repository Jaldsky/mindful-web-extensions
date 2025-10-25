const BaseManager = require('../BaseManager.js');

/**
 * @typedef {Object} DOMElements
 * @property {HTMLFormElement|null} settingsForm - Форма настроек
 * @property {HTMLInputElement|null} backendUrl - Поле ввода URL бэкенда
 * @property {HTMLButtonElement|null} saveBtn - Кнопка сохранения
 * @property {HTMLButtonElement|null} resetBtn - Кнопка сброса
 * @property {HTMLElement|null} status - Элемент статуса
 * @property {HTMLButtonElement|null} runDiagnostics - Кнопка диагностики
 * @property {HTMLButtonElement|null} reloadExtension - Кнопка перезагрузки
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
     * ID элементов DOM
     * @readonly
     * @enum {string}
     */
    static ELEMENT_IDS = {
        SETTINGS_FORM: 'settingsForm',
        BACKEND_URL: 'backendUrl',
        SAVE_BTN: 'saveBtn',
        RESET_BTN: 'resetBtn',
        STATUS: 'status',
        RUN_DIAGNOSTICS: 'runDiagnostics',
        RELOAD_EXTENSION: 'reloadExtension'
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
        
        // Валидируем доступность DOM API
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
        if (typeof document === 'undefined' || !document.getElementById) {
            const error = new Error('DOM API недоступен');
            this._logError('Критическая ошибка инициализации', error);
            throw error;
        }
        
        if (!document.body) {
            this._log('Предупреждение: document.body еще не доступен');
        }
        
        this._log('DOM API доступен');
    }

    /**
     * Инициализирует и кэширует DOM элементы с измерением производительности.
     * 
     * @private
     * @returns {void}
     */
    _initializeElements() {
        return this._executeWithTiming('initializeElements', () => {
            try {
                this.elements = this._cacheDOMElements();
                
                const foundElements = Object.entries(this.elements)
                    .filter(([, el]) => el !== null).length;
                const totalElements = Object.keys(this.elements).length;
                
                this._log('DOM элементы инициализированы', {
                    found: `${foundElements}/${totalElements}`,
                    elements: Object.keys(this.elements).filter(key => this.elements[key])
                });

                if (this.strictMode) {
                    this._validateElements();
                }
            } catch (error) {
                this._logError('Ошибка инициализации DOM элементов', error);
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
                this._log(`Элемент с ID "${id}" не найден`);
            }
            return element;
        };

        return {
            settingsForm: getElement(DOMManager.ELEMENT_IDS.SETTINGS_FORM),
            backendUrl: getElement(DOMManager.ELEMENT_IDS.BACKEND_URL),
            saveBtn: getElement(DOMManager.ELEMENT_IDS.SAVE_BTN),
            resetBtn: getElement(DOMManager.ELEMENT_IDS.RESET_BTN),
            status: getElement(DOMManager.ELEMENT_IDS.STATUS),
            runDiagnostics: getElement(DOMManager.ELEMENT_IDS.RUN_DIAGNOSTICS),
            reloadExtension: getElement(DOMManager.ELEMENT_IDS.RELOAD_EXTENSION)
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
     * Безопасно обновляет элемент DOM с верификацией и измерением времени.
     * 
     * @private
     * @param {HTMLElement|null} element - DOM элемент
     * @param {Function} updateFn - Функция обновления
     * @param {Function} [verifyFn] - Функция верификации (optional)
     * @param {string} [elementName='element'] - Название элемента для логирования
     * @returns {boolean} true если обновление успешно
     */
    _safeUpdateElement(element, updateFn, verifyFn, elementName = 'element') {
        if (!element) {
            this._log(`Невозможно обновить ${elementName}: элемент не найден`);
            return false;
        }

        // Проверяем, что элемент в DOM
        if (!document.body.contains(element)) {
            this._logError(`${elementName} не находится в DOM`);
            return false;
        }

        const startTime = performance.now();

        try {
            updateFn(element);
            
            // Верификация если функция предоставлена
            if (verifyFn && !verifyFn(element)) {
                this._logError(`Верификация обновления ${elementName} не удалась`);
                return false;
            }
            
            const duration = Math.round(performance.now() - startTime);
            this._log(`${elementName} обновлен успешно (${duration}мс)`);
            
            return true;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this._logError(`Ошибка обновления ${elementName} (${duration}мс)`, error);
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
                this._log('Элемент backendUrl не найден');
                return '';
            }
            
            const value = this.elements.backendUrl.value.trim();
            this._log('Значение URL получено', { length: value.length });
            
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
        if (typeof url !== 'string') {
            throw new TypeError('url должен быть строкой');
        }

        return this._executeWithTiming('setBackendUrlValue', () => {
            return this._safeUpdateElement(
                this.elements.backendUrl,
                (element) => {
                    element.value = url;
                },
                (element) => element.value === url, // Верификация
                'поле URL бэкенда'
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
        if (typeof text !== 'string') {
            throw new TypeError('text должен быть строкой');
        }

        if (typeof disabled !== 'boolean') {
            throw new TypeError('disabled должен быть булевым значением');
        }

        return this._executeWithTiming('setButtonState', () => {
            return this._safeUpdateElement(
                button,
                (element) => {
                    element.textContent = text;
                    element.disabled = disabled;
                },
                (element) => {
                    // Верификация: проверяем, что текст и состояние установлены
                    return element.textContent === text && element.disabled === disabled;
                },
                'кнопка'
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
        
        try {
            // Очищаем ссылки на элементы
            this.elements = {};
            
            this._log('DOMManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении DOMManager', error);
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
