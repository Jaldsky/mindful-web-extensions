const BaseManager = require('../BaseManager.js');

/**
 * Менеджер для локализации DOM элементов.
 * Отвечает за применение переводов к элементам с атрибутом data-i18n.
 * 
 * @class DOMManager
 * @extends BaseManager
 */
class DOMManager extends BaseManager {
    /**
     * Атрибут для указания ключа перевода
     * @readonly
     * @static
     */
    static I18N_ATTRIBUTE = 'data-i18n';

    /**
     * Атрибут для указания целевого атрибута элемента
     * @readonly
     * @static
     */
    static I18N_ATTR_ATTRIBUTE = 'data-i18n-attr';

    /**
     * Создает экземпляр DOMManager.
     * 
     * @param {Function} translationCallback - Функция для получения переводов
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(translationCallback, options = {}) {
        super(options);

        if (typeof translationCallback !== 'function') {
            throw new TypeError('translationCallback должен быть функцией');
        }

        /** @type {Function} Функция для получения переводов */
        this.getTranslation = translationCallback;

        /** @type {Object} Статистика локализации */
        this.statistics = {
            totalLocalizations: 0,
            elementsLocalized: 0,
            errors: 0,
            lastLocalizationTime: null,
            lastElementCount: 0
        };

        /** @type {WeakMap<HTMLElement, string>} Кэш оригинальных ключей элементов */
        this.elementKeyCache = new WeakMap();

