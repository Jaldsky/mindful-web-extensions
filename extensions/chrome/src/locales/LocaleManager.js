const BaseManager = require('../BaseManager.js');
const EN = require('../../locales/en.js');
const RU = require('../../locales/ru.js');

/**
 * Менеджер локализации для Mindful Web Extension.
 * Управляет загрузкой и применением переводов для разных языков.
 * 
 * @class LocaleManager
 * @extends BaseManager
 */
class LocaleManager extends BaseManager {
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
     * Ключ для хранения выбранной локали в storage
     * @readonly
     * @static
     */
    static STORAGE_KEY = 'mindful_locale';

    /**
     * Локаль по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_LOCALE = LocaleManager.LOCALES.EN;

    /**
     * Создает экземпляр LocaleManager.
     * 
     * @param {Object} options - Опции конфигурации
     * @param {string} [options.defaultLocale] - Локаль по умолчанию
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        super(options);

        /** @type {Object} Словари переводов */
        this.translations = {
            [LocaleManager.LOCALES.EN]: EN,
            [LocaleManager.LOCALES.RU]: RU
        };

        /** @type {string} Текущая локаль */
        this.currentLocale = options.defaultLocale || LocaleManager.DEFAULT_LOCALE;

        /** @type {Array<Function>} Слушатели изменения локали */
        this.listeners = [];

        /** @type {boolean} Флаг инициализации */
        this.isInitialized = false;

