const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');

/**
 * Менеджер для применения темы к DOM.
 * Отвечает за установку/удаление атрибута data-theme на document.documentElement.
 * 
 * @class ApplicationManager
 * @extends BaseManager
 */
class ApplicationManager extends BaseManager {
    /**
     * Атрибут для темы
     * @readonly
     * @static
     */
    static THEME_ATTRIBUTE = CONFIG.THEME.ATTRIBUTE;

    /**
     * Доступные темы
     * @readonly
     * @static
     * @enum {string}
     */
    static THEMES = CONFIG.THEME.THEMES;

    /**
     * Создает экземпляр ApplicationManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        super(options);

        /** @type {string} */
        this.currentTheme = CONFIG.THEME.THEMES.LIGHT;

        /** @type {Object} */
        this.statistics = {
            applies: 0,
            lastAppliedTheme: null,
            errors: 0
        };

        this._log({ key: 'logs.theme.application.created' });
    }

    /**
     * Валидирует тему.
     * 
     * @param {string} theme - Тема для валидации
     * @returns {boolean} true если тема валидна
     */
    isValidTheme(theme) {
        return CONFIG.THEME.AVAILABLE.includes(theme);
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
                if (!this.isValidTheme(theme)) {
                    this._logError({ key: 'logs.theme.application.invalidThemeAttempt' }, { theme });
                    theme = CONFIG.THEME.THEMES.LIGHT;
                }

                if (theme === CONFIG.THEME.THEMES.DARK) {
                    document.documentElement.setAttribute(CONFIG.THEME.ATTRIBUTE, CONFIG.THEME.THEMES.DARK);
                } else {
                    document.documentElement.removeAttribute(CONFIG.THEME.ATTRIBUTE);
                }
                
                this.currentTheme = theme;
                this.statistics.applies++;
                this.statistics.lastAppliedTheme = theme;
                this.updateState({ 
                    currentTheme: theme, 
                    lastApplyTime: Date.now() 
                });
                
                this._log({ key: 'logs.theme.application.themeApplied' }, { theme });
                return true;
            } catch (error) {
                this.statistics.errors++;
                this._logError({ key: 'logs.theme.application.applyError' }, error);
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
        return this.currentTheme;
    }

    /**
     * Получает статистику применения тем.
     * 
     * @returns {Object} Статистика
     */
    getStatistics() {
        return { ...this.statistics };
    }

    /**
     * Очищает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.theme.application.cleanupStart' });
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApplicationManager;
    module.exports.default = ApplicationManager;
}
