const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для авторизации на странице настроек.
 *
 * @class AuthManager
 */
class AuthManager {
    /**
     * Создает экземпляр AuthManager.
     *
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Инициализирует onboarding и стартовый экран.
     *
     * @async
     * @returns {Promise<void>}
     */
    async initOnboarding() {
        const manager = this.manager;
        const onboardingCompleted = await manager.storageManager.loadOnboardingCompleted();
        if (!onboardingCompleted) {
            this.showOnboarding();
        } else {
            this.hideOnboarding();
        }
    }

    /**
     * Обновляет статус авторизации в UI.
     *
     * @async
     * @returns {Promise<void>}
     */
    async refreshAuthStatus() {
        const manager = this.manager;
        const statusEl = manager.domManager.elements.authStatus;
        if (!statusEl) {
            return;
        }

        try {
            const response = await manager.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
            );
            const isAuthenticated = Boolean(response?.isAuthenticated);
            statusEl.textContent = isAuthenticated
                ? manager.localeManager.t('options.auth.statusLoggedIn')
                : manager.localeManager.t('options.auth.statusAnonymous');
        } catch (error) {
            manager._logError({ key: 'logs.ui.auth.statusError' }, error);
            statusEl.textContent = manager.localeManager.t('options.auth.statusUnknown');
        }
    }

    /**
     * Показывает onboarding окно.
     */
    showOnboarding() {
        const { onboardingOverlay } = this.manager.domManager.elements;
        if (onboardingOverlay) onboardingOverlay.style.display = 'flex';
    }

    /**
     * Скрывает onboarding окно.
     */
    hideOnboarding() {
        const { onboardingOverlay } = this.manager.domManager.elements;
        if (onboardingOverlay) onboardingOverlay.style.display = 'none';
    }

    /**
     * Логин пользователя.
     *
     * @async
     * @param {string} username - Логин или email
     * @param {string} password - Пароль
     * @returns {Promise<void>}
     */
    async login(username, password) {
        const manager = this.manager;
        const loginButton = manager.domManager.elements.authLoginBtn;
        const originalText = manager.localeManager.t('options.auth.loginButton');
        const passwordInput = manager.domManager.elements.authPassword;

        if (!username || !password) {
            manager.statusManager.showError(manager.localeManager.t('options.auth.loginError'));
            return;
        }

        if (loginButton) {
            manager.domManager.setButtonState(
                loginButton,
                manager.localeManager.t('options.auth.loginLoading'),
                true
            );
        }

        try {
            const response = await manager.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_LOGIN,
                { username, password }
            );

            if (!response?.success) {
                throw new Error(response?.error || manager.localeManager.t('options.auth.loginError'));
            }

            await manager.storageManager.saveOnboardingCompleted(true);
            this.hideOnboarding();
            manager.statusManager.showSuccess(manager.localeManager.t('options.auth.loginSuccess'));
            await this.refreshAuthStatus();
        } catch (error) {
            manager._logError({ key: 'logs.ui.auth.loginError' }, error);
            manager.statusManager.showError(error.message);
        } finally {
            if (passwordInput) {
                passwordInput.value = '';
            }
            if (loginButton) {
                manager.domManager.setButtonState(loginButton, originalText, false);
            }
        }
    }

    /**
     * Логаут пользователя.
     *
     * @async
     * @returns {Promise<void>}
     */
    async logout() {
        const manager = this.manager;
        const logoutButton = manager.domManager.elements.authLogoutBtn;
        const originalText = manager.localeManager.t('options.auth.logoutButton');

        if (logoutButton) {
            manager.domManager.setButtonState(
                logoutButton,
                manager.localeManager.t('options.auth.logoutLoading'),
                true
            );
        }

        try {
            const response = await manager.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_LOGOUT
            );

            if (!response?.success) {
                throw new Error(response?.error || manager.localeManager.t('options.auth.logoutError'));
            }

            manager.statusManager.showSuccess(manager.localeManager.t('options.auth.logoutSuccess'));
            await this.refreshAuthStatus();
        } catch (error) {
            manager._logError({ key: 'logs.ui.auth.logoutError' }, error);
            manager.statusManager.showError(error.message);
        } finally {
            if (logoutButton) {
                manager.domManager.setButtonState(logoutButton, originalText, false);
            }
        }
    }

}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
    module.exports.default = AuthManager;
}

if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
