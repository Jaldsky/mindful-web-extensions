/**
 * @jest-environment jsdom
 */

const AuthManager = require('../../../../src/managers/options/ui/AuthManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('AuthManager', () => {
    let manager;
    let authManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        authManager = new AuthManager(manager);
        
        document.body.innerHTML = `
            <div id="onboardingOverlay" style="display: none;"></div>
            <div id="authStatus"></div>
            <button id="authLoginBtn">Log in</button>
            <button id="authLogoutBtn">Log out</button>
            <input id="authPassword" type="password" />
        `;
        
        manager.domManager.elements.onboardingOverlay = document.getElementById('onboardingOverlay');
        manager.domManager.elements.authStatus = document.getElementById('authStatus');
        manager.domManager.elements.authLoginBtn = document.getElementById('authLoginBtn');
        manager.domManager.elements.authLogoutBtn = document.getElementById('authLogoutBtn');
        manager.domManager.elements.authPassword = document.getElementById('authPassword');
        
        manager.domManager.setButtonState = jest.fn().mockReturnValue(true);
        manager.serviceWorkerManager.sendMessage = jest.fn().mockResolvedValue({ success: true });
        manager.storageManager.loadOnboardingCompleted = jest.fn().mockResolvedValue(false);
        manager.storageManager.saveOnboardingCompleted = jest.fn().mockResolvedValue();
        
        manager.localeManager.t.mockImplementation((key) => {
            const translations = {
                'options.auth.statusLoggedIn': 'Logged in',
                'options.auth.statusAnonymous': 'Anonymous',
                'options.auth.statusUnknown': 'Unknown',
                'options.auth.loginButton': 'Log in',
                'options.auth.loginLoading': 'Logging in...',
                'options.auth.loginError': 'Login error',
                'options.auth.loginSuccess': 'Login successful',
                'options.auth.logoutButton': 'Log out',
                'options.auth.logoutLoading': 'Logging out...',
                'options.auth.logoutError': 'Logout error',
                'options.auth.logoutSuccess': 'Logout successful'
            };
            return translations[key] || key;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should create AuthManager instance with manager', () => {
            expect(authManager).toBeDefined();
            expect(authManager.manager).toBe(manager);
        });
    });

    describe('initOnboarding', () => {
        test('should show onboarding when not completed', async () => {
            manager.storageManager.loadOnboardingCompleted.mockResolvedValue(false);
            authManager.showOnboarding = jest.fn();
            
            await authManager.initOnboarding();
            
            expect(manager.storageManager.loadOnboardingCompleted).toHaveBeenCalled();
            expect(authManager.showOnboarding).toHaveBeenCalled();
        });

        test('should hide onboarding when completed', async () => {
            manager.storageManager.loadOnboardingCompleted.mockResolvedValue(true);
            authManager.hideOnboarding = jest.fn();
            
            await authManager.initOnboarding();
            
            expect(manager.storageManager.loadOnboardingCompleted).toHaveBeenCalled();
            expect(authManager.hideOnboarding).toHaveBeenCalled();
        });
    });

    describe('refreshAuthStatus', () => {
        test('should update status to logged in when authenticated', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ isAuthenticated: true });
            
            await authManager.refreshAuthStatus();
            
            expect(manager.serviceWorkerManager.sendMessage).toHaveBeenCalledWith(
                expect.any(String)
            );
            expect(manager.domManager.elements.authStatus.textContent).toBe('Logged in');
        });

        test('should update status to anonymous when not authenticated', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ isAuthenticated: false });
            
            await authManager.refreshAuthStatus();
            
            expect(manager.domManager.elements.authStatus.textContent).toBe('Anonymous');
        });

        test('should handle missing authStatus element gracefully', async () => {
            manager.domManager.elements.authStatus = null;
            
            await expect(authManager.refreshAuthStatus()).resolves.not.toThrow();
        });

        test('should handle errors and show unknown status', async () => {
            manager.serviceWorkerManager.sendMessage.mockRejectedValue(new Error('Network error'));
            
            await authManager.refreshAuthStatus();
            
            expect(manager.domManager.elements.authStatus.textContent).toBe('Unknown');
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('showOnboarding', () => {
        test('should show onboarding overlay', () => {
            authManager.showOnboarding();
            
            expect(manager.domManager.elements.onboardingOverlay.style.display).toBe('flex');
        });

        test('should handle missing onboardingOverlay gracefully', () => {
            manager.domManager.elements.onboardingOverlay = null;
            
            expect(() => authManager.showOnboarding()).not.toThrow();
        });
    });

    describe('hideOnboarding', () => {
        test('should hide onboarding overlay', () => {
            manager.domManager.elements.onboardingOverlay.style.display = 'flex';
            
            authManager.hideOnboarding();
            
            expect(manager.domManager.elements.onboardingOverlay.style.display).toBe('none');
        });

        test('should handle missing onboardingOverlay gracefully', () => {
            manager.domManager.elements.onboardingOverlay = null;
            
            expect(() => authManager.hideOnboarding()).not.toThrow();
        });
    });

    describe('login', () => {
        test('should show error if username or password is missing', async () => {
            manager.statusManager.showError = jest.fn();
            
            await authManager.login('', 'password');
            expect(manager.statusManager.showError).toHaveBeenCalled();
            
            await authManager.login('username', '');
            expect(manager.statusManager.showError).toHaveBeenCalled();
        });

        test('should call service worker with correct message type', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.storageManager.saveOnboardingCompleted.mockResolvedValue();
            authManager.hideOnboarding = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.login('username', 'password');
            
            expect(manager.serviceWorkerManager.sendMessage).toHaveBeenCalledWith(
                expect.any(String),
                { username: 'username', password: 'password' }
            );
        });

        test('should set button to loading state during login', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.storageManager.saveOnboardingCompleted.mockResolvedValue();
            authManager.hideOnboarding = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.login('username', 'password');
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(
                manager.domManager.elements.authLoginBtn,
                'Logging in...',
                true
            );
        });

        test('should show success and hide onboarding on successful login', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.storageManager.saveOnboardingCompleted.mockResolvedValue();
            manager.statusManager.showSuccess = jest.fn();
            authManager.hideOnboarding = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.login('username', 'password');
            
            expect(manager.storageManager.saveOnboardingCompleted).toHaveBeenCalledWith(true);
            expect(authManager.hideOnboarding).toHaveBeenCalled();
            expect(manager.statusManager.showSuccess).toHaveBeenCalledWith('Login successful');
            expect(authManager.refreshAuthStatus).toHaveBeenCalled();
        });

        test('should handle login error', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ 
                success: false, 
                error: 'Invalid credentials' 
            });
            manager.statusManager.showError = jest.fn();
            
            await authManager.login('username', 'password');
            
            expect(manager.statusManager.showError).toHaveBeenCalledWith('Invalid credentials');
            expect(manager._logError).toHaveBeenCalled();
        });

        test('should clear password field after login attempt', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.storageManager.saveOnboardingCompleted.mockResolvedValue();
            authManager.hideOnboarding = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            manager.domManager.elements.authPassword.value = 'password123';
            
            await authManager.login('username', 'password123');
            
            expect(manager.domManager.elements.authPassword.value).toBe('');
        });

        test('should restore button state after login attempt', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.storageManager.saveOnboardingCompleted.mockResolvedValue();
            authManager.hideOnboarding = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.login('username', 'password');
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(
                manager.domManager.elements.authLoginBtn,
                'Log in',
                false
            );
        });

        test('should handle missing login button gracefully', async () => {
            manager.domManager.elements.authLoginBtn = null;
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.storageManager.saveOnboardingCompleted.mockResolvedValue();
            authManager.hideOnboarding = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await expect(authManager.login('username', 'password')).resolves.not.toThrow();
        });
    });

    describe('logout', () => {
        test('should call service worker with logout message', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.statusManager.showSuccess = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.logout();
            
            expect(manager.serviceWorkerManager.sendMessage).toHaveBeenCalledWith(
                expect.any(String)
            );
        });

        test('should set button to loading state during logout', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.statusManager.showSuccess = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.logout();
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(
                manager.domManager.elements.authLogoutBtn,
                'Logging out...',
                true
            );
        });

        test('should show success on successful logout', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.statusManager.showSuccess = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.logout();
            
            expect(manager.statusManager.showSuccess).toHaveBeenCalledWith('Logout successful');
            expect(authManager.refreshAuthStatus).toHaveBeenCalled();
        });

        test('should handle logout error', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ 
                success: false, 
                error: 'Logout failed' 
            });
            manager.statusManager.showError = jest.fn();
            
            await authManager.logout();
            
            expect(manager.statusManager.showError).toHaveBeenCalledWith('Logout failed');
            expect(manager._logError).toHaveBeenCalled();
        });

        test('should restore button state after logout attempt', async () => {
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.statusManager.showSuccess = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await authManager.logout();
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(
                manager.domManager.elements.authLogoutBtn,
                'Log out',
                false
            );
        });

        test('should handle missing logout button gracefully', async () => {
            manager.domManager.elements.authLogoutBtn = null;
            manager.serviceWorkerManager.sendMessage.mockResolvedValue({ success: true });
            manager.statusManager.showSuccess = jest.fn();
            authManager.refreshAuthStatus = jest.fn().mockResolvedValue();
            
            await expect(authManager.logout()).resolves.not.toThrow();
        });
    });
});
