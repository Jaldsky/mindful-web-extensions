const BaseManager = require('../BaseManager.js');
const EN = require('../../locales/en.js');
const RU = require('../../locales/ru.js');

/**
 * Менеджер для работы с переводами.
 * Отвечает за загрузку переводов, интерполяцию и управление словарями.
 * 
 * @class TranslationManager
 * @extends BaseManager
 */
class TranslationManager extends BaseManager {
    /**
     * Доступные локали
     * @readonly
     * @static
     */
    static LOCALES = {
        EN: 'en',
        RU: 'ru'
    };

    /**
     * Локаль по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_LOCALE = TranslationManager.LOCALES.EN;

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
            [TranslationManager.LOCALES.EN]: EN,
            [TranslationManager.LOCALES.RU]: RU
        };

        /** @type {string} Текущая локаль */
        this.currentLocale = options.defaultLocale || TranslationManager.DEFAULT_LOCALE;

        /** @type {Object} Статистика переводов */
        this.statistics = {
            translationRequests: 0,
            missingTranslations: 0,
            interpolations: 0,
            errors: 0,
            missingKeys: new Set()
        };

        this._log('TranslationManager создан', { currentLocale: this.currentLocale });
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
                    this._log(`Перевод не найден для ключа: ${key}`, {
                        locale: this.currentLocale
                    });
                    return key;
                }

                // Подстановка параметров
                if (typeof translation === 'string' && Object.keys(params).length > 0) {
                    this.statistics.interpolations++;
                    return this._interpolate(translation, params);
                }

                return translation;
            } catch (error) {
                this.statistics.errors++;
                this._logError(`Ошибка получения перевода для ключа: ${key}`, error);
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
        return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
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
            this._logError(`Неподдерживаемая локаль: ${locale}`);
            return false;
        }

        if (this.currentLocale === locale) {
            this._log(`Локаль уже установлена: ${locale}`);
            return true;
        }

        const oldLocale = this.currentLocale;
        this.currentLocale = locale;

        this.updateState({ 
            currentLocale: locale,
            lastLocaleChange: Date.now()
        });

        this._log('Локаль изменена', { 
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
     * Получает список доступных локалей.
     * 
     * @returns {Array<Object>} Массив объектов с информацией о локалях
     */
    getAvailableLocales() {
        return Object.values(TranslationManager.LOCALES).map(locale => ({
            code: locale,
            name: this.translations[locale]?.common?.languageName || locale,
            nativeName: this.translations[locale]?.common?.languageName || locale
        }));
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
        const locales = Object.values(TranslationManager.LOCALES);
        const currentIndex = locales.indexOf(this.currentLocale);
        const nextIndex = (currentIndex + 1) % locales.length;
        const nextLocale = locales[nextIndex];

        this.setLocale(nextLocale);
        return nextLocale;
    }

    /**
     * Получает информацию о текущей локали.
     * 
     * @returns {Object} Информация о локали
     */
    getCurrentLocaleInfo() {
        const locale = this.currentLocale;
        return {
            code: locale,
            name: this.translations[locale]?.common?.languageName || locale,
            translations: this.translations[locale] || {}
        };
    }

    /**
     * Получает статистику переводов.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return {
            ...this.statistics,
            missingKeys: Array.from(this.statistics.missingKeys),
            currentLocale: this.currentLocale,
            availableLocales: Object.keys(this.translations)
        };
    }

    /**
     * Сбрасывает статистику переводов.
     * 
     * @returns {void}
     */
    resetStatistics() {
        this.statistics = {
            translationRequests: 0,
            missingTranslations: 0,
            interpolations: 0,
            errors: 0,
            missingKeys: new Set()
        };
        this._log('Статистика переводов сброшена');
    }

    /**
     * Проверяет наличие перевода для ключа.
     * 
     * @param {string} key - Ключ перевода
     * @param {string} [locale] - Локаль (по умолчанию текущая)
     * @returns {boolean} true если перевод существует
     */
    hasTranslation(key, locale = this.currentLocale) {
        const translation = this._getNestedValue(
            this.translations[locale],
            key
        );
        return translation !== undefined;
    }

    /**
     * Получает все ключи переводов для локали.
     * 
     * @param {string} [locale] - Локаль (по умолчанию текущая)
     * @returns {Array<string>} Массив ключей
     */
    getAllKeys(locale = this.currentLocale) {
        const collectKeys = (obj, prefix = '') => {
            const keys = [];
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        keys.push(...collectKeys(obj[key], fullKey));
                    } else {
                        keys.push(fullKey);
                    }
                }
            }
            return keys;
        };

        return collectKeys(this.translations[locale]);
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов TranslationManager');
        
        try {
            this.statistics.missingKeys.clear();
            this.statistics = {
                translationRequests: 0,
                missingTranslations: 0,
                interpolations: 0,
                errors: 0,
                missingKeys: new Set()
            };
            
            this._log('TranslationManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении TranslationManager', error);
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
