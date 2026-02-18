/**
 * @jest-environment jsdom
 */

const EventHandlersManager = require('../../../../src/managers/app/ui/EventHandlersManager.js');

describe('EventHandlersManager', () => {
    let app;
    let manager;

    const createButton = () => document.createElement('button');

    beforeEach(() => {
        jest.useFakeTimers();
        app = {
            state: { isTracking: false },
            pendingVerificationEmail: null,
            eventHandlers: new Map(),
            domManager: {
                elements: {
                    openSettings: createButton(),
                    themeToggle: createButton(),
                    localeToggle: createButton(),
                    toggleTracking: createButton()
                },
                setTrackingToggleLoading: jest.fn(),
                updateTrackingStatus: jest.fn(),
                updateTrackingToggle: jest.fn(),
                hideLoginForm: jest.fn(),
                showRegisterFormInContainer: jest.fn(),
                showLoginFormInContainer: jest.fn()
            },
            themeManager: {
                getCurrentTheme: jest.fn().mockReturnValue('light'),
                applyTheme: jest.fn(),
                saveTheme: jest.fn().mockResolvedValue()
            },
            localeManager: {
                t: jest.fn((key) => key),
                toggleLocale: jest.fn().mockResolvedValue()
            },
            serviceWorkerManager: {
                setTrackingEnabled: jest.fn().mockResolvedValue({ success: true, isTracking: true }),
                sendMessage: jest.fn().mockResolvedValue({ success: true })
            },
            notificationManager: {
                showNotification: jest.fn()
            },
            updateState: jest.fn((next) => {
                app.state = { ...app.state, ...next };
            }),
            loadInitialStatus: jest.fn().mockResolvedValue(),
            _saveOnboardingCompleted: jest.fn().mockResolvedValue(true),
            _loadOnboardingCompleted: jest.fn().mockResolvedValue(false),
            _updateThemeLocaleToggleIcons: jest.fn(),
            _showMain: jest.fn(),
            _showOnboardingScreen: jest.fn(),
            _syncVerifyCodeFromDigits: jest.fn(),
            _handleLogin: jest.fn().mockResolvedValue(true),
            _handleRegister: jest.fn().mockResolvedValue(true),
            _handleVerify: jest.fn().mockResolvedValue(true),
            _handleResendCode: jest.fn().mockResolvedValue(true),
            _log: jest.fn(),
            _logError: jest.fn(),
            toggleTracking: jest.fn(),
            _setupVerifyCodeDigits: jest.fn()
        };

        manager = new EventHandlersManager(app);
        global.chrome = {
            runtime: {
                openOptionsPage: jest.fn()
            }
        };
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
        delete global.chrome;
        delete navigator.clipboard;
        document.body.innerHTML = '';
    });

    test('setupEventHandlers регистрирует openSettings handler', () => {
        manager.setupEventHandlers();

        app.domManager.elements.openSettings.click();

        expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalled();
        expect(app.eventHandlers.has('openSettings')).toBe(true);
    });

    test('setupEventHandlers регистрирует theme toggle handler', async () => {
        manager.setupEventHandlers();

        app.domManager.elements.themeToggle.click();
        await Promise.resolve();

        expect(app.themeManager.applyTheme).toHaveBeenCalledWith('dark');
        expect(app.themeManager.saveTheme).toHaveBeenCalledWith('dark');
        expect(app._updateThemeLocaleToggleIcons).toHaveBeenCalled();
    });

    test('setupEventHandlers регистрирует locale toggle handler', async () => {
        manager.setupEventHandlers();

        app.domManager.elements.localeToggle.click();
        await Promise.resolve();

        expect(app.localeManager.toggleLocale).toHaveBeenCalled();
    });

    test('toggleTracking возвращает true и обновляет состояние', async () => {
        const resultPromise = manager.toggleTracking();
        jest.advanceTimersByTime(600);
        const result = await resultPromise;

        expect(result).toBe(true);
        expect(app.updateState).toHaveBeenCalledWith({ isTracking: true });
        expect(app.domManager.updateTrackingStatus).toHaveBeenCalledWith(true);
        expect(app.domManager.updateTrackingToggle).toHaveBeenCalledWith(true);
    });

    test('toggleTracking возвращает false при rejected toggle request', async () => {
        app.serviceWorkerManager.setTrackingEnabled.mockRejectedValue(new Error('toggle failed'));
        app.state.isTracking = true;

        const resultPromise = manager.toggleTracking();
        jest.advanceTimersByTime(600);
        const result = await resultPromise;

        expect(result).toBe(false);
        expect(app._logError).toHaveBeenCalled();
        expect(app.domManager.updateTrackingToggle).toHaveBeenCalledWith(true);
    });

    test('toggleTracking возвращает false при invalid backend response', async () => {
        app.serviceWorkerManager.setTrackingEnabled.mockResolvedValue({ success: false, error: 'bad' });

        const resultPromise = manager.toggleTracking();
        jest.advanceTimersByTime(600);
        const result = await resultPromise;

        expect(result).toBe(false);
        expect(app._logError).toHaveBeenCalled();
    });

    test('handler userStatus копирует identifier в буфер', async () => {
        const userStatus = document.createElement('button');
        userStatus.id = 'userStatus';
        userStatus.dataset.identifier = 'anon-123';
        document.body.appendChild(userStatus);

        navigator.clipboard = {
            writeText: jest.fn().mockResolvedValue()
        };

        manager.setupEventHandlers();
        userStatus.click();
        await Promise.resolve();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('anon-123');
        expect(app.notificationManager.showNotification).toHaveBeenCalledWith(
            'app.user.identifierCopied',
            'success'
        );
    });

    test('setupEventHandlers обрабатывает tryAnonBtn и вызывает loadInitialStatus', async () => {
        const tryAnonBtn = createButton();
        app.domManager.elements.tryAnonBtn = tryAnonBtn;

        manager.setupEventHandlers();
        tryAnonBtn.click();
        await Promise.resolve();
        await Promise.resolve();

        expect(app._saveOnboardingCompleted).toHaveBeenCalledWith(true);
        expect(app.serviceWorkerManager.sendMessage).toHaveBeenCalled();
        expect(app._showMain).toHaveBeenCalled();
        expect(app.loadInitialStatus).toHaveBeenCalled();
    });

    test('registerForm валидирует username и не вызывает register при ошибке', async () => {
        const form = document.createElement('form');
        const usernameInput = document.createElement('input');
        const emailInput = document.createElement('input');
        const passwordInput = document.createElement('input');
        const confirmInput = document.createElement('input');
        const usernameError = document.createElement('div');

        usernameInput.value = 'bad name';
        emailInput.value = 'user@test.com';
        passwordInput.value = '123456';
        confirmInput.value = '123456';

        app.domManager.elements.registerForm = form;
        app.domManager.elements.registerUsername = usernameInput;
        app.domManager.elements.registerEmail = emailInput;
        app.domManager.elements.registerPassword = passwordInput;
        app.domManager.elements.registerConfirmPassword = confirmInput;
        app.domManager.elements.registerUsernameError = usernameError;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(usernameInput.classList.contains('error')).toBe(true);
        expect(usernameError.textContent).toBe('app.register.usernameInvalid');
        expect(app._handleRegister).not.toHaveBeenCalled();
    });

    test('registerForm валидирует confirm password mismatch', async () => {
        const form = document.createElement('form');
        const usernameInput = document.createElement('input');
        const emailInput = document.createElement('input');
        const passwordInput = document.createElement('input');
        const confirmInput = document.createElement('input');
        const confirmError = document.createElement('div');

        usernameInput.value = 'good_name';
        emailInput.value = 'user@test.com';
        passwordInput.value = 'abc123';
        confirmInput.value = 'abc';

        app.domManager.elements.registerForm = form;
        app.domManager.elements.registerUsername = usernameInput;
        app.domManager.elements.registerEmail = emailInput;
        app.domManager.elements.registerPassword = passwordInput;
        app.domManager.elements.registerConfirmPassword = confirmInput;
        app.domManager.elements.registerConfirmPasswordError = confirmError;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(confirmInput.classList.contains('error')).toBe(true);
        expect(confirmError.textContent).toBe('app.register.passwordMismatch');
        expect(app._handleRegister).not.toHaveBeenCalled();
    });

    test('verifyForm синхронизирует код и вызывает verify handler', async () => {
        const form = document.createElement('form');
        const verifyEmail = document.createElement('input');
        const verifyCode = document.createElement('input');
        verifyEmail.value = 'user@test.com';
        verifyCode.value = '123456';

        app.domManager.elements.verifyForm = form;
        app.domManager.elements.verifyEmail = verifyEmail;
        app.domManager.elements.verifyCode = verifyCode;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(app._syncVerifyCodeFromDigits).toHaveBeenCalled();
        expect(app._handleVerify).toHaveBeenCalledWith('user@test.com', '123456');
    });

    test('resendForm показывает ошибку при пустом email', async () => {
        const form = document.createElement('form');
        const resendEmail = document.createElement('input');
        const resendEmailError = document.createElement('div');

        app.domManager.elements.resendForm = form;
        app.domManager.elements.resendEmail = resendEmail;
        app.domManager.elements.resendEmailError = resendEmailError;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(resendEmailError.textContent).toBe('app.verify.emailRequired');
        expect(app._handleResendCode).not.toHaveBeenCalled();
    });

    test('resendForm при успехе переключает на verify и сохраняет email', async () => {
        const form = document.createElement('form');
        const resendEmail = document.createElement('input');
        const resendEmailError = document.createElement('div');
        const verifyEmail = document.createElement('input');
        resendEmail.value = 'verify@test.com';

        app.domManager.elements.resendForm = form;
        app.domManager.elements.resendEmail = resendEmail;
        app.domManager.elements.resendEmailError = resendEmailError;
        app.domManager.elements.verifyEmail = verifyEmail;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(app._handleResendCode).toHaveBeenCalledWith('verify@test.com');
        expect(verifyEmail.value).toBe('verify@test.com');
        expect(app.pendingVerificationEmail).toBe('verify@test.com');
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('verify');
    });

    test('signInBtn и loginBack переключают экраны онбординга', async () => {
        const signInBtn = createButton();
        const loginBack = createButton();
        app.domManager.elements.signInBtn = signInBtn;
        app.domManager.elements.loginBack = loginBack;
        app._loadOnboardingCompleted.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

        manager.setupEventHandlers();

        signInBtn.click();
        await Promise.resolve();
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('login');

        loginBack.click();
        await Promise.resolve();
        expect(app._showMain).toHaveBeenCalled();

        loginBack.click();
        await Promise.resolve();
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('welcome');
    });

    test('register links управляют переходами и pending email', () => {
        const registerLink = document.createElement('a');
        const registerCancel = document.createElement('a');
        const registerVerifyLink = document.createElement('a');
        const registerEmail = document.createElement('input');
        registerEmail.value = 'reg@test.com';

        app.domManager.elements.registerLink = registerLink;
        app.domManager.elements.registerCancel = registerCancel;
        app.domManager.elements.registerVerifyLink = registerVerifyLink;
        app.domManager.elements.registerEmail = registerEmail;

        manager.setupEventHandlers();

        registerLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        registerCancel.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        registerVerifyLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(app._showOnboardingScreen).toHaveBeenCalledWith('register');
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('login');
        expect(app.pendingVerificationEmail).toBe('reg@test.com');
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('verify');
    });

    test('loginForm вызывает _handleLogin с trimmed username', async () => {
        const form = document.createElement('form');
        const username = document.createElement('input');
        const password = document.createElement('input');
        username.value = ' user ';
        password.value = 'secret';
        app.domManager.elements.loginForm = form;
        app.domManager.elements.loginUsername = username;
        app.domManager.elements.loginPassword = password;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(app._handleLogin).toHaveBeenCalledWith('user', 'secret');
    });

    test('openLogin/mainLoginBack/mainLoginForm/mainRegisterLink/mainRegisterVerifyLink работают корректно', async () => {
        const openLogin = createButton();
        const mainLoginBack = createButton();
        const mainLoginForm = document.createElement('form');
        const mainLoginUsername = document.createElement('input');
        const mainLoginPassword = document.createElement('input');
        const mainRegisterLink = document.createElement('a');
        const mainRegisterVerifyLink = document.createElement('a');
        const loginContainer = document.createElement('div');
        mainLoginUsername.value = ' mainuser ';
        mainLoginPassword.value = 'pass';
        loginContainer.style.display = 'block';

        app.domManager.elements.openLogin = openLogin;
        app.domManager.elements.mainLoginBack = mainLoginBack;
        app.domManager.elements.mainLoginForm = mainLoginForm;
        app.domManager.elements.mainLoginUsername = mainLoginUsername;
        app.domManager.elements.mainLoginPassword = mainLoginPassword;
        app.domManager.elements.mainRegisterLink = mainRegisterLink;
        app.domManager.elements.mainRegisterVerifyLink = mainRegisterVerifyLink;
        app.domManager.elements.loginContainer = loginContainer;

        manager.setupEventHandlers();

        openLogin.click();
        mainLoginBack.click();
        mainLoginForm.dispatchEvent(new Event('submit'));
        mainRegisterLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        mainRegisterVerifyLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await Promise.resolve();

        expect(app._showOnboardingScreen).toHaveBeenCalledWith('login');
        expect(app.domManager.hideLoginForm).toHaveBeenCalled();
        expect(app._handleLogin).toHaveBeenCalledWith('mainuser', 'pass');
        expect(app.domManager.showRegisterFormInContainer).toHaveBeenCalled();
        expect(loginContainer.style.display).toBe('none');
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('verify');
    });

    test('verifyBack/resendCodeLink/resendBack/mainRegisterBack переключают экраны', () => {
        const verifyBack = createButton();
        const resendCodeLink = document.createElement('a');
        const resendBack = createButton();
        const mainRegisterBack = document.createElement('a');

        app.domManager.elements.verifyBack = verifyBack;
        app.domManager.elements.resendCodeLink = resendCodeLink;
        app.domManager.elements.resendBack = resendBack;
        app.domManager.elements.mainRegisterBack = mainRegisterBack;

        manager.setupEventHandlers();

        verifyBack.click();
        resendCodeLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        resendBack.click();
        mainRegisterBack.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

        expect(app._showOnboardingScreen).toHaveBeenCalledWith('register');
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('resend');
        expect(app._showOnboardingScreen).toHaveBeenCalledWith('verify');
        expect(app.domManager.showLoginFormInContainer).toHaveBeenCalled();
    });

    test('mainRegisterForm валидирует и вызывает _handleRegister', async () => {
        const form = document.createElement('form');
        const username = document.createElement('input');
        const email = document.createElement('input');
        const password = document.createElement('input');
        const confirm = document.createElement('input');
        const usernameError = document.createElement('div');
        const confirmError = document.createElement('div');
        username.value = 'main_user';
        email.value = 'main@test.com';
        password.value = 'abc123';
        confirm.value = 'abc123';

        app.domManager.elements.mainRegisterForm = form;
        app.domManager.elements.mainRegisterUsername = username;
        app.domManager.elements.mainRegisterEmail = email;
        app.domManager.elements.mainRegisterPassword = password;
        app.domManager.elements.mainRegisterConfirmPassword = confirm;
        app.domManager.elements.mainRegisterUsernameError = usernameError;
        app.domManager.elements.mainRegisterConfirmPasswordError = confirmError;

        manager.setupEventHandlers();
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();

        expect(app._handleRegister).toHaveBeenCalledWith('main_user', 'main@test.com', 'abc123');

        username.value = 'bad name';
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();
        expect(usernameError.textContent).toBe('app.register.usernameInvalid');

        username.value = 'good_name';
        password.value = 'a';
        confirm.value = 'b';
        form.dispatchEvent(new Event('submit'));
        await Promise.resolve();
        expect(confirmError.textContent).toBe('app.register.passwordMismatch');
    });

    test('userStatus делает fallback copy при ошибке clipboard', async () => {
        const userStatus = document.createElement('button');
        userStatus.id = 'userStatus';
        userStatus.dataset.identifier = 'anon-fallback';
        document.body.appendChild(userStatus);

        navigator.clipboard = {
            writeText: jest.fn().mockRejectedValue(new Error('clipboard fail'))
        };
        document.execCommand = jest.fn().mockReturnValue(true);

        manager.setupEventHandlers();
        userStatus.click();
        await Promise.resolve();
        await Promise.resolve();

        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(app.notificationManager.showNotification).toHaveBeenCalledWith(
            'app.user.identifierCopied',
            'success'
        );
    });

    test('userStatus не делает ничего без identifier', async () => {
        const userStatus = document.createElement('button');
        userStatus.id = 'userStatus';
        userStatus.dataset.identifier = '';
        document.body.appendChild(userStatus);
        navigator.clipboard = {
            writeText: jest.fn().mockResolvedValue()
        };

        manager.setupEventHandlers();
        userStatus.click();
        await Promise.resolve();

        expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    test('toggleTracking возвращает false если setTrackingToggleLoading бросает ошибку', async () => {
        app.domManager.setTrackingToggleLoading.mockImplementation(() => {
            throw new Error('ui fail');
        });

        const result = await manager.toggleTracking();

        expect(result).toBe(false);
        expect(app._logError).toHaveBeenCalled();
    });
});
