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
     * Создает экземпляр LocaleManager.
     * Инициализирует все необходимые менеджеры и настраивает их взаимодействие.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {string} [options.defaultLocale] - Локаль по умолчанию
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        const enableLogging = options.enableLogging !== undefined ? options.enableLogging : false;
        
        super({
            enableLogging,
            ...options
        });

        this.storageManager = new StorageManager({ enableLogging });
        this.translationManager = new TranslationManager({
            defaultLocale: options.defaultLocale || BaseManager.DEFAULT_LOCALE,
            enableLogging
        });

        if (this.options) {
            this.options.translateFn = (key, params) => this.translationManager.translate(key, params);
        }

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
            this._log({ key: 'logs.locale.alreadyInitialized' });
            return;
        }

        await this._executeWithTimingAsync('init', async () => {
            try {

                const savedLocale = await this.storageManager.loadLocale();
                
                if (savedLocale && this.translationManager.isLocaleSupported(savedLocale)) {
                    this.translationManager.setLocale(savedLocale);

                    BaseManager.updateLocaleCache(savedLocale);
                    this._log({ key: 'logs.locale.savedLocaleLoaded' }, { locale: savedLocale });
                } else {
                    const browserLocale = BaseManager.detectBrowserLocale();
                    if (browserLocale && this.translationManager.isLocaleSupported(browserLocale)) {
                        this.translationManager.setLocale(browserLocale);
                        await this.storageManager.saveLocale(browserLocale);

                        BaseManager.updateLocaleCache(browserLocale);
                        this._log({ key: 'logs.locale.browserLocaleSet' }, { locale: browserLocale });
                    } else {
                        const defaultLocale = BaseManager.DEFAULT_LOCALE;
                        this.translationManager.setLocale(defaultLocale);
                        await this.storageManager.saveLocale(defaultLocale);

                        BaseManager.updateLocaleCache(defaultLocale);
                        this._log({ key: 'logs.locale.defaultLocaleSet' }, { locale: defaultLocale });
                    }
                }

                this.isInitialized = true;
                this.updateState({ 
                    isInitialized: true,
                    currentLocale: this.translationManager.getCurrentLocale()
                });
            } catch (error) {
                this._logError({ key: 'logs.locale.initError' }, error);

                this.translationManager.setLocale(BaseManager.DEFAULT_LOCALE);
                this.isInitialized = true;
                this.updateState({ 
                    isInitialized: true,
                    currentLocale: BaseManager.DEFAULT_LOCALE
                });
            }
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
     * Добавляет слушателя изменения локали.
     * 
     * @param {Function} listener - Функция-слушатель
     * @returns {Function} Функция для отписки
     */
    addLocaleChangeListener(listener) {
        if (typeof listener !== 'function') {
            const t = this._getTranslateFn();
            throw new TypeError(t('logs.locale.listenerMustBeFunction'));
        }

        this.listeners.push(listener);

        return () => {
            const index = this.listeners.indexOf(listener);
            if (index !== -1) {
                this.listeners.splice(index, 1);
                this._log({ key: 'logs.locale.listenerRemoved' }, {
                    listenersCount: this.listeners.length
                });
            }
        };
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
                this._logError({ key: 'logs.locale.listenerError' }, error);
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

            this._log({ key: 'logs.locale.managersDestroyed' });
        } catch (error) {
            this._logError({ key: 'logs.locale.managersDestroyError' }, error);
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        if (!this.isInitialized) {
            this._log({ key: 'logs.locale.alreadyDestroyed' });
            return;
        }

        this._log({ key: 'logs.locale.destroyStart' });
        
        try {
            this.listeners = [];
            this._destroyManagers();
            this.isInitialized = false;
            
            this._log({ key: 'logs.locale.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.locale.destroyError' }, error);
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
