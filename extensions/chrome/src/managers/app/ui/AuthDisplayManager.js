/**
 * Управляет переключением auth-форм в popup UI.
 *
 * @class AuthDisplayManager
 */
class AuthDisplayManager {
    /**
     * @param {import('../DOMManager.js')} domManager
     */
    constructor(domManager) {
        this.dom = domManager;
    }

    showLoginForm() {
        const dom = this.dom;
        const mainElement = dom.elements.appMain;
        const loginElement = dom.elements.loginContainer;
        const mainCard = mainElement ? mainElement.querySelector('.auth-card') : null;
        const loginCard = loginElement ? loginElement.querySelector('.auth-card') : null;
        const animateMain = mainCard || mainElement;
        const animateLogin = loginCard || loginElement;

        if (mainElement && loginElement && animateMain && animateLogin) {
            animateMain.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            animateLogin.classList.remove('fade-in', 'fade-out', 'fade-out-down');

            animateMain.classList.add('fade-out');
            setTimeout(() => {
                mainElement.style.display = 'none';
                animateMain.classList.remove('fade-out');

                loginElement.style.display = 'flex';
                animateLogin.style.transform = 'translateY(-20px) scale(0.95)';
                animateLogin.style.opacity = '0';
                // eslint-disable-next-line no-unused-expressions
                animateLogin.offsetWidth;
                animateLogin.style.transform = '';
                animateLogin.style.opacity = '';
                animateLogin.classList.add('fade-in');
            }, 400);
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

    hideLoginForm() {
        const dom = this.dom;
        const mainElement = dom.elements.appMain;
        const loginElement = dom.elements.loginContainer;
        const mainCard = mainElement ? mainElement.querySelector('.auth-card') : null;
        const loginCard = loginElement ? loginElement.querySelector('.auth-card') : null;
        const animateMain = mainCard || mainElement;
        const animateLogin = loginCard || loginElement;

        if (mainElement && loginElement && animateMain && animateLogin) {
            animateMain.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            animateLogin.classList.remove('fade-in', 'fade-out', 'fade-out-down');

            animateLogin.classList.add('fade-out-down');
            setTimeout(() => {
                loginElement.style.display = 'none';
                animateLogin.classList.remove('fade-out-down');

                mainElement.style.display = 'flex';
                animateMain.style.transform = 'translateY(20px) scale(0.95)';
                animateMain.style.opacity = '0';
                // eslint-disable-next-line no-unused-expressions
                animateMain.offsetWidth;
                animateMain.style.transform = '';
                animateMain.style.opacity = '';
                animateMain.classList.add('fade-in');
            }, 400);
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

    showLoginButton() {
        const dom = this.dom;
        return dom._safeUpdateElement(
            dom.elements.openLogin,
            (element) => {
                element.style.display = '';
            },
            'openLogin'
        );
    }

    hideLoginButton() {
        const dom = this.dom;
        return dom._safeUpdateElement(
            dom.elements.openLogin,
            (element) => {
                element.style.display = 'none';
            },
            'openLogin'
        );
    }

    showLoginFormInContainer() {
        const dom = this.dom;
        const loginForm = dom.elements.mainLoginForm;
        const registerForm = dom.elements.mainRegisterForm;
        const headerLogo = dom.elements.authHeaderLogo;
        const headerSubtitle = dom.elements.authHeaderSubtitle;

        if (loginForm && registerForm) {
            loginForm.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            registerForm.classList.remove('fade-in', 'fade-out', 'fade-out-down');

            registerForm.classList.add('fade-out-down');
            setTimeout(() => {
                registerForm.style.display = 'none';
                registerForm.classList.remove('fade-out-down');
                loginForm.style.display = '';
                loginForm.style.transform = 'translateY(20px)';
                loginForm.style.opacity = '0';
                // eslint-disable-next-line no-unused-expressions
                loginForm.offsetWidth;
                loginForm.style.transform = '';
                loginForm.style.opacity = '';
                loginForm.classList.add('fade-in');
            }, 400);
        } else {
            if (loginForm) loginForm.style.display = '';
            if (registerForm) registerForm.style.display = 'none';
        }

        if (headerLogo) headerLogo.textContent = '🔐 Sign in';
        if (headerSubtitle) {
            const t = dom._getTranslateFn();
            headerSubtitle.textContent = t('app.auth.subtitle');
        }
        return true;
    }

    showRegisterFormInContainer() {
        const dom = this.dom;
        const loginForm = dom.elements.mainLoginForm;
        const registerForm = dom.elements.mainRegisterForm;
        const headerLogo = dom.elements.authHeaderLogo;
        const headerSubtitle = dom.elements.authHeaderSubtitle;

        if (loginForm && registerForm) {
            loginForm.classList.remove('fade-in', 'fade-out');
            registerForm.classList.remove('fade-in', 'fade-out');

            loginForm.classList.add('fade-out');
            setTimeout(() => {
                loginForm.style.display = 'none';
                loginForm.classList.remove('fade-out');
                registerForm.style.display = '';
                registerForm.style.transform = 'translateY(-20px)';
                registerForm.style.opacity = '0';
                // eslint-disable-next-line no-unused-expressions
                registerForm.offsetWidth;
                registerForm.style.transform = '';
                registerForm.style.opacity = '';
                registerForm.classList.add('fade-in');
            }, 400);
        } else {
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = '';
        }

        if (headerLogo) headerLogo.textContent = '📝 Register';
        if (headerSubtitle) {
            const t = dom._getTranslateFn();
            headerSubtitle.textContent = t('app.register.subtitle') || 'Create a new account';
        }
        return true;
    }
}

module.exports = AuthDisplayManager;
module.exports.default = AuthDisplayManager;