        this._log('DOMManager создан');
    }

    /**
     * Применяет локализацию к DOM элементам.
     * Ищет элементы с атрибутом data-i18n и обновляет их текст или атрибуты.
     * 
     * @param {HTMLElement} [root=document] - Корневой элемент для поиска
     * @returns {number} Количество обновленных элементов
     */
    localizeDOM(root = document) {
        return this._executeWithTiming('localizeDOM', () => {
            if (!root) {
                this._log('Root элемент не предоставлен');
                return 0;
            }

            try {
                const elements = root.querySelectorAll(`[${DOMManager.I18N_ATTRIBUTE}]`);
                let count = 0;

                elements.forEach(element => {
                    try {
                        const localized = this._localizeElement(element);
                        if (localized) {
                            count++;
                        }
                    } catch (error) {
                        this.statistics.errors++;
                        this._logError('Ошибка локализации элемента', error);
                    }
                });

                this.statistics.totalLocalizations++;
                this.statistics.elementsLocalized += count;
                this.statistics.lastLocalizationTime = Date.now();
                this.statistics.lastElementCount = count;

                this.updateState({
                    lastLocalizationTime: Date.now(),
                    lastElementCount: count
                });

                this._log(`Локализовано элементов: ${count}`);
                return count;
            } catch (error) {
                this.statistics.errors++;
                this._logError('Ошибка локализации DOM', error);
                return 0;
            }
        });
    }

    /**
     * Локализует отдельный элемент.
     * 
     * @private
     * @param {HTMLElement} element - Элемент для локализации
     * @returns {boolean} true если элемент был локализован
     */
    _localizeElement(element) {
        const key = element.getAttribute(DOMManager.I18N_ATTRIBUTE);
        const attr = element.getAttribute(DOMManager.I18N_ATTR_ATTRIBUTE);

        if (!key) {
            return false;
        }

        // Сохраняем ключ в кэш для возможного повторного использования
        this.elementKeyCache.set(element, key);

        const translation = this.getTranslation(key);

        if (attr) {
            // Обновляем атрибут
            element.setAttribute(attr, translation);
        } else {
            // Обновляем текстовое содержимое
            element.textContent = translation;
        }

        return true;
    }

    /**
     * Локализует отдельный элемент по селектору.
     * 
     * @param {string} selector - CSS селектор элемента
     * @param {string} key - Ключ перевода
     * @param {string} [attr] - Атрибут для обновления (если не указан, обновляет textContent)
     * @returns {boolean} true если элемент найден и локализован
     */
    localizeElementBySelector(selector, key, attr = null) {
        try {
            const element = document.querySelector(selector);
            if (!element) {
                this._log(`Элемент не найден: ${selector}`);
                return false;
            }

            const translation = this.getTranslation(key);

            if (attr) {
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }

            this._log(`Элемент локализован: ${selector}`, { key, translation });
            return true;
        } catch (error) {
            this.statistics.errors++;
            this._logError(`Ошибка локализации элемента: ${selector}`, error);
            return false;
        }
    }

    /**
     * Локализует множественные элементы по селектору.
     * 
     * @param {string} selector - CSS селектор элементов
     * @param {string} key - Ключ перевода
     * @param {string} [attr] - Атрибут для обновления
     * @returns {number} Количество локализованных элементов
     */
    localizeElementsBySelector(selector, key, attr = null) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length === 0) {
                this._log(`Элементы не найдены: ${selector}`);
                return 0;
            }

            const translation = this.getTranslation(key);
            let count = 0;

            elements.forEach(element => {
                try {
                    if (attr) {
                        element.setAttribute(attr, translation);
                    } else {
                        element.textContent = translation;
                    }
                    count++;
                } catch (error) {
                    this.statistics.errors++;
                    this._logError('Ошибка локализации элемента', error);
                }
            });

            this._log(`Элементы локализованы: ${selector}`, { count, key });
            return count;
        } catch (error) {
            this.statistics.errors++;
            this._logError(`Ошибка локализации элементов: ${selector}`, error);
            return 0;
        }
    }

    /**
     * Добавляет атрибуты локализации к элементу.
     * 
     * @param {HTMLElement} element - Элемент
     * @param {string} key - Ключ перевода
     * @param {string} [attr] - Атрибут для обновления
     * @returns {boolean} true если атрибуты добавлены
     */
    addLocalizationAttributes(element, key, attr = null) {
        try {
            if (!element) {
                this._log('Элемент не предоставлен');
                return false;
            }

            element.setAttribute(DOMManager.I18N_ATTRIBUTE, key);
            
            if (attr) {
                element.setAttribute(DOMManager.I18N_ATTR_ATTRIBUTE, attr);
            }

            // Сразу локализуем элемент
            this._localizeElement(element);

            this._log('Атрибуты локализации добавлены', { key, attr });
            return true;
        } catch (error) {
            this.statistics.errors++;
            this._logError('Ошибка добавления атрибутов локализации', error);
            return false;
        }
    }

    /**
     * Удаляет атрибуты локализации у элемента.
     * 
     * @param {HTMLElement} element - Элемент
     * @returns {boolean} true если атрибуты удалены
     */
    removeLocalizationAttributes(element) {
        try {
            if (!element) {
                this._log('Элемент не предоставлен');
                return false;
            }

            element.removeAttribute(DOMManager.I18N_ATTRIBUTE);
            element.removeAttribute(DOMManager.I18N_ATTR_ATTRIBUTE);

            this._log('Атрибуты локализации удалены');
            return true;
        } catch (error) {
            this.statistics.errors++;
            this._logError('Ошибка удаления атрибутов локализации', error);
            return false;
        }
    }

    /**
     * Получает все локализуемые элементы.
     * 
     * @param {HTMLElement} [root=document] - Корневой элемент
     * @returns {NodeList} Список элементов
     */
    getLocalizableElements(root = document) {
        try {
            return root.querySelectorAll(`[${DOMManager.I18N_ATTRIBUTE}]`);
        } catch (error) {
            this._logError('Ошибка получения локализуемых элементов', error);
            return [];
        }
    }

    /**
     * Получает количество локализуемых элементов.
     * 
     * @param {HTMLElement} [root=document] - Корневой элемент
     * @returns {number} Количество элементов
     */
    getLocalizableElementsCount(root = document) {
        try {
            const elements = this.getLocalizableElements(root);
            return elements.length;
        } catch (error) {
            this._logError('Ошибка подсчета локализуемых элементов', error);
            return 0;
        }
    }

    /**
     * Получает статистику локализации DOM.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return {
            ...this.statistics,
            averageElementsPerLocalization: this.statistics.totalLocalizations > 0
                ? Math.round(this.statistics.elementsLocalized / this.statistics.totalLocalizations)
                : 0
        };
    }

    /**
     * Сбрасывает статистику.
     * 
     * @returns {void}
     */
    resetStatistics() {
        this.statistics = {
            totalLocalizations: 0,
            elementsLocalized: 0,
            errors: 0,
            lastLocalizationTime: null,
            lastElementCount: 0
        };
        this._log('Статистика локализации сброшена');
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов DOMManager');
        
        try {
            this.elementKeyCache = new WeakMap();
            this.statistics = {
                totalLocalizations: 0,
                elementsLocalized: 0,
                errors: 0,
                lastLocalizationTime: null,
                lastElementCount: 0
            };
            
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
    window.DOMManager = DOMManager;
}
