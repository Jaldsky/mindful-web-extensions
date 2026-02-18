const CONFIG = require('../../../config/config.js');

/**
 * Управляет отображением экранов и анимациями в app.
 *
 * @class DisplayManager
 */
class DisplayManager {
    /**
     * @param {import('../AppManager.js')} appManager
     */
    constructor(appManager) {
        this.app = appManager;
    }

    _revealApp() {
        if (typeof document === 'undefined' || !document.body) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                document.body.classList.remove('app-loading');
            });
        });
    }

    _animateChildren(container, childRootSelector, startDelay = 0) {
        if (!container || !childRootSelector) return;
        const root = container.querySelector(childRootSelector);
        if (!root) return;

        const children = Array.from(root.children).filter((el) => el.nodeType === Node.ELEMENT_NODE);
        if (children.length === 0) return;

        children.forEach((child) => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            child.style.transition = 'none';
            child.style.animation = 'none';
        });
        // eslint-disable-next-line no-unused-expressions
        root.offsetHeight;

        children.forEach((child, index) => {
            setTimeout(() => {
                child.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, startDelay + 100 + (index * 80));
        });

        const clearAfter = startDelay + 100 + (children.length * 80) + 700;
        setTimeout(() => {
            children.forEach((child) => {
                child.style.opacity = '';
                child.style.transform = '';
                child.style.transition = '';
                child.style.animation = '';
            });
        }, clearAfter);
    }

    _animateFormChildren(container, startDelay = 0) {
        const app = this.app;
        app._animateChildren(container, '.auth-form', startDelay);
    }

    _animateMainChildren() {
        const app = this.app;
        const main = app.domManager.elements.appMain;
        if (!main) return;
        const layout = main.querySelector('.app-main-layout');
        if (!layout) return;
        app._animateChildren(main, '.app-main-layout', 0);
    }

    _pinMainForTransition(main, zIndex = '1050') {
        if (!main) return;
        main.style.position = 'absolute';
        main.style.inset = '0';
        main.style.width = '100%';
        main.style.zIndex = zIndex;
    }

    _unpinMainAfterTransition(main) {
        if (!main) return;
        main.style.position = '';
        main.style.inset = '';
        main.style.width = '';
        main.style.zIndex = '';
    }

    _showOnboardingScreen(screen) {
        const app = this.app;
        const overlay = app.domManager.elements.onboardingOverlay;
        const main = app.domManager.elements.appMain;
        const loginContainer = app.domManager.elements.loginContainer;
        const mainModal = main ? main.querySelector('.app-main-modal') : null;
        const onboardingModal = overlay ? overlay.querySelector('.app-onboarding-modal') : null;
        const welcome = app.domManager.elements.welcomeScreen;
        const login = app.domManager.elements.loginScreen;
        const register = app.domManager.elements.registerScreen;
        const verify = app.domManager.elements.verifyScreen;
        const resend = app.domManager.elements.resendScreen;

        const isMainMenuVisible = main && main.style.display !== 'none' &&
            window.getComputedStyle(main).display !== 'none';

        if (loginContainer) loginContainer.style.display = 'none';

        if (isMainMenuVisible && main && overlay) {
            app._cameFromMainMenu = true;
            const fromMainHeight = mainModal ? Math.round(mainModal.offsetHeight) : null;
            if (welcome) welcome.style.display = 'none';
            if (login) login.style.display = 'none';
            if (register) register.style.display = 'none';
            if (verify) verify.style.display = 'none';
            if (resend) resend.style.display = 'none';

            overlay.style.display = 'flex';
            if (fromMainHeight && onboardingModal) {
                onboardingModal.style.height = `${fromMainHeight}px`;
                onboardingModal.classList.add('modal-height-transition');
                // eslint-disable-next-line no-unused-expressions
                onboardingModal.offsetHeight;
            }
            app._showScreenInOverlay(screen, welcome, login, register, verify, resend);

            requestAnimationFrame(() => {
                main.style.display = 'none';
                app._unpinMainAfterTransition(main);
            });
        } else {
            app._cameFromMainMenu = false;

            const isOverlayVisible = overlay && overlay.style.display !== 'none' &&
                window.getComputedStyle(overlay).display !== 'none';

            if (!isOverlayVisible) {
                if (welcome) welcome.style.display = 'none';
                if (login) login.style.display = 'none';
                if (register) register.style.display = 'none';
                if (verify) verify.style.display = 'none';
                if (resend) resend.style.display = 'none';
            }

            if (overlay) overlay.style.display = 'flex';
            if (main) main.style.display = 'none';
            app._unpinMainAfterTransition(main);
            app._showScreenInOverlay(screen, welcome, login, register, verify, resend);
        }
    }

    _showScreenInOverlay(screen, welcome, login, register, verify, resend) {
        const app = this.app;
        const modal = document.querySelector('.app-onboarding-modal');
        const skipModalHeightAnimation = false;

        let currentScreen = null;
        const checkVisibility = (element) => {
            if (!element) return false;
            if (element.style.display === 'none') return false;
            const style = window.getComputedStyle(element);
            return style.display !== 'none';
        };

        if (checkVisibility(welcome)) {
            currentScreen = 'welcome';
        } else if (checkVisibility(login)) {
            currentScreen = 'login';
        } else if (checkVisibility(register)) {
            currentScreen = 'register';
        } else if (checkVisibility(verify)) {
            currentScreen = 'verify';
        } else if (resend && checkVisibility(resend)) {
            currentScreen = 'resend';
        }

        const currentElement = currentScreen === 'welcome'
            ? welcome
            : currentScreen === 'login'
                ? login
                : currentScreen === 'register'
                    ? register
                    : currentScreen === 'verify'
                        ? verify
                        : currentScreen === 'resend'
                            ? resend
                            : null;
        const targetElement = screen === 'welcome'
            ? welcome
            : screen === 'login'
                ? login
                : screen === 'register'
                    ? register
                    : screen === 'verify'
                        ? verify
                        : screen === 'resend'
                            ? resend
                            : null;

        if (!currentScreen && targetElement) {
            if (welcome) welcome.style.display = 'none';
            if (login) login.style.display = 'none';
            if (register) register.style.display = 'none';
            if (verify) verify.style.display = 'none';
            if (resend) resend.style.display = 'none';

            targetElement.style.display = 'block';
            const formForAnimation = targetElement.querySelector('.auth-form');
            if (formForAnimation) {
                const initialChildren = Array.from(formForAnimation.children).filter((el) => el.nodeType === Node.ELEMENT_NODE);
                initialChildren.forEach((child) => {
                    child.style.opacity = '0';
                    child.style.transform = 'translateY(20px)';
                    child.style.transition = 'none';
                    child.style.animation = 'none';
                });
            }

            // eslint-disable-next-line no-unused-expressions
            targetElement.offsetHeight;

            if (modal && !skipModalHeightAnimation && targetElement) {
                const contentHeight = Math.round(targetElement.offsetHeight);
                const style = window.getComputedStyle(modal);
                const padTop = parseFloat(style.paddingTop) || 0;
                const padBottom = parseFloat(style.paddingBottom) || 0;
                const targetHeight = Math.round(contentHeight + padTop + padBottom);
                modal.style.height = `${targetHeight}px`;
            }

            requestAnimationFrame(() => {
                if (targetElement) {
                    targetElement.classList.remove('fade-in', 'fade-out', 'fade-out-down');
                    targetElement.style.transform = 'scale(0.98)';
                    targetElement.style.opacity = '0';
                    // eslint-disable-next-line no-unused-expressions
                    targetElement.offsetWidth;
                    targetElement.style.transform = '';
                    targetElement.style.opacity = '';
                    targetElement.classList.add('fade-in');

                    app.localeManager.localizeDOM(targetElement);
                    if (screen === 'verify') {
                        const email = app.pendingVerificationEmail ||
                            app.domManager.elements.verifyEmail?.value?.trim() || '';
                        if (email && app.domManager.elements.verifyEmail) {
                            app.domManager.elements.verifyEmail.value = email;
                        }
                        const descriptionElement = app.domManager.elements.verifyDescription;
                        if (descriptionElement) {
                            if (email) {
                                descriptionElement.textContent = app.localeManager.t(
                                    'app.verify.description',
                                    { email: email }
                                );
                            } else {
                                descriptionElement.textContent = app.localeManager.t(
                                    'app.verify.descriptionManual'
                                );
                            }
                        }
                    }
                    if (screen === 'resend') {
                        if (app.domManager.elements.resendEmail) {
                            const email = app.pendingVerificationEmail ||
                                app.domManager.elements.verifyEmail?.value?.trim() || '';
                            app.domManager.elements.resendEmail.value = email;
                        }
                        if (app.domManager.elements.resendEmailError) {
                            app.domManager.elements.resendEmailError.textContent = '';
                        }
                    }
                    app._animateFormChildren(targetElement, 0);
                    if (modal && !skipModalHeightAnimation) {
                        setTimeout(() => {
                            const finalHeight = Math.round(modal.scrollHeight);
                            modal.style.height = `${finalHeight}px`;
                            modal.classList.remove('modal-height-transition');
                            modal.style.height = '';
                        }, 400);
                    }
                }
            });
            return;
        }

        const screenOrder = { welcome: 0, login: 1, register: 2, verify: 3, resend: 4 };
        const isBackward = currentScreen && screenOrder[currentScreen] > screenOrder[screen];

        if (currentElement && targetElement && currentElement !== targetElement) {
            let currentHeight;
            if (modal) {
                currentHeight = Math.round(modal.offsetHeight);
            }

            if (currentElement) {
                currentElement.style.display = 'none';
            }
            targetElement.style.display = 'block';
            targetElement.style.opacity = '0';
            // eslint-disable-next-line no-unused-expressions
            targetElement.offsetHeight;

            let targetHeight;
            if (modal) {
                const contentHeight = Math.round(targetElement.offsetHeight);
                const style = window.getComputedStyle(modal);
                const padTop = parseFloat(style.paddingTop) || 0;
                const padBottom = parseFloat(style.paddingBottom) || 0;
                targetHeight = Math.round(contentHeight + padTop + padBottom);
            } else {
                targetHeight = Math.round(targetElement.offsetHeight);
            }

            if (currentElement) {
                currentElement.style.display = 'block';
            }
            targetElement.style.display = 'none';
            targetElement.style.opacity = '';

            if (modal && !skipModalHeightAnimation) {
                modal.style.height = `${currentHeight}px`;
                modal.classList.add('modal-height-transition');
                // eslint-disable-next-line no-unused-expressions
                modal.offsetHeight;
            }

            if (welcome) {
                welcome.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (login) {
                login.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (register) {
                register.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (verify) {
                verify.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }
            if (resend) {
                resend.classList.remove('fade-in', 'fade-out', 'fade-out-down');
            }

            if (isBackward) {
                currentElement.classList.add('fade-out-down');
            } else {
                currentElement.classList.add('fade-out');
            }

            setTimeout(() => {
                if (welcome) welcome.style.display = 'none';
                if (login) login.style.display = 'none';
                if (register) register.style.display = 'none';
                if (verify) verify.style.display = 'none';
                if (resend) resend.style.display = 'none';

                currentElement.classList.remove('fade-out', 'fade-out-down');

                if (modal && !skipModalHeightAnimation) {
                    modal.style.height = `${targetHeight}px`;
                }

                if (targetElement) {
                    const formForAnimation = targetElement.querySelector('.auth-form');
                    if (formForAnimation) {
                        const childrenToAnimate = Array.from(formForAnimation.children).filter((el) => el.nodeType === Node.ELEMENT_NODE);
                        childrenToAnimate.forEach((child) => {
                            child.style.opacity = '0';
                            child.style.transform = 'translateY(20px)';
                            child.style.transition = 'none';
                            child.style.animation = 'none';
                        });
                    }

                    targetElement.style.display = 'block';
                    targetElement.style.transform = 'scale(0.98)';
                    targetElement.style.opacity = '0';

                    // eslint-disable-next-line no-unused-expressions
                    targetElement.offsetWidth;

                    targetElement.style.transform = '';
                    targetElement.style.opacity = '';
                    targetElement.classList.add('fade-in');

                    app.localeManager.localizeDOM(targetElement);
                    if (screen === 'verify') {
                        const email = app.pendingVerificationEmail ||
                            app.domManager.elements.verifyEmail?.value?.trim() || '';
                        if (email && app.domManager.elements.verifyEmail) {
                            app.domManager.elements.verifyEmail.value = email;
                        }
                        const descriptionElement = app.domManager.elements.verifyDescription;
                        if (descriptionElement) {
                            if (email) {
                                descriptionElement.textContent = app.localeManager.t(
                                    'app.verify.description',
                                    { email: email }
                                );
                            } else {
                                descriptionElement.textContent = app.localeManager.t(
                                    'app.verify.descriptionManual'
                                );
                            }
                        }
                    }
                    if (screen === 'resend') {
                        if (app.domManager.elements.resendEmail) {
                            const email = app.pendingVerificationEmail ||
                                app.domManager.elements.verifyEmail?.value?.trim() || '';
                            app.domManager.elements.resendEmail.value = email;
                        }
                        if (app.domManager.elements.resendEmailError) {
                            app.domManager.elements.resendEmailError.textContent = '';
                        }
                    }
                    app._animateFormChildren(targetElement, 0);
                }

                if (modal && !skipModalHeightAnimation) {
                    setTimeout(() => {
                        const finalHeight = Math.round(modal.scrollHeight);
                        modal.style.height = `${finalHeight}px`;
                        modal.classList.remove('modal-height-transition');
                    }, 400);
                }
            }, 400);
        } else {
            const shownElement = screen === 'welcome'
                ? welcome
                : screen === 'login'
                    ? login
                    : screen === 'register'
                        ? register
                        : screen === 'verify'
                            ? verify
                            : screen === 'resend'
                                ? resend
                                : null;
            if (shownElement) {
                const formForAnimation = shownElement.querySelector('.auth-form');
                if (formForAnimation) {
                    const initialChildren = Array.from(formForAnimation.children).filter((el) => el.nodeType === Node.ELEMENT_NODE);
                    initialChildren.forEach((child) => {
                        child.style.opacity = '0';
                        child.style.transform = 'translateY(20px)';
                        child.style.transition = 'none';
                        child.style.animation = 'none';
                    });
                }
            }
            if (welcome) welcome.style.display = screen === 'welcome' ? 'block' : 'none';
            if (login) login.style.display = screen === 'login' ? 'block' : 'none';
            if (register) register.style.display = screen === 'register' ? 'block' : 'none';
            if (verify) verify.style.display = screen === 'verify' ? 'block' : 'none';
            if (resend) resend.style.display = screen === 'resend' ? 'block' : 'none';

            if (shownElement) {
                app.localeManager.localizeDOM(shownElement);
                if (screen === 'verify') {
                    const email = app.pendingVerificationEmail ||
                        app.domManager.elements.verifyEmail?.value?.trim() || '';
                    if (email && app.domManager.elements.verifyEmail) {
                        app.domManager.elements.verifyEmail.value = email;
                    }
                    const descriptionElement = app.domManager.elements.verifyDescription;
                    if (descriptionElement) {
                        if (email) {
                            descriptionElement.textContent = app.localeManager.t(
                                'app.verify.description',
                                { email: email }
                            );
                        } else {
                            descriptionElement.textContent = app.localeManager.t(
                                'app.verify.descriptionManual'
                            );
                        }
                    }
                }
                if (screen === 'resend') {
                    if (app.domManager.elements.resendEmail) {
                        const email = app.pendingVerificationEmail ||
                            app.domManager.elements.verifyEmail?.value?.trim() || '';
                        app.domManager.elements.resendEmail.value = email;
                    }
                    if (app.domManager.elements.resendEmailError) {
                        app.domManager.elements.resendEmailError.textContent = '';
                    }
                }
                app._animateFormChildren(shownElement, 0);
            }
        }
    }

    _showMain() {
        const app = this.app;
        const overlay = app.domManager.elements.onboardingOverlay;
        const main = app.domManager.elements.appMain;
        const loginContainer = app.domManager.elements.loginContainer;
        const mainModal = main ? main.querySelector('.app-main-modal') : null;
        const mainCard = mainModal ? mainModal.querySelector('.auth-card') : null;
        const onboardingModal = overlay ? overlay.querySelector('.app-onboarding-modal') : null;
        const welcome = app.domManager.elements.welcomeScreen;
        const login = app.domManager.elements.loginScreen;
        const register = app.domManager.elements.registerScreen;
        const verify = app.domManager.elements.verifyScreen;
        const resend = app.domManager.elements.resendScreen;

        const isOverlayVisible = overlay && overlay.style.display !== 'none' &&
            window.getComputedStyle(overlay).display !== 'none';

        if (isOverlayVisible && overlay && main) {
            const elementToShow = mainCard || mainModal || main;
            const overlayScreens = [welcome, login, register, verify, resend].filter(Boolean);
            const getVisibleScreen = () => overlayScreens.find((screenEl) => {
                if (!screenEl) return false;
                if (screenEl.style.display === 'none') return false;
                return window.getComputedStyle(screenEl).display !== 'none';
            });

            const currentOverlayScreen = getVisibleScreen();
            const overlayModalHeight = (onboardingModal && overlay && window.getComputedStyle(overlay).display !== 'none')
                ? Math.round(onboardingModal.offsetHeight)
                : 0;

            const showMainWithAuthAnimation = (fromHeight) => {
                const startHeight = (fromHeight != null && fromHeight > 0) ? fromHeight : overlayModalHeight;
                main.style.display = 'flex';
                app._pinMainForTransition(main, '1050');

                if (mainModal && startHeight > 0) {
                    mainModal.style.height = 'auto';
                    const toHeight = Math.round(mainModal.scrollHeight);
                    if (Number.isFinite(toHeight) && toHeight > 0) {
                        mainModal.style.height = `${startHeight}px`;
                        mainModal.style.transition = 'height 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)';
                        // eslint-disable-next-line no-unused-expressions
                        mainModal.offsetHeight;
                        mainModal.style.height = `${toHeight}px`;
                        setTimeout(() => {
                            mainModal.style.transition = '';
                            mainModal.style.height = '';
                        }, 420);
                    } else {
                        mainModal.style.height = '';
                        mainModal.style.transition = '';
                    }
                }

                elementToShow.classList.remove('fade-in', 'fade-out', 'fade-out-down');
                elementToShow.style.transform = 'scale(0.98)';
                elementToShow.style.opacity = '0';

                // eslint-disable-next-line no-unused-expressions
                elementToShow.offsetWidth;

                elementToShow.style.transform = '';
                elementToShow.style.opacity = '';
                elementToShow.classList.add('fade-in');
                app._animateMainChildren();
            };

            if (currentOverlayScreen) {
                const fromHeight = onboardingModal ? Math.round(onboardingModal.offsetHeight) : 0;
                currentOverlayScreen.classList.remove('fade-in', 'fade-out', 'fade-out-down');
                currentOverlayScreen.classList.add('fade-out');

                setTimeout(() => {
                    currentOverlayScreen.classList.remove('fade-out');
                    overlayScreens.forEach((screenEl) => {
                        screenEl.style.display = 'none';
                    });
                    overlay.style.display = 'none';
                    if (loginContainer) loginContainer.style.display = 'none';
                    showMainWithAuthAnimation(fromHeight);
                    app._unpinMainAfterTransition(main);
                }, 400);
            } else {
                showMainWithAuthAnimation(overlayModalHeight);
                overlay.style.display = 'none';
                if (loginContainer) loginContainer.style.display = 'none';
                app._unpinMainAfterTransition(main);
            }
        } else {
            if (overlay) overlay.style.display = 'none';
            if (loginContainer) loginContainer.style.display = 'none';

            if (main) {
                app._unpinMainAfterTransition(main);
                if (mainModal) {
                    mainModal.classList.remove('fade-in', 'fade-out', 'fade-out-down');
                } else {
                    main.classList.remove('fade-in', 'fade-out', 'fade-out-down');
                }

                main.style.display = 'flex';

                const elementToShow = mainCard || mainModal || main;

                elementToShow.style.transform = 'scale(0.98)';
                elementToShow.style.opacity = '0';

                // eslint-disable-next-line no-unused-expressions
                elementToShow.offsetWidth;

                elementToShow.style.transform = '';
                elementToShow.style.opacity = '';
                elementToShow.classList.add('fade-in');
                app._animateMainChildren();
            }
        }
    }

    onLocaleChange() {
        const app = this.app;
        try {
            app.localeManager.localizeDOM();
            app.domManager.refreshStatuses();
            app._updateThemeLocaleToggleIcons();

            app._log({ key: 'logs.app.localeChanged' }, {
                locale: app.localeManager.getCurrentLocale()
            });
        } catch (error) {
            app._logError({ key: 'logs.app.localeChangeError' }, error);
        }
    }

    _setLegalLinksUrls() {
        const app = this.app;
        try {
            if (typeof document === 'undefined' || !CONFIG.APP) return;
            const termsUrl = CONFIG.APP.TERMS_URL;
            const privacyUrl = CONFIG.APP.PRIVACY_URL;
            const analyticsUrl = CONFIG.APP.BASE_URL;
            document.querySelectorAll('.app-legal-terms').forEach((el) => {
                if (el.tagName === 'A') el.href = termsUrl;
            });
            document.querySelectorAll('.app-legal-privacy').forEach((el) => {
                if (el.tagName === 'A') el.href = privacyUrl;
            });
            document.querySelectorAll('.app-analytics-link').forEach((el) => {
                if (el.tagName === 'A') el.href = analyticsUrl;
            });
        } catch (error) {
            app._logError({ key: 'logs.app.localeChangeError' }, error);
        }
    }

    _updateThemeLocaleToggleIcons() {
        const app = this.app;
        try {
            const themeIcon = document.getElementById('appThemeIcon');
            const localeIcon = document.getElementById('appLocaleIcon');
            if (themeIcon && app.themeManager) {
                const theme = app.themeManager.getCurrentTheme();
                const isDark = theme === CONFIG.THEME.THEMES.DARK;
                themeIcon.textContent = isDark ? '🌙' : '☀️';
                themeIcon.classList.toggle('app-theme-icon-moon', isDark);
            }
            if (localeIcon && app.localeManager) {
                const locale = app.localeManager.getCurrentLocale();
                localeIcon.textContent = locale === 'ru' ? '🇷🇺' : '🇺🇸';
            }
        } catch (error) {
            app._logError({ key: 'logs.app.localeChangeError' }, error);
        }
    }
}

module.exports = DisplayManager;
module.exports.default = DisplayManager;
