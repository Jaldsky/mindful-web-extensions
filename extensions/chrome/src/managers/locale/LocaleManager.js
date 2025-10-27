const BaseManager = require('../../base/BaseManager.js');
const StorageManager = require('./StorageManager.js');
const TranslationManager = require('./TranslationManager.js');
const DOMManager = require('./DOMManager.js');

/**
 * Главный менеджер локализации для Mindful Web Extension.
 * Координирует работу всех компонентов локализации.
 * Использует композицию для объединения функциональности различных менеджеров.
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
     * Локаль по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_LOCALE = LocaleManager.LOCALES.EN;

    /**
     * Создает экземпляр LocaleManager.
     * Инициализирует все необходимые менеджеры и настраивает их взаимодействие.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {string} [options.defaultLocale] - Локаль по умолчанию
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined ? options.enableLogging : false,
            ...options
        });

        const enableLogging = this.enableLogging;

        // Инициализация менеджеров с общими настройками логирования
        this.storageManager = new StorageManager({ enableLogging });
        this.translationManager = new TranslationManager({
            defaultLocale: options.defaultLocale || LocaleManager.DEFAULT_LOCALE,
            enableLogging
        });
        
        // DOMManager требует callback для получения переводов
        this.domManager = new DOMManager(
            (key, params) => this.translationManager.translate(key, params),
            { enableLogging }
        );

        /** @type {Array<Function>} Слушатели изменения локали */
        this.listeners = [];

        /** @type {boolean} Флаг инициализации */
        this.isInitialized = false;

        this.updateState({
            isInitialized: false,
            currentLocale: this.translationManager.getCurrentLocale()
        });

        this._log('LocaleManager создан', { 
            currentLocale: this.translationManager.getCurrentLocale() 
        });
    }

    /**
     * Инициализирует менеджер локализации.
     * Загружает сохраненную локаль из хранилища и определяет локаль браузера.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log('LocaleManager уже инициализирован');
            return;
        }

        await this._executeWithTimingAsync('init', async () => {
            try {
                this._log('Начало инициализации LocaleManager');

                // Загружаем сохраненную локаль
                const savedLocale = await this.storageManager.loadLocale();
                
                if (savedLocale && this.translationManager.isLocaleSupported(savedLocale)) {
                    this.translationManager.setLocale(savedLocale);
                    this._log('Загружена сохраненная локаль', { locale: savedLocale });
                } else {
                    // Пытаемся определить локаль браузера
                    const browserLocale = this._detectBrowserLocale();
                    if (browserLocale && this.translationManager.isLocaleSupported(browserLocale)) {
                        this.translationManager.setLocale(browserLocale);
                        await this.storageManager.saveLocale(browserLocale);
                        this._log('Установлена локаль браузера', { locale: browserLocale });
                    }
                }

                this.isInitialized = true;
                this.updateState({ 
                    isInitialized: true,
                    currentLocale: this.translationManager.getCurrentLocale()
                });

                this._log('LocaleManager инициализирован успешно', { 
                    currentLocale: this.translationManager.getCurrentLocale(),
                    performanceMetrics: this.getPerformanceMetrics()
                });
            } catch (error) {
                this._logError('Ошибка инициализации LocaleManager', error);
                // Используем локаль по умолчанию при ошибке
                this.translationManager.setLocale(LocaleManager.DEFAULT_LOCALE);
                this.isInitialized = true;
                this.updateState({ 
                    isInitialized: true,
                    currentLocale: LocaleManager.DEFAULT_LOCALE
                });
            }
        });
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
     * Получает перевод по ключу.
     * Поддерживает вложенные ключи через точку (например, 'app.title').
     * 
     * @param {string} key - Ключ перевода
     * @param {Object} [params] - Параметры для подстановки
     * @returns {string} Переведенная строка или ключ, если перевод не найден
     */
    t(key, params = {}) {
        return this.translationManager.translate(key, params);
    }

    /**
     * Устанавливает новую локаль.
     * 
     * @async
     * @param {string} locale - Код локали
     * @returns {Promise<boolean>} Успешно ли установлена локаль
     */
    async setLocale(locale) {
        return await this._executeWithTimingAsync('setLocale', async () => {
            if (!this.translationManager.isLocaleSupported(locale)) {
                this._logError(`Неподдерживаемая локаль: ${locale}`);
                return false;
            }

            const currentLocale = this.translationManager.getCurrentLocale();
            
            if (currentLocale === locale) {
                this._log(`Локаль уже установлена: ${locale}`);
                return true;
            }

            const oldLocale = currentLocale;
            
            // Устанавливаем локаль в TranslationManager
            const setSuccess = this.translationManager.setLocale(locale);
            
            if (!setSuccess) {
                return false;
            }

            // Сохраняем в storage
            const saved = await this.storageManager.saveLocale(locale);

            this.updateState({ currentLocale: locale });

            this._log('Локаль изменена', { 
                from: oldLocale, 
                to: locale,
                saved 
            });

            // Уведомляем слушателей
            this._notifyListeners(locale, oldLocale);

            return true;
        });
    }

    /**
     * Получает текущую локаль.
     * 
     * @returns {string} Код текущей локали
     */
    getCurrentLocale() {
        return this.translationManager.getCurrentLocale();
    }

    /**
     * Получает список доступных локалей.
     * 
     * @returns {Array<Object>} Массив объектов с информацией о локалях
     */
    getAvailableLocales() {
        return this.translationManager.getAvailableLocales();
    }

    /**
     * Проверяет, поддерживается ли локаль.
     * 
     * @param {string} locale - Код локали
     * @returns {boolean} true если локаль поддерживается
     */
    isLocaleSupported(locale) {
        return this.translationManager.isLocaleSupported(locale);
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
        return this.domManager.localizeDOM(root);
    }

    /**
     * Локализует отдельный элемент по селектору.
     * 
     * @param {string} selector - CSS селектор элемента
     * @param {string} key - Ключ перевода
     * @param {string} [attr] - Атрибут для обновления
     * @returns {boolean} true если элемент найден и локализован
     */
    localizeElement(selector, key, attr = null) {
        return this.domManager.localizeElementBySelector(selector, key, attr);
    }

    /**
     * Переключает на следующую доступную локаль.
     * 
     * @async
     * @returns {Promise<string>} Новая локаль
     */
    async toggleLocale() {
        return await this._executeWithTimingAsync('toggleLocale', async () => {
            const newLocale = this.translationManager.toggleLocale();
            await this.storageManager.saveLocale(newLocale);
            
            const oldLocale = this.state.currentLocale;
            this.updateState({ currentLocale: newLocale });
            
            this._notifyListeners(newLocale, oldLocale);
            
            return newLocale;
        });
    }

    /**
     * Получает информацию о текущей локали.
     * 
     * @returns {Object} Информация о локали
     */
    getCurrentLocaleInfo() {
        return this.translationManager.getCurrentLocaleInfo();
    }

    /**
     * Получает общую статистику локализации.
     * 
     * @returns {Object} Объект со статистикой
     */
    getStatistics() {
        return {
            currentLocale: this.getCurrentLocale(),
            isInitialized: this.isInitialized,
            storage: this.storageManager.getStatistics(),
            translation: this.translationManager.getStatistics(),
            dom: this.domManager.getStatistics(),
            listeners: this.listeners.length
        };
    }

    /**
     * Получает метрики производительности всех менеджеров.
     * 
     * @returns {Object} Метрики производительности
     */
    getAllPerformanceMetrics() {
        return {
            localeManager: this.getPerformanceMetrics(),
            storage: this.storageManager.getPerformanceMetrics(),
            translation: this.translationManager.getPerformanceMetrics(),
            dom: this.domManager.getPerformanceMetrics()
        };
    }

    /**
     * Получает диагностическую информацию.
     * 
     * @returns {Object} Диагностическая информация
     */
    getDiagnostics() {
        return {
            isInitialized: this.isInitialized,
            state: this.getState(),
            statistics: this.getStatistics(),
            performanceMetrics: this.getAllPerformanceMetrics(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Сбрасывает статистику всех менеджеров.
     * 
     * @returns {void}
     */
    resetStatistics() {
        try {
            this.storageManager.resetStatistics();
            this.translationManager.resetStatistics();
            this.domManager.resetStatistics();
            this._log('Вся статистика сброшена');
        } catch (error) {
            this._logError('Ошибка сброса статистики', error);
        }
    }

    /**
     * Проверяет наличие перевода для ключа.
     * 
     * @param {string} key - Ключ перевода
     * @param {string} [locale] - Локаль (по умолчанию текущая)
     * @returns {boolean} true если перевод существует
     */
    hasTranslation(key, locale = null) {
        return this.translationManager.hasTranslation(key, locale || this.getCurrentLocale());
    }

    /**
     * Получает все ключи переводов для текущей локали.
     * 
     * @param {string} [locale] - Локаль (по умолчанию текущая)
     * @returns {Array<string>} Массив ключей
     */
    getAllTranslationKeys(locale = null) {
        return this.translationManager.getAllKeys(locale || this.getCurrentLocale());
    }

    /**
     * Уничтожает менеджеры в обратном порядке инициализации.
     * 
     * @private
     * @returns {void}
     */
    _destroyManagers() {
        try {
            if (this.domManager) {
                this.domManager.destroy();
                this.domManager = null;
            }

            if (this.translationManager) {
                this.translationManager.destroy();
                this.translationManager = null;
            }

            if (this.storageManager) {
                this.storageManager.destroy();
                this.storageManager = null;
            }

            this._log('Все менеджеры уничтожены');
        } catch (error) {
            this._logError('Ошибка уничтожения менеджеров', error);
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        if (!this.isInitialized) {
            this._log('LocaleManager уже был уничтожен');
            return;
        }

        this._log('Очистка ресурсов LocaleManager');
        
        try {
            this.listeners = [];
            this._destroyManagers();
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
