const BaseManager = require('../../base/BaseManager.js');
const EN = require('../../../locales/en.js');
const RU = require('../../../locales/ru.js');

/**
 * Менеджер для работы с переводами.
 * Отвечает за загрузку переводов, интерполяцию и управление словарями.
 * 
 * @class TranslationManager
 * @extends BaseManager
 */
class TranslationManager extends BaseManager {

    /**
     * Создает экземпляр TranslationManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {string} [options.defaultLocale] - Локаль по умолчанию
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        super(options);

        /** @type {Object} Словари переводов */
        this.translations = {
            [BaseManager.SUPPORTED_LOCALES.EN]: EN,
            [BaseManager.SUPPORTED_LOCALES.RU]: RU
        };

        /** @type {string} Текущая локаль */
        this.currentLocale = options.defaultLocale || BaseManager.DEFAULT_LOCALE;

        /** @type {Object} Статистика переводов */
        this.statistics = {
            translationRequests: 0,
            missingTranslations: 0,
            interpolations: 0,
            errors: 0,
            missingKeys: new Set()
        };

        this._log({ key: 'logs.translation.created' }, { currentLocale: this.currentLocale });
    }

    /**
     * Получает перевод по ключу.
     * Поддерживает вложенные ключи через точку (например, 'app.title').
     * 
     * @param {string} key - Ключ перевода
     * @param {Object} [params] - Параметры для подстановки
     * @returns {string} Переведенная строка или ключ, если перевод не найден
     */
    translate(key, params = {}) {
        return this._executeWithTiming('translate', () => {
            try {
                this.statistics.translationRequests++;

                const translation = this._getNestedValue(
                    this.translations[this.currentLocale],
                    key
                );

                if (translation === undefined) {
                    this.statistics.missingTranslations++;
                    this.statistics.missingKeys.add(key);
                    this._log({ key: 'logs.translation.missing', params: { key } }, {
                        locale: this.currentLocale
                    });
                    return key;
                }

                if (typeof translation === 'string' && Object.keys(params).length > 0) {
                    this.statistics.interpolations++;
                    return this._interpolate(translation, params);
                }

                return translation;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.translation.translateError', params: { key } }, error);
                return key;
            }
        });
    }

    /**
     * Получает значение по вложенному ключу.
     * 
     * @private
     * @param {Object} obj - Объект для поиска
     * @param {string} key - Ключ (может быть вложенным через точку)
     * @returns {*} Значение или undefined
     */
    _getNestedValue(obj, key) {
        return key.split('.').reduce((current, part) => current?.[part], obj);
    }

    /**
     * Подставляет параметры в строку.
     * Поддерживает плейсхолдеры вида {{key}}.
     * 
     * @private
     * @param {string} str - Строка с плейсхолдерами {{key}}
     * @param {Object} params - Параметры для подстановки
     * @returns {string} Строка с подставленными значениями
     */
    _interpolate(str, params) {
        return str.replace(/\{\{(\w+)}}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * Устанавливает текущую локаль.
     * 
     * @param {string} locale - Код локали
     * @returns {boolean} Успешно ли установлена локаль
     */
    setLocale(locale) {
        if (!this.translations[locale]) {
            this._logError({ key: 'logs.translation.unsupported', params: { locale } });
            return false;
        }

        if (this.currentLocale === locale) {
            this._log({ key: 'logs.translation.alreadySet', params: { locale } });
            return true;
        }

        const oldLocale = this.currentLocale;
        this.currentLocale = locale;

        this.updateState({ 
            currentLocale: locale,
            lastLocaleChange: Date.now()
        });

        this._log({ key: 'logs.translation.changed' }, { 
            from: oldLocale, 
            to: locale
        });

        return true;
    }

    /**
     * Получает текущую локаль.
     * 
     * @returns {string} Код текущей локали
     */
    getCurrentLocale() {
        return this.currentLocale;
    }

    /**
     * Проверяет, поддерживается ли локаль.
     * 
     * @param {string} locale - Код локали
     * @returns {boolean} true если локаль поддерживается
     */
    isLocaleSupported(locale) {
        return !!this.translations[locale];
    }

    /**
     * Переключает на следующую доступную локаль.
     * 
     * @returns {string} Новая локаль
     */
    toggleLocale() {
        const locales = Object.values(BaseManager.SUPPORTED_LOCALES);
        const currentIndex = locales.indexOf(this.currentLocale);
        const nextIndex = (currentIndex + 1) % locales.length;
        const nextLocale = locales[nextIndex];

        this.setLocale(nextLocale);
        return nextLocale;
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.translation.destroyStart' });
        
        try {
            this.statistics.missingKeys.clear();
            this.statistics = {
                translationRequests: 0,
                missingTranslations: 0,
                interpolations: 0,
                errors: 0,
                missingKeys: new Set()
            };
            
            this._log({ key: 'logs.translation.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.translation.destroyError' }, error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationManager;
    module.exports.default = TranslationManager;
}

if (typeof window !== 'undefined') {
    window.TranslationManager = TranslationManager;
}
