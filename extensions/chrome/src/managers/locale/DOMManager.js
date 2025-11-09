const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

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
    static I18N_ATTRIBUTE = CONFIG.LOCALE_DOM.I18N_ATTRIBUTE;

    /**
     * Атрибут для указания целевого атрибута элемента
     * @readonly
     * @static
     */
    static I18N_ATTR_ATTRIBUTE = CONFIG.LOCALE_DOM.I18N_ATTR_ATTRIBUTE;

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
            const t = this._getTranslateFn();
            throw new TypeError(t('logs.localeDom.translationCallbackMustBeFunction'));
        }

        /** @type {Function} Функция для получения переводов */
        this.getTranslation = translationCallback;

        /** @type {Object} Статистика локализации */
        this.statistics = {
            totalLocalizations: 0,
            elementsLocalized: 0,
            errors: 0,
            lastLocalizationTime: null
        };

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
                this._log({ key: 'logs.localeDom.rootNotProvided' });
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
                        this._logError({ key: 'logs.localeDom.elementLocalizeError' }, error);
                    }
                });

                this.statistics.totalLocalizations++;
                this.statistics.elementsLocalized += count;
                this.statistics.lastLocalizationTime = Date.now();

                this._log({ key: 'logs.localeDom.localizedCount', params: { count } });
                return count;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.localeDom.domLocalizeError' }, error);
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

        const translation = this.getTranslation(key);

        if (attr) {
            element.setAttribute(attr, translation);
        } else {
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
                this._log({ key: 'logs.localeDom.elementNotFound', params: { selector } });
                return false;
            }

            const translation = this.getTranslation(key);

            if (attr) {
                element.setAttribute(attr, translation);
            } else {
                element.textContent = translation;
            }

            this._log({ key: 'logs.localeDom.elementLocalized', params: { selector } }, { key, translation });
            return true;
        } catch (error) {
            this.statistics.errors++;
            this._logError({ key: 'logs.localeDom.elementLocalizeSelectorError', params: { selector } }, error);
            return false;
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
            lastLocalizationTime: null
        };
        this._log({ key: 'logs.localeDom.statsReset' });
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.localeDom.destroyStart' });
        
        try {
            this.statistics = {
                totalLocalizations: 0,
                elementsLocalized: 0,
                errors: 0,
                lastLocalizationTime: null
            };
            
            this._log({ key: 'logs.localeDom.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.localeDom.destroyError' }, error);
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
