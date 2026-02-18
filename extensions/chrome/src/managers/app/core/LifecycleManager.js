/**
 * Управляет жизненным циклом AppManager.
 *
 * @class LifecycleManager
 */
class LifecycleManager {
    /**
     * @param {import('../AppManager.js')} appManager
     */
    constructor(appManager) {
        this.app = appManager;
    }

    startPeriodicUpdates() {
        const app = this.app;
        if (app.updateInterval) {
            app._log({ key: 'logs.app.periodicUpdatesAlreadyStarted' });
            return;
        }

        app._log({ key: 'logs.app.periodicUpdatesStart' });

        app.updateInterval = setInterval(async () => {
            try {
                await app.loadInitialStatus();
            } catch (error) {
                app._logError({ key: 'logs.app.periodicUpdatesError' }, error);
            }
        }, app.CONSTANTS.UPDATE_INTERVAL);
    }

    _stopPeriodicUpdates() {
        const app = this.app;
        if (app.updateInterval) {
            clearInterval(app.updateInterval);
            app.updateInterval = null;
            app._log({ key: 'logs.app.periodicUpdatesStopped' });
        }
    }

    destroy() {
        const app = this.app;
        if (!app.isInitialized) {
            app._log({ key: 'logs.app.alreadyDestroyed' });
            return;
        }

        app._log({ key: 'logs.app.destroyStart' });

        try {
            app._stopPeriodicUpdates();
            app._removeEventHandlers();
            if (app._recheckDebounceTimer !== null) {
                clearTimeout(app._recheckDebounceTimer);
                app._recheckDebounceTimer = null;
            }
            if (app._storageListener && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.removeListener(app._storageListener);
                app._storageListener = null;
            }
            if (app._visibilityHandler && typeof document !== 'undefined' && document.removeEventListener) {
                document.removeEventListener('visibilitychange', app._visibilityHandler);
                app._visibilityHandler = null;
            }
            app._destroyManagers();

            app.isInitialized = false;
            app._log({ key: 'logs.app.destroyed' });
        } catch (error) {
            app._logError({ key: 'logs.app.destroyError' }, error);
        }
    }

    _removeEventHandlers() {
        const app = this.app;
        try {
            app.eventHandlers.forEach((handler, key) => {
                let element;

                if (key === 'userStatus') {
                    element = document.getElementById('userStatus');
                } else {
                    element = app.domManager.elements[key];
                }

                if (element && handler) {
                    element.removeEventListener('click', handler);
                }
            });

            app.eventHandlers.clear();
            app._log({ key: 'logs.app.eventHandlersRemoved' });
        } catch (error) {
            app._logError({ key: 'logs.app.eventHandlersRemoveError' }, error);
        }
    }

    _destroyManagers() {
        const app = this.app;
        try {
            if (app.diagnosticsManager) {
                app.diagnosticsManager.destroy();
                app.diagnosticsManager = null;
            }

            if (app.serviceWorkerManager) {
                app.serviceWorkerManager.destroy();
                app.serviceWorkerManager = null;
            }

            if (app.notificationManager) {
                app.notificationManager.destroy();
                app.notificationManager = null;
            }

            if (app.domManager) {
                app.domManager.destroy();
                app.domManager = null;
            }

            if (app.localeManager) {
                app.localeManager.destroy();
                app.localeManager = null;
            }

            app._log({ key: 'logs.app.managersDestroyed' });
        } catch (error) {
            app._logError({ key: 'logs.app.managersDestroyError' }, error);
        }
    }
}

module.exports = LifecycleManager;
module.exports.default = LifecycleManager;
