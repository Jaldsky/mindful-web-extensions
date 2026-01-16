const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement|null} connectionStatus - Элемент статуса подключения
 * @property {HTMLElement|null} trackingStatus - Элемент статуса отслеживания
 * @property {HTMLElement|null} eventsCount - Элемент счетчика событий
 * @property {HTMLElement|null} domainsCount - Элемент счетчика доменов
 * @property {HTMLElement|null} openSettings - Кнопка открытия настроек
 * @property {HTMLElement|null} testConnection - Кнопка тестирования подключения
 * @property {HTMLElement|null} toggleTracking - Кнопка переключения отслеживания
 */

/**
 * @typedef {Object} Counters
 * @property {number} events - Количество событий
 * @property {number} domains - Количество доменов
 * @property {number} queue - Размер очереди
 */

/**
 * Менеджер для работы с DOM элементами.
 * Отвечает за кэширование и обновление UI элементов.
 * 
 * @class DOMManager
 * @extends BaseManager
 */
class DOMManager extends BaseManager {
    /**
     * CSS классы для статусов
     * Эти классы определены в styles/common.css
     * @readonly
     * @static
     */
    static CSS_CLASSES = CONFIG.APP_DOM.CSS_CLASSES;

    /**
     * ID элементов DOM
     * @readonly
     * @static
     */
    static ELEMENT_IDS = CONFIG.APP_DOM.ELEMENT_IDS;

    /**
     * Создает экземпляр DOMManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @param {boolean} [options.strictMode=false] - Строгий режим (выбрасывать ошибки при отсутствии элементов)
     * @param {Function} [options.translateFn] - Функция для получения переводов
     */
    constructor(options = {}) {
        super(options);
        
        const t = this._getTranslateFn();
        
        /** @type {boolean} */
        this.strictMode = options.strictMode || false;
        
        /** @type {DOMElements} */
        this.elements = {};
        
        /** @type {Function} Функция для получения переводов */
        this.translateFn = options.translateFn || (() => '');
        
        if (!this.translateFn || typeof this.translateFn !== 'function') {
            throw new TypeError(t('logs.dom.validation.translateFnMustBeFunction'));
        }
 
        this.CONSTANTS.CONNECTION_MESSAGE_TIMEOUT = this.CONSTANTS.CONNECTION_MESSAGE_TIMEOUT || 2000;
        this.connectionMessageTimer = null;
        
        /** @type {boolean|null} Последний известный статус подключения (для восстановления после временных сообщений) */
        this.lastKnownConnectionStatus = null;
 
        try {
            this._validateDOMAvailability();
            this._initializeElements();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('logs.dom.initializationError');
            throw new Error(errorMessage);
        }
    }

    /**
     * Проверяет доступность DOM API.
     * 
     * @private
     * @throws {Error} Если document недоступен
     * @returns {void}
     */
    _validateDOMAvailability() {
        const t = this._getTranslateFn();
        
        if (typeof document === 'undefined') {
            throw new Error(t('logs.dom.documentApiUnavailable'));
        }
        
        if (typeof document.getElementById !== 'function') {
            throw new Error(t('logs.dom.getElementByIdUnavailable'));
        }
    }

    /**
     * Инициализирует и кэширует DOM элементы.
     * 
     * @private
     * @returns {void}
     */
    _initializeElements() {
        try {
            this.elements = this._cacheDOMElements();

            if (this.strictMode) {
                this._validateElements();
            }
        } catch (error) {
            this._logError({ key: 'logs.dom.initializationError' }, error);
            if (this.strictMode) {
                throw error;
            }
        }
    }

