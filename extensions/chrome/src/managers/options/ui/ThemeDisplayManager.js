const CONFIG = require('../../../../config.js');

/**
 * Менеджер для отображения темы.
 * Отвечает за переключение темы и обновление отображения темы.
 * 
 * @class ThemeDisplayManager
 */
class ThemeDisplayManager {
    /**
     * Создает экземпляр ThemeDisplayManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Устанавливает ThemeManager.
     * 
     * @param {Object} themeManager - Экземпляр ThemeManager
     * @returns {void}
     */
    setThemeManager(themeManager) {
        this.manager.themeManager = themeManager;
        this.manager._log({ key: 'logs.ui.themeDisplay.themeManagerSet' });
    }

    /**
     * Переключает тему.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleTheme() {
        const manager = this.manager;

        try {
            if (!manager.themeManager) {
                manager._logError({ key: 'logs.ui.themeDisplay.themeManagerNotSet' });
                return;
            }

            manager._log({ key: 'logs.ui.themeDisplay.toggleThemeStart' });

            const currentTheme = manager.themeManager.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            manager.themeManager.applyTheme(newTheme);
            await manager.themeManager.saveTheme(newTheme);

            this.updateThemeDisplay(newTheme);

            manager._log({ key: 'logs.ui.themeDisplay.themeToggled' }, {
                from: currentTheme,
                to: newTheme
            });
        } catch (error) {
            manager._logError({ key: 'logs.ui.themeDisplay.toggleThemeError' }, error);
            manager.statusManager.showError(
                manager.localeManager.t('options.status.saveError')
            );
        }
    }

    /**
     * Обновляет отображение темы.
     * 
     * @param {string} [theme] - Тема для отображения
     * @returns {void}
     */
    updateThemeDisplay(theme) {
        const manager = this.manager;

        try {
            const themeIconElement = document.getElementById('themeIcon');
            const themeLabelElement = document.getElementById('themeLabel');

            if (!themeIconElement || !themeLabelElement) {
                return;
            }

            const currentTheme = theme || (manager.themeManager ? manager.themeManager.getCurrentTheme() : 'light');
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';

            if (targetTheme === 'dark') {
                themeIconElement.textContent = CONFIG.UI.THEME_DISPLAY.ICONS.DARK;
                themeLabelElement.textContent = manager.localeManager.t('options.theme.dark');
            } else {
                themeIconElement.textContent = CONFIG.UI.THEME_DISPLAY.ICONS.LIGHT;
                themeLabelElement.textContent = manager.localeManager.t('options.theme.light');
            }
        } catch (error) {
            manager._logError({ key: 'logs.ui.themeDisplay.updateThemeDisplayError' }, error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeDisplayManager;
    module.exports.default = ThemeDisplayManager;
}

if (typeof window !== 'undefined') {
    window.ThemeDisplayManager = ThemeDisplayManager;
}
