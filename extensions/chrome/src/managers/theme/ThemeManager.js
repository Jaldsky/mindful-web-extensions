const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');
const StorageManager = require('./StorageManager.js');
const ApplicationManager = require('./ApplicationManager.js');
const SyncManager = require('./SyncManager.js');

/**
 * Главный менеджер для управления темами оформления расширения.
 * Координирует работу StorageManager, ApplicationManager и SyncManager.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class ThemeManager
 * @extends BaseManager
 */
class ThemeManager extends BaseManager {
    /**
     * Тема по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_THEME = CONFIG.THEME.DEFAULT;

    /**
     * Создает экземпляр ThemeManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     * @param {boolean} [options.enableCache] - Использовать localStorage кеш
     * @param {Function} [options.onThemeChange] - Callback при изменении темы
     */
    constructor(options = {}) {
        super(options);

        // Инициализация подменеджеров
        this.storageManager = new StorageManager({
            enableLogging: this.enableLogging,
            enableCache: options.enableCache !== false
        });

        this.applicationManager = new ApplicationManager({
            enableLogging: this.enableLogging
        });

        this.syncManager = new SyncManager({
            enableLogging: this.enableLogging,
            onThemeChange: options.onThemeChange
        });

        /** @type {boolean} */
        this.isInitialized = false;

        this._log({ key: 'logs.theme.themeManager.created' }, {
            enableCache: this.storageManager.enableCache,
            hasCallback: !!options.onThemeChange
        });
    }

    /**
     * Загружает тему из хранилища и применяет её.
     * Сначала проверяет кеш для мгновенного применения, затем загружает из storage.
     * 
     * @async
     * @returns {Promise<string>} Применённая тема
     */
    async loadAndApplyTheme() {
        return await this._executeWithTimingAsync('loadAndApplyTheme', async () => {
            try {
                this._log({ key: 'logs.theme.themeManager.loadingAndApplying' });

                // Сначала применяем из кеша для мгновенного эффекта
                const cachedTheme = this.storageManager.getThemeFromCache();
                if (cachedTheme && this.applicationManager.isValidTheme(cachedTheme)) {
                    this.applicationManager.applyTheme(cachedTheme);
                    this._log({ key: 'logs.theme.themeManager.appliedFromCache' }, { theme: cachedTheme });
                }

                // Затем загружаем из chrome.storage (авторитетный источник)
                const storedTheme = await this.storageManager.loadTheme();
                const theme = (storedTheme && this.applicationManager.isValidTheme(storedTheme)) 
                    ? storedTheme 
                    : CONFIG.THEME.DEFAULT;

                // Применяем и сохраняем в кеш
                this.applicationManager.applyTheme(theme);
                this.storageManager.saveThemeToCache(theme);

                this.isInitialized = true;
                this.updateState({ 
                    isInitialized: true,
                    currentTheme: theme,
                    lastLoadTime: Date.now()
                });

                this._log({ key: 'logs.theme.themeManager.loadedAndApplied' }, { theme });
                return theme;
            } catch (error) {
                this._logError({ key: 'logs.theme.themeManager.loadError' }, error);
                
                // Fallback: пытаемся применить из кеша или default
                const fallbackTheme = this.storageManager.getThemeFromCache() || CONFIG.THEME.DEFAULT;
                this.applicationManager.applyTheme(fallbackTheme);
                return fallbackTheme;
            }
        });
    }

    /**
     * Применяет тему к документу.
     * 
     * @param {string} theme - Тема для применения ('light' или 'dark')
     * @returns {boolean} true если тема успешно применена
     */
    applyTheme(theme) {
        return this._executeWithTiming('applyTheme', () => {
            try {
                if (!this.applicationManager.isValidTheme(theme)) {
                    this._logError({ key: 'logs.theme.themeManager.invalidTheme' }, { theme });
                    return false;
                }

                const applied = this.applicationManager.applyTheme(theme);
                if (applied) {
                    this.storageManager.saveThemeToCache(theme);
                    this.updateState({ currentTheme: theme });
                }

                return applied;
            } catch (error) {
                this._logError({ key: 'logs.theme.themeManager.applyError' }, error);
                return false;
            }
        });
    }

