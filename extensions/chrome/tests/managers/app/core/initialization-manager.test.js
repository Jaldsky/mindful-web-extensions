/**
 * @jest-environment jsdom
 */

const InitializationManager = require('../../../../src/managers/app/core/InitializationManager.js');
const CONFIG = require('../../../../src/config/config.js');

describe('InitializationManager', () => {
    let app;
    let manager;

    const createAppMock = () => ({
        isInitialized: false,
        pendingVerificationEmail: null,
        _recheckDebounceTimer: null,
        _recheckDebounceMs: 10,
        domManager: {
            elements: {
                verifyEmail: { value: '' },
                verifyDescription: { textContent: '' },
                onboardingOverlay: null,
                appMain: null,
                loginScreen: null,
                registerScreen: null,
                verifyScreen: null,
                resendScreen: null
            },
            setTranslateFn: jest.fn(),
            updateTrackingStatus: jest.fn(),
            updateTrackingToggle: jest.fn(),
            updateCounters: jest.fn()
        },
        localeManager: {
            init: jest.fn().mockResolvedValue(),
            t: jest.fn((key, params) => params?.email ? `${key}:${params.email}` : key),
            localizeDOM: jest.fn(),
            addLocaleChangeListener: jest.fn()
        },
        serviceWorkerManager: {
            sendMessage: jest.fn().mockResolvedValue({ success: true, isAuthenticated: false, anonId: null }),
            getTrackingStatus: jest.fn().mockResolvedValue({ isTracking: true }),
            getTodayStats: jest.fn().mockResolvedValue({ events: 1, domains: 1 })
        },
        themeManager: {
            loadAndApplyTheme: jest.fn().mockResolvedValue()
        },
        notificationManager: {
            showNotification: jest.fn()
        },
        updateState: jest.fn(),
        loadUserInfo: jest.fn().mockResolvedValue(),
        _updateLoginButtonVisibility: jest.fn().mockResolvedValue(),
        loadInitialStatus: jest.fn().mockResolvedValue(),
        _showOnboardingScreen: jest.fn(),
        _showMain: jest.fn(),
        _revealApp: jest.fn(),
        _setLegalLinksUrls: jest.fn(),
        _updateThemeLocaleToggleIcons: jest.fn(),
        setupEventHandlers: jest.fn(),
        onLocaleChange: jest.fn(),
        _scheduleRecheckAuthAndShowScreen: jest.fn(),
        _recheckAuthAndShowScreen: jest.fn(),
        _log: jest.fn(),
        _logError: jest.fn(),
        _loadPendingVerificationEmail: jest.fn().mockResolvedValue(null),
        _loadOnboardingCompleted: jest.fn().mockResolvedValue(false)
    });

    beforeEach(() => {
        jest.useFakeTimers();
        app = createAppMock();
        manager = new InitializationManager(app);
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue(),
                    remove: jest.fn().mockResolvedValue()
                },
                onChanged: {
                    addListener: jest.fn(),
                    removeListener: jest.fn()
                }
            }
        };
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
        delete global.chrome;
    });

    test('init завершает ранним return если app уже initialized', async () => {
        app.isInitialized = true;
        await manager.init();
        expect(app._log).toHaveBeenCalledWith({ key: 'logs.app.alreadyInitialized' });
        expect(app.localeManager.init).not.toHaveBeenCalled();
    });

    test('init показывает verify экран при pending email', async () => {
        app._loadPendingVerificationEmail.mockResolvedValue('user@test.com');

        await manager.init();
        jest.advanceTimersByTime(120);

        expect(app._showOnboardingScreen).toHaveBeenCalledWith('verify');
        expect(app.domManager.elements.verifyEmail.value).toBe('user@test.com');
        expect(app.domManager.elements.verifyDescription.textContent).toContain('user@test.com');
        expect(app.isInitialized).toBe(true);
    });

    test('init показывает main при активной сессии', async () => {
        app.serviceWorkerManager.sendMessage.mockResolvedValue({
            success: true,
            isAuthenticated: true
        });

        await manager.init();

        expect(app._showMain).toHaveBeenCalled();
        expect(app.loadInitialStatus).toHaveBeenCalled();
    });

    test('init логирует и rethrow при критической ошибке', async () => {
        app.localeManager.init.mockRejectedValue(new Error('locale init failed'));

        await expect(manager.init()).rejects.toThrow('locale init failed');
        expect(app.notificationManager.showNotification).toHaveBeenCalledWith(
            'app.notifications.initError',
            'error'
        );
        expect(app._revealApp).toHaveBeenCalled();
    });

    test('loadInitialStatus обновляет UI и user info', async () => {
        await manager.loadInitialStatus();

        expect(app.domManager.updateTrackingStatus).toHaveBeenCalledWith(true);
        expect(app.domManager.updateTrackingToggle).toHaveBeenCalledWith(true);
        expect(app.domManager.updateCounters).toHaveBeenCalled();
        expect(app.loadUserInfo).toHaveBeenCalled();
        expect(app._updateLoginButtonVisibility).toHaveBeenCalled();
    });

    test('loadInitialStatus показывает notification при ошибке', async () => {
        app.serviceWorkerManager.getTrackingStatus.mockRejectedValue(new Error('status error'));

        await manager.loadInitialStatus();

        expect(app.notificationManager.showNotification).toHaveBeenCalledWith(
            'app.notifications.initialStatusError',
            'error'
        );
    });

    test('_scheduleRecheckAuthAndShowScreen переустанавливает debounce timer', () => {
        app._recheckDebounceTimer = setTimeout(() => {}, 1000);

        manager._scheduleRecheckAuthAndShowScreen();
        jest.advanceTimersByTime(20);

        expect(app._recheckAuthAndShowScreen).toHaveBeenCalled();
        expect(app._recheckDebounceTimer).toBeNull();
    });

    test('_saveOnboardingCompleted сохраняет значение в storage', async () => {
        const result = await manager._saveOnboardingCompleted(true);
        expect(result).toBe(true);
        expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
            [CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]: true
        });
    });

    test('_savePendingVerificationEmail удаляет ключ при пустом email', async () => {
        const result = await manager._savePendingVerificationEmail('');
        expect(result).toBe(true);
        expect(global.chrome.storage.local.remove).toHaveBeenCalledWith([
            CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL
        ]);
    });

    test('loadUserInfo заполняет статус для authenticated пользователя', async () => {
        document.body.innerHTML = `
            <div id="userStatus"></div>
            <div id="userStatusTooltip"></div>
        `;
        app.serviceWorkerManager.sendMessage.mockResolvedValue({
            success: true,
            username: 'john'
        });

        await manager.loadUserInfo();

        const userStatus = document.getElementById('userStatus');
        const tooltip = document.getElementById('userStatusTooltip');
        expect(userStatus.dataset.identifier).toBe('john');
        expect(userStatus.classList.contains('user-status-authenticated')).toBe(true);
        expect(tooltip.textContent).toBe('john');
    });

    test('loadUserInfo ставит unknown при неуспешном ответе', async () => {
        document.body.innerHTML = `
            <div id="userStatus"></div>
            <div id="userStatusTooltip"></div>
        `;
        app.serviceWorkerManager.sendMessage.mockResolvedValue({ success: false });

        await manager.loadUserInfo();

        const userStatus = document.getElementById('userStatus');
        const tooltip = document.getElementById('userStatusTooltip');
        expect(userStatus.dataset.identifier).toBe('');
        expect(userStatus.style.cursor).toBe('default');
        expect(tooltip.textContent).toBe('');
    });

    test('_applyOnboardingState показывает welcome если onboarding не завершен', async () => {
        app._loadPendingVerificationEmail.mockResolvedValue(null);
        app._loadOnboardingCompleted.mockResolvedValue(false);

        await manager._applyOnboardingState();

        expect(app._showOnboardingScreen).toHaveBeenCalledWith('welcome');
    });

    test('_recheckAuthAndShowScreen показывает main и грузит статус при активной сессии', async () => {
        const overlay = document.createElement('div');
        overlay.style.display = 'none';
        const main = document.createElement('div');
        main.style.display = 'none';
        const login = document.createElement('div');
        const register = document.createElement('div');
        const verify = document.createElement('div');
        const resend = document.createElement('div');
        login.style.display = 'none';
        register.style.display = 'none';
        verify.style.display = 'none';
        resend.style.display = 'none';

        app.domManager.elements.onboardingOverlay = overlay;
        app.domManager.elements.appMain = main;
        app.domManager.elements.loginScreen = login;
        app.domManager.elements.registerScreen = register;
        app.domManager.elements.verifyScreen = verify;
        app.domManager.elements.resendScreen = resend;
        app.serviceWorkerManager.sendMessage.mockResolvedValue({ isAuthenticated: true });
        app._loadOnboardingCompleted.mockResolvedValue(false);

        await manager._recheckAuthAndShowScreen();

        expect(app._showMain).toHaveBeenCalled();
        expect(app.loadInitialStatus).toHaveBeenCalled();
    });

    test('_loadPendingVerificationEmail возвращает trim email', async () => {
        global.chrome.storage.local.get.mockResolvedValue({
            [CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]: '  test@a.com  '
        });

        const email = await manager._loadPendingVerificationEmail();

        expect(email).toBe('test@a.com');
    });
});
