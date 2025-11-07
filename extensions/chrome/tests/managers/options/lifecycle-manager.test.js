/**
 * @jest-environment jsdom
 */

const LifecycleManager = require('../../../src/managers/options/core/LifecycleManager.js');
const { createBaseOptionsManager } = require('./options-test-helpers.js');

describe('LifecycleManager', () => {
    const setupEnvironment = () => {
        document.body.innerHTML = `
            <button id="languageToggle"></button>
            <button id="themeToggle"></button>
        `;

        const manager = createBaseOptionsManager();
        manager.isInitialized = true;
        manager.logsManager = {
            stopAutoRefresh: jest.fn()
        };
        manager.domManager.elements.settingsForm = { removeEventListener: jest.fn() };
        manager.eventHandlers.set('settingsForm', jest.fn());
        manager.eventHandlers.set('languageToggle', jest.fn());
        manager.eventHandlers.set('themeToggle', jest.fn());

        return { manager, lifecycleManager: new LifecycleManager(manager) };
    };

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('destroy освобождает ресурсы и сбрасывает флаг инициализации', () => {
        const { manager, lifecycleManager } = setupEnvironment();
        const {
            diagnosticsManager,
            serviceWorkerManager,
            notificationManager,
            validationManager,
            statusManager,
            storageManager,
            domManager,
            localeManager
        } = manager;

        const result = lifecycleManager.destroy();

        expect(result).toBe(true);
        expect(manager.logsManager.stopAutoRefresh).toHaveBeenCalled();
        expect(domManager.elements.settingsForm.removeEventListener).toHaveBeenCalled();
        expect(diagnosticsManager.destroy).toHaveBeenCalled();
        expect(serviceWorkerManager.destroy).toHaveBeenCalled();
        expect(notificationManager.destroy).toHaveBeenCalled();
        expect(validationManager.destroy).toHaveBeenCalled();
        expect(statusManager.destroy).toHaveBeenCalled();
        expect(storageManager.destroy).toHaveBeenCalled();
        expect(domManager.destroy).toHaveBeenCalled();
        expect(localeManager.destroy).toHaveBeenCalled();
        expect(manager.eventHandlers.size).toBe(0);
        expect(manager.isInitialized).toBe(false);
    });

    test('destroy возвращает false, если менеджер уже уничтожен', () => {
        const { manager, lifecycleManager } = setupEnvironment();
        manager.isInitialized = false;

        const result = lifecycleManager.destroy();

        expect(result).toBe(false);
        expect(manager.logsManager.stopAutoRefresh).not.toHaveBeenCalled();
    });
});
