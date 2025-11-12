/**
 * @jest-environment jsdom
 */

const ThemeDisplayManager = require('../../../../src/managers/options/ui/ThemeDisplayManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('ThemeDisplayManager', () => {
    let manager;
    let themeDisplayManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        themeDisplayManager = new ThemeDisplayManager(manager);
        
        document.body.innerHTML = `
            <div id="themeIcon"></div>
            <div id="themeLabel"></div>
        `;
        
        manager.themeManager = {
            getCurrentTheme: jest.fn(() => 'light'),
            applyTheme: jest.fn(),
            saveTheme: jest.fn().mockResolvedValue()
        };
        
        manager.localeManager.t = jest.fn((key) => {
            const translations = {
                'options.theme.dark': 'Dark',
                'options.theme.light': 'Light',
                'options.status.saveError': 'Save error'
            };
            return translations[key] || key;
        });
        
        manager.statusManager = {
            showError: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с manager', () => {
            expect(themeDisplayManager.manager).toBe(manager);
        });
    });

    describe('setThemeManager', () => {
        test('устанавливает themeManager в manager', () => {
            const mockThemeManager = { getCurrentTheme: jest.fn() };
            
            themeDisplayManager.setThemeManager(mockThemeManager);
            
            expect(manager.themeManager).toBe(mockThemeManager);
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.themeDisplay.themeManagerSet' })
            );
        });
    });

    describe('toggleTheme', () => {
        test('переключает тему с light на dark', async () => {
            manager.themeManager.getCurrentTheme.mockReturnValue('light');
            
            await themeDisplayManager.toggleTheme();
            
            expect(manager.themeManager.applyTheme).toHaveBeenCalledWith('dark');
            expect(manager.themeManager.saveTheme).toHaveBeenCalledWith('dark');
        });

        test('переключает тему с dark на light', async () => {
            manager.themeManager.getCurrentTheme.mockReturnValue('dark');
            
            await themeDisplayManager.toggleTheme();
            
            expect(manager.themeManager.applyTheme).toHaveBeenCalledWith('light');
            expect(manager.themeManager.saveTheme).toHaveBeenCalledWith('light');
        });

        test('обновляет отображение темы после переключения', async () => {
            const updateSpy = jest.spyOn(themeDisplayManager, 'updateThemeDisplay');
            manager.themeManager.getCurrentTheme.mockReturnValue('light');
            
            await themeDisplayManager.toggleTheme();
            
            expect(updateSpy).toHaveBeenCalledWith('dark');
        });

        test('логирует переключение темы', async () => {
            manager.themeManager.getCurrentTheme.mockReturnValue('light');
            
            await themeDisplayManager.toggleTheme();
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.themeDisplay.themeToggled' }),
                expect.objectContaining({ from: 'light', to: 'dark' })
            );
        });

        test('логирует ошибку если themeManager не установлен', async () => {
            manager.themeManager = null;
            
            await themeDisplayManager.toggleTheme();
            
            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.themeDisplay.themeManagerNotSet' })
            );
        });

        test('обрабатывает ошибки при переключении темы', async () => {
            manager.themeManager.saveTheme.mockRejectedValue(new Error('Test error'));
            
            await themeDisplayManager.toggleTheme();
            
            expect(manager._logError).toHaveBeenCalled();
            expect(manager.statusManager.showError).toHaveBeenCalledWith('Save error');
        });
    });

    describe('updateThemeDisplay', () => {
        test('обновляет отображение для light темы', () => {
            manager.themeManager.getCurrentTheme.mockReturnValue('light');
            
            themeDisplayManager.updateThemeDisplay();
            
            const icon = document.getElementById('themeIcon');
            const label = document.getElementById('themeLabel');
            
            expect(icon.textContent).toBe('🌙');
            expect(label.textContent).toBe('Dark');
        });

        test('обновляет отображение для dark темы', () => {
            manager.themeManager.getCurrentTheme.mockReturnValue('dark');
            
            themeDisplayManager.updateThemeDisplay();
            
            const icon = document.getElementById('themeIcon');
            const label = document.getElementById('themeLabel');
            
            expect(icon.textContent).toBe('☀️');
            expect(label.textContent).toBe('Light');
        });

        test('использует переданную тему вместо текущей', () => {
            themeDisplayManager.updateThemeDisplay('dark');
            
            const icon = document.getElementById('themeIcon');
            const label = document.getElementById('themeLabel');
            
            expect(icon.textContent).toBe('☀️');
            expect(label.textContent).toBe('Light');
        });

        test('работает без themeManager', () => {
            manager.themeManager = null;
            
            themeDisplayManager.updateThemeDisplay('light');
            
            const icon = document.getElementById('themeIcon');
            const label = document.getElementById('themeLabel');
            
            expect(icon.textContent).toBe('🌙');
            expect(label.textContent).toBe('Dark');
        });

        test('не обновляет если элементы не найдены', () => {
            document.getElementById('themeIcon').remove();
            document.getElementById('themeLabel').remove();
            
            expect(() => themeDisplayManager.updateThemeDisplay()).not.toThrow();
        });

        test('не обновляет если отсутствует themeIcon', () => {
            document.getElementById('themeIcon').remove();
            
            expect(() => themeDisplayManager.updateThemeDisplay()).not.toThrow();
        });

        test('не обновляет если отсутствует themeLabel', () => {
            document.getElementById('themeLabel').remove();
            
            expect(() => themeDisplayManager.updateThemeDisplay()).not.toThrow();
        });

        test('обрабатывает ошибки при обновлении отображения', () => {
            manager.themeManager.getCurrentTheme.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            themeDisplayManager.updateThemeDisplay();
            
            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.themeDisplay.updateThemeDisplayError' }),
                expect.any(Error)
            );
        });

        test('использует light как тему по умолчанию', () => {
            manager.themeManager = null;
            
            themeDisplayManager.updateThemeDisplay();
            
            const icon = document.getElementById('themeIcon');
            const label = document.getElementById('themeLabel');
            
            expect(icon.textContent).toBe('🌙');
            expect(label.textContent).toBe('Dark');
        });
    });
});
