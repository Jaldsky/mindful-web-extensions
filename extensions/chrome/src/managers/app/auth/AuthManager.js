const CONFIG = require('../../../config/config.js');

/**
 * Управляет auth-flow в app (login/register/verify/resend/logout).
 *
 * @class AuthManager
 */
class AuthManager {
    /**
     * @param {import('../AppManager.js')} appManager
     */
    constructor(appManager) {
        this.app = appManager;
    }

    async _handleLogin(username, password) {
        const app = this.app;
        if (!username || !password) {
            app.notificationManager.showNotification(
                app.localeManager.t('app.auth.loginError'),
                'error',
                { layout: 'authToast', duration: 5000 }
            );
            return;
        }

        try {
            const response = await app.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_LOGIN,
                { username, password }
            );
            if (!response?.success) {
                throw new Error(response?.error || app.localeManager.t('app.auth.loginError'));
            }
            await app._saveOnboardingCompleted(true);
            app._showMain();

            if (app.domManager.elements.mainLoginPassword) {
                app.domManager.elements.mainLoginPassword.value = '';
            }
            if (app.domManager.elements.loginPassword) {
                app.domManager.elements.loginPassword.value = '';
            }

            await app._updateLoginButtonVisibility();
            await app.loadUserInfo();
            app.notificationManager.showNotification(
                app.localeManager.t('app.auth.loginSuccess'),
                'success'
            );
        } catch (error) {
            app._logError({ key: 'logs.app.authLoginError' }, error);
            app.notificationManager.showNotification(
                error.message || app.localeManager.t('app.auth.loginError'),
                'error',
                { layout: 'authToast', duration: 5000 }
            );
        } finally {
            if (app.domManager.elements.loginPassword) {
                app.domManager.elements.loginPassword.value = '';
            }
        }
    }

    async _handleRegister(username, email, password) {
        const app = this.app;
        if (!username || !email || !password) {
            app.notificationManager.showNotification(
                app.localeManager.t('app.register.error'),
                'error',
                { layout: 'authToast', duration: 5000 }
            );
            return;
        }

        try {
            const response = await app.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_REGISTER,
                { username, email, password }
            );
            if (!response?.success) {
                const errorMessage = response?.error || app.localeManager.t('app.register.error');
                const match = errorMessage.match(/^\[\d+\]\s*(.+)$/);
                const detailMessage = match ? match[1] : errorMessage;
                throw new Error(detailMessage);
            }
            const registeredEmail = app.domManager.elements.registerEmail?.value?.trim() ||
                app.domManager.elements.mainRegisterEmail?.value?.trim() || '';
            app.pendingVerificationEmail = registeredEmail;
            await app._savePendingVerificationEmail(registeredEmail);

            if (app.domManager.elements.mainRegisterPassword) {
                app.domManager.elements.mainRegisterPassword.value = '';
            }
            if (app.domManager.elements.mainRegisterConfirmPassword) {
                app.domManager.elements.mainRegisterConfirmPassword.value = '';
            }
            if (app.domManager.elements.registerPassword) {
                app.domManager.elements.registerPassword.value = '';
            }
            if (app.domManager.elements.registerConfirmPassword) {
                app.domManager.elements.registerConfirmPassword.value = '';
            }

            app._showOnboardingScreen('verify');

            app.notificationManager.showNotification(
                app.localeManager.t('app.register.success'),
                'success'
            );
        } catch (error) {
            app._logError({ key: 'logs.app.authRegisterError' }, error);

            let errorMessage = error.message || app.localeManager.t('app.register.error');
            const statusMatch = errorMessage.match(/^\[(\d+)\]\s*(.+)$/);

            if (statusMatch) {
                const status = statusMatch[1];
                const detail = statusMatch[2];

                errorMessage = `${app.localeManager.t('app.register.status')}: ${status}\n${app.localeManager.t('app.register.detail')}: ${detail}`;
            }

            app.notificationManager.showNotification(
                errorMessage,
                'error',
                { layout: 'authToast', duration: 5000 }
            );
        } finally {
            if (app.domManager.elements.registerPassword) {
                app.domManager.elements.registerPassword.value = '';
            }
            if (app.domManager.elements.registerConfirmPassword) {
                app.domManager.elements.registerConfirmPassword.value = '';
            }
            if (app.domManager.elements.mainRegisterPassword) {
                app.domManager.elements.mainRegisterPassword.value = '';
            }
            if (app.domManager.elements.mainRegisterConfirmPassword) {
                app.domManager.elements.mainRegisterConfirmPassword.value = '';
            }
        }
    }

    async _handleVerify(email, code) {
        const app = this.app;
        if (!email || !code) {
            app.notificationManager.showNotification(
                app.localeManager.t('app.verify.error'),
                'error',
                { layout: 'authToast', duration: 5000 }
            );
            return;
        }

        try {
            const response = await app.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_VERIFY,
                { email, code }
            );
            if (!response?.success) {
                const errorMessage = response?.error || app.localeManager.t('app.verify.error');
                const match = errorMessage.match(/^\[\d+\]\s*(.+)$/);
                const detailMessage = match ? match[1] : errorMessage;
                throw new Error(detailMessage);
            }

            await app._savePendingVerificationEmail(null);
            app.pendingVerificationEmail = null;
            app._showOnboardingScreen('login');

            app._clearVerifyCodeDigits();
            app.notificationManager.showNotification(
                app.localeManager.t('app.verify.success'),
                'success'
            );
        } catch (error) {
            app._logError({ key: 'logs.app.authVerifyError' }, error);

            let errorMessage = error.message || app.localeManager.t('app.verify.error');
            const statusMatch = errorMessage.match(/^\[(\d+)\]\s*(.+)$/);

            if (statusMatch) {
                const status = statusMatch[1];
                const detail = statusMatch[2];
                errorMessage = `${app.localeManager.t('app.verify.status')}: ${status}\n${app.localeManager.t('app.verify.detail')}: ${detail}`;
            }

            app.notificationManager.showNotification(
                errorMessage,
                'error',
                { layout: 'authToast', duration: 5000 }
            );
        }
    }

    async _handleResendCode(email) {
        const app = this.app;
        if (!email) {
            app.notificationManager.showNotification(
                app.localeManager.t('app.verify.emailRequired'),
                'error',
                { layout: 'authToast', duration: 5000 }
            );
            return false;
        }

        try {
            const response = await app.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.AUTH_RESEND_CODE,
                { email }
            );
            if (!response?.success) {
                const errorMessage = response?.error || app.localeManager.t('app.verify.resendError');
                const match = errorMessage.match(/^\[\d+\]\s*(.+)$/);
                const detailMessage = match ? match[1] : errorMessage;
                throw new Error(detailMessage);
            }

            app.notificationManager.showNotification(
                app.localeManager.t('app.verify.resendSuccess'),
                'success'
            );
            return true;
        } catch (error) {
            app._logError({ key: 'logs.app.authResendCodeError' }, error);

            let errorMessage = error.message || app.localeManager.t('app.verify.resendError');
            const statusMatch = errorMessage.match(/^\[(\d+)\]\s*(.+)$/);

            if (statusMatch) {
                const status = statusMatch[1];
                const detail = statusMatch[2];
                errorMessage = `${app.localeManager.t('app.verify.status')}: ${status}\n${app.localeManager.t('app.verify.detail')}: ${detail}`;
            }

            app.notificationManager.showNotification(
                errorMessage,
                'error',
                { layout: 'authToast', duration: 5000 }
            );
            return false;
        }
    }

    async _sendAuthLogout() {
        const app = this.app;
        try {
            await app.serviceWorkerManager.sendMessage(CONFIG.MESSAGE_TYPES.AUTH_LOGOUT);
            await app._updateLoginButtonVisibility();
        } catch (error) {
            app._logError({ key: 'logs.app.authLogoutError' }, error);
        }
    }

    async _updateLoginButtonVisibility() {
        const app = this.app;
        try {
            const response = await app.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
            );
            const isAuthenticated = Boolean(response?.isAuthenticated);

            if (isAuthenticated) {
                app.domManager.hideLoginButton();
            } else {
                app.domManager.showLoginButton();
            }
        } catch (error) {
            app._logError({ key: 'logs.app.authStatusCheckError' }, error);
            app.domManager.showLoginButton();
        }
    }

    _syncVerifyCodeFromDigits() {
        const app = this.app;
        const container = app.domManager.elements.verifyCodeContainer;
        const hidden = app.domManager.elements.verifyCode;
        if (!container || !hidden) return;
        const inputs = container.querySelectorAll('.auth-code-digit');
        const digits = Array.from(inputs).map((inp) => (inp.value && /^\d$/.test(inp.value) ? inp.value : ''));
        hidden.value = digits.join('');
    }

    _clearVerifyCodeDigits() {
        const app = this.app;
        const container = app.domManager.elements.verifyCodeContainer;
        const hidden = app.domManager.elements.verifyCode;
        if (hidden) hidden.value = '';
        if (container) {
            container.querySelectorAll('.auth-code-digit').forEach((inp) => {
                inp.value = '';
                inp.classList.remove('has-error');
            });
        }
        const codeError = document.getElementById('appVerifyCodeError');
        if (codeError) codeError.textContent = '';
    }

    _setupVerifyCodeDigits() {
        const app = this.app;
        const container = app.domManager.elements.verifyCodeContainer;
        const hidden = app.domManager.elements.verifyCode;
        if (!container || !hidden) return;
        const inputs = Array.from(container.querySelectorAll('.auth-code-digit'));
        const LEN = 6;

        const syncToHidden = () => {
            const digits = inputs.map((inp) => (inp.value && /^\d$/.test(inp.value) ? inp.value : ''));
            hidden.value = digits.join('');
        };

        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 1);
                e.target.value = v;
                syncToHidden();
                if (v && index < LEN - 1) {
                    inputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, LEN);
                if (!pasted) return;
                pasted.split('').forEach((ch, i) => {
                    if (inputs[i]) {
                        inputs[i].value = ch;
                    }
                });
                syncToHidden();
                const nextIndex = Math.min(pasted.length, LEN - 1);
                inputs[nextIndex]?.focus();
            });
        });
    }
}

module.exports = AuthManager;
module.exports.default = AuthManager;