    /**
     * Сохраняет тему в хранилище.
     * 
     * @async
     * @param {string} theme - Тема для сохранения
     * @returns {Promise<boolean>} true если успешно сохранено
     */
    async saveTheme(theme) {
        return await this._executeWithTimingAsync('saveTheme', async () => {
            try {
                if (!this.applicationManager.isValidTheme(theme)) {
                    this._logError({ key: 'logs.theme.themeManager.invalidThemeForSave' }, { theme });
                    return false;
                }

                const saved = await this.storageManager.saveTheme(theme);
                if (saved) {
                    this.updateState({ lastSaveTime: Date.now() });
                }

                return saved;
            } catch (error) {
                this._logError({ key: 'logs.theme.themeManager.saveError' }, error);
                return false;
            }
        });
    }

    /**
     * Получает текущую активную тему.
     * 
     * @returns {string} Текущая тема
     */
    getCurrentTheme() {
        return this.applicationManager.getCurrentTheme();
    }

    /**
     * Начинает слушать изменения темы в хранилище.
     * Автоматически применяет тему при изменении в других окнах/вкладках.
     * 
     * @param {Function} [callback] - Дополнительный callback при изменении темы
     * @returns {boolean} true если слушатель успешно установлен
     */
    listenForThemeChanges(callback) {
        try {
            const onThemeChange = (newTheme) => {
                if (this.applicationManager.isValidTheme(newTheme)) {
                    this.applicationManager.applyTheme(newTheme);
                    this.storageManager.saveThemeToCache(newTheme);
                    
                    if (callback) {
                        try {
                            callback(newTheme);
                        } catch (error) {
                            this._logError({ key: 'logs.theme.themeManager.userCallbackError' }, error);
                        }
                    }
                }
            };

            return this.syncManager.startListening(onThemeChange);
        } catch (error) {
            this._logError({ key: 'logs.theme.themeManager.listenerSetupError' }, error);
            return false;
        }
    }

    /**
     * Останавливает прослушивание изменений темы.
     * 
     * @returns {boolean} true если слушатель успешно удален
     */
    stopListening() {
        return this.syncManager.stopListening();
    }

    /**
     * Проверяет, активен ли слушатель.
     * 
     * @returns {boolean} true если слушатель активен
     */
    isListening() {
        return this.syncManager.isListening();
    }

    /**
     * Получает полную статистику работы менеджера.
     * 
     * @returns {Object} Объект со статистикой всех подменеджеров
     */
    getStatistics() {
        return {
            isInitialized: this.isInitialized,
            currentTheme: this.getCurrentTheme(),
            storage: this.storageManager.getStatistics(),
            application: this.applicationManager.getStatistics(),
            sync: this.syncManager.getStatistics(),
            performanceMetrics: Object.fromEntries(this.performanceMetrics)
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
            enableLogging: this.enableLogging,
            currentTheme: this.getCurrentTheme(),
            statistics: this.getStatistics(),
            state: this.getState(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.theme.themeManager.cleanupStart' });
        
        try {
            // Уничтожаем подменеджеры
            if (this.syncManager) {
                this.syncManager.destroy();
                this.syncManager = null;
            }

            if (this.applicationManager) {
                this.applicationManager.destroy();
                this.applicationManager = null;
            }

            if (this.storageManager) {
                this.storageManager.destroy();
                this.storageManager = null;
            }

            this.isInitialized = false;
            this._log({ key: 'logs.theme.themeManager.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.theme.themeManager.destroyError' }, error);
        }

        super.destroy();
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
    module.exports.default = ThemeManager;
}

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
}