    /**
     * Кэширует часто используемые DOM элементы для лучшей производительности.
     * 
     * @private
     * @returns {DOMElements} Объект, содержащий кэшированные DOM элементы
     */
    _cacheDOMElements() {
        const getElement = (id) => {
            const element = document.getElementById(id);
            if (!element) {
                this._log({ key: 'logs.dom.elementNotFound', params: { id } });
            }
            return element;
        };

        return {
            connectionStatus: getElement(DOMManager.ELEMENT_IDS.CONNECTION_STATUS),
            trackingStatus: getElement(DOMManager.ELEMENT_IDS.TRACKING_STATUS),
            eventsCount: getElement(DOMManager.ELEMENT_IDS.EVENTS_COUNT),
            domainsCount: getElement(DOMManager.ELEMENT_IDS.DOMAINS_COUNT),
            openSettings: getElement(DOMManager.ELEMENT_IDS.OPEN_SETTINGS),
            testConnection: getElement(DOMManager.ELEMENT_IDS.TEST_CONNECTION),
            toggleTracking: getElement(DOMManager.ELEMENT_IDS.TOGGLE_TRACKING),
            appMain: getElement(DOMManager.ELEMENT_IDS.APP_MAIN),
            onboardingOverlay: getElement(DOMManager.ELEMENT_IDS.APP_ONBOARDING_OVERLAY),
            welcomeScreen: getElement(DOMManager.ELEMENT_IDS.APP_WELCOME_SCREEN),
            loginScreen: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_SCREEN),
            registerScreen: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_SCREEN),
            verifyScreen: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_SCREEN),
            verifyForm: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_FORM),
            verifyDescription: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_DESCRIPTION),
            verifyEmail: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_EMAIL),
            verifyCode: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_CODE),
            registerVerifyLink: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_VERIFY_LINK),
            verifySubmit: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_SUBMIT),
            verifyBack: getElement(DOMManager.ELEMENT_IDS.APP_VERIFY_BACK),
            resendCodeLink: getElement(DOMManager.ELEMENT_IDS.APP_RESEND_CODE_LINK),
            tryAnonBtn: getElement(DOMManager.ELEMENT_IDS.APP_TRY_ANON_BTN),
            signInBtn: getElement(DOMManager.ELEMENT_IDS.APP_SIGN_IN_BTN),
            loginForm: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_FORM),
            loginUsername: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_USERNAME),
            loginPassword: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_PASSWORD),
            loginSubmit: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_SUBMIT),
            loginBack: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_BACK),
            registerLink: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_LINK),
            registerForm: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_FORM),
            registerUsername: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_USERNAME),
            registerUsernameError: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_USERNAME_ERROR),
            registerEmail: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_EMAIL),
            registerPassword: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_PASSWORD),
            registerConfirmPassword: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_CONFIRM_PASSWORD),
            registerConfirmPasswordError: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_CONFIRM_PASSWORD_ERROR),
            registerSubmit: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_SUBMIT),
            registerCancel: getElement(DOMManager.ELEMENT_IDS.APP_REGISTER_CANCEL),
            loginContainer: getElement(DOMManager.ELEMENT_IDS.APP_LOGIN_CONTAINER),
            mainLoginForm: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_LOGIN_FORM),
            mainLoginUsername: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_LOGIN_USERNAME),
            mainLoginPassword: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_LOGIN_PASSWORD),
            mainLoginSubmit: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_LOGIN_SUBMIT),
            mainLoginBack: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_LOGIN_BACK),
            mainRegisterLink: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_LINK),
            mainRegisterForm: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_FORM),
            mainRegisterUsername: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_USERNAME),
            mainRegisterUsernameError: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_USERNAME_ERROR),
            mainRegisterEmail: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_EMAIL),
            mainRegisterPassword: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_PASSWORD),
            mainRegisterConfirmPassword: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_CONFIRM_PASSWORD),
            mainRegisterConfirmPasswordError: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_CONFIRM_PASSWORD_ERROR),
            mainRegisterSubmit: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_SUBMIT),
            mainRegisterBack: getElement(DOMManager.ELEMENT_IDS.APP_MAIN_REGISTER_BACK),
            authHeaderLogo: getElement(DOMManager.ELEMENT_IDS.APP_AUTH_HEADER_LOGO),
            authHeaderSubtitle: getElement(DOMManager.ELEMENT_IDS.APP_AUTH_HEADER_SUBTITLE),
            openLogin: getElement(DOMManager.ELEMENT_IDS.OPEN_LOGIN)
        };
    }

    /**
     * Валидирует наличие критичных элементов.
     * 
     * @private
     * @throws {Error} Если критичные элементы отсутствуют
     * @returns {void}
     */
    _validateElements() {
        const missingElements = [];
        
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                missingElements.push(key);
            }
        });
        
        if (missingElements.length > 0) {
            const elements = missingElements.join(', ');
            throw new Error(this.translateFn('logs.dom.criticalElementsMissing', { elements }));
        }
    }

    /**
     * Безопасно обновляет элемент DOM.
     * 
     * @private
     * @param {HTMLElement|null} element - DOM элемент
     * @param {Function} updateFn - Функция обновления
     * @param {string} [elementName='element'] - Название элемента для логирования
     * @returns {boolean} true если обновление успешно
     */
    _safeUpdateElement(element, updateFn, elementName = 'element') {
        if (!element) {
            this._log({ key: 'logs.dom.updateImpossible', params: { elementName } });
            return false;
        }

        try {
            updateFn(element);
            return true;
        } catch (error) {
            this._logError({ key: 'logs.dom.elementUpdateError', params: { elementName } }, error);
            return false;
        }
    }

    /**
     * Обновляет отображение статуса подключения в app.
     * 
     * @param {boolean} isOnline - Подключен ли интернет
     * @throws {TypeError} Если isOnline не является булевым значением
     * @returns {boolean} true если обновление успешно
     */
    updateConnectionStatus(isOnline) {
        if (typeof isOnline !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.isOnlineMustBeBoolean'));
        }

        try {
            this.lastKnownConnectionStatus = isOnline;
            
            this.updateState({ isOnline });
            this._clearConnectionMessageTimer();
            
            const elementName = this.translateFn('logs.dom.elementNames.connectionStatus');
            
            return this._safeUpdateElement(
                this.elements.connectionStatus,
                (element) => {
                    const statusText = isOnline 
                        ? this.translateFn('app.status.online')
                        : this.translateFn('app.status.offline');
                    
                    element.textContent = statusText;
                    element.dataset.originalText = statusText;
                    element.className = '';
                    element.className = isOnline 
                        ? DOMManager.CSS_CLASSES.STATUS_ONLINE 
                        : DOMManager.CSS_CLASSES.STATUS_OFFLINE;
                },
                elementName
            );
        } catch (error) {
            this._logError({ key: 'logs.dom.connectionStatusUpdateError' }, error);
            return false;
        }
    }

    showConnectionStatusMessage(message, type = 'info') {
        if (!message || typeof message !== 'string') {
            return;
        }

        const element = this.elements.connectionStatus;
        if (!element) {
            return;
        }

        const className = type === 'success'
            ? DOMManager.CSS_CLASSES.STATUS_ONLINE
            : type === 'error'
                ? DOMManager.CSS_CLASSES.STATUS_OFFLINE
                : type === 'warning'
                    ? DOMManager.CSS_CLASSES.STATUS_WARNING
                    : DOMManager.CSS_CLASSES.STATUS_INACTIVE;

        element.textContent = message;
        element.className = '';
        element.className = className;

        this._clearConnectionMessageTimer();
        this.connectionMessageTimer = setTimeout(() => {
            this._clearConnectionMessageTimer();
            const isOnline = this.lastKnownConnectionStatus !== null 
                ? this.lastKnownConnectionStatus 
                : Boolean(this.state?.isOnline);
            this.updateConnectionStatus(isOnline);
        }, this.CONSTANTS.CONNECTION_MESSAGE_TIMEOUT || 2000);
    }

    _clearConnectionMessageTimer() {
        if (this.connectionMessageTimer) {
            clearTimeout(this.connectionMessageTimer);
            this.connectionMessageTimer = null;
        }
    }

    /**
     * Обновляет отображение статуса отслеживания в app.
     * 
     * @param {boolean} isTracking - Активно ли отслеживание
     * @throws {TypeError} Если isTracking не является булевым значением
     * @returns {boolean} true если обновление успешно
     */
    updateTrackingStatus(isTracking) {
        if (typeof isTracking !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.isTrackingMustBeBoolean'));
        }

        try {
            this.updateState({ isTracking });
            
            const elementName = this.translateFn('logs.dom.elementNames.trackingStatus');
            
            return this._safeUpdateElement(
                this.elements.trackingStatus,
                (element) => {
                    element.textContent = isTracking 
                        ? this.translateFn('app.status.active')
                        : this.translateFn('app.status.inactive');
                    element.className = '';
                    element.className = isTracking 
                        ? DOMManager.CSS_CLASSES.STATUS_ACTIVE 
                        : DOMManager.CSS_CLASSES.STATUS_INACTIVE;
                },
                elementName
            );
        } catch (error) {
            this._logError({ key: 'logs.dom.trackingStatusUpdateError' }, error);
            return false;
        }
    }

    /**
     * Обновляет отображение кнопки переключения отслеживания.
     * 
     * @param {boolean} isTracking - Активно ли отслеживание в данный момент
     * @param {Object} [options={}]
     * @param {boolean} [options.disabled=false] - Заблокирована ли кнопка
     * @returns {boolean} true если обновление успешно
     */
    updateTrackingToggle(isTracking, options = {}) {
        if (typeof isTracking !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.isTrackingMustBeBoolean'));
        }

        const disabled = Boolean(options.disabled);
        const button = this.elements.toggleTracking;

        const labelKey = isTracking ? 'app.buttons.disableTracking' : 'app.buttons.enableTracking';
        const label = this.translateFn(labelKey);

        const elementName = this.translateFn('logs.dom.elementNames.trackingToggle');

        return this._safeUpdateElement(
            button,
            (element) => {
                element.textContent = label;
                element.disabled = disabled;
                element.classList.remove('toggle-btn--disable', 'toggle-btn--enable');
                element.classList.add(isTracking ? 'toggle-btn--disable' : 'toggle-btn--enable');
            },
            elementName
        );
    }

    /**
     * Переводит кнопку переключения отслеживания в состояние загрузки.
     * 
     * @returns {boolean} true если обновление успешно
     */
    setTrackingToggleLoading(targetIsTracking) {
        if (typeof targetIsTracking !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.targetIsTrackingMustBeBoolean'));
        }

        const button = this.elements.toggleTracking;
        const labelKey = targetIsTracking
            ? 'app.buttons.trackingEnableLoading'
            : 'app.buttons.trackingDisableLoading';
        const label = this.translateFn(labelKey);

        return this.setButtonState(button, label, true);
    }

    /**
     * Обновляет счетчики событий, доменов и очереди.
     * 
     * @param {Counters} counters - Объект со счетчиками
     * @throws {TypeError} Если counters не является объектом
     * @returns {Object} Объект с результатами обновления каждого счетчика
     */
    updateCounters(counters) {
        if (!counters || typeof counters !== 'object') {
            throw new TypeError(this.translateFn('logs.dom.validation.countersMustBeObject'));
        }

        const { events = 0, domains = 0 } = counters;

        const validEvents = Number.isFinite(events) ? Math.max(0, events) : 0;
        const validDomains = Number.isFinite(domains) ? Math.max(0, domains) : 0;

        const results = {
            events: this._safeUpdateElement(
                this.elements.eventsCount,
                (element) => { element.textContent = validEvents.toString(); },
                this.translateFn('logs.dom.elementNames.eventsCounter')
            ),
            domains: this._safeUpdateElement(
                this.elements.domainsCount,
                (element) => { element.textContent = validDomains.toString(); },
                this.translateFn('logs.dom.elementNames.domainsCounter')
            )
        };

        return results;
    }

    /**
     * Устанавливает состояние кнопки (текст и активность).
     * 
     * @param {HTMLElement|null} button - Элемент кнопки
     * @param {string} text - Текст кнопки
     * @param {boolean} disabled - Заблокирована ли кнопка
     * @throws {TypeError} Если параметры имеют неверный тип
     * @returns {boolean} true если обновление успешно
     */
    setButtonState(button, text, disabled) {
        if (typeof text !== 'string') {
            throw new TypeError(this.translateFn('logs.dom.validation.textMustBeString'));
        }
        
        if (typeof disabled !== 'boolean') {
            throw new TypeError(this.translateFn('logs.dom.validation.disabledMustBeBoolean'));
        }

        return this._safeUpdateElement(
            button,
            (element) => {
                element.textContent = text;
                element.disabled = disabled;
            },
            this.translateFn('logs.dom.elementNames.button')
        );
    }

    /**
     * Перезагружает кэш DOM элементов.
     * Полезно если DOM был изменен динамически.
     * 
     * @returns {void}
     */
    reloadElements() {
        this._log({ key: 'logs.dom.elementsReload' });
        this._initializeElements();
    }
    
    /**
     * Получает статистику доступности элементов.
     * 
     * @returns {Object} Статистика элементов
     */
    getElementsStatistics() {
        try {
            const stats = {
                total: 0,
                available: 0,
                missing: [],
                inDOM: 0,
                notInDOM: []
            };

            Object.entries(this.elements).forEach(([key, element]) => {
                stats.total++;
                
                if (element) {
                    stats.available++;
                    
                    if (document.body && document.body.contains(element)) {
                        stats.inDOM++;
                    } else {
                        stats.notInDOM.push(key);
                    }
                } else {
                    stats.missing.push(key);
                }
            });

            return stats;
        } catch (error) {
            this._logError({ key: 'logs.dom.elementsStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Устанавливает функцию локализации.
     * 
     * @param {Function} translateFn - Функция для получения переводов
     * @returns {void}
     */
    setTranslateFn(translateFn) {
        const t = this._getTranslateFn();
        
        if (typeof translateFn !== 'function') {
            throw new TypeError(t('logs.dom.validation.translateFnMustBeFunction'));
        }
        this.translateFn = translateFn;
    }

    /**
     * Обновляет все статусы с текущей локализацией.
     * Используется при смене языка.
     * 
     * @returns {void}
     */
    refreshStatuses() {
        if (this.state.isOnline !== undefined) {
            this.updateConnectionStatus(this.state.isOnline);
        }
        if (this.state.isTracking !== undefined) {
            this.updateTrackingStatus(this.state.isTracking);
            this.updateTrackingToggle(this.state.isTracking);
        }
        this._log({ key: 'logs.dom.statusesRefreshed' });
    }

    /**
     * Показывает форму входа и скрывает основное меню.
     * 
     * @returns {boolean} true если операция успешна
     */
    showLoginForm() {
        const mainElement = this.elements.appMain;
        const loginElement = this.elements.loginContainer;
        
        if (mainElement && loginElement) {
            // Remove any existing animation classes
            mainElement.classList.remove('fade-in', 'fade-out');
            loginElement.classList.remove('fade-in', 'fade-out');
            
            // Fade out main, then fade in login
            mainElement.classList.add('fade-out');
            setTimeout(() => {
                mainElement.style.display = 'none';
                mainElement.classList.remove('fade-out');
                loginElement.style.display = 'flex';
                // Start from top for forward navigation
                loginElement.style.transform = 'translateY(-20px)';
                loginElement.style.opacity = '0';
                // Force reflow for animation
                // eslint-disable-next-line no-unused-expressions
                loginElement.offsetWidth;
                loginElement.style.transform = '';
                loginElement.style.opacity = '';
                loginElement.classList.add('fade-in');
            }, 250);
        } else {
            if (mainElement) {
                mainElement.style.display = 'none';
            }
            if (loginElement) {
                loginElement.style.display = 'flex';
            }
        }
        return true;
    }

    /**
     * Скрывает форму входа и показывает основное меню.
     * 
     * @returns {boolean} true если операция успешна
     */
    hideLoginForm() {
        const mainElement = this.elements.appMain;
        const loginElement = this.elements.loginContainer;
        
        if (mainElement && loginElement) {
            // Remove any existing animation classes
            mainElement.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            loginElement.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            
            // Fade out login down, then fade in main from bottom
            loginElement.classList.add('fade-out-down');
            setTimeout(() => {
                loginElement.style.display = 'none';
                loginElement.classList.remove('fade-out-down');
                mainElement.style.display = 'flex';
                // Start from bottom
                mainElement.style.transform = 'translateY(20px)';
                mainElement.style.opacity = '0';
                // Force reflow for animation
                // eslint-disable-next-line no-unused-expressions
                mainElement.offsetWidth;
                mainElement.style.transform = '';
                mainElement.style.opacity = '';
                mainElement.classList.add('fade-in');
            }, 250);
        } else {
            if (mainElement) {
                mainElement.style.display = 'flex';
            }
            if (loginElement) {
                loginElement.style.display = 'none';
            }
        }
        return true;
    }

    /**
     * Показывает кнопку входа.
     * 
     * @returns {boolean} true если операция успешна
     */
    showLoginButton() {
        return this._safeUpdateElement(
            this.elements.openLogin,
            (element) => {
                element.style.display = '';
            },
            'openLogin'
        );
    }

    /**
     * Скрывает кнопку входа.
     * 
     * @returns {boolean} true если операция успешна
     */
    hideLoginButton() {
        return this._safeUpdateElement(
            this.elements.openLogin,
            (element) => {
                element.style.display = 'none';
            },
            'openLogin'
        );
    }

    /**
     * Показывает форму входа и скрывает форму регистрации.
     * 
     * @returns {boolean} true если операция успешна
     */
    showLoginFormInContainer() {
        const loginForm = this.elements.mainLoginForm;
        const registerForm = this.elements.mainRegisterForm;
        const headerLogo = this.elements.authHeaderLogo;
        const headerSubtitle = this.elements.authHeaderSubtitle;
        
        if (loginForm && registerForm) {
            // Remove any existing animation classes
            loginForm.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            registerForm.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            
            // Fade out register down (back button), then fade in login from bottom
            registerForm.classList.add('fade-out-down');
            setTimeout(() => {
                registerForm.style.display = 'none';
                registerForm.classList.remove('fade-out-down');
                loginForm.style.display = '';
                // Start from bottom
                loginForm.style.transform = 'translateY(20px)';
                loginForm.style.opacity = '0';
                // Force reflow for animation
                // eslint-disable-next-line no-unused-expressions
                loginForm.offsetWidth;
                loginForm.style.transform = '';
                loginForm.style.opacity = '';
                loginForm.classList.add('fade-in');
            }, 250);
        } else {
            if (loginForm) loginForm.style.display = '';
            if (registerForm) registerForm.style.display = 'none';
        }
        
        if (headerLogo) headerLogo.textContent = '🔐 Sign in';
        if (headerSubtitle) {
            const t = this._getTranslateFn();
            headerSubtitle.textContent = t('app.auth.subtitle');
        }
        return true;
    }

    /**
     * Показывает форму регистрации и скрывает форму входа.
     * 
     * @returns {boolean} true если операция успешна
     */
    showRegisterFormInContainer() {
        const loginForm = this.elements.mainLoginForm;
        const registerForm = this.elements.mainRegisterForm;
        const headerLogo = this.elements.authHeaderLogo;
        const headerSubtitle = this.elements.authHeaderSubtitle;
        
        if (loginForm && registerForm) {
            // Remove any existing animation classes
            loginForm.classList.remove('fade-in', 'fade-out');
            registerForm.classList.remove('fade-in', 'fade-out');
            
            // Fade out login, then fade in register
            loginForm.classList.add('fade-out');
            setTimeout(() => {
                loginForm.style.display = 'none';
                loginForm.classList.remove('fade-out');
                registerForm.style.display = '';
                // Start from top for forward navigation
                registerForm.style.transform = 'translateY(-20px)';
                registerForm.style.opacity = '0';
                // Force reflow for animation
                // eslint-disable-next-line no-unused-expressions
                registerForm.offsetWidth;
                registerForm.style.transform = '';
                registerForm.style.opacity = '';
                registerForm.classList.add('fade-in');
            }, 250);
        } else {
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = '';
        }
        
        if (headerLogo) headerLogo.textContent = '📝 Register';
        if (headerSubtitle) {
            const t = this._getTranslateFn();
            headerSubtitle.textContent = t('app.register.subtitle') || 'Create a new account';
        }
        return true;
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.dom.cleanupStart' });
        this._clearConnectionMessageTimer();
        this.elements = {};
        this.translateFn = null;
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMManager;
    module.exports.default = DOMManager;
}

if (typeof window !== 'undefined') {
    window.DOMManager = DOMManager;
}
