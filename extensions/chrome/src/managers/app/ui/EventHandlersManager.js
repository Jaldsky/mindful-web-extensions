const CONFIG = require('../../../config/config.js');

/**
 * Управляет обработчиками UI-событий app.
 *
 * @class EventHandlersManager
 */
class EventHandlersManager {
    /**
     * @param {import('../AppManager.js')} appManager
     */
    constructor(appManager) {
        this.app = appManager;
    }

    setupEventHandlers() {
        const app = this.app;

        if (app.domManager.elements.themeToggle) {
            const handler = async () => {
                const current = app.themeManager.getCurrentTheme();
                const next = current === CONFIG.THEME.THEMES.DARK
                    ? CONFIG.THEME.THEMES.LIGHT
                    : CONFIG.THEME.THEMES.DARK;
                app.themeManager.applyTheme(next);
                await app.themeManager.saveTheme(next);
                app._updateThemeLocaleToggleIcons();
            };
            app.domManager.elements.themeToggle.addEventListener('click', handler);
            app.eventHandlers.set('themeToggle', handler);
        }

        if (app.domManager.elements.localeToggle) {
            const handler = async () => {
                await app.localeManager.toggleLocale();
            };
            app.domManager.elements.localeToggle.addEventListener('click', handler);
            app.eventHandlers.set('localeToggle', handler);
        }

        if (app.domManager.elements.openSettings) {
            const handler = () => {
                app._log({ key: 'logs.app.openSettings' });
                chrome.runtime.openOptionsPage();
            };
            app.domManager.elements.openSettings.addEventListener('click', handler);
            app.eventHandlers.set('openSettings', handler);
        }

        if (app.domManager.elements.toggleTracking) {
            const handler = async () => {
                await app.toggleTracking();
            };
            app.domManager.elements.toggleTracking.addEventListener('click', handler);
            app.eventHandlers.set('toggleTracking', handler);
        }

        if (app.domManager.elements.tryAnonBtn) {
            const handler = async () => {
                try {
                    const response = await app.serviceWorkerManager.sendMessage(
                        CONFIG.MESSAGE_TYPES.AUTH_LOGOUT
                    );
                    if (!response?.success) {
                        throw new Error(response?.error || 'anonymous-auth-failed');
                    }
                } catch (error) {
                    app._logError({ key: 'logs.app.authLogoutError' }, error);
                    app.notificationManager.showNotification(
                        app.localeManager.t('app.notifications.anonymousLoginError'),
                        'error',
                        { layout: 'authToast', duration: 5000 }
                    );
                    return;
                }

                await app._saveOnboardingCompleted(true);
                app._showMain();

                await app.loadInitialStatus();
            };
            app.domManager.elements.tryAnonBtn.addEventListener('click', handler);
            app.eventHandlers.set('tryAnonBtn', handler);
        }

        if (app.domManager.elements.signInBtn) {
            const handler = async () => {
                app._showOnboardingScreen('login');
            };
            app.domManager.elements.signInBtn.addEventListener('click', handler);
            app.eventHandlers.set('signInBtn', handler);
        }

        if (app.domManager.elements.loginBack) {
            const handler = async () => {
                const onboardingCompleted = await app._loadOnboardingCompleted();

                if (onboardingCompleted) {
                    app._showMain();
                    app._cameFromMainMenu = false;
                } else {
                    app._showOnboardingScreen('welcome');
                }
            };
            app.domManager.elements.loginBack.addEventListener('click', handler);
            app.eventHandlers.set('loginBack', handler);
        }

        if (app.domManager.elements.registerLink) {
            const handler = (event) => {
                event.preventDefault();
                app._showOnboardingScreen('register');
            };
            app.domManager.elements.registerLink.addEventListener('click', handler);
            app.eventHandlers.set('registerLink', handler);
        }

        if (app.domManager.elements.registerCancel) {
            const handler = (event) => {
                event.preventDefault();

                app._showOnboardingScreen('login');
            };
            app.domManager.elements.registerCancel.addEventListener('click', handler);
            app.eventHandlers.set('registerCancel', handler);
        }

        if (app.domManager.elements.registerVerifyLink) {
            const handler = (event) => {
                event.preventDefault();

                const email = app.domManager.elements.registerEmail?.value?.trim() ||
                    app.domManager.elements.mainRegisterEmail?.value?.trim() || '';
                if (email) {
                    app.pendingVerificationEmail = email;
                } else {
                    app.pendingVerificationEmail = null;
                }
                app._showOnboardingScreen('verify');
            };
            app.domManager.elements.registerVerifyLink.addEventListener('click', handler);
            app.eventHandlers.set('registerVerifyLink', handler);
        }

        if (app.domManager.elements.loginForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = app.domManager.elements.loginUsername?.value?.trim();
                const password = app.domManager.elements.loginPassword?.value || '';
                await app._handleLogin(username, password);
            };
            app.domManager.elements.loginForm.addEventListener('submit', handler);
            app.eventHandlers.set('loginForm', handler);
        }

