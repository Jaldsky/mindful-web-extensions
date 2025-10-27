/**
 * Тесты для theme_manager/ApplicationManager
 * Тестирует функциональность применения темы к DOM
 */

const ApplicationManager = require('../../src/theme_manager/ApplicationManager.js');

describe('theme_manager/ApplicationManager', () => {
    let applicationManager;
    let setAttributeSpy;
    let removeAttributeSpy;

    beforeEach(() => {
        // Используем реальный document.documentElement из JSDOM
        // и шпионим за его методами
        setAttributeSpy = jest.spyOn(document.documentElement, 'setAttribute');
        removeAttributeSpy = jest.spyOn(document.documentElement, 'removeAttribute');

        applicationManager = new ApplicationManager({ enableLogging: false });
    });

    afterEach(() => {
        if (applicationManager) {
            applicationManager.destroy();
        }
        setAttributeSpy.mockRestore();
        removeAttributeSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(applicationManager).toBeInstanceOf(ApplicationManager);
            expect(applicationManager.currentTheme).toBe('light');
        });

        test('должен инициализировать статистику', () => {
            expect(applicationManager.statistics).toBeDefined();
            expect(applicationManager.statistics.applies).toBe(0);
            expect(applicationManager.statistics.lastAppliedTheme).toBeNull();
            expect(applicationManager.statistics.errors).toBe(0);
        });

        test('должен иметь правильные константы', () => {
            expect(ApplicationManager.THEME_ATTRIBUTE).toBe('data-theme');
            expect(ApplicationManager.THEMES).toEqual({
                LIGHT: 'light',
                DARK: 'dark'
            });
        });
    });

    describe('isValidTheme', () => {
        test('должен валидировать светлую тему', () => {
            expect(applicationManager.isValidTheme('light')).toBe(true);
        });

        test('должен валидировать темную тему', () => {
            expect(applicationManager.isValidTheme('dark')).toBe(true);
        });

        test('должен отклонять невалидную тему', () => {
            expect(applicationManager.isValidTheme('invalid')).toBe(false);
        });

        test('должен отклонять пустую строку', () => {
            expect(applicationManager.isValidTheme('')).toBe(false);
        });

        test('должен отклонять null', () => {
            expect(applicationManager.isValidTheme(null)).toBe(false);
        });

        test('должен отклонять undefined', () => {
            expect(applicationManager.isValidTheme(undefined)).toBe(false);
        });
    });

    describe('applyTheme', () => {
        test('должен применять темную тему', () => {
            const result = applicationManager.applyTheme('dark');

            expect(result).toBe(true);
            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
            expect(applicationManager.currentTheme).toBe('dark');
            expect(applicationManager.statistics.applies).toBe(1);
            expect(applicationManager.statistics.lastAppliedTheme).toBe('dark');
        });

        test('должен применять светлую тему', () => {
            // Сначала применим темную
            applicationManager.applyTheme('dark');
            setAttributeSpy.mockClear();
            removeAttributeSpy.mockClear();

            // Затем светлую
            const result = applicationManager.applyTheme('light');

            expect(result).toBe(true);
            expect(removeAttributeSpy).toHaveBeenCalledWith('data-theme');
            expect(applicationManager.currentTheme).toBe('light');
            expect(applicationManager.statistics.applies).toBe(2);
        });

        test('должен обрабатывать невалидную тему как светлую', () => {
            const result = applicationManager.applyTheme('invalid');

            expect(result).toBe(true);
            expect(removeAttributeSpy).toHaveBeenCalledWith('data-theme');
            expect(applicationManager.currentTheme).toBe('light');
        });

        test('должен обновлять статистику', () => {
            applicationManager.applyTheme('dark');

            expect(applicationManager.statistics.applies).toBe(1);
            expect(applicationManager.statistics.lastAppliedTheme).toBe('dark');
        });

        test('должен обрабатывать ошибки при применении', () => {
            setAttributeSpy.mockImplementation(() => {
                throw new Error('DOM error');
            });

            const result = applicationManager.applyTheme('dark');

            // applyTheme ловит ошибки и возвращает false
            expect(result).toBe(false);
            expect(applicationManager.statistics.errors).toBe(1);
        });

        test('должен переключаться между темами', () => {
            // Применяем темную
            applicationManager.applyTheme('dark');
            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
            setAttributeSpy.mockClear();

            // Применяем светлую
            applicationManager.applyTheme('light');
            expect(removeAttributeSpy).toHaveBeenCalledWith('data-theme');
            removeAttributeSpy.mockClear();

            // Снова темную
            applicationManager.applyTheme('dark');
            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
        });

        test('должен обновлять состояние менеджера', () => {
            applicationManager.applyTheme('dark');

            const state = applicationManager.getState();
            expect(state.currentTheme).toBe('dark');
            expect(state.lastApplyTime).toBeDefined();
        });
    });

    describe('getCurrentTheme', () => {
        test('должен возвращать текущую тему', () => {
            expect(applicationManager.getCurrentTheme()).toBe('light');
        });

        test('должен возвращать актуальную тему после изменения', () => {
            applicationManager.applyTheme('dark');
            expect(applicationManager.getCurrentTheme()).toBe('dark');

            applicationManager.applyTheme('light');
            expect(applicationManager.getCurrentTheme()).toBe('light');
        });
    });

    describe('getStatistics', () => {
        test('должен возвращать статистику', () => {
            applicationManager.applyTheme('dark');
            applicationManager.applyTheme('light');
            applicationManager.applyTheme('dark');

            const stats = applicationManager.getStatistics();

            expect(stats.applies).toBe(3);
            expect(stats.lastAppliedTheme).toBe('dark');
            expect(stats.errors).toBe(0);
        });
    });

    describe('destroy', () => {
        test('должен вызывать родительский destroy', () => {
            applicationManager.applyTheme('dark');
            
            const destroySpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(applicationManager)), 'destroy');
            
            applicationManager.destroy();

            expect(destroySpy).toHaveBeenCalled();
        });
    });
});
