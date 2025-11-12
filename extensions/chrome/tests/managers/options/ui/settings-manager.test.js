/**
 * @jest-environment jsdom
 */

const SettingsManager = require('../../../../src/managers/options/ui/SettingsManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('SettingsManager', () => {
    let manager;
    let settingsManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        settingsManager = new SettingsManager(manager);
        
        document.body.innerHTML = `
            <button id="saveBtn">Save</button>
            <button id="resetBtn">Reset</button>
            <input id="backendUrl" />
        `;
        
        manager.domManager.elements.saveBtn = document.getElementById('saveBtn');
        manager.domManager.elements.resetBtn = document.getElementById('resetBtn');
        manager.domManager.elements.backendUrl = document.getElementById('backendUrl');
        
        manager.domManager.setButtonState = jest.fn().mockReturnValue(true);
        manager.domManager.getBackendUrlValue = jest.fn().mockReturnValue('https://api.test');
        manager.domManager.setBackendUrlValue = jest.fn().mockReturnValue(true);
        
        manager.validationManager.validateBackendUrl = jest.fn().mockReturnValue({
            isValid: true,
            value: 'https://api.test'
        });
        
        manager.storageManager.saveBackendUrl = jest.fn().mockResolvedValue(true);
        manager.storageManager.saveDomainExceptions = jest.fn().mockResolvedValue(true);
        manager.storageManager.notifyBackgroundScript = jest.fn().mockResolvedValue(true);
        manager.storageManager.notifyDomainExceptionsUpdate = jest.fn().mockResolvedValue(true);
        manager.storageManager.resetToDefault = jest.fn().mockResolvedValue('https://default');
        
        manager.statusManager.showError = jest.fn();
        manager.statusManager.showSuccess = jest.fn();
        
        manager.uiManager = {
            getDomainExceptions: jest.fn().mockReturnValue([]),
            setDomainExceptions: jest.fn()
        };
        
        manager.localeManager.t = jest.fn((key) => {
            const translations = {
                'options.buttons.save': 'Save',
                'options.buttons.saving': 'Saving...',
                'options.buttons.reset': 'Reset',
                'options.buttons.resetting': 'Resetting...',
                'options.status.saveFailed': 'Save failed',
                'options.status.saveError': 'Save error',
                'options.status.resetError': 'Reset error',
                'options.status.uiUpdateError': 'UI error'
            };
            return translations[key] || key;
        });
        
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('constructor', () => {
        test('инициализирует с пустым Map для таймеров', () => {
            expect(settingsManager.buttonFeedbackTimers).toBeInstanceOf(Map);
            expect(settingsManager.buttonFeedbackTimers.size).toBe(0);
        });
    });

    describe('saveSettings', () => {
        test('сохраняет настройки успешно', async () => {
            const result = await settingsManager.saveSettings();
            
            expect(result).toBe(true);
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(
                manager.domManager.elements.saveBtn,
                'Saving...',
                true
            );
            expect(manager.validationManager.validateBackendUrl).toHaveBeenCalledWith('https://api.test');
            expect(manager.storageManager.saveBackendUrl).toHaveBeenCalledWith('https://api.test');
            expect(manager.storageManager.saveDomainExceptions).toHaveBeenCalled();
            expect(manager.storageManager.notifyBackgroundScript).toHaveBeenCalled();
            expect(manager.storageManager.notifyDomainExceptionsUpdate).toHaveBeenCalled();
        });

        test('возвращает false при ошибке валидации', async () => {
            manager.validationManager.validateBackendUrl.mockReturnValue({
                isValid: false,
                error: 'Invalid URL'
            });
            
            const result = await settingsManager.saveSettings();
            
            expect(result).toBe(false);
            expect(manager.statusManager.showError).toHaveBeenCalledWith('Invalid URL');
            expect(manager.storageManager.saveBackendUrl).not.toHaveBeenCalled();
        });

        test('показывает ошибку валидации в input', async () => {
            const input = document.getElementById('backendUrl');
            input.setCustomValidity = jest.fn();
            input.reportValidity = jest.fn();
            
            manager.validationManager.validateBackendUrl.mockReturnValue({
                isValid: false,
                error: 'Invalid URL'
            });
            
            await settingsManager.saveSettings();
            
            expect(input.setCustomValidity).toHaveBeenCalledWith('Invalid URL');
            expect(input.reportValidity).toHaveBeenCalled();
        });

        test('возвращает false если не удалось получить URL', async () => {
            manager.domManager.getBackendUrlValue.mockReturnValue(null);
            
            const result = await settingsManager.saveSettings();
            
            expect(result).toBe(false);
            expect(manager._logError).toHaveBeenCalled();
        });

        test('возвращает false если сохранение URL не удалось', async () => {
            manager.storageManager.saveBackendUrl.mockResolvedValue(false);
            
            const result = await settingsManager.saveSettings();
            
            expect(result).toBe(false);
            expect(manager._logError).toHaveBeenCalled();
        });

        test('возвращает false если сохранение доменов не удалось', async () => {
            manager.storageManager.saveDomainExceptions.mockResolvedValue(false);
            
            const result = await settingsManager.saveSettings();
            
            expect(result).toBe(false);
            expect(manager._logError).toHaveBeenCalled();
        });

        test('обрабатывает ошибки при сохранении', async () => {
            manager.storageManager.saveBackendUrl.mockRejectedValue(new Error('Test error'));
            
            const result = await settingsManager.saveSettings();
            
            expect(result).toBe(false);
            expect(manager._logError).toHaveBeenCalled();
        });

        test('очищает таймер обратной связи перед сохранением', async () => {
            settingsManager.buttonFeedbackTimers.set('saveBtn', setTimeout(() => {}, 1000));
            
            await settingsManager.saveSettings();
            
            expect(settingsManager.buttonFeedbackTimers.has('saveBtn')).toBe(false);
        });

        test('очищает валидность input перед сохранением', async () => {
            const input = document.getElementById('backendUrl');
            input.setCustomValidity = jest.fn();
            
            await settingsManager.saveSettings();
            
            expect(input.setCustomValidity).toHaveBeenCalledWith('');
        });

        test('логирует если обновление состояния кнопки не удалось', async () => {
            manager.domManager.setButtonState.mockReturnValue(false);
            
            await settingsManager.saveSettings();
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.settings.saveButtonStateUpdateFailed' })
            );
        });
    });

    describe('resetToDefault', () => {
        test('сбрасывает настройки к значениям по умолчанию', async () => {
            const result = await settingsManager.resetToDefault();
            
            expect(result).toBe(true);
            expect(manager.storageManager.resetToDefault).toHaveBeenCalled();
            expect(manager.storageManager.saveDomainExceptions).toHaveBeenCalledWith([]);
            expect(manager.domManager.setBackendUrlValue).toHaveBeenCalledWith('https://default');
            expect(manager.uiManager.setDomainExceptions).toHaveBeenCalledWith([]);
            expect(manager.storageManager.notifyBackgroundScript).toHaveBeenCalled();
            expect(manager.storageManager.notifyDomainExceptionsUpdate).toHaveBeenCalled();
        });

        test('возвращает false если сброс доменов не удался', async () => {
            manager.storageManager.saveDomainExceptions.mockResolvedValue(false);
            
            const result = await settingsManager.resetToDefault();
            
            expect(result).toBe(false);
            expect(manager._logError).toHaveBeenCalled();
        });

        test('логирует если обновление UI не удалось', async () => {
            manager.domManager.setBackendUrlValue.mockReturnValue(false);
            
            await settingsManager.resetToDefault();
            
            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.settings.uiUpdateAfterResetFailed' })
            );
        });

        test('обрабатывает ошибки при сбросе', async () => {
            manager.storageManager.resetToDefault.mockRejectedValue(new Error('Test error'));
            
            const result = await settingsManager.resetToDefault();
            
            expect(result).toBe(false);
            expect(manager._logError).toHaveBeenCalled();
        });

        test('очищает таймер обратной связи перед сбросом', async () => {
            settingsManager.buttonFeedbackTimers.set('resetBtn', setTimeout(() => {}, 1000));
            
            await settingsManager.resetToDefault();
            
            expect(settingsManager.buttonFeedbackTimers.has('resetBtn')).toBe(false);
        });

        test('логирует если обновление состояния кнопки не удалось', async () => {
            manager.domManager.setButtonState.mockReturnValue(false);
            
            await settingsManager.resetToDefault();
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.settings.resetButtonStateUpdateFailed' })
            );
        });
    });

    describe('_setButtonFeedback', () => {
        test('устанавливает обратную связь кнопки', () => {
            const button = document.getElementById('saveBtn');
            const originalText = 'Save';
            
            settingsManager._setButtonFeedback('saveBtn', button, 'Saving...', true, originalText, 1000);
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(button, 'Saving...', true);
            expect(settingsManager.buttonFeedbackTimers.has('saveBtn')).toBe(true);
        });

        test('восстанавливает текст кнопки после таймера', async () => {
            const button = document.getElementById('saveBtn');
            const originalText = 'Save';
            
            settingsManager._setButtonFeedback('saveBtn', button, 'Saving...', true, originalText, 100);
            
            jest.advanceTimersByTime(100);
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(button, originalText, false);
            expect(settingsManager.buttonFeedbackTimers.has('saveBtn')).toBe(false);
        });

        test('обрезает длинный текст', () => {
            const button = document.getElementById('saveBtn');
            const longText = 'A'.repeat(100);
            
            settingsManager._setButtonFeedback('saveBtn', button, longText, false, 'Save', 1000);
            
            expect(manager.domManager.setButtonState).toHaveBeenCalledWith(
                button,
                expect.stringMatching(/^A{0,17}…?$/),
                false
            );
        });

        test('логирует если кнопка не найдена', () => {
            settingsManager._setButtonFeedback('nonexistent', null, 'Text', false, 'Original', 1000);
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.settings.buttonNotFound' })
            );
        });

        test('не устанавливает таймер если обновление состояния не удалось', () => {
            const button = document.getElementById('saveBtn');
            manager.domManager.setButtonState.mockReturnValue(false);
            
            settingsManager._setButtonFeedback('saveBtn', button, 'Saving...', true, 'Save', 1000);
            
            expect(settingsManager.buttonFeedbackTimers.has('saveBtn')).toBe(false);
        });
    });

    describe('_clearButtonFeedback', () => {
        test('очищает таймер обратной связи', () => {
            const timerId = setTimeout(() => {}, 1000);
            settingsManager.buttonFeedbackTimers.set('saveBtn', timerId);
            
            settingsManager._clearButtonFeedback('saveBtn');
            
            expect(settingsManager.buttonFeedbackTimers.has('saveBtn')).toBe(false);
        });

        test('не вызывает ошибку если таймер не существует', () => {
            expect(() => settingsManager._clearButtonFeedback('nonexistent')).not.toThrow();
        });
    });
});
