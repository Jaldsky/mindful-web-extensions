const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');
const DOMManager = require('./DOMManager.js');
const NotificationManager = require('./NotificationManager.js');
const ServiceWorkerManager = require('./ServiceWorkerManager.js');
const DiagnosticsManager = require('./DiagnosticsManager.js');
const LocaleManager = require('../locale/LocaleManager.js');

/**
 * Главный менеджер приложения, координирующий работу всех компонентов app.
 * Использует композицию для объединения функциональности различных менеджеров.
 * 
 * @class AppManager
 * @extends BaseManager
 */
class AppManager extends BaseManager {
    /**
     * Метки кнопок для различных состояний.
     * @readonly
     * @static
     */
    static BUTTON_LABELS = CONFIG.BUTTON_LABELS;

    /**
     * Создает экземпляр AppManager.
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

        const enableLogging = this.enableLogging;

        this.localeManager = new LocaleManager({ enableLogging });
        const translateFn = (key, params) => this.localeManager.t(key, params);
        this.domManager = new DOMManager({ enableLogging, translateFn });
        this.notificationManager = new NotificationManager({ enableLogging, translateFn });
        this.serviceWorkerManager = new ServiceWorkerManager({ enableLogging, translateFn });
        this.diagnosticsManager = new DiagnosticsManager(
            this.serviceWorkerManager, 
            this.notificationManager,
            { enableLogging, translateFn }
        );

        this.updateInterval = null;
        this.eventHandlers = new Map();
        this.isInitialized = false;

        this.pendingVerificationEmail = null;
        this._cameFromMainMenu = false;

        this.init();
    }

    /**
     * Инициализирует менеджер приложения.
     * Загружает начальный статус и настраивает обработчики событий.
     * 
     * ПЕРИОДИЧЕСКИЕ ОБНОВЛЕНИЯ ОТКЛЮЧЕНЫ:
     * - Статус онлайн/офлайн определяется по результатам отправки событий
     * - События отправляются автоматически каждые 30 секунд
     * - Дополнительные healthcheck запросы не нужны
     * - Проверка подключения доступна в настройках (options page)
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) {
            this._log({ key: 'logs.app.alreadyInitialized' });
            return;
        }

        try {

            await this.localeManager.init();

            this.domManager.setTranslateFn((key) => this.localeManager.t(key));
            this.localeManager.localizeDOM();

            const pendingEmail = await this._loadPendingVerificationEmail();
            const onboardingCompleted = await this._loadOnboardingCompleted();

            if (pendingEmail) {
                this.pendingVerificationEmail = pendingEmail;
                this._showOnboardingScreen('verify');
                
                setTimeout(() => {
                    if (this.domManager.elements.verifyEmail && this.pendingVerificationEmail) {
                        this.domManager.elements.verifyEmail.value = this.pendingVerificationEmail;
                    }
                    const descriptionElement = this.domManager.elements.verifyDescription;
                    if (descriptionElement) {
                        if (this.pendingVerificationEmail) {
                            descriptionElement.textContent = this.localeManager.t(
                                'app.verify.description',
                                { email: this.pendingVerificationEmail }
                            );
                        } else {
                            descriptionElement.textContent = this.localeManager.t(
                                'app.verify.descriptionManual'
                            );
                        }
                    }
                }, 100);
            } else if (!onboardingCompleted) {
                this._showOnboardingScreen('welcome');
            } else {
                this._showMain();
                this.localeManager.localizeDOM();
                await this.loadInitialStatus();
            }

            this.setupEventHandlers();
            this.localeManager.addLocaleChangeListener(() => {
                this.onLocaleChange();
            });

            this.isInitialized = true;
        } catch (error) {
            this._logError({ key: 'logs.app.initError' }, error);
            this.notificationManager.showNotification(
                this.localeManager.t('app.notifications.initError'),
                'error'
            );
            throw error;
        }
    }

    /**
     * Загружает начальный статус системы.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadInitialStatus() {
        try {
            const trackingStatus = await this.serviceWorkerManager.getTrackingStatus();
            this.domManager.updateTrackingStatus(trackingStatus.isTracking);
            this.domManager.updateTrackingToggle(trackingStatus.isTracking);
            this.updateState({ isTracking: trackingStatus.isTracking });

            const stats = await this.serviceWorkerManager.getTodayStats();
            this.domManager.updateCounters(stats);

            await this.loadUserInfo();
            await this._updateLoginButtonVisibility();
            
        } catch (error) {
            this._logError({ key: 'logs.app.initialStatusError' }, error);
            this.notificationManager.showNotification(
                this.localeManager.t('app.notifications.initialStatusError'),
                'error'
            );
        }
    }

    /**
     * Загружает и отображает информацию о пользователе.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadUserInfo() {
        try {
            const response = await this.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
            );

            const userStatusElement = document.getElementById('userStatus');
            const userStatusTooltip = document.getElementById('userStatusTooltip');

            if (response && response.success) {
                const username = response.username || null;
                const anonId = response.anonId || null;
                
                if (username) {
                    if (userStatusElement) {
                        userStatusElement.textContent = this.localeManager.t('app.user.statusAuthenticated');
                        userStatusElement.classList.remove('user-status-anonymous');
                        userStatusElement.classList.add('user-status-clickable', 'user-status-authenticated');
                        userStatusElement.style.cursor = 'pointer';
                        userStatusElement.dataset.identifier = username;
                    }
                    if (userStatusTooltip) {
                        userStatusTooltip.textContent = username;
                    }
                } else if (anonId) {
                    if (userStatusElement) {
                        userStatusElement.textContent = this.localeManager.t('app.user.statusAnonymous');
                        userStatusElement.classList.remove('user-status-authenticated');
                        userStatusElement.classList.add('user-status-clickable', 'user-status-anonymous');
                        userStatusElement.style.cursor = 'pointer';
                        userStatusElement.dataset.identifier = anonId;
                    }
                    if (userStatusTooltip) {
                        userStatusTooltip.textContent = anonId;
                    }
                } else {
                    if (userStatusElement) {
                        userStatusElement.textContent = this.localeManager.t('app.status.unknown');
                        userStatusElement.classList.remove('user-status-clickable', 'user-status-anonymous', 'user-status-authenticated');
                        userStatusElement.style.cursor = 'default';
                        userStatusElement.dataset.identifier = '';
                    }
                    if (userStatusTooltip) {
                        userStatusTooltip.textContent = '';
                    }
                }
            } else {
                if (userStatusElement) {
                    userStatusElement.textContent = this.localeManager.t('app.status.unknown');
                    userStatusElement.classList.remove('user-status-clickable', 'user-status-anonymous', 'user-status-authenticated');
                    userStatusElement.style.cursor = 'default';
                    userStatusElement.dataset.identifier = '';
                }
                if (userStatusTooltip) {
                    userStatusTooltip.textContent = '';
                }
            }
        } catch (error) {
            this._logError({ key: 'logs.app.userInfoLoadError' }, error);
            const userStatusElement = document.getElementById('userStatus');
            const userStatusTooltip = document.getElementById('userStatusTooltip');
            if (userStatusElement) {
                userStatusElement.textContent = this.localeManager.t('app.status.unknown');
                userStatusElement.classList.remove('user-status-clickable', 'user-status-anonymous', 'user-status-authenticated');
                userStatusElement.style.cursor = 'default';
                userStatusElement.dataset.identifier = '';
            }
            if (userStatusTooltip) {
                userStatusTooltip.textContent = '';
            }
        }
    }

    /**
     * Настраивает обработчики событий для кнопок.
     * Сохраняет обработчики в Map для последующей очистки.
     * 
     * @returns {void}
     */
    setupEventHandlers() {

        if (this.domManager.elements.openSettings) {
            const handler = () => {
                this._log({ key: 'logs.app.openSettings' });
                chrome.runtime.openOptionsPage();
            };
            this.domManager.elements.openSettings.addEventListener('click', handler);
            this.eventHandlers.set('openSettings', handler);
        }

        if (this.domManager.elements.toggleTracking) {
            const handler = async () => {
                await this.toggleTracking();
            };
            this.domManager.elements.toggleTracking.addEventListener('click', handler);
            this.eventHandlers.set('toggleTracking', handler);
        }

        if (this.domManager.elements.tryAnonBtn) {
            const handler = async () => {
                await this._saveOnboardingCompleted(true);

                try {
                    await this.serviceWorkerManager.sendMessage(CONFIG.MESSAGE_TYPES.AUTH_LOGOUT);
                } catch (error) {
                    this._logError({ key: 'logs.app.authLogoutError' }, error);
                }

                this._showMain();

                await this.loadInitialStatus();
            };
            this.domManager.elements.tryAnonBtn.addEventListener('click', handler);
            this.eventHandlers.set('tryAnonBtn', handler);
        }

        if (this.domManager.elements.signInBtn) {
            const handler = async () => {
                this._showOnboardingScreen('login');
            };
            this.domManager.elements.signInBtn.addEventListener('click', handler);
            this.eventHandlers.set('signInBtn', handler);
        }

        if (this.domManager.elements.loginBack) {
            const handler = async () => {
                const onboardingCompleted = await this._loadOnboardingCompleted();
                
                if (onboardingCompleted) {
                    this._showMain();
                    this._cameFromMainMenu = false;
                } else {
                    this._showOnboardingScreen('welcome');
                }
            };
            this.domManager.elements.loginBack.addEventListener('click', handler);
            this.eventHandlers.set('loginBack', handler);
        }

        if (this.domManager.elements.registerLink) {
            const handler = (event) => {
                event.preventDefault();
                this._showOnboardingScreen('register');
            };
            this.domManager.elements.registerLink.addEventListener('click', handler);
            this.eventHandlers.set('registerLink', handler);
        }

        if (this.domManager.elements.registerCancel) {
            const handler = (event) => {
                event.preventDefault();

                this._showOnboardingScreen('login');
            };
            this.domManager.elements.registerCancel.addEventListener('click', handler);
            this.eventHandlers.set('registerCancel', handler);
        }

        if (this.domManager.elements.registerVerifyLink) {
            const handler = (event) => {
                event.preventDefault();

                const email = this.domManager.elements.registerEmail?.value?.trim() || 
                             this.domManager.elements.mainRegisterEmail?.value?.trim() || '';
                if (email) {
                    this.pendingVerificationEmail = email;
                } else {

                    this.pendingVerificationEmail = null;
                }
                this._showOnboardingScreen('verify');
            };
            this.domManager.elements.registerVerifyLink.addEventListener('click', handler);
            this.eventHandlers.set('registerVerifyLink', handler);
        }

        if (this.domManager.elements.loginForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = this.domManager.elements.loginUsername?.value?.trim();
                const password = this.domManager.elements.loginPassword?.value || '';
                await this._handleLogin(username, password);
            };
            this.domManager.elements.loginForm.addEventListener('submit', handler);
            this.eventHandlers.set('loginForm', handler);
        }

