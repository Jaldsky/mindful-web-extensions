const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');
const DOMManager = require('./DOMManager.js');
const StorageManager = require('./StorageManager.js');
const StatusManager = require('./StatusManager.js');
const ValidationManager = require('./ValidationManager.js');
const ServiceWorkerManager = require('../app/ServiceWorkerManager.js');
const DiagnosticsManager = require('../app/DiagnosticsManager.js');
const NotificationManager = require('../app/NotificationManager.js');
const LocaleManager = require('../locale/LocaleManager.js');

/**
 * Главный менеджер настроек, координирующий работу всех компонентов options page.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class OptionsManager
 * @extends BaseManager
 */
class OptionsManager extends BaseManager {
    /**
     * Метки кнопок для различных состояний.
     * @readonly
     * @static
     */
    static BUTTON_LABELS = CONFIG.BUTTON_LABELS;

    /**
     * Сообщения для статусов
     * @readonly
     * @static
     */
    static STATUS_MESSAGES = {
        SETTINGS_SAVED: 'Settings saved successfully!',
        SETTINGS_RESET: 'Settings reset to default',
        LOAD_ERROR: 'Error loading settings',
        SAVE_ERROR: 'Error saving settings',
        RESET_ERROR: 'Error resetting settings',
        UI_UPDATE_ERROR: 'Warning: UI update issue detected'
    };

