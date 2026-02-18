/**
 * @jest-environment jsdom
 */

const DisplayManager = require('../../../../src/managers/app/ui/DisplayManager.js');
const CONFIG = require('../../../../src/config/config.js');

describe('DisplayManager', () => {
    let app;
    let manager;

    beforeEach(() => {
        jest.useFakeTimers();
        global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

        app = {
            _cameFromMainMenu: false,
            pendingVerificationEmail: null,
            domManager: {
                elements: {}
            },
            localeManager: {
                localizeDOM: jest.fn(),
                t: jest.fn((key, params) => params?.email ? `${key}:${params.email}` : key),
                getCurrentLocale: jest.fn().mockReturnValue('ru')
            },
            themeManager: {
                getCurrentTheme: jest.fn().mockReturnValue(CONFIG.THEME.THEMES.DARK)
            },
            _animateChildren: jest.fn(),
            _showScreenInOverlay: jest.fn(),
            _pinMainForTransition: jest.fn(),
            _unpinMainAfterTransition: jest.fn(),
            _animateFormChildren: jest.fn(),
            _animateMainChildren: jest.fn(),
            _updateThemeLocaleToggleIcons: jest.fn(),
            _log: jest.fn(),
            _logError: jest.fn()
        };

        manager = new DisplayManager(app);
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
        delete global.requestAnimationFrame;
        document.body.innerHTML = '';
    });

    test('_revealApp удаляет app-loading класс', () => {
        document.body.classList.add('app-loading');

        manager._revealApp();
        jest.runAllTimers();

        expect(document.body.classList.contains('app-loading')).toBe(false);
    });

    test('_animateChildren анимирует и очищает стили дочерних элементов', () => {
        document.body.innerHTML = `
            <div id="container">
                <div class="auth-form">
                    <div id="first"></div>
                    <div id="second"></div>
                </div>
            </div>
        `;
        const container = document.getElementById('container');
        const first = document.getElementById('first');

        manager._animateChildren(container, '.auth-form', 0);

        expect(first.style.opacity).toBe('0');
        jest.runAllTimers();
        expect(first.style.opacity).toBe('');
    });

    test('_showOnboardingScreen помечает переход из main menu', () => {
        const overlay = document.createElement('div');
        const onboardingModal = document.createElement('div');
        onboardingModal.className = 'app-onboarding-modal';
        overlay.appendChild(onboardingModal);
        overlay.style.display = 'none';

        const main = document.createElement('div');
        main.style.display = 'flex';
        const mainModal = document.createElement('div');
        mainModal.className = 'app-main-modal';
        Object.defineProperty(mainModal, 'offsetHeight', { value: 250, configurable: true });
        main.appendChild(mainModal);

        app.domManager.elements = {
            onboardingOverlay: overlay,
            appMain: main,
            loginContainer: document.createElement('div'),
            welcomeScreen: document.createElement('div'),
            loginScreen: document.createElement('div'),
            registerScreen: document.createElement('div'),
            verifyScreen: document.createElement('div'),
            resendScreen: document.createElement('div')
        };

        manager._showOnboardingScreen('login');

        expect(app._cameFromMainMenu).toBe(true);
        expect(app._showScreenInOverlay).toHaveBeenCalled();
        jest.runAllTimers();
    });

    test('_showMain показывает main, когда overlay не активен', () => {
        const overlay = document.createElement('div');
        overlay.style.display = 'none';
        const main = document.createElement('div');
        const mainModal = document.createElement('div');
        mainModal.className = 'app-main-modal';
        main.appendChild(mainModal);

        app.domManager.elements = {
            onboardingOverlay: overlay,
            appMain: main,
            loginContainer: document.createElement('div'),
            welcomeScreen: document.createElement('div'),
            loginScreen: document.createElement('div'),
            registerScreen: document.createElement('div'),
            verifyScreen: document.createElement('div'),
            resendScreen: document.createElement('div')
        };

        manager._showMain();

        expect(main.style.display).toBe('flex');
        expect(mainModal.classList.contains('fade-in')).toBe(true);
    });

    test('onLocaleChange обновляет локализацию и логирует', () => {
        app.domManager.refreshStatuses = jest.fn();

        manager.onLocaleChange();

        expect(app.localeManager.localizeDOM).toHaveBeenCalled();
        expect(app.domManager.refreshStatuses).toHaveBeenCalled();
        expect(app._updateThemeLocaleToggleIcons).toHaveBeenCalled();
        expect(app._log).toHaveBeenCalledWith(
            { key: 'logs.app.localeChanged' },
            { locale: 'ru' }
        );
    });

    test('_setLegalLinksUrls устанавливает href для legal ссылок', () => {
        document.body.innerHTML = `
            <a class="app-legal-terms"></a>
            <a class="app-legal-privacy"></a>
            <span class="app-legal-terms"></span>
        `;

        manager._setLegalLinksUrls();

        const terms = document.querySelector('a.app-legal-terms');
        const privacy = document.querySelector('a.app-legal-privacy');
        expect(terms.href).toContain(CONFIG.APP.TERMS_URL);
        expect(privacy.href).toContain(CONFIG.APP.PRIVACY_URL);
    });

    test('_updateThemeLocaleToggleIcons меняет иконки темы и языка', () => {
        document.body.innerHTML = `
            <span id="appThemeIcon"></span>
            <span id="appLocaleIcon"></span>
        `;

        manager._updateThemeLocaleToggleIcons();

        expect(document.getElementById('appThemeIcon').textContent).toBe('🌙');
        expect(document.getElementById('appLocaleIcon').textContent).toBe('🇷🇺');
    });

    test('_showScreenInOverlay первично показывает verify и заполняет email', () => {
        const modal = document.createElement('div');
        modal.className = 'app-onboarding-modal';
        document.body.appendChild(modal);

        const welcome = document.createElement('div');
        const login = document.createElement('div');
        const register = document.createElement('div');
        const verify = document.createElement('div');
        const resend = document.createElement('div');
        const verifyForm = document.createElement('div');
        verifyForm.className = 'auth-form';
        verifyForm.appendChild(document.createElement('div'));
        verify.appendChild(verifyForm);

        const verifyEmail = document.createElement('input');
        const verifyDescription = document.createElement('div');
        app.pendingVerificationEmail = 'focus@test.com';
        app.domManager.elements.verifyEmail = verifyEmail;
        app.domManager.elements.verifyDescription = verifyDescription;

        manager._showScreenInOverlay('verify', welcome, login, register, verify, resend);
        jest.runAllTimers();

        expect(verify.style.display).toBe('block');
        expect(verifyEmail.value).toBe('focus@test.com');
        expect(verifyDescription.textContent).toContain('focus@test.com');
        expect(app._animateFormChildren).toHaveBeenCalled();
    });

    test('_showScreenInOverlay переключает со screen login на register', () => {
        const modal = document.createElement('div');
        modal.className = 'app-onboarding-modal';
        document.body.appendChild(modal);

        const welcome = document.createElement('div');
        const login = document.createElement('div');
        const register = document.createElement('div');
        const verify = document.createElement('div');
        const resend = document.createElement('div');
        login.style.display = 'block';
        register.style.display = 'none';

        Object.defineProperty(modal, 'offsetHeight', { value: 200, configurable: true });
        Object.defineProperty(register, 'offsetHeight', { value: 100, configurable: true });

        manager._showScreenInOverlay('register', welcome, login, register, verify, resend);
        jest.advanceTimersByTime(500);

        expect(register.style.display).toBe('block');
        expect(login.style.display).toBe('none');
        expect(register.classList.contains('fade-in')).toBe(true);
    });
});