        if (this.domManager.elements.registerForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = this.domManager.elements.registerUsername?.value?.trim();
                const email = this.domManager.elements.registerEmail?.value?.trim();
                const password = this.domManager.elements.registerPassword?.value || '';
                const confirmPassword = this.domManager.elements.registerConfirmPassword?.value || '';

                const usernamePattern = /^[a-zA-Z0-9_]+$/;
                if (username && !usernamePattern.test(username)) {
                    const usernameInput = this.domManager.elements.registerUsername;
                    const errorElement = this.domManager.elements.registerUsernameError;
                    if (usernameInput) {
                        usernameInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = this.localeManager.t('app.register.usernameInvalid');
                    }
                    return;
                } else {
                    const usernameInput = this.domManager.elements.registerUsername;
                    const errorElement = this.domManager.elements.registerUsernameError;
                    if (usernameInput) {
                        usernameInput.classList.remove('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }

                if (password !== confirmPassword) {
                    const confirmInput = this.domManager.elements.registerConfirmPassword;
                    const errorElement = this.domManager.elements.registerConfirmPasswordError;
                    if (confirmInput) {
                        confirmInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = this.localeManager.t('app.register.passwordMismatch');
                    }
                    return;
                } else {
                    const confirmInput = this.domManager.elements.registerConfirmPassword;
                    const errorElement = this.domManager.elements.registerConfirmPasswordError;
                    if (confirmInput) {
                        confirmInput.classList.remove('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
                
                await this._handleRegister(username, email, password);
            };
            this.domManager.elements.registerForm.addEventListener('submit', handler);
            this.eventHandlers.set('registerForm', handler);

            if (this.domManager.elements.registerUsername) {
                const validateUsername = () => {
                    const username = this.domManager.elements.registerUsername?.value?.trim() || '';
                    const usernamePattern = /^[a-zA-Z0-9_]+$/;
                    const usernameInput = this.domManager.elements.registerUsername;
                    const errorElement = this.domManager.elements.registerUsernameError;
                    
                    if (username && !usernamePattern.test(username)) {
                        if (usernameInput) {
                            usernameInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = this.localeManager.t('app.register.usernameInvalid');
                        }
                    } else {
                        if (usernameInput) {
                            usernameInput.classList.remove('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = '';
                        }
                    }
                };
                
                this.domManager.elements.registerUsername.addEventListener('input', validateUsername);
            }

            if (this.domManager.elements.registerPassword && this.domManager.elements.registerConfirmPassword) {
                const validatePasswordMatch = () => {
                    const password = this.domManager.elements.registerPassword?.value || '';
                    const confirmPassword = this.domManager.elements.registerConfirmPassword?.value || '';
                    const confirmInput = this.domManager.elements.registerConfirmPassword;
                    const errorElement = this.domManager.elements.registerConfirmPasswordError;
                    
                    if (confirmPassword && password !== confirmPassword) {
                        if (confirmInput) {
                            confirmInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = this.localeManager.t('app.register.passwordMismatch');
                        }
                    } else {
                        if (confirmInput) {
                            confirmInput.classList.remove('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = '';
                        }
                    }
                };
                
                this.domManager.elements.registerPassword.addEventListener('input', validatePasswordMatch);
                this.domManager.elements.registerConfirmPassword.addEventListener('input', validatePasswordMatch);
            }
        }

        if (this.domManager.elements.openLogin) {
            const handler = () => {
                this._log({ key: 'logs.app.openLogin' });

                this._showOnboardingScreen('login');
            };
            this.domManager.elements.openLogin.addEventListener('click', handler);
            this.eventHandlers.set('openLogin', handler);
        }

        if (this.domManager.elements.mainLoginBack) {
            const handler = () => {
                this._log({ key: 'logs.app.closeLogin' });
                this.domManager.hideLoginForm();
            };
            this.domManager.elements.mainLoginBack.addEventListener('click', handler);
            this.eventHandlers.set('mainLoginBack', handler);
        }

        if (this.domManager.elements.mainLoginForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = this.domManager.elements.mainLoginUsername?.value?.trim();
                const password = this.domManager.elements.mainLoginPassword?.value || '';
                await this._handleLogin(username, password);
            };
            this.domManager.elements.mainLoginForm.addEventListener('submit', handler);
            this.eventHandlers.set('mainLoginForm', handler);
        }

        if (this.domManager.elements.mainRegisterLink) {
            const handler = (event) => {
                event.preventDefault();
                this.domManager.showRegisterFormInContainer();
            };
            this.domManager.elements.mainRegisterLink.addEventListener('click', handler);
            this.eventHandlers.set('mainRegisterLink', handler);
        }

        if (this.domManager.elements.verifyForm) {
            const handler = async (event) => {
                event.preventDefault();
                const email = this.domManager.elements.verifyEmail?.value?.trim() || 
                             this.pendingVerificationEmail || '';
                const code = this.domManager.elements.verifyCode?.value?.trim();
                await this._handleVerify(email, code);
            };
            this.domManager.elements.verifyForm.addEventListener('submit', handler);
            this.eventHandlers.set('verifyForm', handler);
        }

        if (this.domManager.elements.verifyBack) {
            const handler = async () => {

                this._showOnboardingScreen('register');
            };
            this.domManager.elements.verifyBack.addEventListener('click', handler);
            this.eventHandlers.set('verifyBack', handler);
        }

        if (this.domManager.elements.resendCodeLink) {
            const handler = async (event) => {
                event.preventDefault();

                const email = this.domManager.elements.verifyEmail?.value?.trim() || 
                            this.pendingVerificationEmail || '';
                if (email) {
                    await this._handleResendCode(email);
                }
            };
            this.domManager.elements.resendCodeLink.addEventListener('click', handler);
            this.eventHandlers.set('resendCodeLink', handler);
        }

        if (this.domManager.elements.mainRegisterForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = this.domManager.elements.mainRegisterUsername?.value?.trim();
                const email = this.domManager.elements.mainRegisterEmail?.value?.trim();
                const password = this.domManager.elements.mainRegisterPassword?.value || '';
                const confirmPassword = this.domManager.elements.mainRegisterConfirmPassword?.value || '';

                const usernamePattern = /^[a-zA-Z0-9_]+$/;
                if (username && !usernamePattern.test(username)) {
                    const usernameInput = this.domManager.elements.mainRegisterUsername;
                    const errorElement = this.domManager.elements.mainRegisterUsernameError;
                    if (usernameInput) {
                        usernameInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = this.localeManager.t('app.register.usernameInvalid');
                    }
                    return;
                } else {
                    const usernameInput = this.domManager.elements.mainRegisterUsername;
                    const errorElement = this.domManager.elements.mainRegisterUsernameError;
                    if (usernameInput) {
                        usernameInput.classList.remove('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }

                if (password !== confirmPassword) {
                    const confirmInput = this.domManager.elements.mainRegisterConfirmPassword;
                    const errorElement = this.domManager.elements.mainRegisterConfirmPasswordError;
                    if (confirmInput) {
                        confirmInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = this.localeManager.t('app.register.passwordMismatch');
                    }
                    return;
                } else {
                    const confirmInput = this.domManager.elements.mainRegisterConfirmPassword;
                    const errorElement = this.domManager.elements.mainRegisterConfirmPasswordError;
                    if (confirmInput) {
                        confirmInput.classList.remove('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
                
                await this._handleRegister(username, email, password);
            };
            this.domManager.elements.mainRegisterForm.addEventListener('submit', handler);
            this.eventHandlers.set('mainRegisterForm', handler);

            if (this.domManager.elements.mainRegisterUsername) {
                const validateUsername = () => {
                    const username = this.domManager.elements.mainRegisterUsername?.value?.trim() || '';
                    const usernamePattern = /^[a-zA-Z0-9_]+$/;
                    const usernameInput = this.domManager.elements.mainRegisterUsername;
                    const errorElement = this.domManager.elements.mainRegisterUsernameError;
                    
                    if (username && !usernamePattern.test(username)) {
                        if (usernameInput) {
                            usernameInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = this.localeManager.t('app.register.usernameInvalid');
                        }
                    } else {
                        if (usernameInput) {
                            usernameInput.classList.remove('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = '';
                        }
                    }
                };
                
                this.domManager.elements.mainRegisterUsername.addEventListener('input', validateUsername);
            }

            if (this.domManager.elements.mainRegisterPassword && this.domManager.elements.mainRegisterConfirmPassword) {
                const validatePasswordMatch = () => {
                    const password = this.domManager.elements.mainRegisterPassword?.value || '';
                    const confirmPassword = this.domManager.elements.mainRegisterConfirmPassword?.value || '';
                    const confirmInput = this.domManager.elements.mainRegisterConfirmPassword;
                    const errorElement = this.domManager.elements.mainRegisterConfirmPasswordError;
                    
                    if (confirmPassword && password !== confirmPassword) {
                        if (confirmInput) {
                            confirmInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = this.localeManager.t('app.register.passwordMismatch');
                        }
                    } else {
                        if (confirmInput) {
                            confirmInput.classList.remove('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = '';
                        }
                    }
                };
                
                this.domManager.elements.mainRegisterPassword.addEventListener('input', validatePasswordMatch);
                this.domManager.elements.mainRegisterConfirmPassword.addEventListener('input', validatePasswordMatch);
            }
        }

        if (this.domManager.elements.mainRegisterBack) {
            const handler = (event) => {
                event.preventDefault();
                this.domManager.showLoginFormInContainer();
            };
            this.domManager.elements.mainRegisterBack.addEventListener('click', handler);
            this.eventHandlers.set('mainRegisterBack', handler);
        }

        const userStatusElement = document.getElementById('userStatus');
        if (userStatusElement) {
            const handler = async () => {
                const identifier = userStatusElement.dataset.identifier;
                if (!identifier || identifier === '') {
                    return;
                }

                try {
                    await navigator.clipboard.writeText(identifier);
                    this.notificationManager.showNotification(
                        this.localeManager.t('app.user.identifierCopied'),
                        'success'
                    );
                } catch (error) {
                    this._logError({ key: 'logs.app.copyToClipboardError' }, error);
                    try {
                        const textarea = document.createElement('textarea');
                        textarea.value = identifier;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        this.notificationManager.showNotification(
                            this.localeManager.t('app.user.identifierCopied'),
                            'success'
                        );
                    } catch (fallbackError) {
                        this._logError({ key: 'logs.app.copyToClipboardFallbackError' }, fallbackError);
                        this.notificationManager.showNotification(
                            this.localeManager.t('app.notifications.copyError'),
                            'error'
                        );
                    }
                }
            };
            userStatusElement.addEventListener('click', handler);
            this.eventHandlers.set('userStatus', handler);
        }
    }

    async _applyOnboardingState() {

        const pendingEmail = await this._loadPendingVerificationEmail();
        if (pendingEmail) {
            this.pendingVerificationEmail = pendingEmail;
            this._showOnboardingScreen('verify');

            setTimeout(() => {
                if (this.domManager.elements.verifyEmail && this.pendingVerificationEmail) {
                    this.domManager.elements.verifyEmail.value = this.pendingVerificationEmail;
                }
                const descriptionElement = this.domManager.elements.verifyDescription;
                if (descriptionElement) {
                    if (this.pendingVerificationEmail) {

                        descriptionElement.textContent = this.localeManager.t(
                            'app.verify.description',
                            { email: this.pendingVerificationEmail }
                        );
                    } else {

                        descriptionElement.textContent = this.localeManager.t(
                            'app.verify.descriptionManual'
                        );
                    }
                }
            }, 100);
            return;
        }
        
        const completed = await this._loadOnboardingCompleted();
        if (!completed) {
            this._showOnboardingScreen('welcome');
        } else {
            this._showMain();
        }
    }

    _showOnboardingScreen(screen) {
        const overlay = this.domManager.elements.onboardingOverlay;
        const main = this.domManager.elements.appMain;
        const loginContainer = this.domManager.elements.loginContainer;
        const welcome = this.domManager.elements.welcomeScreen;
        const login = this.domManager.elements.loginScreen;
        const register = this.domManager.elements.registerScreen;
        const verify = this.domManager.elements.verifyScreen;

        const isMainMenuVisible = main && main.style.display !== 'none' && 
                                  window.getComputedStyle(main).display !== 'none';

        if (loginContainer) loginContainer.style.display = 'none';

        if (isMainMenuVisible && main && overlay) {
            this._cameFromMainMenu = true;

            main.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            overlay.classList.remove('fade-in', 'fade-out', 'fade-out-down');

            main.classList.add('fade-out');
            
            setTimeout(() => {
                main.style.display = 'none';
                main.classList.remove('fade-out');

                if (welcome) welcome.style.display = 'none';
                if (login) login.style.display = 'none';
                if (register) register.style.display = 'none';
                if (verify) verify.style.display = 'none';

                overlay.style.display = 'flex';
                overlay.style.transform = 'scale(0.95)';
                overlay.style.opacity = '0';

                // Force reflow
                // eslint-disable-next-line no-unused-expressions
                overlay.offsetWidth;
                
                overlay.style.transform = '';
                overlay.style.opacity = '';
                overlay.classList.add('fade-in');

                this._showScreenInOverlay(screen, welcome, login, register, verify);
            }, 250);
        } else {
            this._cameFromMainMenu = false;

            const isOverlayVisible = overlay && overlay.style.display !== 'none' && 
                                     window.getComputedStyle(overlay).display !== 'none';
            
            if (!isOverlayVisible) {
                if (welcome) welcome.style.display = 'none';
                if (login) login.style.display = 'none';
                if (register) register.style.display = 'none';
                if (verify) verify.style.display = 'none';
            }
            
            if (overlay) overlay.style.display = 'flex';
            if (main) main.style.display = 'none';
            this._showScreenInOverlay(screen, welcome, login, register, verify);
        }
    }

    _showScreenInOverlay(screen, welcome, login, register, verify) {
        const modal = document.querySelector('.app-onboarding-modal');

        let currentScreen = null;
        const checkVisibility = (element) => {
            if (!element) return false;

            if (element.style.display === 'none') return false;

            const style = window.getComputedStyle(element);
            if (style.display === 'none') return false;

            return true;
        };

        if (checkVisibility(welcome)) {
            currentScreen = 'welcome';
        } else if (checkVisibility(login)) {
            currentScreen = 'login';
        } else if (checkVisibility(register)) {
            currentScreen = 'register';
        } else if (checkVisibility(verify)) {
            currentScreen = 'verify';
        }

        const currentElement = currentScreen === 'welcome'
? welcome 
                              : currentScreen === 'login'
? login 
                              : currentScreen === 'register'
? register 
                              : currentScreen === 'verify' ? verify : null;
        const targetElement = screen === 'welcome'
? welcome 
                             : screen === 'login'
? login 
                             : screen === 'register'
? register 
                             : screen === 'verify' ? verify : null;

        if (!currentScreen && targetElement) {

            if (welcome) welcome.style.display = 'none';
            if (login) login.style.display = 'none';
            if (register) register.style.display = 'none';
            if (verify) verify.style.display = 'none';

            targetElement.style.display = 'block';

            // Force reflow
            // eslint-disable-next-line no-unused-expressions
            targetElement.offsetHeight;

            if (modal) {
                const targetHeight = modal.scrollHeight;
                modal.style.height = `${targetHeight}px`;
            }

            setTimeout(() => {
                const formElement = targetElement.querySelector('.auth-form');
                if (formElement) {
                    const children = formElement.children;

                    Array.from(children).forEach((child) => {
                        child.style.opacity = '0';
                        child.style.transform = 'translateY(20px)';
                    });

                    // Force reflow
                    // eslint-disable-next-line no-unused-expressions
                    formElement.offsetHeight;

                    Array.from(children).forEach((child, index) => {
                        setTimeout(() => {
                            child.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0)';
                        }, 100 + (index * 80));
                    });
                }
            }, 50);

            setTimeout(() => {
                if (targetElement) {
                    this.localeManager.localizeDOM(targetElement);

                    setTimeout(() => {
                        const formElement = targetElement.querySelector('.auth-form');
                        if (formElement) {
                            const children = formElement.children;
                            Array.from(children).forEach((child) => {
                                child.style.opacity = '';
                                child.style.transform = '';
                                child.style.transition = '';
                            });
                        }
                    }, 800);
                    
                    if (screen === 'verify') {
                        const email = this.pendingVerificationEmail || 
                                    this.domManager.elements.verifyEmail?.value?.trim() || '';
                        if (email && this.domManager.elements.verifyEmail) {
                            this.domManager.elements.verifyEmail.value = email;
                        }
                        const descriptionElement = this.domManager.elements.verifyDescription;
                        if (descriptionElement) {
                            if (email) {
                                descriptionElement.textContent = this.localeManager.t(
                                    'app.verify.description',
                                    { email: email }
                                );
                            } else {
                                descriptionElement.textContent = this.localeManager.t(
                                    'app.verify.descriptionManual'
                                );
                            }
                        }
                    }
                }
            }, 50);
            return;
        }

        const screenOrder = { welcome: 0, login: 1, register: 2, verify: 3 };
        const isBackward = currentScreen && screenOrder[currentScreen] > screenOrder[screen];

        if (currentElement && targetElement && currentElement !== targetElement) {
            if (currentElement) {
                currentElement.style.display = 'none';
            }

            targetElement.style.display = 'block';
            targetElement.style.opacity = '0';

            // Force reflow
            // eslint-disable-next-line no-unused-expressions
            targetElement.offsetHeight;

            const targetHeight = modal ? modal.scrollHeight : targetElement.offsetHeight;

            if (currentElement) {
                currentElement.style.display = 'block';
            }
            targetElement.style.display = 'none';
            targetElement.style.opacity = '';

            if (modal) {
                const currentHeight = modal.offsetHeight;
                modal.style.height = `${currentHeight}px`;

                // Force reflow
                // eslint-disable-next-line no-unused-expressions
                modal.offsetHeight;

                modal.style.height = `${targetHeight}px`;
            }

            if (welcome) {
                welcome.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (login) {
                login.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (register) {
                register.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (verify) {
                verify.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }

            if (isBackward) {
                currentElement.classList.add('fade-out-down');
            } else {
                currentElement.classList.add('fade-out');
            }

            setTimeout(() => {
                if (welcome) welcome.style.display = 'none';
                if (login) login.style.display = 'none';
                if (register) register.style.display = 'none';
                if (verify) verify.style.display = 'none';

                currentElement.classList.remove('fade-out', 'fade-out-down');

                if (targetElement) {
                    targetElement.style.display = 'block';
                    targetElement.style.transform = 'scale(0.98)';
                    targetElement.style.opacity = '0';

                    // Force reflow
                    // eslint-disable-next-line no-unused-expressions
                    targetElement.offsetWidth;

                    targetElement.style.transform = '';
                    targetElement.style.opacity = '';
                    targetElement.classList.add('fade-in');

                    setTimeout(() => {
                        if (targetElement) {
                            this.localeManager.localizeDOM(targetElement);
                            if (screen === 'verify') {
                                const email = this.pendingVerificationEmail || 
                                            this.domManager.elements.verifyEmail?.value?.trim() || '';
                                if (email && this.domManager.elements.verifyEmail) {
                                    this.domManager.elements.verifyEmail.value = email;
                                }
                                const descriptionElement = this.domManager.elements.verifyDescription;
                                if (descriptionElement) {
                                    if (email) {
                                        descriptionElement.textContent = this.localeManager.t(
                                            'app.verify.description',
                                            { email: email }
                                        );
                                    } else {
                                        descriptionElement.textContent = this.localeManager.t(
                                            'app.verify.descriptionManual'
                                        );
                                    }
                                }
                            }
                        }

                        if (modal) {
                            modal.style.height = '';
                        }
                    }, 50);
                }
            }, 400);
        } else {
            if (welcome) welcome.style.display = screen === 'welcome' ? 'block' : 'none';
            if (login) login.style.display = screen === 'login' ? 'block' : 'none';
            if (register) register.style.display = screen === 'register' ? 'block' : 'none';
            if (verify) verify.style.display = screen === 'verify' ? 'block' : 'none';

            const shownElement = screen === 'welcome'
? welcome 
                               : screen === 'login'
? login 
                               : screen === 'register'
? register 
                               : screen === 'verify' ? verify : null;
            if (shownElement) {
                this.localeManager.localizeDOM(shownElement);
                if (screen === 'verify') {
                    const email = this.pendingVerificationEmail || 
                                this.domManager.elements.verifyEmail?.value?.trim() || '';
                    if (email && this.domManager.elements.verifyEmail) {
                        this.domManager.elements.verifyEmail.value = email;
                    }
                    const descriptionElement = this.domManager.elements.verifyDescription;
                    if (descriptionElement) {
                        if (email) {
                            descriptionElement.textContent = this.localeManager.t(
                                'app.verify.description',
                                { email: email }
                            );
                        } else {
                            descriptionElement.textContent = this.localeManager.t(
                                'app.verify.descriptionManual'
                            );
                        }
                    }
                }
            }
        }
    }

    _showMain() {
        const overlay = this.domManager.elements.onboardingOverlay;
        const main = this.domManager.elements.appMain;
        const loginContainer = this.domManager.elements.loginContainer;

        const isOverlayVisible = overlay && overlay.style.display !== 'none' && 
                                 window.getComputedStyle(overlay).display !== 'none';
        
        if (isOverlayVisible && overlay && main) {
            overlay.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            main.classList.remove('fade-in', 'fade-out', 'fade-out-down');

            overlay.classList.add('fade-out');
            
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.classList.remove('fade-out');

                main.style.display = 'flex';
                main.style.transform = 'translateY(20px)';
                main.style.opacity = '0';

                // Force reflow
                // eslint-disable-next-line no-unused-expressions
                main.offsetWidth;
                
                main.style.transform = '';
                main.style.opacity = '';
                main.classList.add('fade-in');
            }, 250);
        } else {
            if (overlay) overlay.style.display = 'none';
            if (loginContainer) loginContainer.style.display = 'none';
            if (main) main.style.display = 'flex';
        }
    }

    async _handleLogin(username, password) {
        if (!username || !password) {
            this.notificationManager.showNotification(
                this.localeManager.t('app.auth.loginError'),
                'error'
            );
            return;
        }

        try {
            const response = await this.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_LOGIN,
                { username, password }
            );
            if (!response?.success) {
                throw new Error(response?.error || this.localeManager.t('app.auth.loginError'));
            }
            await this._saveOnboardingCompleted(true);
            this._showMain();

            if (this.domManager.elements.mainLoginPassword) {
                this.domManager.elements.mainLoginPassword.value = '';
            }
            if (this.domManager.elements.loginPassword) {
                this.domManager.elements.loginPassword.value = '';
            }

            await this._updateLoginButtonVisibility();
            await this.loadUserInfo();
            this.notificationManager.showNotification(
                this.localeManager.t('app.auth.loginSuccess'),
                'success'
            );
        } catch (error) {
            this._logError({ key: 'logs.app.authLoginError' }, error);
            this.notificationManager.showNotification(
                error.message || this.localeManager.t('app.auth.loginError'),
                'error'
            );
        } finally {
            if (this.domManager.elements.loginPassword) {
                this.domManager.elements.loginPassword.value = '';
            }
        }
    }

    async _handleRegister(username, email, password) {
        if (!username || !email || !password) {
            this.notificationManager.showNotification(
                this.localeManager.t('app.register.error'),
                'error'
            );
            return;
        }

        try {
            const response = await this.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_REGISTER,
                { username, email, password }
            );
            if (!response?.success) {
                const errorMessage = response?.error || this.localeManager.t('app.register.error');
                const match = errorMessage.match(/^\[\d+\]\s*(.+)$/);
                const detailMessage = match ? match[1] : errorMessage;
                throw new Error(detailMessage);
            }
            const registeredEmail = this.domManager.elements.registerEmail?.value?.trim() || 
                                   this.domManager.elements.mainRegisterEmail?.value?.trim() || '';
            this.pendingVerificationEmail = registeredEmail;
            await this._savePendingVerificationEmail(registeredEmail);

            if (this.domManager.elements.mainRegisterPassword) {
                this.domManager.elements.mainRegisterPassword.value = '';
            }
            if (this.domManager.elements.mainRegisterConfirmPassword) {
                this.domManager.elements.mainRegisterConfirmPassword.value = '';
            }
            if (this.domManager.elements.registerPassword) {
                this.domManager.elements.registerPassword.value = '';
            }
            if (this.domManager.elements.registerConfirmPassword) {
                this.domManager.elements.registerConfirmPassword.value = '';
            }

            this._showOnboardingScreen('verify');
            
            this.notificationManager.showNotification(
                this.localeManager.t('app.register.success'),
                'success'
            );
        } catch (error) {
            this._logError({ key: 'logs.app.authRegisterError' }, error);

            let errorMessage = error.message || this.localeManager.t('app.register.error');
            const statusMatch = errorMessage.match(/^\[(\d+)\]\s*(.+)$/);
            
            if (statusMatch) {
                const status = statusMatch[1];
                const detail = statusMatch[2];

                errorMessage = `${this.localeManager.t('app.register.status')}: ${status}\n${this.localeManager.t('app.register.detail')}: ${detail}`;
            }
            
            this.notificationManager.showNotification(
                errorMessage,
                'error'
            );
        } finally {
            if (this.domManager.elements.registerPassword) {
                this.domManager.elements.registerPassword.value = '';
            }
            if (this.domManager.elements.registerConfirmPassword) {
                this.domManager.elements.registerConfirmPassword.value = '';
            }
            if (this.domManager.elements.mainRegisterPassword) {
                this.domManager.elements.mainRegisterPassword.value = '';
            }
            if (this.domManager.elements.mainRegisterConfirmPassword) {
                this.domManager.elements.mainRegisterConfirmPassword.value = '';
            }
        }
    }

    async _handleVerify(email, code) {
        if (!email || !code) {
            this.notificationManager.showNotification(
                this.localeManager.t('app.verify.error'),
                'error'
            );
            return;
        }

        try {
            const response = await this.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_VERIFY,
                { email, code }
            );
            if (!response?.success) {
                const errorMessage = response?.error || this.localeManager.t('app.verify.error');
                const match = errorMessage.match(/^\[\d+\]\s*(.+)$/);
                const detailMessage = match ? match[1] : errorMessage;
                throw new Error(detailMessage);
            }

            await this._savePendingVerificationEmail(null);
            this.pendingVerificationEmail = null;
            this._showOnboardingScreen('login');

            if (this.domManager.elements.verifyCode) {
                this.domManager.elements.verifyCode.value = '';
            }
            this.notificationManager.showNotification(
                this.localeManager.t('app.verify.success'),
                'success'
            );
        } catch (error) {
            this._logError({ key: 'logs.app.authVerifyError' }, error);

            let errorMessage = error.message || this.localeManager.t('app.verify.error');
            const statusMatch = errorMessage.match(/^\[(\d+)\]\s*(.+)$/);
            
            if (statusMatch) {
                const status = statusMatch[1];
                const detail = statusMatch[2];
                errorMessage = `${this.localeManager.t('app.verify.status')}: ${status}\n${this.localeManager.t('app.verify.detail')}: ${detail}`;
            }
            
            this.notificationManager.showNotification(
                errorMessage,
                'error'
            );
        }
    }

    async _handleResendCode(email) {
        if (!email) {
            this.notificationManager.showNotification(
                this.localeManager.t('app.verify.emailRequired'),
                'error'
            );
            return;
        }

        try {
            const response = await this.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_RESEND_CODE,
                { email }
            );
            if (!response?.success) {
                const errorMessage = response?.error || this.localeManager.t('app.verify.resendError');
                const match = errorMessage.match(/^\[\d+\]\s*(.+)$/);
                const detailMessage = match ? match[1] : errorMessage;
                throw new Error(detailMessage);
            }
            
            this.notificationManager.showNotification(
                this.localeManager.t('app.verify.resendSuccess'),
                'success'
            );
        } catch (error) {
            this._logError({ key: 'logs.app.authResendCodeError' }, error);

            let errorMessage = error.message || this.localeManager.t('app.verify.resendError');
            const statusMatch = errorMessage.match(/^\[(\d+)\]\s*(.+)$/);
            
            if (statusMatch) {
                const status = statusMatch[1];
                const detail = statusMatch[2];
                errorMessage = `${this.localeManager.t('app.verify.status')}: ${status}\n${this.localeManager.t('app.verify.detail')}: ${detail}`;
            }
            
            this.notificationManager.showNotification(
                errorMessage,
                'error'
            );
        }
    }

    async _sendAuthLogout() {
        try {
            await this.serviceWorkerManager.sendMessage(CONFIG.MESSAGE_TYPES.AUTH_LOGOUT);
            await this._updateLoginButtonVisibility();
        } catch (error) {
            this._logError({ key: 'logs.app.authLogoutError' }, error);
        }
    }

    /**
     * Обновляет видимость кнопки входа в зависимости от статуса авторизации.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async _updateLoginButtonVisibility() {
        try {
            const response = await this.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
            );
            const isAuthenticated = Boolean(response?.isAuthenticated);
            
            if (isAuthenticated) {
                this.domManager.hideLoginButton();
            } else {
                this.domManager.showLoginButton();
            }
        } catch (error) {
            this._logError({ key: 'logs.app.authStatusCheckError' }, error);
            this.domManager.showLoginButton();
        }
    }

    async _loadOnboardingCompleted() {
        try {
            const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]);
            return Boolean(result[CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]);
        } catch (error) {
            this._logError({ key: 'logs.app.onboardingLoadError' }, error);
            return false;
        }
    }

    async _saveOnboardingCompleted(value) {
        try {
            await chrome.storage.local.set({
                [CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]: Boolean(value)
            });
            return true;
        } catch (error) {
            this._logError({ key: 'logs.app.onboardingSaveError' }, error);
            return false;
        }
    }

    async _loadPendingVerificationEmail() {
        try {
            const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]);
            const email = result[CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL];
            return email && email.trim() ? email.trim() : null;
        } catch (error) {
            this._logError({ key: 'logs.app.onboardingLoadError' }, error);
            return null;
        }
    }

    async _savePendingVerificationEmail(email) {
        try {
            if (email && email.trim()) {
                await chrome.storage.local.set({
                    [CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]: email.trim()
                });
            } else {
                await chrome.storage.local.remove([CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]);
            }
            return true;
        } catch (error) {
            this._logError({ key: 'logs.app.onboardingSaveError' }, error);
            return false;
        }
    }

    /**
     * Переключает состояние отслеживания (включить/отключить).
     * 
     * @async
     * @returns {Promise<boolean>} true если операция завершилась успешно
     */
    async toggleTracking() {
        const currentState = Boolean(this.state.isTracking);
        const targetState = !currentState;
        const button = this.domManager.elements.toggleTracking;

        try {

            this.domManager.setTrackingToggleLoading(targetState);

            const toggleRequest = this.serviceWorkerManager.setTrackingEnabled(targetState);
            const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

            const [toggleResult] = await Promise.allSettled([toggleRequest, minDelay]);

            if (toggleResult.status !== 'fulfilled') {
                const errorMessage = toggleResult.reason?.message || this.localeManager.t('app.notifications.trackingToggleError');
                this._logError({ key: 'logs.app.trackingToggleError' }, toggleResult.reason || new Error(errorMessage));
                this.domManager.updateTrackingToggle(currentState);
                return false;
            }

            const response = toggleResult.value;

            if (!response || typeof response !== 'object' || !('success' in response) || response.success !== true) {
                const errorMessage = (response && typeof response === 'object' && 'error' in response)
                    ? response.error
                    : this.localeManager.t('app.notifications.trackingToggleError');
                this._logError({ key: 'logs.app.trackingToggleError' }, new Error(errorMessage));
                this.domManager.updateTrackingToggle(currentState);
                return false;
            }

            const newIsTracking = Boolean(response.isTracking);
            this.updateState({ isTracking: newIsTracking });
            this.domManager.updateTrackingStatus(newIsTracking);
            this.domManager.updateTrackingToggle(newIsTracking);

            return true;
        } catch (error) {
            this._logError({ key: 'logs.app.trackingToggleError' }, error);
            this.domManager.updateTrackingToggle(currentState);
            return false;
        } finally {
            const finalState = Boolean(this.state.isTracking);
            this.domManager.updateTrackingToggle(finalState, { disabled: false });
            if (button) {
                button.blur();
            }
        }
    }

    /**
     * Обработчик изменения локали.
     * 
     * @returns {void}
     */
    onLocaleChange() {
        try {
            this.localeManager.localizeDOM();
            this.domManager.refreshStatuses();
            
            this._log({ key: 'logs.app.localeChanged' }, {
                locale: this.localeManager.getCurrentLocale()
            });
        } catch (error) {
            this._logError({ key: 'logs.app.localeChangeError' }, error);
        }
    }

    /**
     * Запускает периодические обновления статуса.
     * 
     * @returns {void}
     */
    startPeriodicUpdates() {
        if (this.updateInterval) {
            this._log({ key: 'logs.app.periodicUpdatesAlreadyStarted' });
            return;
        }

        this._log({ key: 'logs.app.periodicUpdatesStart' });
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadInitialStatus();
            } catch (error) {
                this._logError({ key: 'logs.app.periodicUpdatesError' }, error);
            }
        }, this.CONSTANTS.UPDATE_INTERVAL);
    }

    /**
     * Останавливает периодические обновления статуса.
     * 
     * @private
     * @returns {void}
     */
    _stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this._log({ key: 'logs.app.periodicUpdatesStopped' });
        }
    }

    /**
     * Очищает ресурсы при закрытии app.
     *
     * @returns {void}
     */
    destroy() {
        if (!this.isInitialized) {
            this._log({ key: 'logs.app.alreadyDestroyed' });
            return;
        }

        this._log({ key: 'logs.app.destroyStart' });

        try {
            this._stopPeriodicUpdates();
            this._removeEventHandlers();
            this._destroyManagers();

            this.isInitialized = false;
            this._log({ key: 'logs.app.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.app.destroyError' }, error);
        }

        super.destroy();
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
                let element;

                if (key === 'userStatus') {
                    element = document.getElementById('userStatus');
                } else {
                    element = this.domManager.elements[key];
                }
                
                if (element && handler) {
                    element.removeEventListener('click', handler);
                }
            });

            this.eventHandlers.clear();
            this._log({ key: 'logs.app.eventHandlersRemoved' });
        } catch (error) {
            this._logError({ key: 'logs.app.eventHandlersRemoveError' }, error);
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

            if (this.domManager) {
                this.domManager.destroy();
                this.domManager = null;
            }

            if (this.localeManager) {
                this.localeManager.destroy();
                this.localeManager = null;
            }

            this._log({ key: 'logs.app.managersDestroyed' });
        } catch (error) {
            this._logError({ key: 'logs.app.managersDestroyError' }, error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppManager;
    module.exports.default = AppManager;
}

if (typeof window !== 'undefined') {
    window.AppManager = AppManager;
}