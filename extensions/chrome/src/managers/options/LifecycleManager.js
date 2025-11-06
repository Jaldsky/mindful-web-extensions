/**
 * Менеджер для управления жизненным циклом OptionsManager.
 * Отвечает за уничтожение менеджеров, удаление обработчиков событий и очистку ресурсов.
 * 
 * @class LifecycleManager
 */
class LifecycleManager {
    /**
     * Создает экземпляр LifecycleManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Удаляет все обработчики событий.
     * 
     * @returns {void}
     */
    removeEventHandlers() {
        const manager = this.manager;

        try {
            manager.eventHandlers.forEach((handler, key) => {
                let element = manager.domManager.elements[key];

                if (!element && (key === 'languageToggle' || key === 'themeToggle')) {
                    element = document.getElementById(key);
                }

                if (element && handler) {
                    const eventType = key === 'settingsForm' ? 'submit' : 'click';
                    element.removeEventListener(eventType, handler);
                }
            });

            manager.eventHandlers.clear();
            manager._log({ key: 'logs.lifecycle.eventHandlersRemoved' });
        } catch (error) {
            manager._logError({ key: 'logs.lifecycle.removeEventHandlersError' }, error);
        }
    }

    /**
     * Уничтожает все менеджеры.
     * 
     * @returns {void}
     */
    destroyManagers() {
        const manager = this.manager;

        try {
            if (manager.diagnosticsManager) {
                manager.diagnosticsManager.destroy();
                manager.diagnosticsManager = null;
            }

            if (manager.serviceWorkerManager) {
                manager.serviceWorkerManager.destroy();
                manager.serviceWorkerManager = null;
            }

            if (manager.notificationManager) {
                manager.notificationManager.destroy();
                manager.notificationManager = null;
            }

            if (manager.validationManager) {
                manager.validationManager.destroy();
                manager.validationManager = null;
            }

            if (manager.statusManager) {
                manager.statusManager.destroy();
                manager.statusManager = null;
            }

            if (manager.storageManager) {
                manager.storageManager.destroy();
                manager.storageManager = null;
            }

            if (manager.domManager) {
                manager.domManager.destroy();
                manager.domManager = null;
            }

            if (manager.localeManager) {
                manager.localeManager.destroy();
                manager.localeManager = null;
            }

            manager._log({ key: 'logs.lifecycle.managersDestroyed' });
        } catch (error) {
            manager._logError({ key: 'logs.lifecycle.destroyManagersError' }, error);
        }
    }

    /**
     * Уничтожает OptionsManager и очищает все ресурсы.
     * 
     * @returns {boolean} true если уничтожение успешно, false если уже было уничтожено
     */
    destroy() {
        const manager = this.manager;

        if (!manager.isInitialized) {
            manager._log({ key: 'logs.lifecycle.alreadyDestroyed' });
            return false;
        }

        manager._log({ key: 'logs.lifecycle.destroyStart' });

        try {
            manager.logsManager.stopAutoRefresh();

            this.removeEventHandlers();
            this.destroyManagers();

            manager.isInitialized = false;
            manager._log({ key: 'logs.lifecycle.destroyed' });
        } catch (error) {
            manager._logError({ key: 'logs.lifecycle.destroyError' }, error);
        }

        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LifecycleManager;
    module.exports.default = LifecycleManager;
}

if (typeof window !== 'undefined') {
    window.LifecycleManager = LifecycleManager;
}
