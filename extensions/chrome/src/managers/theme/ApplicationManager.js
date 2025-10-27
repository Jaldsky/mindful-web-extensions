const BaseManager = require('../../base/BaseManager.js');

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
    static THEME_ATTRIBUTE = 'data-theme';

    /**
     * Доступные темы
     * @readonly
     * @static
     * @enum {string}
     */
    static THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    };

    /**
     * Создает экземпляр ApplicationManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging] - Включить логирование
     */
    constructor(options = {}) {
        super(options);

        /** @type {string} */
        this.currentTheme = ApplicationManager.THEMES.LIGHT;

        /** @type {Object} */
        this.statistics = {
            applies: 0,
            lastAppliedTheme: null,
            errors: 0
        };

        this._log('ApplicationManager создан');
    }

    /**
     * Валидирует тему.
     * 
     * @param {string} theme - Тема для валидации
     * @returns {boolean} true если тема валидна
     */
    isValidTheme(theme) {
        return Object.values(ApplicationManager.THEMES).includes(theme);
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
                    this._logError('Попытка применить невалидную тему', { theme });
                    theme = ApplicationManager.THEMES.LIGHT;
                }

                if (theme === ApplicationManager.THEMES.DARK) {
                    document.documentElement.setAttribute(ApplicationManager.THEME_ATTRIBUTE, 'dark');
                } else {
                    document.documentElement.removeAttribute(ApplicationManager.THEME_ATTRIBUTE);
                }
                
                this.currentTheme = theme;
                this.statistics.applies++;
                this.statistics.lastAppliedTheme = theme;
                this.updateState({ 
                    currentTheme: theme, 
                    lastApplyTime: Date.now() 
                });
                
                this._log('Тема применена к DOM', { theme });
                return true;
            } catch (error) {
                this.statistics.errors++;
                this._logError('Ошибка применения темы', error);
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
        this._log('Очистка ресурсов ApplicationManager');
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApplicationManager;
    module.exports.default = ApplicationManager;
}

if (typeof window !== 'undefined') {
    window.ThemeApplicationManager = ApplicationManager;
}
