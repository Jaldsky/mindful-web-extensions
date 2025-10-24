const BaseManager = require('../BaseManager.js');

/**
 * @typedef {Object} DOMElements
 * @property {HTMLFormElement|null} settingsForm - Форма настроек
 * @property {HTMLInputElement|null} backendUrl - Поле ввода URL бэкенда
 * @property {HTMLButtonElement|null} saveBtn - Кнопка сохранения
 * @property {HTMLButtonElement|null} resetBtn - Кнопка сброса
 * @property {HTMLElement|null} status - Элемент статуса
 */

/**
 * Менеджер для работы с DOM элементами страницы настроек.
 * Отвечает за кэширование и базовые операции с элементами UI.
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
        STATUS: 'status'
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
        
        this._initializeElements();
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
            settingsForm: getElement(DOMManager.ELEMENT_IDS.SETTINGS_FORM),
            backendUrl: getElement(DOMManager.ELEMENT_IDS.BACKEND_URL),
            saveBtn: getElement(DOMManager.ELEMENT_IDS.SAVE_BTN),
            resetBtn: getElement(DOMManager.ELEMENT_IDS.RESET_BTN),
            status: getElement(DOMManager.ELEMENT_IDS.STATUS)
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
     * Получает значение поля URL бэкенда.
     * 
     * @returns {string} Значение поля URL
     */
    getBackendUrlValue() {
        return this.elements.backendUrl?.value.trim() || '';
    }

    /**
     * Устанавливает значение поля URL бэкенда.
     * 
     * @param {string} url - URL для установки
     * @throws {TypeError} Если url не является строкой
     * @returns {boolean} true если установка успешна
     */
    setBackendUrlValue(url) {
        if (typeof url !== 'string') {
            throw new TypeError('url должен быть строкой');
        }

        return this._safeUpdateElement(
            this.elements.backendUrl,
            (element) => {
                element.value = url;
            },
            'поле URL бэкенда'
        );
    }

    /**
     * Устанавливает состояние кнопки (текст и активность).
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
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов DOMManager');
        this.elements = {};
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
