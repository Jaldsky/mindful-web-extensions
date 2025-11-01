/**
 * @jest-environment jsdom
 */

const UIManager = require('../../../src/managers/options/UIManager.js');
const { createBaseOptionsManager } = require('./options-test-helpers.js');

describe('UIManager', () => {
    const createEnvironment = () => {
        const manager = createBaseOptionsManager();
        const saveButton = document.createElement('button');
        const resetButton = document.createElement('button');

        manager.domManager.elements.saveBtn = saveButton;
        manager.domManager.elements.resetBtn = resetButton;
        manager.domManager.setButtonState.mockReturnValue(true);
        manager.domManager.getBackendUrlValue.mockReturnValue('https://api.test');
        manager.validationManager.validateBackendUrl.mockReturnValue({ isValid: true, value: 'https://api.test' });
        manager.storageManager.saveBackendUrl.mockResolvedValue(true);
        manager.storageManager.notifyBackgroundScript.mockResolvedValue(true);
        manager.storageManager.resetToDefault.mockResolvedValue('https://default');
        manager.domManager.setBackendUrlValue.mockReturnValue(true);
        manager.statusManager.showSuccess.mockReturnValue(true);
        manager.statusManager.showError.mockReturnValue(true);
        manager.statusManager.showWarning.mockReturnValue(true);
        manager.localeManager.t.mockImplementation((key) => ({
            'options.buttons.save': 'Save',
            'options.buttons.saving': 'Saving...',
            'options.status.settingsSaved': 'Saved',
            'options.buttons.reset': 'Reset',
            'options.buttons.resetting': 'Resetting...',
            'options.status.settingsReset': 'Reset ok',
            'options.status.resetError': 'Reset error',
            'options.status.saveFailed': 'Save failed',
            'options.status.saveError': 'Save error',
            'options.status.uiUpdateError': 'UI error'
        }[key] || key));

        return { manager, uiManager: new UIManager(manager) };
    };

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('saveSettings сохраняет URL и возвращает true при успехе', async () => {
        const { manager, uiManager } = createEnvironment();

        const result = await uiManager.saveSettings();

        expect(result).toBe(true);
        expect(manager.domManager.setButtonState).toHaveBeenCalledWith(manager.domManager.elements.saveBtn, 'Saving...', true);
        expect(manager.validationManager.validateBackendUrl).toHaveBeenCalledWith('https://api.test');
        expect(manager.storageManager.saveBackendUrl).toHaveBeenCalledWith('https://api.test');
        expect(manager.storageManager.notifyBackgroundScript).toHaveBeenCalledWith('https://api.test');
        expect(manager.statusManager.showSuccess).toHaveBeenCalledWith('Saved');
        expect(manager.domManager.setButtonState).toHaveBeenCalledWith(manager.domManager.elements.saveBtn, 'Save', false);
    });

    test('saveSettings возвращает false при ошибке валидации', async () => {
        const { manager, uiManager } = createEnvironment();
        manager.validationManager.validateBackendUrl.mockReturnValue({ isValid: false, error: 'Invalid' });

        const result = await uiManager.saveSettings();

        expect(result).toBe(false);
        expect(manager.statusManager.showError).toHaveBeenCalledWith('Invalid');
    });

    test('resetToDefault восстанавливает значения по умолчанию', async () => {
        const { manager, uiManager } = createEnvironment();

        const result = await uiManager.resetToDefault();

        expect(result).toBe(true);
        expect(manager.storageManager.resetToDefault).toHaveBeenCalled();
        expect(manager.domManager.setBackendUrlValue).toHaveBeenCalledWith('https://default');
        expect(manager.statusManager.showSuccess).toHaveBeenCalledWith('Reset ok');
        expect(manager.domManager.setButtonState).toHaveBeenCalledWith(manager.domManager.elements.resetBtn, 'Resetting...', true);
        expect(manager.domManager.setButtonState).toHaveBeenCalledWith(manager.domManager.elements.resetBtn, 'Reset', false);
    });
});
