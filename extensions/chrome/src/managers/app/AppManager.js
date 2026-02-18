const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');
const DOMManager = require('./DOMManager.js');
const NotificationManager = require('./NotificationManager.js');
const ServiceWorkerManager = require('./ServiceWorkerManager.js');
const DiagnosticsManager = require('./DiagnosticsManager.js');
const LocaleManager = require('../locale/LocaleManager.js');
const ThemeManager = require('../theme/ThemeManager.js');
const InitializationManager = require('./core/InitializationManager.js');
const DisplayManager = require('./ui/DisplayManager.js');
const EventHandlersManager = require('./ui/EventHandlersManager.js');
const AuthManager = require('./auth/AuthManager.js');
const LifecycleManager = require('./core/LifecycleManager.js');

/**
 * Главный менеджер приложения, координирующий работу всех компонентов app.
 * Делегирует функциональность специализированным менеджерам.
 *
 * @class AppManager
 * @extends BaseManager
 */
class AppManager extends BaseManager {
    static BUTTON_LABELS = CONFIG.BUTTON_LABELS;

    constructor(options = {}) {
        super({
            enableLogging: options.enableLogging !== undefined ? options.enableLogging : true,
            ...options
        });

        const enableLogging = this.enableLogging;
        const translateFn = (key, params) => this.localeManager.t(key, params);

        this.localeManager = new LocaleManager({ enableLogging });
        this.themeManager = new ThemeManager({ enableLogging, enableCache: true });
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
        this._recheckDebounceTimer = null;
        this._recheckDebounceMs = 1200;

        this.initializationManager = new InitializationManager(this);
        this.displayManager = new DisplayManager(this);
        this.eventHandlersManager = new EventHandlersManager(this);
        this.authManager = new AuthManager(this);
        this.lifecycleManager = new LifecycleManager(this);

        this.init();
    }

    async init() {
        return this.initializationManager.init();
    }

    async loadInitialStatus() {
        return this.initializationManager.loadInitialStatus();
    }

    async loadUserInfo() {
        return this.initializationManager.loadUserInfo();
    }

    setupEventHandlers() {
        return this.eventHandlersManager.setupEventHandlers();
    }

    async _applyOnboardingState() {
        return this.initializationManager._applyOnboardingState();
    }

    _revealApp() {
        return this.displayManager._revealApp();
    }

    _animateChildren(container, childRootSelector, startDelay = 0) {
        return this.displayManager._animateChildren(container, childRootSelector, startDelay);
    }

    _animateFormChildren(container, startDelay = 0) {
        return this.displayManager._animateFormChildren(container, startDelay);
    }

    _animateMainChildren() {
        return this.displayManager._animateMainChildren();
    }

    _pinMainForTransition(main, zIndex = '1050') {
        return this.displayManager._pinMainForTransition(main, zIndex);
    }

    _unpinMainAfterTransition(main) {
        return this.displayManager._unpinMainAfterTransition(main);
    }

    _showOnboardingScreen(screen) {
        return this.displayManager._showOnboardingScreen(screen);
    }

    _showScreenInOverlay(screen, welcome, login, register, verify, resend) {
        return this.displayManager._showScreenInOverlay(screen, welcome, login, register, verify, resend);
    }

    _scheduleRecheckAuthAndShowScreen() {
        return this.initializationManager._scheduleRecheckAuthAndShowScreen();
    }

    async _recheckAuthAndShowScreen() {
        return this.initializationManager._recheckAuthAndShowScreen();
    }

    _showMain() {
        return this.displayManager._showMain();
    }

    async _handleLogin(username, password) {
        return this.authManager._handleLogin(username, password);
    }

    async _handleRegister(username, email, password) {
        return this.authManager._handleRegister(username, email, password);
    }

    async _handleVerify(email, code) {
        return this.authManager._handleVerify(email, code);
    }

    async _handleResendCode(email) {
        return this.authManager._handleResendCode(email);
    }

    async _sendAuthLogout() {
        return this.authManager._sendAuthLogout();
    }

    async _updateLoginButtonVisibility() {
        return this.authManager._updateLoginButtonVisibility();
    }

    _syncVerifyCodeFromDigits() {
        return this.authManager._syncVerifyCodeFromDigits();
    }

    _clearVerifyCodeDigits() {
        return this.authManager._clearVerifyCodeDigits();
    }

    _setupVerifyCodeDigits() {
        return this.authManager._setupVerifyCodeDigits();
    }

    async _loadOnboardingCompleted() {
        return this.initializationManager._loadOnboardingCompleted();
    }

    async _saveOnboardingCompleted(value) {
        return this.initializationManager._saveOnboardingCompleted(value);
    }

    async _loadPendingVerificationEmail() {
        return this.initializationManager._loadPendingVerificationEmail();
    }

    async _savePendingVerificationEmail(email) {
        return this.initializationManager._savePendingVerificationEmail(email);
    }

    async toggleTracking() {
        return this.eventHandlersManager.toggleTracking();
    }

    onLocaleChange() {
        return this.displayManager.onLocaleChange();
    }

    _setLegalLinksUrls() {
        return this.displayManager._setLegalLinksUrls();
    }

    _updateThemeLocaleToggleIcons() {
        return this.displayManager._updateThemeLocaleToggleIcons();
    }

    startPeriodicUpdates() {
        return this.lifecycleManager.startPeriodicUpdates();
    }

    _stopPeriodicUpdates() {
        return this.lifecycleManager._stopPeriodicUpdates();
    }

    destroy() {
        this.lifecycleManager.destroy();
        super.destroy();
    }

    _removeEventHandlers() {
        return this.lifecycleManager._removeEventHandlers();
    }

    _destroyManagers() {
        return this.lifecycleManager._destroyManagers();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppManager;
    module.exports.default = AppManager;
}

if (typeof window !== 'undefined') {
    window.AppManager = AppManager;
}