    /**
     * Создает экземпляр OptionsManager.
     * Инициализирует все необходимые менеджеры и настраивает их взаимодействие.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=true] - Включить логирование
     */
    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
            ...options
        });

        // Инициализация менеджеров с обработкой ошибок
        this.localeManager = new LocaleManager({ enableLogging: this.enableLogging });
        
        try {
            this.domManager = new DOMManager({ enableLogging: this.enableLogging });
        } catch (error) {
            this._logError('Критическая ошибка инициализации DOMManager', error);
            throw new Error(`DOM Manager initialization failed: ${error.message}`);
        }
        
        try {
            this.storageManager = new StorageManager({ enableLogging: this.enableLogging });
        } catch (error) {
            this._logError('Критическая ошибка инициализации StorageManager', error);
            throw new Error(`Storage Manager initialization failed: ${error.message}`);
        }

        // ThemeManager уже создан в options.js, получаем ссылку позже через setThemeManager
        
        this.validationManager = new ValidationManager({ 
            enableLogging: this.enableLogging,
            enableHistory: true,
            maxHistorySize: 50
        });
        
        // StatusManager с расширенной конфигурацией и валидацией
        try {
            this.statusManager = new StatusManager({ 
                enableLogging: this.enableLogging,
                statusElement: this.domManager.elements.status,
                enableHistory: true,
                enableQueue: true,
                maxHistorySize: 50,
                maxQueueSize: 5,
                defaultDuration: 3000
            });
        } catch (error) {
            this._logError('Ошибка инициализации StatusManager', error);
            // Создаем StatusManager без элемента, установим позже
            this.statusManager = new StatusManager({ 
                enableLogging: this.enableLogging,
                enableHistory: true,
                enableQueue: true
            });
        }

        // Инициализация менеджеров для диагностики
        this.notificationManager = new NotificationManager({ enableLogging: this.enableLogging });
        this.serviceWorkerManager = new ServiceWorkerManager({ enableLogging: this.enableLogging });
        this.diagnosticsManager = new DiagnosticsManager(
            this.serviceWorkerManager,
            this.notificationManager,
            { enableLogging: this.enableLogging }
        );

        // Хранилище обработчиков событий
        this.eventHandlers = new Map();

        // Хранилище оригинальных текстов кнопок
        this.originalButtonTexts = new Map();

        // Флаг инициализации
        this.isInitialized = false;

        this.init();
    }

    /**
     * Инициализирует менеджер настроек.
     * Загружает настройки, настраивает обработчики событий.
     * Включает проверку доступности Storage API.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log('OptionsManager уже инициализирован');
            return;
        }

        const initStartTime = performance.now();

        try {
            this._log('Начало инициализации OptionsManager');

            // Инициализируем LocaleManager
            await this.localeManager.init();
            
            // Применяем локализацию к DOM
            this.localeManager.localizeDOM();
            
            // Обновляем отображение текущего языка
            this.updateLanguageDisplay();

            // Загружаем сохраненные настройки
            // (валидация Storage API уже произошла в конструкторе StorageManager)
            await this.loadSettings();

            // Настраиваем обработчики событий
            this.setupEventHandlers();

            // Слушаем изменения локали
            this.localeManager.addLocaleChangeListener(() => {
                this.onLocaleChange();
            });

            this.isInitialized = true;
            
            const initTime = Math.round(performance.now() - initStartTime);
            this._log('OptionsManager инициализирован успешно', {
                initTime: `${initTime}мс`,
                storageMetrics: this.storageManager.getPerformanceMetrics(),
                domMetrics: this.domManager.getPerformanceMetrics(),
                domElements: this.domManager.getElementsStatistics(),
                validationMetrics: this.validationManager.getPerformanceMetrics()
            });
            
        } catch (error) {
            const initTime = Math.round(performance.now() - initStartTime);
            this._logError(`Ошибка инициализации OptionsManager (${initTime}мс)`, error);
            
            // Показываем специфичное сообщение об ошибке
            const errorMessage = error.message.includes('Chrome Storage API')
                ? error.message
                : this.localeManager?.t('options.status.loadError') || OptionsManager.STATUS_MESSAGES.LOAD_ERROR;
            
            const statusShown = this.statusManager.showError(errorMessage);
            
            if (!statusShown) {
                this._log('Предупреждение: не удалось отобразить статус ошибки инициализации');
            }
            
            throw error;
        }
    }

    /**
     * Загружает настройки из хранилища и отображает их в UI.
     * Включает измерение производительности и детальное логирование.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadSettings() {
        const startTime = performance.now();
        
        try {
            this._log('Загрузка настроек');

            const backendUrl = await this.storageManager.loadBackendUrl();
            
            // Проверяем успешность установки значения в UI с верификацией
            const setSuccess = this.domManager.setBackendUrlValue(backendUrl);
            
            if (!setSuccess) {
                this._logError('Не удалось обновить UI после загрузки настроек');
                
                // Показываем предупреждение пользователю
                const warningShown = this.statusManager.showWarning(
                    OptionsManager.STATUS_MESSAGES.UI_UPDATE_ERROR
                );
                
                if (!warningShown) {
                    this._log('Предупреждение: не удалось отобразить предупреждение о проблеме с UI');
                }
            }

            const loadTime = Math.round(performance.now() - startTime);
            this._log('Настройки загружены успешно', { 
                backendUrl: backendUrl.substring(0, 50) + (backendUrl.length > 50 ? '...' : ''), 
                loadTime: `${loadTime}мс`,
                uiUpdateSuccess: setSuccess
            });
            
        } catch (error) {
            const loadTime = Math.round(performance.now() - startTime);
            this._logError(`Ошибка загрузки настроек (${loadTime}мс)`, error);
            
            // Показываем более детальное сообщение об ошибке
            const errorMessage = error.message.includes('chrome.storage API недоступен')
                ? 'Storage API unavailable. Please reload the extension.'
                : OptionsManager.STATUS_MESSAGES.LOAD_ERROR;
            
            const statusShown = this.statusManager.showError(errorMessage);
            
            if (!statusShown) {
                this._log('Предупреждение: не удалось отобразить статус ошибки');
            }
            
            throw error;
        }
    }

    /**
     * Настраивает обработчики событий для формы.
     * Сохраняет обработчики в Map для последующей очистки.
     * Включает проверки доступности элементов и измерение производительности.
     * 
     * @returns {void}
     */
    setupEventHandlers() {
        const setupStartTime = performance.now();
        let handlersCount = 0;
        
        this._log('Настройка обработчиков событий');

        // Обработчик отправки формы
        if (this.domManager.elements.settingsForm) {
            const formSubmitHandler = (e) => {
                e.preventDefault();
                this.saveSettings();
            };
            
            this.domManager.elements.settingsForm.addEventListener('submit', formSubmitHandler);
            this.eventHandlers.set('settingsForm', formSubmitHandler);
            handlersCount++;
        } else {
            this._log('Предупреждение: форма настроек не найдена, обработчик submit не установлен');
        }

        // Обработчик кнопки сброса
        if (this.domManager.elements.resetBtn) {
            // Сохраняем оригинальный текст кнопки
            this.originalButtonTexts.set('resetBtn', this.domManager.elements.resetBtn.textContent);
            
            const resetClickHandler = () => {
                this.resetToDefault();
            };
            
            this.domManager.elements.resetBtn.addEventListener('click', resetClickHandler);
            this.eventHandlers.set('resetBtn', resetClickHandler);
            handlersCount++;
        } else {
            this._log('Предупреждение: кнопка сброса не найдена, обработчик не установлен');
        }

        // Сохраняем оригинальный текст кнопки сохранения
        if (this.domManager.elements.saveBtn) {
            this.originalButtonTexts.set('saveBtn', this.domManager.elements.saveBtn.textContent);
        } else {
            this._log('Предупреждение: кнопка сохранения не найдена');
        }

        // Обработчик кнопки диагностики
        if (this.domManager.elements.runDiagnostics) {
            this.originalButtonTexts.set('runDiagnostics', this.domManager.elements.runDiagnostics.textContent);
            
            const diagnosticsClickHandler = async () => {
                await this.runDiagnostics();
            };
            
            this.domManager.elements.runDiagnostics.addEventListener('click', diagnosticsClickHandler);
            this.eventHandlers.set('runDiagnostics', diagnosticsClickHandler);
            handlersCount++;
        } else {
            this._log('Предупреждение: кнопка диагностики не найдена, обработчик не установлен');
        }

        // Обработчик закрытия панели разработчика
        const closeDevToolsPanel = document.getElementById('closeDevToolsPanel');
        if (closeDevToolsPanel) {
            const handler = () => this.closeDevToolsPanel();
            closeDevToolsPanel.addEventListener('click', handler);
            this.eventHandlers.set('closeDevToolsPanel', handler);
            handlersCount++;
        }

        // Обработчики переключения вкладок
        const logsTab = document.getElementById('logsTab');
        const diagnosticsTab = document.getElementById('diagnosticsTab');
        
        if (logsTab) {
            const handler = () => this.switchTab('logs');
            logsTab.addEventListener('click', handler);
            this.eventHandlers.set('logsTab', handler);
            handlersCount++;
        }
        
        if (diagnosticsTab) {
            const handler = () => this.switchTab('diagnostics');
            diagnosticsTab.addEventListener('click', handler);
            this.eventHandlers.set('diagnosticsTab', handler);
            handlersCount++;
        }

        const refreshLogs = document.getElementById('refreshLogs');
        if (refreshLogs) {
            const handler = () => this.refreshLogs();
            refreshLogs.addEventListener('click', handler);
            this.eventHandlers.set('refreshLogs', handler);
            handlersCount++;
        }

        const clearLogs = document.getElementById('clearLogs');
        if (clearLogs) {
            const handler = () => this.clearLogs();
            clearLogs.addEventListener('click', handler);
            this.eventHandlers.set('clearLogs', handler);
            handlersCount++;
        }

        const copyLogs = document.getElementById('copyLogs');
        if (copyLogs) {
            const handler = () => this.copyLogs();
            copyLogs.addEventListener('click', handler);
            this.eventHandlers.set('copyLogs', handler);
            handlersCount++;
        }

        // Language toggle button
        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
            const handler = async () => {
                await this.toggleLanguage();
            };
            languageToggle.addEventListener('click', handler);
            this.eventHandlers.set('languageToggle', handler);
            handlersCount++;
        }

        // Theme toggle button
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const handler = async () => {
                await this.toggleTheme();
            };
            themeToggle.addEventListener('click', handler);
            this.eventHandlers.set('themeToggle', handler);
            handlersCount++;
        }

        // Developer tools toggle button - opens panel
        if (this.domManager.elements.toggleDeveloperTools) {
            const handler = () => {
                const panel = document.getElementById('devToolsPanel');
                if (panel && panel.style.display === 'block') {
                    this.closeDevToolsPanel();
                } else {
                    this.openDevToolsPanel('logs');
                }
            };
            this.domManager.elements.toggleDeveloperTools.addEventListener('click', handler);
            this.eventHandlers.set('toggleDeveloperTools', handler);
            handlersCount++;
        } else {
            this._log('Предупреждение: кнопка developer tools не найдена, обработчик не установлен');
        }

        // Restore developer tools state from localStorage
        this.restoreDeveloperToolsState();

        const setupTime = Math.round(performance.now() - setupStartTime);
        this._log('Обработчики событий настроены', {
            setupTime: `${setupTime}мс`,
            handlersCount,
            domStatistics: this.domManager.getElementsStatistics()
        });
    }

    /**
     * Сохраняет настройки с полным циклом валидации и верификации.
     * 
     * @async
     * @returns {Promise<boolean>} true если сохранение успешно
     */
    async saveSettings() {
        const saveBtn = this.domManager.elements.saveBtn;
        const originalText = this.localeManager.t('options.buttons.save');
        const operationStartTime = performance.now();

        try {
            this._log('Начало операции сохранения настроек');

            // Блокируем кнопку и меняем текст с верификацией
            const buttonStateSet = this.domManager.setButtonState(
                saveBtn,
                this.localeManager.t('options.buttons.saving'),
                true
            );
            
            if (!buttonStateSet) {
                this._log('Предупреждение: не удалось обновить состояние кнопки сохранения');
            }

            // Получаем значение URL из формы с измерением времени
            const backendUrl = this.domManager.getBackendUrlValue();
            
            if (!backendUrl && backendUrl !== '') {
                this._logError('Не удалось получить значение URL из DOM');
                
                const errorShown = this.statusManager.showError(
                    OptionsManager.STATUS_MESSAGES.UI_UPDATE_ERROR
                );
                
                if (!errorShown) {
                    this._log('Предупреждение: не удалось отобразить статус ошибки чтения UI');
                }
                
                return false;
            }

            // Валидируем URL с измерением времени
            const validationResult = this.validationManager.validateBackendUrl(backendUrl);
            
            if (!validationResult.isValid) {
                this._log('Валидация не прошла', {
                    error: validationResult.error,
                    validationMetrics: this.validationManager.getPerformanceMetrics(),
                    validationStats: this.validationManager.getValidationStatistics()
                });
                
                const statusShown = this.statusManager.showError(validationResult.error);
                
                if (!statusShown) {
                    this._log('Предупреждение: не удалось отобразить статус ошибки валидации');
                }
                
                return false;
            }
            
            this._log('Валидация URL успешна', {
                url: validationResult.value.substring(0, 50) + (validationResult.value.length > 50 ? '...' : ''),
                validationMetrics: this.validationManager.getPerformanceMetrics()
            });

            // Сохраняем в хранилище (с внутренней верификацией)
            const saveSuccess = await this.storageManager.saveBackendUrl(validationResult.value);
            
            if (!saveSuccess) {
                throw new Error('Верификация сохранения не удалась');
            }

            // Уведомляем background script (неблокирующая операция)
            const notifySuccess = await this.storageManager.notifyBackgroundScript(validationResult.value);
            
            if (!notifySuccess) {
                this._log('Background script не был уведомлен (продолжаем работу)');
            }

            // Показываем успешный статус
            const statusShown = this.statusManager.showSuccess(
                this.localeManager.t('options.status.settingsSaved')
            );

            const totalTime = Math.round(performance.now() - operationStartTime);
            
            this._log('Настройки успешно сохранены', {
                totalTime: `${totalTime}мс`,
                backgroundNotified: notifySuccess,
                statusDisplayed: statusShown,
                statusMetrics: this.statusManager.getPerformanceMetrics(),
                validationMetrics: this.validationManager.getPerformanceMetrics(),
                domMetrics: this.domManager.getPerformanceMetrics(),
                storageMetrics: this.storageManager.getPerformanceMetrics()
            });
            
            return true;

        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            this._logError(`Ошибка сохранения настроек (${totalTime}мс)`, error);
            
            // Показываем специфичное сообщение об ошибке
            const errorMessage = error.message.includes('Верификация')
                ? this.localeManager.t('options.status.saveFailed')
                : this.localeManager.t('options.status.saveError');
            
            const statusShown = this.statusManager.showError(errorMessage);
            
            if (!statusShown) {
                this._log('Предупреждение: не удалось отобразить статус ошибки сохранения');
            }
            
            return false;
            
        } finally {
            // Восстанавливаем кнопку с проверкой
            const buttonRestored = this.domManager.setButtonState(
                saveBtn,
                originalText,
                false
            );
            
            if (!buttonRestored) {
                this._log('Предупреждение: не удалось восстановить состояние кнопки сохранения');
            }
        }
    }

    /**
     * Сбрасывает настройки к значениям по умолчанию с полной верификацией.
     * 
     * @async
     * @returns {Promise<boolean>} true если сброс успешен
     */
    async resetToDefault() {
        const resetBtn = this.domManager.elements.resetBtn;
        const originalText = this.localeManager.t('options.buttons.reset');
        const operationStartTime = performance.now();

        try {
            this._log('Начало операции сброса настроек');

            // Блокируем кнопку и меняем текст с верификацией
            const buttonStateSet = this.domManager.setButtonState(
                resetBtn,
                this.localeManager.t('options.buttons.resetting'),
                true
            );
            
            if (!buttonStateSet) {
                this._log('Предупреждение: не удалось обновить состояние кнопки сброса');
            }

            // Сбрасываем в хранилище (использует saveBackendUrl с верификацией)
            const defaultUrl = await this.storageManager.resetToDefault();

            // Обновляем UI с верификацией
            const uiUpdateSuccess = this.domManager.setBackendUrlValue(defaultUrl);
            
            if (!uiUpdateSuccess) {
                this._logError('Не удалось обновить UI после сброса настроек');
                
                // Показываем предупреждение пользователю
                const warningShown = this.statusManager.showWarning(
                    OptionsManager.STATUS_MESSAGES.UI_UPDATE_ERROR
                );
                
                if (!warningShown) {
                    this._log('Предупреждение: не удалось отобразить предупреждение о проблеме с UI');
                }
            }

            // Уведомляем background script (неблокирующая операция)
            const notifySuccess = await this.storageManager.notifyBackgroundScript(defaultUrl);
            
            if (!notifySuccess) {
                this._log('Background script не был уведомлен (продолжаем работу)');
            }

            // Показываем успешный статус
            const statusShown = this.statusManager.showSuccess(
                this.localeManager.t('options.status.settingsReset')
            );

            const totalTime = Math.round(performance.now() - operationStartTime);
            
            this._log('Настройки сброшены к значениям по умолчанию', {
                defaultUrl,
                totalTime: `${totalTime}мс`,
                uiUpdateSuccess,
                backgroundNotified: notifySuccess,
                statusDisplayed: statusShown,
                statusMetrics: this.statusManager.getPerformanceMetrics(),
                domMetrics: this.domManager.getPerformanceMetrics(),
                storageMetrics: this.storageManager.getPerformanceMetrics()
            });
            
            return true;

        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            this._logError(`Ошибка сброса настроек (${totalTime}мс)`, error);
            
            const statusShown = this.statusManager.showError(
                this.localeManager.t('options.status.resetError')
            );
            
            if (!statusShown) {
                this._log('Предупреждение: не удалось отобразить статус ошибки сброса');
            }
            
            return false;
            
        } finally {
            // Восстанавливаем кнопку с проверкой
            const buttonRestored = this.domManager.setButtonState(
                resetBtn,
                originalText,
                false
            );
            
            if (!buttonRestored) {
                this._log('Предупреждение: не удалось восстановить состояние кнопки сброса');
            }
        }
    }

    /**
     * Запускает диагностику системы.
     * 
     * @async
     * @returns {Promise<Object>} Результаты диагностики
     */
    async runDiagnostics() {
        const button = this.domManager.elements.runDiagnostics;
        const originalText = button ? button.textContent : '';
        const operationStartTime = performance.now();
        
        try {
            this._log('Запуск диагностики');

            // Блокируем кнопку и меняем текст
            if (button) {
                button.disabled = true;
                button.textContent = this.localeManager.t('options.buttons.analyzing') || 'Analyzing...';
            }

            // Минимальная задержка для визуальной обратной связи (500ms)
            const minDelay = new Promise(resolve => setTimeout(resolve, 500));
            const diagnosticsRun = this.diagnosticsManager.runDiagnostics();
            
            const [results] = await Promise.all([diagnosticsRun, minDelay]);
            
            // Отрисовываем результаты
            this._renderDiagnostics(results);

            const totalTime = Math.round(performance.now() - operationStartTime);
            this._log('Диагностика завершена', { 
                overall: results.overall,
                totalTime: `${totalTime}мс`
            });

            return results;
        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            this._logError(`Ошибка диагностики (${totalTime}мс)`, error);
            
            const statusShown = this.statusManager.showError(
                this.localeManager.t('options.status.diagnosticsError')
            );
            
            if (!statusShown) {
                this._log('Предупреждение: не удалось отобразить статус ошибки диагностики');
            }
            
            throw error;
        } finally {
            // Восстанавливаем кнопку
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    /**
     * Переключает язык интерфейса.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleLanguage() {
        try {
            await this.localeManager.toggleLocale();
        } catch (error) {
            this._logError('Ошибка переключения языка', error);
        }
    }

    /**
     * Обновляет отображение текущего языка.
     * 
     * @returns {void}
     */
    updateLanguageDisplay() {
        const languageCodeElement = document.getElementById('currentLanguage');
        if (languageCodeElement) {
            const locale = this.localeManager.getCurrentLocale();
            languageCodeElement.textContent = locale.toUpperCase();
        }
    }

    /**
     * Обработчик изменения локали.
     * 
     * @returns {void}
     */
    onLocaleChange() {
        try {
            // Применяем локализацию к DOM
            this.localeManager.localizeDOM();
            
            // Обновляем отображение языка
            this.updateLanguageDisplay();
            
            // Обновляем отображение темы (для перевода)
            this.updateThemeDisplay();
            
            this._log('Локаль изменена', {
                locale: this.localeManager.getCurrentLocale()
            });
        } catch (error) {
            this._logError('Ошибка при изменении локали', error);
        }
    }

    /**
     * Устанавливает ссылку на ThemeManager.
     * Вызывается из options.js после создания ThemeManager.
     * 
     * @param {Object} themeManager - Экземпляр ThemeManager
     * @returns {void}
     */
    setThemeManager(themeManager) {
        this.themeManager = themeManager;
        this._log('ThemeManager установлен');
    }

    /**
     * Переключает тему.
     * Использует ThemeManager для координации всех операций с темой.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async toggleTheme() {
        try {
            if (!this.themeManager) {
                this._logError('ThemeManager не установлен');
                return;
            }

            this._log('Переключение темы');
            
            // Получаем текущую тему
            const currentTheme = this.themeManager.getCurrentTheme();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Применяем новую тему
            this.themeManager.applyTheme(newTheme);
            
            // Сохраняем в хранилище
            await this.themeManager.saveTheme(newTheme);
            
            // Обновляем отображение кнопки
            this.updateThemeDisplay(newTheme);
            
            // Уведомление не показываем - визуальное изменение и так очевидно
            
            this._log('Тема переключена', { 
                from: currentTheme, 
                to: newTheme 
            });
        } catch (error) {
            this._logError('Ошибка переключения темы', error);
            // Показываем ошибку только если что-то пошло не так
            this.statusManager.showError(
                this.localeManager.t('options.status.saveError')
            );
        }
    }

    /**
     * Обновляет отображение текущей темы в UI.
     * 
     * @param {string} [theme] - Тема для отображения (если не указана, получается из ThemeManager)
     * @returns {void}
     */
    updateThemeDisplay(theme) {
        try {
            const themeIconElement = document.getElementById('themeIcon');
            const themeLabelElement = document.getElementById('themeLabel');
            
            if (!themeIconElement || !themeLabelElement) {
                return;
            }
            
            const currentTheme = theme || (this.themeManager ? this.themeManager.getCurrentTheme() : 'light');
            
            if (currentTheme === 'dark') {
                themeIconElement.textContent = '🌙';
                themeLabelElement.textContent = this.localeManager.t('options.theme.dark');
            } else {
                themeIconElement.textContent = '☀️';
                themeLabelElement.textContent = this.localeManager.t('options.theme.light');
            }
        } catch (error) {
            this._logError('Ошибка обновления отображения темы', error);
        }
    }

    /**
     * Переключает видимость секции developer tools.
     * 
     * @returns {void}
     */
    toggleDeveloperTools() {
        try {
            const content = document.getElementById('developerToolsContent');
            const icon = document.getElementById('developerToolsIcon');
            const button = document.getElementById('toggleDeveloperTools');
            
            if (!content || !icon || !button) {
                this._logError('Не найдены элементы developer tools');
                return;
            }
            
            const isVisible = content.style.display !== 'none';
            
            if (isVisible) {
                // Скрыть с анимацией
                content.classList.add('hiding');
                icon.classList.remove('expanded');
                button.classList.remove('active');
                
                // Ждём окончания анимации (0.5s)
                setTimeout(() => {
                    content.style.display = 'none';
                    content.classList.remove('hiding');
                }, 500);
                
                localStorage.setItem('mindful_developer_tools_expanded', 'false');
            } else {
                // Показать с анимацией
                content.style.display = 'flex';
                icon.classList.add('expanded');
                button.classList.add('active');
                localStorage.setItem('mindful_developer_tools_expanded', 'true');
            }
            
            this._log('Developer tools переключены', { isVisible: !isVisible });
        } catch (error) {
            this._logError('Ошибка переключения developer tools', error);
        }
    }

    /**
     * Восстанавливает состояние developer tools из localStorage.
     * 
     * @returns {void}
     */
    restoreDeveloperToolsState() {
        try {
            const content = document.getElementById('developerToolsContent');
            const icon = document.getElementById('developerToolsIcon');
            const button = document.getElementById('toggleDeveloperTools');
            
            if (!content || !icon || !button) {
                return;
            }
            
            const isExpanded = localStorage.getItem('mindful_developer_tools_expanded') === 'true';
            
            if (isExpanded) {
                content.style.display = 'flex';
                icon.classList.add('expanded');
                button.classList.add('active');
            } else {
                content.style.display = 'none';
                icon.classList.remove('expanded');
                button.classList.remove('active');
            }
            
            this._log('Developer tools состояние восстановлено', { isExpanded });
        } catch (error) {
            this._logError('Ошибка восстановления состояния developer tools', error);
        }
    }

    /**
     * Получает текущее значение URL бэкенда из формы.
     * 
     * @returns {string} Текущее значение URL
     */
    getCurrentBackendUrl() {
        return this.domManager.getBackendUrlValue();
    }

    /**
     * Получает URL бэкенда по умолчанию.
     * 
     * @returns {string} URL по умолчанию
     */
    getDefaultBackendUrl() {
        return this.storageManager.getDefaultBackendUrl();
    }

    /**
     * Проверяет, валиден ли текущий URL в форме.
     * 
     * @returns {boolean} true если URL валиден
     */
    isCurrentUrlValid() {
        const url = this.getCurrentBackendUrl();
        return this.validationManager.isValidUrl(url);
    }

    /**
     * Получает статистику работы статусов.
     * 
     * @returns {Object} Статистика StatusManager
     */
    getStatusStatistics() {
        try {
            return this.statusManager.getStatistics();
        } catch (error) {
            this._logError('Ошибка получения статистики статусов', error);
            return {};
        }
    }

    /**
     * Получает историю статусов.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @param {string} [options.type] - Фильтр по типу
     * @param {number} [options.limit] - Ограничение количества записей
     * @returns {Array} Массив записей истории
     */
    getStatusHistory(options = {}) {
        try {
            return this.statusManager.getHistory(options);
        } catch (error) {
            this._logError('Ошибка получения истории статусов', error);
            return [];
        }
    }

    /**
     * Получает метрики производительности статусов.
     * 
     * @returns {Object} Объект с метриками
     */
    getStatusPerformanceMetrics() {
        try {
            return this.statusManager.getPerformanceMetrics();
        } catch (error) {
            this._logError('Ошибка получения метрик производительности', error);
            return {};
        }
    }

    /**
     * Очищает историю статусов.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearStatusHistory() {
        try {
            const count = this.statusManager.clearHistory();
            this._log(`История статусов очищена: ${count} записей`);
            return count;
        } catch (error) {
            this._logError('Ошибка очистки истории статусов', error);
            return 0;
        }
    }

    /**
     * Получает статистику валидаций.
     * 
     * @returns {Object} Статистика валидаций
     */
    getValidationStatistics() {
        try {
            return this.validationManager.getValidationStatistics();
        } catch (error) {
            this._logError('Ошибка получения статистики валидации', error);
            return {};
        }
    }

    /**
     * Получает историю валидаций.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @returns {Array} История валидаций
     */
    getValidationHistory(options = {}) {
        try {
            return this.validationManager.getHistory(options);
        } catch (error) {
            this._logError('Ошибка получения истории валидации', error);
            return [];
        }
    }

    /**
     * Очищает историю валидаций.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearValidationHistory() {
        try {
            const count = this.validationManager.clearHistory();
            this._log(`История валидаций очищена: ${count} записей`);
            return count;
        } catch (error) {
            this._logError('Ошибка очистки истории валидации', error);
            return 0;
        }
    }

    /**
     * Получает метрики производительности валидаций.
     * 
     * @returns {Object} Метрики производительности
     */
    getValidationPerformanceMetrics() {
        try {
            return this.validationManager.getPerformanceMetrics();
        } catch (error) {
            this._logError('Ошибка получения метрик производительности валидации', error);
            return {};
        }
    }

    /**
     * Проверяет валидность состояния всех менеджеров.
     * 
     * @returns {Object} Результат валидации с деталями по каждому менеджеру
     */
    validateManagersState() {
        const results = {
            isValid: true,
            managers: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Валидация StatusManager
            if (this.statusManager && typeof this.statusManager.validateState === 'function') {
                results.managers.statusManager = this.statusManager.validateState();
                if (!results.managers.statusManager.isValid) {
                    results.isValid = false;
                }
            }

            // Валидация ValidationManager
            if (this.validationManager && typeof this.validationManager.validateState === 'function') {
                results.managers.validationManager = this.validationManager.validateState();
                if (!results.managers.validationManager.isValid) {
                    results.isValid = false;
                }
            }

            this._log('Валидация менеджеров завершена', results);
            return results;
        } catch (error) {
            this._logError('Ошибка валидации менеджеров', error);
            return {
                isValid: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Получает полную диагностическую информацию.
     * 
     * @returns {Object} Диагностическая информация
     */
    getDiagnostics() {
        try {
            return {
                isInitialized: this.isInitialized,
                enableLogging: this.enableLogging,
                statusStatistics: this.getStatusStatistics(),
                statusPerformanceMetrics: this.getStatusPerformanceMetrics(),
                storagePerformanceMetrics: this.storageManager.getPerformanceMetrics(),
                domPerformanceMetrics: this.domManager.getPerformanceMetrics(),
                domElementsStatistics: this.domManager.getElementsStatistics(),
                validationPerformanceMetrics: this.validationManager.getPerformanceMetrics(),
                validationStatistics: this.validationManager.getValidationStatistics(),
                managersValidation: this.validateManagersState(),
                currentUrl: this.getCurrentBackendUrl(),
                defaultUrl: this.getDefaultBackendUrl(),
                isUrlValid: this.isCurrentUrlValid(),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this._logError('Ошибка получения диагностики', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Удаляет обработчики событий.
     * 
     * @private
     * @returns {void}
     */
    _removeEventHandlers() {
        try {
            this.eventHandlers.forEach((handler, key) => {
                let element = this.domManager.elements[key];
                
                // Для обработчиков, которые не в DOMManager, получаем элементы напрямую
                if (!element && (key === 'languageToggle' || key === 'themeToggle')) {
                    element = document.getElementById(key);
                }
                
                if (element && handler) {
                    const eventType = key === 'settingsForm' ? 'submit' : 'click';
                    element.removeEventListener(eventType, handler);
                }
            });

            this.eventHandlers.clear();
            this._log('Обработчики событий удалены');
        } catch (error) {
            this._logError('Ошибка удаления обработчиков событий', error);
        }
    }

    /**
     * Уничтожает все менеджеры.
     * 
     * @private
     * @returns {void}
     */
    _destroyManagers() {
        try {
            if (this.diagnosticsManager) {
                this.diagnosticsManager.destroy();
                this.diagnosticsManager = null;
            }

            if (this.serviceWorkerManager) {
                this.serviceWorkerManager.destroy();
                this.serviceWorkerManager = null;
            }

            if (this.notificationManager) {
                this.notificationManager.destroy();
                this.notificationManager = null;
            }

            if (this.validationManager) {
                this.validationManager.destroy();
                this.validationManager = null;
            }

            if (this.statusManager) {
                this.statusManager.destroy();
                this.statusManager = null;
            }

            if (this.storageManager) {
                this.storageManager.destroy();
                this.storageManager = null;
            }

            if (this.domManager) {
                this.domManager.destroy();
                this.domManager = null;
            }

            if (this.localeManager) {
                this.localeManager.destroy();
                this.localeManager = null;
            }

            this._log('Все менеджеры уничтожены');
        } catch (error) {
            this._logError('Ошибка уничтожения менеджеров', error);
        }
    }

    /**
     * Открывает панель разработчика с указанной вкладкой.
     * 
     * @param {string} tab - Название вкладки ('logs' или 'diagnostics')
     * @returns {void}
     */
    openDevToolsPanel(tab = 'logs') {
        try {
            const panel = document.getElementById('devToolsPanel');
            if (!panel) {
                this._logError('Панель разработчика не найдена');
                return;
            }
            
            // Показываем панель с анимацией
            panel.style.display = 'block';
            panel.classList.remove('closing');
            
            // Переключаемся на нужную вкладку
            this.switchTab(tab);
            
            // Плавная прокрутка к панели
            setTimeout(() => {
                panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
            
            this._log(`Панель разработчика открыта, вкладка: ${tab}`);
        } catch (error) {
            this._logError('Ошибка открытия панели разработчика', error);
        }
    }

    /**
     * Закрывает панель разработчика.
     * 
     * @returns {void}
     */
    closeDevToolsPanel() {
        try {
            const panel = document.getElementById('devToolsPanel');
            if (!panel) {
                this._logError('Панель разработчика не найдена');
                return;
            }
            
            // Добавляем класс для анимации закрытия
            panel.classList.add('closing');
            
            // Скрываем после окончания анимации
            setTimeout(() => {
                panel.style.display = 'none';
                panel.classList.remove('closing');
            }, 300);
            
            this._log('Панель разработчика закрыта');
        } catch (error) {
            this._logError('Ошибка закрытия панели разработчика', error);
        }
    }

    /**
     * Переключает вкладки в панели разработчика.
     * 
     * @param {string} tabName - Название вкладки ('logs' или 'diagnostics')
     * @returns {void}
     */
    switchTab(tabName) {
        try {
            // Получаем все вкладки и контент
            const tabs = document.querySelectorAll('.dev-tab');
            const contents = document.querySelectorAll('.tab-content');
            
            // Убираем активный класс со всех вкладок и контента
            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));
            
            // Активируем нужную вкладку
            const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
            const activeContent = document.getElementById(`${tabName}TabContent`);
            
            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');
                this._log(`Переключено на вкладку: ${tabName}`);
            } else {
                this._logError(`Вкладка ${tabName} не найдена`);
            }
        } catch (error) {
            this._logError('Ошибка переключения вкладок', error);
        }
    }

    /**
     * Загружает и отображает логи.
     * 
     * @returns {Promise<void>}
     */
    async loadLogs() {
        try {
            const logsContent = document.getElementById('logsContent');
            if (!logsContent) {
                this._logError('Контейнер для логов не найден');
                return;
            }
            
            // Получаем логи из chrome.storage.local
            const result = await chrome.storage.local.get(['mindful_logs']);
            const logs = result.mindful_logs || [];
            
            if (logs.length === 0) {
                logsContent.textContent = 'No logs available';
            } else {
                // Форматируем логи
                const formattedLogs = logs.map(log => {
                    const timestamp = new Date(log.timestamp).toLocaleString();
                    const level = log.level || 'INFO';
                    const message = log.message || '';
                    const data = log.data ? JSON.stringify(log.data, null, 2) : '';
                    
                    return `[${timestamp}] [${level}] ${message}${data ? `\n${data}` : ''}`;
                }).join('\n\n');
                
                logsContent.textContent = formattedLogs;
            }
            
            this._log('Логи загружены', { count: logs.length });
        } catch (error) {
            this._logError('Ошибка загрузки логов', error);
            const logsContent = document.getElementById('logsContent');
            if (logsContent) {
                logsContent.textContent = `Error loading logs: ${error.message}`;
            }
        }
    }

    /**
     * Обновляет логи.
     * 
     * @returns {Promise<void>}
     */
    async refreshLogs() {
        try {
            this._log('Обновление логов...');
            await this.loadLogs();
        } catch (error) {
            this._logError('Ошибка обновления логов', error);
        }
    }

    /**
     * Очищает логи.
     * 
     * @returns {Promise<void>}
     */
    async clearLogs() {
        try {
            this._log('Очистка логов...');
            
            // Очищаем логи в storage
            await chrome.storage.local.set({ mindful_logs: [] });
            
            // Обновляем отображение
            const logsContent = document.getElementById('logsContent');
            if (logsContent) {
                logsContent.textContent = '';
            }
            
            this._log('Логи очищены');
            
            // Показываем уведомление
            if (this.statusManager) {
                this.statusManager.showSuccess(
                    this.localeManager.t('options.notifications.logsCleared') || 'Logs cleared successfully'
                );
            }
        } catch (error) {
            this._logError('Ошибка очистки логов', error);
            if (this.statusManager) {
                this.statusManager.showError(
                    this.localeManager.t('options.notifications.logsClearError') || 'Error clearing logs'
                );
            }
        }
    }

    /**
     * Копирует логи в буфер обмена.
     * 
     * @returns {Promise<void>}
     */
    async copyLogs() {
        try {
            const logsContent = document.getElementById('logsContent');
            if (!logsContent || !logsContent.textContent) {
                this._log('Нет логов для копирования');
                return;
            }
            
            await navigator.clipboard.writeText(logsContent.textContent);
            this._log('Логи скопированы в буфер обмена');
            
            // Показываем уведомление
            if (this.statusManager) {
                this.statusManager.showSuccess(
                    this.localeManager.t('options.notifications.logsCopied') || 'Logs copied to clipboard'
                );
            }
        } catch (error) {
            this._logError('Ошибка копирования логов', error);
            if (this.statusManager) {
                this.statusManager.showError(
                    this.localeManager.t('options.notifications.logsCopyError') || 'Error copying logs'
                );
            }
        }
    }

    /**
     * Отрисовывает результаты диагностики в модальном окне.
     * 
     * @private
     * @param {Object} results - Результаты диагностики
     * @returns {void}
     */
    _renderDiagnostics(results) {
        try {
            const resultsContainer = document.getElementById('diagnosticsResults');
            const summary = document.getElementById('diagnosticsSummary');
            const checks = document.getElementById('diagnosticsChecks');
            
            if (!summary || !checks) {
                this._logError('Элементы диагностики не найдены');
                return;
            }
            
            // Показываем контейнер с результатами
            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }
            
            const statusEmoji = { 'ok': '✅', 'warning': '⚠️', 'error': '❌' };
            const statusText = {
                'ok': this.localeManager.t('options.diagnostics.statusOk'),
                'warning': this.localeManager.t('options.diagnostics.statusWarning'),
                'error': this.localeManager.t('options.diagnostics.statusError')
            };
            
            // Подсчитываем статистику
            const checksArray = Object.values(results.checks);
            const stats = {
                total: checksArray.length,
                ok: checksArray.filter(c => c.status === 'ok').length,
                warning: checksArray.filter(c => c.status === 'warning').length,
                error: checksArray.filter(c => c.status === 'error').length
            };
            
            // Формируем сводку
            summary.className = `diagnostics-summary status-${results.overall}`;
            summary.innerHTML = `
                <div class="diagnostics-summary-header">
                    <span class="summary-icon">${statusEmoji[results.overall] || '❓'}</span>
                    <span class="summary-title">${statusText[results.overall] || this.localeManager.t('options.diagnostics.statusUnknown')}</span>
                </div>
                <div class="diagnostics-summary-grid">
                    <div class="stat-card">
                        <div class="stat-label">${this.localeManager.t('options.diagnostics.labelTotal')}</div>
                        <div class="stat-value">${stats.total}</div>
                    </div>
                    <div class="stat-card stat-success">
                        <div class="stat-label">✅ ${this.localeManager.t('options.diagnostics.labelSuccess')}</div>
                        <div class="stat-value">${stats.ok}</div>
                    </div>
                    ${stats.warning > 0
? `
                    <div class="stat-card stat-warning">
                        <div class="stat-label">⚠️ ${this.localeManager.t('options.diagnostics.labelWarnings')}</div>
                        <div class="stat-value">${stats.warning}</div>
                    </div>
                    `
: ''}
                    ${stats.error > 0
? `
                    <div class="stat-card stat-error">
                        <div class="stat-label">❌ ${this.localeManager.t('options.diagnostics.labelErrors')}</div>
                        <div class="stat-value">${stats.error}</div>
                    </div>
                    `
: ''}
                    <div class="stat-card stat-time">
                        <div class="stat-label">⏱️ ${this.localeManager.t('options.diagnostics.labelTime')}</div>
                        <div class="stat-value">${results.totalDuration}<span class="stat-unit">мс</span></div>
                    </div>
                </div>
            `;
            
            // Формируем список проверок
            checks.innerHTML = Object.entries(results.checks)
                .map(([name, check]) => `
                    <div class="diagnostic-check check-${check.status}">
                        <div class="diagnostic-check-header">
                            <div class="diagnostic-check-name">
                                <span>${statusEmoji[check.status] || '❓'}</span>
                                <span>${name}</span>
                            </div>
                            <div class="diagnostic-check-duration">${check.duration}мс</div>
                        </div>
                        <div class="diagnostic-check-message">${check.message}</div>
                    </div>
                `).join('');
        } catch (error) {
            this._logError('Ошибка отрисовки диагностики', error);
        }
    }

    /**
     * Очищает ресурсы при закрытии страницы настроек.
     * 
     * @returns {void}
     */
    destroy() {
        if (!this.isInitialized) {
            this._log('OptionsManager уже был уничтожен');
            return;
        }

        this._log('Очистка ресурсов OptionsManager');

        try {
            this._removeEventHandlers();
            this._destroyManagers();

            this.isInitialized = false;
            this._log('OptionsManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении OptionsManager', error);
        }

        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptionsManager;
    module.exports.default = OptionsManager;
}

if (typeof window !== 'undefined') {
    window.OptionsManager = OptionsManager;
}
