const DomainExceptionsManager = require('./DomainExceptionsManager.js');
const ActivityManager = require('./ActivityManager.js');
const SettingsManager = require('./SettingsManager.js');
const EventHandlersManager = require('./EventHandlersManager.js');
const LocaleDisplayManager = require('./LocaleDisplayManager.js');
const ThemeDisplayManager = require('./ThemeDisplayManager.js');

/**
 * Менеджер для управления пользовательским интерфейсом.
 * Координирует работу всех UI-менеджеров.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class UIManager
 */
class UIManager {
    /**
     * Создает экземпляр UIManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
        
        this.domainExceptionsManager = new DomainExceptionsManager(manager);
        this.activityManager = new ActivityManager(manager);
        this.settingsManager = new SettingsManager(manager);
        this.eventHandlersManager = new EventHandlersManager(manager);
        this.localeDisplayManager = new LocaleDisplayManager(manager);
        this.themeDisplayManager = new ThemeDisplayManager(manager);
    }

    /**
     * Устанавливает список исключений доменов.
     * 
     * @param {string[]} domains - Массив доменов
     * @returns {void}
     */
    setDomainExceptions(domains) {
        return this.domainExceptionsManager.setDomainExceptions(domains);
    }

    /**
     * Получает список исключений доменов.
     * 
     * @returns {string[]} Массив доменов
     */
    getDomainExceptions() {
        return this.domainExceptionsManager.getDomainExceptions();
    }

    /**
     * Добавляет домен в исключения.
     * 
     * @param {string} [value] - Значение домена
     * @returns {boolean} true если домен добавлен успешно
     */
    addDomainException(value) {
        return this.domainExceptionsManager.addDomainException(value);
    }

    /**
     * Удаляет домен из исключений.
     * 
     * @param {string} domain - Домен для удаления
     * @returns {void}
     */
    removeDomainException(domain) {
        return this.domainExceptionsManager.removeDomainException(domain);
    }

    /**
     * Отображает список исключений доменов в DOM.
     * 
     * @returns {void}
     */
    renderDomainExceptions() {
        return this.domainExceptionsManager.renderDomainExceptions();
    }

    /**
     * Загружает статистику активности.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadActivityStats() {
        return this.activityManager.loadActivityStats();
    }

    /**
     * Устанавливает диапазон активности по ключу.
     * 
     * @param {string} key - Ключ диапазона
     * @returns {void}
     */
    setActivityRangeByKey(key) {
        return this.activityManager.setActivityRangeByKey(key);
    }

    /**
     * Запускает автообновление активности.
     * 
     * @returns {void}
     */
    startActivityAutoRefresh() {
        return this.activityManager.startActivityAutoRefresh();
    }

    /**
     * Останавливает автообновление активности.
     * 
     * @returns {void}
     */
    stopActivityAutoRefresh() {
        return this.activityManager.stopActivityAutoRefresh();
    }

    /**
     * Сохраняет настройки.
     * 
     * @async
     * @returns {Promise<boolean>} true если настройки сохранены успешно
     */
    async saveSettings() {
        return this.settingsManager.saveSettings();
    }

    /**
     * Сбрасывает настройки к значениям по умолчанию.
     * 
     * @async
     * @returns {Promise<boolean>} true если настройки сброшены успешно
     */
    async resetToDefault() {
        return this.settingsManager.resetToDefault();
    }

    /**
     * Настраивает обработчики событий.
     * 
     * @returns {void}
     */
    setupEventHandlers() {
        return this.eventHandlersManager.setupEventHandlers();
    }

    /**
     * Переключает язык.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleLanguage() {
        return this.localeDisplayManager.toggleLanguage();
    }

    /**
     * Обновляет отображение языка.
     * 
     * @returns {void}
     */
    updateLanguageDisplay() {
        return this.localeDisplayManager.updateLanguageDisplay();
    }

    /**
     * Обрабатывает изменение локали.
     * 
     * @returns {void}
     */
    onLocaleChange() {
        return this.localeDisplayManager.onLocaleChange();
    }

    /**
     * Устанавливает ThemeManager.
     * 
     * @param {Object} themeManager - Экземпляр ThemeManager
     * @returns {void}
     */
    setThemeManager(themeManager) {
        return this.themeDisplayManager.setThemeManager(themeManager);
    }

    /**
     * Переключает тему.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleTheme() {
        return this.themeDisplayManager.toggleTheme();
    }

    /**
     * Обновляет отображение темы.
     * 
     * @param {string} [theme] - Тема для отображения
     * @returns {void}
     */
    updateThemeDisplay(theme) {
        return this.themeDisplayManager.updateThemeDisplay(theme);
    }

    /**
     * Получает Set исключений доменов (для обратной совместимости).
     * 
     * @returns {Set<string>} Set исключений доменов
     */
    get domainExceptions() {
        return this.domainExceptionsManager.domainExceptions;
    }

    /**
     * Получает историю активности (для обратной совместимости).
     * 
     * @returns {Array<{t: number, v: number}>} История активности
     */
    get activityHistory() {
        return this.activityManager.activityHistory;
    }

    /**
     * Получает флаг инициализации графика активности (для обратной совместимости).
     * 
     * @returns {boolean} true если график инициализирован
     */
    get activityChartInitialized() {
        return this.activityManager.activityChartInitialized;
    }

    /**
     * Получает ключ диапазона активности (для обратной совместимости).
     * 
     * @returns {string} Ключ диапазона активности
     */
    get activityRangeKey() {
        return this.activityManager.activityRangeKey;
    }

    /**
     * Получает диапазон активности в миллисекундах (для обратной совместимости).
     * 
     * @returns {number} Диапазон активности в миллисекундах
     */
    get activityRangeMs() {
        return this.activityManager.activityRangeMs;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
    module.exports.default = UIManager;
}

if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