        if (app.domManager.elements.registerForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = app.domManager.elements.registerUsername?.value?.trim();
                const email = app.domManager.elements.registerEmail?.value?.trim();
                const password = app.domManager.elements.registerPassword?.value || '';
                const confirmPassword = app.domManager.elements.registerConfirmPassword?.value || '';

                const usernamePattern = /^[a-zA-Z0-9_]+$/;
                if (username && !usernamePattern.test(username)) {
                    const usernameInput = app.domManager.elements.registerUsername;
                    const errorElement = app.domManager.elements.registerUsernameError;
                    if (usernameInput) {
                        usernameInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = app.localeManager.t('app.register.usernameInvalid');
                    }
                    return;
                }

                const usernameInput = app.domManager.elements.registerUsername;
                const usernameErrorElement = app.domManager.elements.registerUsernameError;
                if (usernameInput) {
                    usernameInput.classList.remove('error');
                }
                if (usernameErrorElement) {
                    usernameErrorElement.textContent = '';
                }

                if (password !== confirmPassword) {
                    const confirmInput = app.domManager.elements.registerConfirmPassword;
                    const errorElement = app.domManager.elements.registerConfirmPasswordError;
                    if (confirmInput) {
                        confirmInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = app.localeManager.t('app.register.passwordMismatch');
                    }
                    return;
                }

                const confirmInput = app.domManager.elements.registerConfirmPassword;
                const confirmErrorElement = app.domManager.elements.registerConfirmPasswordError;
                if (confirmInput) {
                    confirmInput.classList.remove('error');
                }
                if (confirmErrorElement) {
                    confirmErrorElement.textContent = '';
                }

                await app._handleRegister(username, email, password);
            };
            app.domManager.elements.registerForm.addEventListener('submit', handler);
            app.eventHandlers.set('registerForm', handler);

