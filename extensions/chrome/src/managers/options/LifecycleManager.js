class LifecycleManager {
    constructor(manager) {
        this.manager = manager;
    }

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
            manager._log('Обработчики событий удалены');
        } catch (error) {
            manager._logError('Ошибка удаления обработчиков событий', error);
        }
    }

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

            manager._log('Все менеджеры уничтожены');
        } catch (error) {
            manager._logError('Ошибка уничтожения менеджеров', error);
        }
    }

    destroy() {
        const manager = this.manager;

        if (!manager.isInitialized) {
            manager._log('OptionsManager уже был уничтожен');
            return false;
        }

        manager._log('Очистка ресурсов OptionsManager');

        try {
            manager.logsManager.stopAutoRefresh();

            this.removeEventHandlers();
            this.destroyManagers();

            manager.isInitialized = false;
            manager._log('OptionsManager уничтожен');
        } catch (error) {
            manager._logError('Ошибка при уничтожении OptionsManager', error);
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
