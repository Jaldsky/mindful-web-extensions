const CONFIG = require('../../../config/config.js');

/**
 * Управляет инициализацией app, загрузкой статуса и состоянием онбординга.
 *
 * @class InitializationManager
 */
class InitializationManager {
    /**
     * @param {import('../AppManager.js')} appManager
     */
    constructor(appManager) {
        this.app = appManager;
    }

    async init() {
        const app = this.app;
        if (app.isInitialized) {
            app._log({ key: 'logs.app.alreadyInitialized' });
            return;
        }

        try {
            await app.localeManager.init();

            app.domManager.setTranslateFn((key) => app.localeManager.t(key));
            app.localeManager.localizeDOM();

            let hasActiveSession = false;
            try {
                const authStatus = await app.serviceWorkerManager.sendMessage(
                    CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
                );
                hasActiveSession = Boolean(authStatus?.isAuthenticated || authStatus?.anonId);
            } catch (error) {
                app._logError({ key: 'logs.app.authStatusCheckError' }, error);
            }

            const pendingEmail = await app._loadPendingVerificationEmail();

            if (pendingEmail) {
                app.pendingVerificationEmail = pendingEmail;
                app._showOnboardingScreen('verify');

                setTimeout(() => {
                    if (app.domManager.elements.verifyEmail && app.pendingVerificationEmail) {
                        app.domManager.elements.verifyEmail.value = app.pendingVerificationEmail;
                    }
                    const descriptionElement = app.domManager.elements.verifyDescription;
                    if (descriptionElement) {
                        if (app.pendingVerificationEmail) {
                            descriptionElement.textContent = app.localeManager.t(
                                'app.verify.description',
                                { email: app.pendingVerificationEmail }
                            );
                        } else {
                            descriptionElement.textContent = app.localeManager.t(
                                'app.verify.descriptionManual'
                            );
                        }
                    }
                }, 100);
            } else if (hasActiveSession) {
                app._showMain();
                app.localeManager.localizeDOM();
                await app.loadInitialStatus();
            } else {
                const onboardingCompleted = await app._loadOnboardingCompleted();
                if (!onboardingCompleted) {
                    app._showOnboardingScreen('welcome');
                } else {
                    app._showMain();
                    app.localeManager.localizeDOM();
                    await app.loadInitialStatus();
                }
            }

            app._revealApp();

            try {
                await app.themeManager.loadAndApplyTheme();
                app._updateThemeLocaleToggleIcons();
            } catch (themeError) {
                app._logError({ key: 'logs.app.localeChangeError' }, themeError);
            }

            app.setupEventHandlers();
            app._setLegalLinksUrls();
            app.localeManager.addLocaleChangeListener(() => {
                app.onLocaleChange();
            });

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                app._storageListener = (changes, areaName) => {
                    if (areaName === 'local' && app.isInitialized) {
                        app._scheduleRecheckAuthAndShowScreen();
                    }
                };
                chrome.storage.onChanged.addListener(app._storageListener);
            }

            if (typeof document !== 'undefined' && document.addEventListener) {
                app._visibilityHandler = () => {
                    if (document.visibilityState === 'visible' && app.isInitialized) {
                        app._scheduleRecheckAuthAndShowScreen();
                    }
                };
                document.addEventListener('visibilitychange', app._visibilityHandler);
            }

            app.isInitialized = true;
        } catch (error) {
            app._logError({ key: 'logs.app.initError' }, error);
            app._revealApp();
            app.notificationManager.showNotification(
                app.localeManager.t('app.notifications.initError'),
                'error'
            );
            throw error;
        }
    }

    async loadInitialStatus() {
        const app = this.app;
        try {
            const trackingStatus = await app.serviceWorkerManager.getTrackingStatus();
            app.domManager.updateTrackingStatus(trackingStatus.isTracking);
            app.domManager.updateTrackingToggle(trackingStatus.isTracking);
            app.updateState({ isTracking: trackingStatus.isTracking });

            const stats = await app.serviceWorkerManager.getTodayStats();
            app.domManager.updateCounters(stats);

            await app.loadUserInfo();
            await app._updateLoginButtonVisibility();
        } catch (error) {
            app._logError({ key: 'logs.app.initialStatusError' }, error);
            app.notificationManager.showNotification(
                app.localeManager.t('app.notifications.initialStatusError'),
                'error'
            );
        }
    }

    async loadUserInfo() {
        const app = this.app;
        try {
            const response = await app.serviceWorkerManager.sendMessage(
                CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
            );

            const userStatusElement = document.getElementById('userStatus');
            const userStatusTooltip = document.getElementById('userStatusTooltip');

            if (response && response.success) {
                const username = response.username || null;
                const anonId = response.anonId || null;

                if (username) {
                    if (userStatusElement) {
                        userStatusElement.textContent = app.localeManager.t('app.user.statusAuthenticated');
                        userStatusElement.classList.remove('user-status-anonymous');
                        userStatusElement.classList.add('user-status-clickable', 'user-status-authenticated');
                        userStatusElement.style.cursor = 'pointer';
                        userStatusElement.dataset.identifier = username;
                    }
                    if (userStatusTooltip) {
                        userStatusTooltip.textContent = username;
                    }
                } else if (anonId) {
                    if (userStatusElement) {
                        userStatusElement.textContent = app.localeManager.t('app.user.statusAnonymous');
                        userStatusElement.classList.remove('user-status-authenticated');
                        userStatusElement.classList.add('user-status-clickable', 'user-status-anonymous');
                        userStatusElement.style.cursor = 'pointer';
                        userStatusElement.dataset.identifier = anonId;
                    }
                    if (userStatusTooltip) {
                        userStatusTooltip.textContent = anonId;
                    }
                } else {
                    if (userStatusElement) {
                        userStatusElement.textContent = app.localeManager.t('app.status.unknown');
                        userStatusElement.classList.remove('user-status-clickable', 'user-status-anonymous', 'user-status-authenticated');
                        userStatusElement.style.cursor = 'default';
                        userStatusElement.dataset.identifier = '';
                    }
                    if (userStatusTooltip) {
                        userStatusTooltip.textContent = '';
                    }
                }
            } else {
                if (userStatusElement) {
                    userStatusElement.textContent = app.localeManager.t('app.status.unknown');
                    userStatusElement.classList.remove('user-status-clickable', 'user-status-anonymous', 'user-status-authenticated');
                    userStatusElement.style.cursor = 'default';
                    userStatusElement.dataset.identifier = '';
                }
                if (userStatusTooltip) {
                    userStatusTooltip.textContent = '';
                }
            }
        } catch (error) {
            app._logError({ key: 'logs.app.userInfoLoadError' }, error);
            const userStatusElement = document.getElementById('userStatus');
            const userStatusTooltip = document.getElementById('userStatusTooltip');
            if (userStatusElement) {
                userStatusElement.textContent = app.localeManager.t('app.status.unknown');
                userStatusElement.classList.remove('user-status-clickable', 'user-status-anonymous', 'user-status-authenticated');
                userStatusElement.style.cursor = 'default';
                userStatusElement.dataset.identifier = '';
            }
            if (userStatusTooltip) {
                userStatusTooltip.textContent = '';
            }
        }
    }

    async _applyOnboardingState() {
        const app = this.app;
        const pendingEmail = await app._loadPendingVerificationEmail();
        if (pendingEmail) {
            app.pendingVerificationEmail = pendingEmail;
            app._showOnboardingScreen('verify');

            setTimeout(() => {
                if (app.domManager.elements.verifyEmail && app.pendingVerificationEmail) {
                    app.domManager.elements.verifyEmail.value = app.pendingVerificationEmail;
                }
                const descriptionElement = app.domManager.elements.verifyDescription;
                if (descriptionElement) {
                    if (app.pendingVerificationEmail) {
                        descriptionElement.textContent = app.localeManager.t(
                            'app.verify.description',
                            { email: app.pendingVerificationEmail }
                        );
                    } else {
                        descriptionElement.textContent = app.localeManager.t(
                            'app.verify.descriptionManual'
                        );
                    }
                }
            }, 100);
            return;
        }

        const completed = await app._loadOnboardingCompleted();
        if (!completed) {
            app._showOnboardingScreen('welcome');
        } else {
            app._showMain();
        }
    }

    _scheduleRecheckAuthAndShowScreen() {
        const app = this.app;
        if (app._recheckDebounceTimer !== null) {
            clearTimeout(app._recheckDebounceTimer);
        }
        app._recheckDebounceTimer = setTimeout(() => {
            app._recheckDebounceTimer = null;
            app._recheckAuthAndShowScreen();
        }, app._recheckDebounceMs);
    }

    async _recheckAuthAndShowScreen() {
        const app = this.app;
        try {
            const overlay = app.domManager.elements.onboardingOverlay;
            const main = app.domManager.elements.appMain;
            const login = app.domManager.elements.loginScreen;
            const register = app.domManager.elements.registerScreen;
            const verify = app.domManager.elements.verifyScreen;
            const resend = app.domManager.elements.resendScreen;
            const isOverlayVisible = overlay && overlay.style.display !== 'none' &&
                window.getComputedStyle(overlay).display !== 'none';
            const isAuthFlowVisible = isOverlayVisible && login && register && verify &&
                (window.getComputedStyle(login).display !== 'none' ||
                 window.getComputedStyle(register).display !== 'none' ||
                 window.getComputedStyle(verify).display !== 'none' ||
                 (resend && window.getComputedStyle(resend).display !== 'none'));

            if (isAuthFlowVisible) {
                return;
            }

            const isMainVisible = main && window.getComputedStyle(main).display !== 'none';
            if (isMainVisible && !isOverlayVisible) {
                return;
            }

            let hasActiveSession = false;
            try {
                const authStatus = await app.serviceWorkerManager.sendMessage(
                    CONFIG.MESSAGE_TYPES.GET_AUTH_STATUS
                );
                hasActiveSession = Boolean(authStatus?.isAuthenticated || authStatus?.anonId);
            } catch (error) {
                app._logError({ key: 'logs.app.authStatusCheckError' }, error);
            }
            const onboardingCompleted = await app._loadOnboardingCompleted();
            if (!hasActiveSession && !onboardingCompleted) {
                app._showOnboardingScreen('welcome');
            } else if (hasActiveSession || onboardingCompleted) {
                app._showMain();
                app.localeManager.localizeDOM();
                if (hasActiveSession) {
                    await app.loadInitialStatus();
                }
            }
        } catch (error) {
            app._logError({ key: 'logs.app.localeChangeError' }, error);
        }
    }

    async _loadOnboardingCompleted() {
        const app = this.app;
        try {
            const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]);
            return Boolean(result[CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]);
        } catch (error) {
            app._logError({ key: 'logs.app.onboardingLoadError' }, error);
            return false;
        }
    }

    async _saveOnboardingCompleted(value) {
        const app = this.app;
        try {
            await chrome.storage.local.set({
                [CONFIG.STORAGE_KEYS.ONBOARDING_COMPLETED]: Boolean(value)
            });
            return true;
        } catch (error) {
            app._logError({ key: 'logs.app.onboardingSaveError' }, error);
            return false;
        }
    }

    async _loadPendingVerificationEmail() {
        const app = this.app;
        try {
            const result = await chrome.storage.local.get([CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]);
            const email = result[CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL];
            return email && email.trim() ? email.trim() : null;
        } catch (error) {
            app._logError({ key: 'logs.app.onboardingLoadError' }, error);
            return null;
        }
    }

    async _savePendingVerificationEmail(email) {
        const app = this.app;
        try {
            if (email && email.trim()) {
                await chrome.storage.local.set({
                    [CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]: email.trim()
                });
            } else {
                await chrome.storage.local.remove([CONFIG.STORAGE_KEYS.PENDING_VERIFICATION_EMAIL]);
            }
            return true;
        } catch (error) {
            app._logError({ key: 'logs.app.onboardingSaveError' }, error);
            return false;
        }
    }
}

module.exports = InitializationManager;
module.exports.default = InitializationManager;