            if (app.domManager.elements.registerUsername) {
                const validateUsername = () => {
                    const username = app.domManager.elements.registerUsername?.value?.trim() || '';
                    const usernamePattern = /^[a-zA-Z0-9_]+$/;
                    const usernameInput = app.domManager.elements.registerUsername;
                    const errorElement = app.domManager.elements.registerUsernameError;

                    if (username && !usernamePattern.test(username)) {
                        if (usernameInput) {
                            usernameInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = app.localeManager.t('app.register.usernameInvalid');
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

                app.domManager.elements.registerUsername.addEventListener('input', validateUsername);
            }

            if (app.domManager.elements.registerPassword && app.domManager.elements.registerConfirmPassword) {
                const validatePasswordMatch = () => {
                    const password = app.domManager.elements.registerPassword?.value || '';
                    const confirmPassword = app.domManager.elements.registerConfirmPassword?.value || '';
                    const confirmInput = app.domManager.elements.registerConfirmPassword;
                    const errorElement = app.domManager.elements.registerConfirmPasswordError;

                    if (confirmPassword && password !== confirmPassword) {
                        if (confirmInput) {
                            confirmInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = app.localeManager.t('app.register.passwordMismatch');
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

                app.domManager.elements.registerPassword.addEventListener('input', validatePasswordMatch);
                app.domManager.elements.registerConfirmPassword.addEventListener('input', validatePasswordMatch);
            }
        }

        if (app.domManager.elements.openLogin) {
            const handler = () => {
                app._log({ key: 'logs.app.openLogin' });
                app._showOnboardingScreen('login');
            };
            app.domManager.elements.openLogin.addEventListener('click', handler);
            app.eventHandlers.set('openLogin', handler);
        }

        if (app.domManager.elements.mainLoginBack) {
            const handler = () => {
                app._log({ key: 'logs.app.closeLogin' });
                app.domManager.hideLoginForm();
            };
            app.domManager.elements.mainLoginBack.addEventListener('click', handler);
            app.eventHandlers.set('mainLoginBack', handler);
        }

        if (app.domManager.elements.mainLoginForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = app.domManager.elements.mainLoginUsername?.value?.trim();
                const password = app.domManager.elements.mainLoginPassword?.value || '';
                await app._handleLogin(username, password);
            };
            app.domManager.elements.mainLoginForm.addEventListener('submit', handler);
            app.eventHandlers.set('mainLoginForm', handler);
        }

        if (app.domManager.elements.mainRegisterLink) {
            const handler = (event) => {
                event.preventDefault();
                app.domManager.showRegisterFormInContainer();
            };
            app.domManager.elements.mainRegisterLink.addEventListener('click', handler);
            app.eventHandlers.set('mainRegisterLink', handler);
        }

        if (app.domManager.elements.mainRegisterVerifyLink) {
            const handler = (event) => {
                event.preventDefault();
                if (app.domManager.elements.loginContainer) {
                    app.domManager.elements.loginContainer.style.display = 'none';
                }
                app._showOnboardingScreen('verify');
            };
            app.domManager.elements.mainRegisterVerifyLink.addEventListener('click', handler);
            app.eventHandlers.set('mainRegisterVerifyLink', handler);
        }

        if (app.domManager.elements.verifyForm) {
            const handler = async (event) => {
                event.preventDefault();
                app._syncVerifyCodeFromDigits();
                const email = app.domManager.elements.verifyEmail?.value?.trim() ||
                    app.pendingVerificationEmail || '';
                const code = app.domManager.elements.verifyCode?.value?.trim();
                await app._handleVerify(email, code);
            };
            app.domManager.elements.verifyForm.addEventListener('submit', handler);
            app.eventHandlers.set('verifyForm', handler);
        }

        app._setupVerifyCodeDigits();

        if (app.domManager.elements.verifyBack) {
            const handler = async () => {
                app._showOnboardingScreen('register');
            };
            app.domManager.elements.verifyBack.addEventListener('click', handler);
            app.eventHandlers.set('verifyBack', handler);
        }

        if (app.domManager.elements.resendCodeLink) {
            const handler = (event) => {
                event.preventDefault();
                app._showOnboardingScreen('resend');
            };
            app.domManager.elements.resendCodeLink.addEventListener('click', handler);
            app.eventHandlers.set('resendCodeLink', handler);
        }

        if (app.domManager.elements.resendForm) {
            const handler = async (event) => {
                event.preventDefault();
                const email = app.domManager.elements.resendEmail?.value?.trim() || '';
                const errorEl = app.domManager.elements.resendEmailError;
                if (!email) {
                    if (errorEl) {
                        errorEl.textContent = app.localeManager.t('app.verify.emailRequired');
                    }
                    return;
                }
                if (errorEl) errorEl.textContent = '';
                const success = await app._handleResendCode(email);
                if (success) {
                    if (app.domManager.elements.verifyEmail) {
                        app.domManager.elements.verifyEmail.value = email;
                    }
                    app.pendingVerificationEmail = email;
                    app._showOnboardingScreen('verify');
                }
            };
            app.domManager.elements.resendForm.addEventListener('submit', handler);
            app.eventHandlers.set('resendForm', handler);
        }

        if (app.domManager.elements.resendBack) {
            const handler = () => {
                app._showOnboardingScreen('verify');
            };
            app.domManager.elements.resendBack.addEventListener('click', handler);
            app.eventHandlers.set('resendBack', handler);
        }

        if (app.domManager.elements.mainRegisterForm) {
            const handler = async (event) => {
                event.preventDefault();
                const username = app.domManager.elements.mainRegisterUsername?.value?.trim();
                const email = app.domManager.elements.mainRegisterEmail?.value?.trim();
                const password = app.domManager.elements.mainRegisterPassword?.value || '';
                const confirmPassword = app.domManager.elements.mainRegisterConfirmPassword?.value || '';

                const usernamePattern = /^[a-zA-Z0-9_]+$/;
                if (username && !usernamePattern.test(username)) {
                    const usernameInput = app.domManager.elements.mainRegisterUsername;
                    const errorElement = app.domManager.elements.mainRegisterUsernameError;
                    if (usernameInput) {
                        usernameInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = app.localeManager.t('app.register.usernameInvalid');
                    }
                    return;
                }

                const usernameInput = app.domManager.elements.mainRegisterUsername;
                const usernameErrorElement = app.domManager.elements.mainRegisterUsernameError;
                if (usernameInput) {
                    usernameInput.classList.remove('error');
                }
                if (usernameErrorElement) {
                    usernameErrorElement.textContent = '';
                }

                if (password !== confirmPassword) {
                    const confirmInput = app.domManager.elements.mainRegisterConfirmPassword;
                    const errorElement = app.domManager.elements.mainRegisterConfirmPasswordError;
                    if (confirmInput) {
                        confirmInput.classList.add('error');
                    }
                    if (errorElement) {
                        errorElement.textContent = app.localeManager.t('app.register.passwordMismatch');
                    }
                    return;
                }

                const confirmInput = app.domManager.elements.mainRegisterConfirmPassword;
                const confirmErrorElement = app.domManager.elements.mainRegisterConfirmPasswordError;
                if (confirmInput) {
                    confirmInput.classList.remove('error');
                }
                if (confirmErrorElement) {
                    confirmErrorElement.textContent = '';
                }

                await app._handleRegister(username, email, password);
            };
            app.domManager.elements.mainRegisterForm.addEventListener('submit', handler);
            app.eventHandlers.set('mainRegisterForm', handler);

            if (app.domManager.elements.mainRegisterUsername) {
                const validateUsername = () => {
                    const username = app.domManager.elements.mainRegisterUsername?.value?.trim() || '';
                    const usernamePattern = /^[a-zA-Z0-9_]+$/;
                    const usernameInput = app.domManager.elements.mainRegisterUsername;
                    const errorElement = app.domManager.elements.mainRegisterUsernameError;

                    if (username && !usernamePattern.test(username)) {
                        if (usernameInput) {
                            usernameInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = app.localeManager.t('app.register.usernameInvalid');
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

                app.domManager.elements.mainRegisterUsername.addEventListener('input', validateUsername);
            }

            if (app.domManager.elements.mainRegisterPassword && app.domManager.elements.mainRegisterConfirmPassword) {
                const validatePasswordMatch = () => {
                    const password = app.domManager.elements.mainRegisterPassword?.value || '';
                    const confirmPassword = app.domManager.elements.mainRegisterConfirmPassword?.value || '';
                    const confirmInput = app.domManager.elements.mainRegisterConfirmPassword;
                    const errorElement = app.domManager.elements.mainRegisterConfirmPasswordError;

                    if (confirmPassword && password !== confirmPassword) {
                        if (confirmInput) {
                            confirmInput.classList.add('error');
                        }
                        if (errorElement) {
                            errorElement.textContent = app.localeManager.t('app.register.passwordMismatch');
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

                app.domManager.elements.mainRegisterPassword.addEventListener('input', validatePasswordMatch);
                app.domManager.elements.mainRegisterConfirmPassword.addEventListener('input', validatePasswordMatch);
            }
        }

        if (app.domManager.elements.mainRegisterBack) {
            const handler = (event) => {
                event.preventDefault();
                app.domManager.showLoginFormInContainer();
            };
            app.domManager.elements.mainRegisterBack.addEventListener('click', handler);
            app.eventHandlers.set('mainRegisterBack', handler);
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
                    app.notificationManager.showNotification(
                        app.localeManager.t('app.user.identifierCopied'),
                        'success'
                    );
                } catch (error) {
                    app._logError({ key: 'logs.app.copyToClipboardError' }, error);
                    try {
                        const textarea = document.createElement('textarea');
                        textarea.value = identifier;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        app.notificationManager.showNotification(
                            app.localeManager.t('app.user.identifierCopied'),
                            'success'
                        );
                    } catch (fallbackError) {
                        app._logError({ key: 'logs.app.copyToClipboardFallbackError' }, fallbackError);
                        app.notificationManager.showNotification(
                            app.localeManager.t('app.notifications.copyError'),
                            'error'
                        );
                    }
                }
            };
            userStatusElement.addEventListener('click', handler);
            app.eventHandlers.set('userStatus', handler);
        }
    }

    async toggleTracking() {
        const app = this.app;
        const currentState = Boolean(app.state.isTracking);
        const targetState = !currentState;
        const button = app.domManager.elements.toggleTracking;

        try {
            app.domManager.setTrackingToggleLoading(targetState);

            const toggleRequest = app.serviceWorkerManager.setTrackingEnabled(targetState);
            const minDelay = new Promise((resolve) => setTimeout(resolve, 500));

            const [toggleResult] = await Promise.allSettled([toggleRequest, minDelay]);

            if (toggleResult.status !== 'fulfilled') {
                const errorMessage = toggleResult.reason?.message || app.localeManager.t('app.notifications.trackingToggleError');
                app._logError({ key: 'logs.app.trackingToggleError' }, toggleResult.reason || new Error(errorMessage));
                app.domManager.updateTrackingToggle(currentState);
                return false;
            }

            const response = toggleResult.value;

            if (!response || typeof response !== 'object' || !('success' in response) || response.success !== true) {
                const errorMessage = (response && typeof response === 'object' && 'error' in response)
                    ? response.error
                    : app.localeManager.t('app.notifications.trackingToggleError');
                app._logError({ key: 'logs.app.trackingToggleError' }, new Error(errorMessage));
                app.domManager.updateTrackingToggle(currentState);
                return false;
            }

            const newIsTracking = Boolean(response.isTracking);
            app.updateState({ isTracking: newIsTracking });
            app.domManager.updateTrackingStatus(newIsTracking);
            app.domManager.updateTrackingToggle(newIsTracking);

            return true;
        } catch (error) {
            app._logError({ key: 'logs.app.trackingToggleError' }, error);
            app.domManager.updateTrackingToggle(currentState);
            return false;
        } finally {
            const finalState = Boolean(app.state.isTracking);
            app.domManager.updateTrackingToggle(finalState, { disabled: false });
            if (button) {
                button.blur();
            }
        }
    }
}

module.exports = EventHandlersManager;
module.exports.default = EventHandlersManager;