        this._log('LocaleManager создан', { currentLocale: this.currentLocale });
    }

    /**
     * Инициализирует менеджер локализации.
     * Загружает сохраненную локаль из хранилища.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log('LocaleManager уже инициализирован');
            return;
        }

        try {
            this._log('Начало инициализации LocaleManager');

            // Загружаем сохраненную локаль
            const savedLocale = await this._loadLocale();
            
            if (savedLocale && this.translations[savedLocale]) {
                this.currentLocale = savedLocale;
                this._log('Загружена сохраненная локаль', { locale: savedLocale });
            } else {
                // Пытаемся определить локаль браузера
                const browserLocale = this._detectBrowserLocale();
                if (browserLocale && this.translations[browserLocale]) {
                    this.currentLocale = browserLocale;
                    await this._saveLocale(browserLocale);
                    this._log('Установлена локаль браузера', { locale: browserLocale });
                }
            }

            this.isInitialized = true;
            this._log('LocaleManager инициализирован успешно', { 
                currentLocale: this.currentLocale 
            });
        } catch (error) {
            this._logError('Ошибка инициализации LocaleManager', error);
            // Используем локаль по умолчанию при ошибке
            this.currentLocale = LocaleManager.DEFAULT_LOCALE;
            this.isInitialized = true;
        }
    }

    /**
     * Определяет локаль браузера.
     * 
     * @private
     * @returns {string|null} Код локали или null
     */
    _detectBrowserLocale() {
        try {
            const browserLang = navigator.language || navigator.userLanguage;
            if (!browserLang) return null;

            // Извлекаем первые две буквы (en-US -> en)
            const langCode = browserLang.substring(0, 2).toLowerCase();
            
            // Проверяем, поддерживается ли эта локаль
            if (Object.values(LocaleManager.LOCALES).includes(langCode)) {
                return langCode;
            }

            return null;
        } catch (error) {
            this._logError('Ошибка определения локали браузера', error);
            return null;
        }
    }

    /**
     * Загружает сохраненную локаль из chrome.storage.
     * 
     * @private
     * @async
     * @returns {Promise<string|null>} Код локали или null
     */
    async _loadLocale() {
        try {
            if (!chrome.storage || !chrome.storage.local) {
                this._log('chrome.storage.local недоступен');
                return null;
            }

            return new Promise((resolve) => {
                chrome.storage.local.get([LocaleManager.STORAGE_KEY], (result) => {
                    if (chrome.runtime.lastError) {
                        this._logError('Ошибка загрузки локали', chrome.runtime.lastError);
                        resolve(null);
                    } else {
                        resolve(result[LocaleManager.STORAGE_KEY] || null);
                    }
                });
            });
        } catch (error) {
            this._logError('Ошибка загрузки локали', error);
            return null;
        }
    }

    /**
     * Сохраняет локаль в chrome.storage.
     * 
     * @private
     * @async
     * @param {string} locale - Код локали
     * @returns {Promise<boolean>} Успешно ли сохранено
     */
    async _saveLocale(locale) {
        try {
            if (!chrome.storage || !chrome.storage.local) {
                this._log('chrome.storage.local недоступен');
                return false;
            }

            return new Promise((resolve) => {
                chrome.storage.local.set(
                    { [LocaleManager.STORAGE_KEY]: locale },
                    () => {
                        if (chrome.runtime.lastError) {
                            this._logError('Ошибка сохранения локали', chrome.runtime.lastError);
                            resolve(false);
                        } else {
                            this._log('Локаль сохранена', { locale });
                            resolve(true);
                        }
                    }
                );
            });
        } catch (error) {
            this._logError('Ошибка сохранения локали', error);
            return false;
        }
    }

    /**
     * Получает перевод по ключу.
     * Поддерживает вложенные ключи через точку (например, 'app.title').
     * 
     * @param {string} key - Ключ перевода
     * @param {Object} [params] - Параметры для подстановки
     * @returns {string} Переведенная строка или ключ, если перевод не найден
     */
    t(key, params = {}) {
        try {
            const translation = this._getNestedValue(
                this.translations[this.currentLocale],
                key
            );

            if (translation === undefined) {
                this._log(`Перевод не найден для ключа: ${key}`);
                return key;
            }

            // Подстановка параметров
            if (typeof translation === 'string' && Object.keys(params).length > 0) {
                return this._interpolate(translation, params);
            }

            return translation;
        } catch (error) {
            this._logError(`Ошибка получения перевода для ключа: ${key}`, error);
            return key;
        }
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
     * Устанавливает новую локаль.
     * 
     * @async
     * @param {string} locale - Код локали
     * @returns {Promise<boolean>} Успешно ли установлена локаль
     */
    async setLocale(locale) {
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

        // Сохраняем в storage
        const saved = await this._saveLocale(locale);

        this._log('Локаль изменена', { 
            from: oldLocale, 
            to: locale,
            saved 
        });

        // Уведомляем слушателей
        this._notifyListeners(locale, oldLocale);

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
        return Object.values(LocaleManager.LOCALES).map(locale => ({
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
     * Добавляет слушателя изменения локали.
     * 
     * @param {Function} listener - Функция-слушатель
     * @returns {Function} Функция для отписки
     */
    addLocaleChangeListener(listener) {
        if (typeof listener !== 'function') {
            throw new TypeError('Listener должен быть функцией');
        }

        this.listeners.push(listener);
        this._log('Добавлен слушатель изменения локали', {
            listenersCount: this.listeners.length
        });

        // Возвращаем функцию для отписки
        return () => {
            this.removeLocaleChangeListener(listener);
        };
    }

    /**
     * Удаляет слушателя изменения локали.
     * 
     * @param {Function} listener - Функция-слушатель
     * @returns {boolean} true если слушатель был удален
     */
    removeLocaleChangeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
            this._log('Удален слушатель изменения локали', {
                listenersCount: this.listeners.length
            });
            return true;
        }
        return false;
    }

    /**
     * Уведомляет всех слушателей об изменении локали.
     * 
     * @private
     * @param {string} newLocale - Новая локаль
     * @param {string} oldLocale - Старая локаль
     * @returns {void}
     */
    _notifyListeners(newLocale, oldLocale) {
        this.listeners.forEach(listener => {
            try {
                listener(newLocale, oldLocale);
            } catch (error) {
                this._logError('Ошибка в слушателе изменения локали', error);
            }
        });
    }

    /**
     * Применяет локализацию к DOM элементам.
     * Ищет элементы с атрибутом data-i18n и обновляет их текст.
     * 
     * @param {HTMLElement} [root=document] - Корневой элемент для поиска
     * @returns {number} Количество обновленных элементов
     */
    localizeDOM(root = document) {
        if (!root) {
            this._log('Root элемент не предоставлен');
            return 0;
        }

        try {
            const elements = root.querySelectorAll('[data-i18n]');
            let count = 0;

            elements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                const attr = element.getAttribute('data-i18n-attr');
                
                if (!key) return;

                const translation = this.t(key);
                
                if (attr) {
                    // Обновляем атрибут
                    element.setAttribute(attr, translation);
                } else {
                    // Обновляем текстовое содержимое
                    element.textContent = translation;
                }
                
                count++;
            });

            this._log(`Локализовано элементов: ${count}`);
            return count;
        } catch (error) {
            this._logError('Ошибка локализации DOM', error);
            return 0;
        }
    }

    /**
     * Переключает на следующую доступную локаль.
     * 
     * @async
     * @returns {Promise<string>} Новая локаль
     */
    async toggleLocale() {
        const locales = Object.values(LocaleManager.LOCALES);
        const currentIndex = locales.indexOf(this.currentLocale);
        const nextIndex = (currentIndex + 1) % locales.length;
        const nextLocale = locales[nextIndex];

        await this.setLocale(nextLocale);
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
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов LocaleManager');
        
        try {
            this.listeners = [];
            this.isInitialized = false;
            
            this._log('LocaleManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении LocaleManager', error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocaleManager;
    module.exports.default = LocaleManager;
}

if (typeof window !== 'undefined') {
    window.LocaleManager = LocaleManager;
}
