/**
 * @jest-environment jsdom
 */

const AuthDisplayManager = require('../../../../src/managers/app/ui/AuthDisplayManager.js');

describe('AuthDisplayManager', () => {
    let domManager;
    let authDisplayManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="appMain" style="display:flex;">
                <div class="auth-card" id="mainCard"></div>
            </div>
            <div id="loginContainer" style="display:none;">
                <div class="auth-card" id="loginCard"></div>
            </div>
            <button id="openLogin" style="display:block;"></button>
            <div id="appAuthHeaderLogo"></div>
            <div id="appAuthHeaderSubtitle"></div>
            <form id="appMainLoginForm" style="display:block;"></form>
            <form id="appMainRegisterForm" style="display:none;"></form>
        `;

        domManager = {
            elements: {
                appMain: document.getElementById('appMain'),
                loginContainer: document.getElementById('loginContainer'),
                openLogin: document.getElementById('openLogin'),
                authHeaderLogo: document.getElementById('appAuthHeaderLogo'),
                authHeaderSubtitle: document.getElementById('appAuthHeaderSubtitle'),
                mainLoginForm: document.getElementById('appMainLoginForm'),
                mainRegisterForm: document.getElementById('appMainRegisterForm')
            },
            _safeUpdateElement: jest.fn((element, updateFn) => {
                if (!element) return false;
                updateFn(element);
                return true;
            }),
            _getTranslateFn: jest.fn(() => (key) => {
                if (key === 'app.auth.subtitle') return 'Sign in to continue';
                if (key === 'app.register.subtitle') return 'Create a new account';
                return key;
            })
        };

        authDisplayManager = new AuthDisplayManager(domManager);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    test('showLoginButton и hideLoginButton переключают отображение кнопки', () => {
        expect(authDisplayManager.hideLoginButton()).toBe(true);
        expect(domManager.elements.openLogin.style.display).toBe('none');

        expect(authDisplayManager.showLoginButton()).toBe(true);
        expect(domManager.elements.openLogin.style.display).toBe('');
    });

    test('showLoginForm скрывает main и показывает loginContainer', () => {
        authDisplayManager.showLoginForm();
        jest.advanceTimersByTime(400);

        expect(domManager.elements.appMain.style.display).toBe('none');
        expect(domManager.elements.loginContainer.style.display).toBe('flex');
    });

    test('hideLoginForm скрывает loginContainer и показывает main', () => {
        domManager.elements.loginContainer.style.display = 'flex';
        domManager.elements.appMain.style.display = 'none';

        authDisplayManager.hideLoginForm();
        jest.advanceTimersByTime(400);

        expect(domManager.elements.loginContainer.style.display).toBe('none');
        expect(domManager.elements.appMain.style.display).toBe('flex');
    });

    test('showLoginFormInContainer показывает login форму и обновляет заголовок', () => {
        domManager.elements.mainLoginForm.style.display = 'none';
        domManager.elements.mainRegisterForm.style.display = 'block';

        authDisplayManager.showLoginFormInContainer();
        jest.advanceTimersByTime(400);

        expect(domManager.elements.mainLoginForm.style.display).toBe('');
        expect(domManager.elements.mainRegisterForm.style.display).toBe('none');
        expect(domManager.elements.authHeaderLogo.textContent).toBe('🔐 Sign in');
        expect(domManager.elements.authHeaderSubtitle.textContent).toBe('Sign in to continue');
    });

    test('showRegisterFormInContainer показывает register форму и обновляет заголовок', () => {
        domManager.elements.mainLoginForm.style.display = 'block';
        domManager.elements.mainRegisterForm.style.display = 'none';

        authDisplayManager.showRegisterFormInContainer();
        jest.advanceTimersByTime(400);

        expect(domManager.elements.mainLoginForm.style.display).toBe('none');
        expect(domManager.elements.mainRegisterForm.style.display).toBe('');
        expect(domManager.elements.authHeaderLogo.textContent).toBe('📝 Register');
        expect(domManager.elements.authHeaderSubtitle.textContent).toBe('Create a new account');
    });
});
