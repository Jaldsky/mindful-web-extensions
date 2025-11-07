/**
 * Тесты для theme_manager/ThemeManager
 * Тестирует главный координатор для управления темами
 */

const ThemeManager = require('../../../src/managers/theme/ThemeManager.js');

describe('theme_manager/ThemeManager', () => {
    let themeManager;
    let mockLocalStorage;
    let setAttributeSpy;
    let removeAttributeSpy;
    let mockOnChanged;

    beforeEach(() => {
        // Мокируем localStorage
        mockLocalStorage = {};
        global.localStorage = {
            getItem: jest.fn((key) => mockLocalStorage[key] || null),
            setItem: jest.fn((key, value) => {
                mockLocalStorage[key] = value;
            }),
            removeItem: jest.fn((key) => {
                delete mockLocalStorage[key];
            })
        };

        // Используем реальный document.documentElement из JSDOM
        setAttributeSpy = jest.spyOn(document.documentElement, 'setAttribute');
        removeAttributeSpy = jest.spyOn(document.documentElement, 'removeAttribute');

        // Мокируем chrome.storage
        mockOnChanged = {
            addListener: jest.fn(),
            removeListener: jest.fn()
        };

        global.chrome.storage = {
            local: {
                get: jest.fn().mockResolvedValue({}),
                set: jest.fn().mockResolvedValue()
            },
            onChanged: mockOnChanged
        };

        themeManager = new ThemeManager({ 
            enableLogging: false,
            enableCache: true
        });
    });

    afterEach(() => {
        if (themeManager) {
            themeManager.destroy();
        }
        setAttributeSpy.mockRestore();
        removeAttributeSpy.mockRestore();
        jest.clearAllMocks();
        delete global.localStorage;
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(themeManager).toBeInstanceOf(ThemeManager);
            expect(themeManager.isInitialized).toBe(false);
        });

        test('должен инициализировать подменеджеры', () => {
            expect(themeManager.storageManager).toBeDefined();
            expect(themeManager.applicationManager).toBeDefined();
            expect(themeManager.syncManager).toBeDefined();
        });

        test('должен создаваться с отключенным кешем', () => {
            const manager = new ThemeManager({ 
                enableLogging: false,
                enableCache: false 
            });

            expect(manager.storageManager.enableCache).toBe(false);
            manager.destroy();
        });

        test('должен создаваться с callback', () => {
            const callback = jest.fn();
            const manager = new ThemeManager({ 
                enableLogging: false,
                onThemeChange: callback 
            });

            expect(manager.syncManager.onThemeChangeCallback).toBe(callback);
            manager.destroy();
        });

        test('должен иметь правильные константы', () => {
            expect(ThemeManager.DEFAULT_THEME).toBe('light');
        });
    });

    describe('loadAndApplyTheme', () => {
        test('должен загружать и применять тему из storage', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            const theme = await themeManager.loadAndApplyTheme();

            expect(theme).toBe('dark');
            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
            expect(themeManager.isInitialized).toBe(true);
        });

        test('должен применять тему из кеша перед загрузкой из storage', async () => {
            mockLocalStorage.mindful_theme_cache = 'dark';
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'light'
            });

            const theme = await themeManager.loadAndApplyTheme();

            // Сначала применяется из кеша (dark), затем из storage (light)
            expect(setAttributeSpy).toHaveBeenCalled();
            expect(theme).toBe('light'); // Финальная тема из storage
        });

        test('должен применять тему по умолчанию если storage пуст', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const theme = await themeManager.loadAndApplyTheme();

            expect(theme).toBe('light');
            expect(removeAttributeSpy).toHaveBeenCalledWith('data-theme');
        });

        test('должен сохранять тему в кеш', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            await themeManager.loadAndApplyTheme();

            expect(mockLocalStorage.mindful_theme_cache).toBe('dark');
        });

        test('должен обрабатывать ошибки загрузки', async () => {
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            const theme = await themeManager.loadAndApplyTheme();

            expect(theme).toBe('light'); // Применяется тема по умолчанию
        });

        test('должен обновлять состояние после загрузки', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            await themeManager.loadAndApplyTheme();

            const state = themeManager.getState();
            expect(state.isInitialized).toBe(true);
            expect(state.currentTheme).toBe('dark');
            expect(state.lastLoadTime).toBeDefined();
        });
    });

    describe('applyTheme', () => {
        test('должен применять тему через ApplicationManager', () => {
            const result = themeManager.applyTheme('dark');

            expect(result).toBe(true);
            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
        });

        test('должен применять светлую тему', () => {
            const result = themeManager.applyTheme('light');

            expect(result).toBe(true);
            expect(removeAttributeSpy).toHaveBeenCalledWith('data-theme');
        });

        test('должен отклонять невалидную тему', () => {
            const result = themeManager.applyTheme('invalid');

            // ThemeManager валидирует темы и возвращает false для невалидных
            expect(result).toBe(false);
            expect(removeAttributeSpy).not.toHaveBeenCalled();
        });

        test('должен сохранять тему в кеш', () => {
            themeManager.applyTheme('dark');

            expect(mockLocalStorage.mindful_theme_cache).toBe('dark');
        });
    });

    describe('saveTheme', () => {
        test('должен сохранять тему в storage', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            const result = await themeManager.saveTheme('dark');

            expect(result).toBe(true);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                'mindful_theme': 'dark'
            });
        });

        test('должен обрабатывать ошибки сохранения', async () => {
            global.chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

            const result = await themeManager.saveTheme('dark');

            expect(result).toBe(false);
        });

        test('должен обновлять состояние после сохранения', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            await themeManager.saveTheme('dark');

            const state = themeManager.getState();
            expect(state.lastSaveTime).toBeDefined();
        });
    });

    describe('getCurrentTheme', () => {
        test('должен возвращать текущую тему', () => {
            themeManager.applyTheme('dark');

            expect(themeManager.getCurrentTheme()).toBe('dark');
        });

        test('должен возвращать светлую тему по умолчанию', () => {
            expect(themeManager.getCurrentTheme()).toBe('light');
        });
    });

    describe('listenForThemeChanges', () => {
        test('должен начинать прослушивание изменений', () => {
            const result = themeManager.listenForThemeChanges();

            expect(result).toBe(true);
            expect(mockOnChanged.addListener).toHaveBeenCalled();
        });

        test('должен начинать прослушивание с callback', () => {
            const callback = jest.fn();
            themeManager.listenForThemeChanges(callback);

            expect(mockOnChanged.addListener).toHaveBeenCalled();
        });

        test('должен применять тему при изменении в storage', () => {
            const callback = jest.fn();
            themeManager.listenForThemeChanges(callback);

            // Получаем слушателя
            const listener = mockOnChanged.addListener.mock.calls[0][0];

            // Симулируем изменение
            listener({ 'mindful_theme': { newValue: 'dark' } }, 'local');

            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
            expect(callback).toHaveBeenCalledWith('dark');
        });

        test('должен возвращать false если API недоступен', () => {
            delete global.chrome.storage.onChanged;

            const result = themeManager.listenForThemeChanges();

            expect(result).toBe(false);
        });
    });

    describe('stopListening', () => {
        test('должен останавливать прослушивание', () => {
            themeManager.listenForThemeChanges();

            themeManager.stopListening();

            expect(mockOnChanged.removeListener).toHaveBeenCalled();
        });

        test('должен работать если прослушивание не запущено', () => {
            expect(() => themeManager.stopListening()).not.toThrow();
        });
    });

    describe('isListening', () => {
        test('должен возвращать true когда прослушивание активно', () => {
            themeManager.listenForThemeChanges();

            expect(themeManager.isListening()).toBe(true);
        });

        test('должен возвращать false когда прослушивание неактивно', () => {
            expect(themeManager.isListening()).toBe(false);
        });
    });

    describe('getStatistics', () => {
        test('должен возвращать статистику всех подменеджеров', async () => {
            // Выполняем операции
            mockLocalStorage.mindful_theme_cache = 'dark';
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            await themeManager.loadAndApplyTheme();
            await themeManager.saveTheme('light');
            themeManager.listenForThemeChanges();

            const stats = themeManager.getStatistics();

            expect(stats.storage).toBeDefined();
            expect(stats.application).toBeDefined();
            expect(stats.sync).toBeDefined();
            expect(stats.storage.loads).toBeGreaterThan(0);
            expect(stats.application.applies).toBeGreaterThan(0);
        });
    });

    describe('getDiagnostics', () => {
        test('должен возвращать диагностическую информацию', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });

            await themeManager.loadAndApplyTheme();

            const diagnostics = themeManager.getDiagnostics();

            expect(diagnostics.isInitialized).toBe(true);
            expect(diagnostics.currentTheme).toBe('dark');
            expect(diagnostics.enableLogging).toBe(false);
            expect(diagnostics.statistics).toBeDefined();
            expect(diagnostics.state).toBeDefined();
            expect(diagnostics.timestamp).toBeDefined();
        });
    });

    describe('Интеграционные сценарии', () => {
        test('должен правильно работать полный цикл: загрузка -> изменение -> сохранение', async () => {
            // Начальное состояние - light тема в storage
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'light'
            });

            // Загружаем
            await themeManager.loadAndApplyTheme();
            expect(themeManager.getCurrentTheme()).toBe('light');

            // Применяем новую тему
            themeManager.applyTheme('dark');
            expect(themeManager.getCurrentTheme()).toBe('dark');

            // Сохраняем
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'dark'
            });
            await themeManager.saveTheme('dark');

            // Проверяем что все применилось
            expect(setAttributeSpy).toHaveBeenCalledWith('data-theme', 'dark');
            expect(mockLocalStorage.mindful_theme_cache).toBe('dark');
        });

        test('должен синхронизировать тему между страницами', () => {
            const callback = jest.fn();
            themeManager.listenForThemeChanges(callback);

            // Получаем слушателя
            const listener = mockOnChanged.addListener.mock.calls[0][0];

            // Симулируем изменение темы на другой странице
            listener({ 'mindful_theme': { newValue: 'dark' } }, 'local');

            // Проверяем что тема применилась и callback вызван
            expect(themeManager.getCurrentTheme()).toBe('dark');
            expect(callback).toHaveBeenCalledWith('dark');
            expect(mockLocalStorage.mindful_theme_cache).toBe('dark');
        });

        test('должен использовать кеш для быстрого применения темы', async () => {
            // Устанавливаем кеш
            mockLocalStorage.mindful_theme_cache = 'dark';
            
            // storage возвращает light (симулируем задержку синхронизации)
            global.chrome.storage.local.get.mockResolvedValue({
                'mindful_theme': 'light'
            });

            await themeManager.loadAndApplyTheme();

            // Тема должна сначала примениться из кеша, затем обновиться из storage
            expect(setAttributeSpy).toHaveBeenCalled();
            // Финальная тема из storage
            expect(themeManager.getCurrentTheme()).toBe('light');
        });
    });

    describe('destroy', () => {
        test('должен уничтожать все подменеджеры', () => {
            themeManager.listenForThemeChanges();

            themeManager.destroy();

            expect(themeManager.storageManager).toBeNull();
            expect(themeManager.applicationManager).toBeNull();
            expect(themeManager.syncManager).toBeNull();
            expect(themeManager.isInitialized).toBe(false);
        });

        test('должен останавливать прослушивание при уничтожении', () => {
            themeManager.listenForThemeChanges();

            themeManager.destroy();

            expect(mockOnChanged.removeListener).toHaveBeenCalled();
        });

        test('должен обрабатывать повторное уничтожение', () => {
            themeManager.destroy();

            expect(() => themeManager.destroy()).not.toThrow();
        });

        test('должен обрабатывать ошибки при уничтожении', () => {
            // Мокируем ошибку в syncManager.destroy
            jest.spyOn(themeManager.syncManager, 'destroy').mockImplementation(() => {
                throw new Error('Destroy error');
            });

            // Не должно выбросить ошибку
            expect(() => themeManager.destroy()).not.toThrow();
        });
    });

    describe('Обработка ошибок', () => {
        test('должен обрабатывать ошибки при загрузке темы', async () => {
            // Мокируем ошибку в storage
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            const theme = await themeManager.loadAndApplyTheme();

            // Должна применить fallback тему (default или из кеша)
            expect(['light', 'dark']).toContain(theme);
            expect(themeManager.isInitialized).toBe(true);
        });

        test('должен применять default тему при ошибке если кеш пустой', async () => {
            // Создаем новый manager чтобы гарантировать пустой кеш
            const newManager = new ThemeManager({ 
                enableLogging: false,
                enableCache: false
            });
            
            // Мокируем ошибку в storage
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            const theme = await newManager.loadAndApplyTheme();

            // Должна применить default тему
            expect(theme).toBe('light');
            
            newManager.destroy();
        });

        test('должен обрабатывать ошибки при применении темы', () => {
            // Мокируем ошибку в applicationManager
            jest.spyOn(themeManager.applicationManager, 'applyTheme').mockImplementation(() => {
                throw new Error('Apply error');
            });

            const result = themeManager.applyTheme('dark');

            expect(result).toBe(false);
        });

        test('должен отклонять невалидную тему при сохранении', async () => {
            const result = await themeManager.saveTheme('invalid-theme');

            expect(result).toBe(false);
        });

        test('должен обрабатывать ошибки при сохранении темы', async () => {
            // Мокируем ошибку в storage
            jest.spyOn(themeManager.storageManager, 'saveTheme').mockRejectedValue(new Error('Save error'));

            const result = await themeManager.saveTheme('dark');

            expect(result).toBe(false);
        });

        test('должен обрабатывать ошибки в пользовательском callback', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Callback error');
            });

            themeManager.listenForThemeChanges(errorCallback);

            // Получаем callback для onChanged
            const onChangedCallback = mockOnChanged.addListener.mock.calls[0][0];

            // Симулируем изменение темы
            onChangedCallback({ mindful_theme: { newValue: 'dark' } }, 'local');

            // Callback должен быть вызван несмотря на ошибку
            expect(errorCallback).toHaveBeenCalledWith('dark');
        });

        test('должен обрабатывать ошибки при установке слушателя', () => {
            // Мокируем ошибку в syncManager
            jest.spyOn(themeManager.syncManager, 'startListening').mockImplementation(() => {
                throw new Error('Listener error');
            });

            const result = themeManager.listenForThemeChanges();

            expect(result).toBe(false);
        });
    });
});
