/**
 * Тесты для theme_manager/StorageManager
 * Тестирует функциональность работы с chrome.storage и localStorage кешем для тем
 */

const StorageManager = require('../../src/theme_manager/StorageManager.js');

describe('theme_manager/StorageManager', () => {
    let storageManager;
    let mockLocalStorage;

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

        // Мокируем chrome.storage.local
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            }
        };

        // Настраиваем моки по умолчанию
        global.chrome.storage.local.get.mockResolvedValue({});
        global.chrome.storage.local.set.mockResolvedValue();

        storageManager = new StorageManager({ 
            enableLogging: false,
            enableCache: true 
        });
    });

    afterEach(() => {
        if (storageManager) {
            storageManager.destroy();
        }
        jest.clearAllMocks();
        delete global.localStorage;
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(storageManager).toBeInstanceOf(StorageManager);
            expect(storageManager.enableCache).toBe(true);
        });

        test('должен инициализировать статистику', () => {
            expect(storageManager.statistics).toBeDefined();
            expect(storageManager.statistics.loads).toBe(0);
            expect(storageManager.statistics.saves).toBe(0);
            expect(storageManager.statistics.cacheHits).toBe(0);
            expect(storageManager.statistics.cacheMisses).toBe(0);
            expect(storageManager.statistics.errors).toBe(0);
        });

        test('должен иметь правильные константы', () => {
            expect(StorageManager.STORAGE_KEY).toBe('mindful_theme');
            expect(StorageManager.CACHE_KEY).toBe('mindful_theme_cache');
        });

        test('должен создаваться с отключенным кешем', () => {
            const manager = new StorageManager({ enableCache: false });
            expect(manager.enableCache).toBe(false);
            manager.destroy();
        });
    });

    describe('getThemeFromCache', () => {
        test('должен возвращать тему из localStorage кеша', () => {
            mockLocalStorage[StorageManager.CACHE_KEY] = 'dark';

            const theme = storageManager.getThemeFromCache();

            expect(theme).toBe('dark');
            expect(storageManager.statistics.cacheHits).toBe(1);
            expect(global.localStorage.getItem).toHaveBeenCalledWith(StorageManager.CACHE_KEY);
        });

        test('должен возвращать null если кеш пуст', () => {
            const theme = storageManager.getThemeFromCache();

            expect(theme).toBeNull();
            expect(storageManager.statistics.cacheMisses).toBe(1);
        });

        test('должен возвращать тему из кеша без валидации', () => {
            mockLocalStorage[StorageManager.CACHE_KEY] = 'invalid-theme';

            const theme = storageManager.getThemeFromCache();

            // StorageManager не валидирует тему, это делает ApplicationManager
            expect(theme).toBe('invalid-theme');
            expect(storageManager.statistics.cacheHits).toBe(1);
        });

        test('должен возвращать null если кеш отключен', () => {
            const manager = new StorageManager({ enableCache: false });
            mockLocalStorage[StorageManager.CACHE_KEY] = 'dark';

            const theme = manager.getThemeFromCache();

            expect(theme).toBeNull();
            manager.destroy();
        });

        test('должен обрабатывать ошибки localStorage', () => {
            global.localStorage.getItem.mockImplementation(() => {
                throw new Error('localStorage error');
            });

            const theme = storageManager.getThemeFromCache();

            expect(theme).toBeNull();
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('должен возвращать null если localStorage недоступен', () => {
            delete global.localStorage;
            const manager = new StorageManager({ enableCache: true });

            const theme = manager.getThemeFromCache();

            expect(theme).toBeNull();
            manager.destroy();
        });
    });

    describe('saveThemeToCache', () => {
        test('должен сохранять тему в localStorage кеш', () => {
            storageManager.saveThemeToCache('dark');

            expect(mockLocalStorage[StorageManager.CACHE_KEY]).toBe('dark');
            expect(global.localStorage.setItem).toHaveBeenCalledWith(
                StorageManager.CACHE_KEY,
                'dark'
            );
        });

        test('должен сохранять светлую тему', () => {
            storageManager.saveThemeToCache('light');

            expect(mockLocalStorage[StorageManager.CACHE_KEY]).toBe('light');
        });

        test('не должен сохранять если кеш отключен', () => {
            const manager = new StorageManager({ enableCache: false });
            manager.saveThemeToCache('dark');

            expect(global.localStorage.setItem).not.toHaveBeenCalled();
            manager.destroy();
        });

        test('должен обрабатывать ошибки localStorage', () => {
            global.localStorage.setItem.mockImplementation(() => {
                throw new Error('localStorage error');
            });

            // Не должно бросать ошибку
            expect(() => storageManager.saveThemeToCache('dark')).not.toThrow();
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('не должен падать если localStorage недоступен', () => {
            delete global.localStorage;
            const manager = new StorageManager({ enableCache: true });

            expect(() => manager.saveThemeToCache('dark')).not.toThrow();
            manager.destroy();
        });
    });

    describe('loadTheme', () => {
        test('должен загружать тему из chrome.storage', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                [StorageManager.STORAGE_KEY]: 'dark'
            });

            const theme = await storageManager.loadTheme();

            expect(theme).toBe('dark');
            expect(storageManager.statistics.loads).toBe(1);
            expect(global.chrome.storage.local.get).toHaveBeenCalledWith([StorageManager.STORAGE_KEY]);
        });

        test('должен возвращать null если тема не сохранена', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const theme = await storageManager.loadTheme();

            expect(theme).toBeNull();
            expect(storageManager.statistics.loads).toBe(1);
        });

        test('должен возвращать null если chrome.storage недоступен', async () => {
            delete global.chrome.storage;

            const theme = await storageManager.loadTheme();

            expect(theme).toBeNull();
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('должен обрабатывать ошибки загрузки', async () => {
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            const theme = await storageManager.loadTheme();

            expect(theme).toBeNull();
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('должен обновлять статистику при загрузке', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                [StorageManager.STORAGE_KEY]: 'light'
            });

            await storageManager.loadTheme();

            expect(storageManager.statistics.lastOperation).toBe('load');
        });
    });

    describe('saveTheme', () => {
        test('должен сохранять тему в chrome.storage', async () => {
            const success = await storageManager.saveTheme('dark');

            expect(success).toBe(true);
            expect(storageManager.statistics.saves).toBe(1);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                [StorageManager.STORAGE_KEY]: 'dark'
            });
        });

        test('должен сохранять светлую тему', async () => {
            const success = await storageManager.saveTheme('light');

            expect(success).toBe(true);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                [StorageManager.STORAGE_KEY]: 'light'
            });
        });

        test('должен возвращать false если chrome.storage недоступен', async () => {
            delete global.chrome.storage;

            const success = await storageManager.saveTheme('dark');

            expect(success).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('должен обрабатывать ошибки сохранения', async () => {
            global.chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

            const success = await storageManager.saveTheme('dark');

            expect(success).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('должен обновлять статистику при сохранении', async () => {
            await storageManager.saveTheme('dark');

            expect(storageManager.statistics.lastOperation).toBe('save');
        });

        test('должен валидировать тему перед сохранением', async () => {
            const success = await storageManager.saveTheme(null);

            expect(success).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
            expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
        });

        test('должен отклонять невалидные типы', async () => {
            const success = await storageManager.saveTheme(123);

            expect(success).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
        });
    });

    describe('getStatistics', () => {
        test('должен возвращать статистику', async () => {
            // Выполним несколько операций
            mockLocalStorage[StorageManager.CACHE_KEY] = 'dark';
            storageManager.getThemeFromCache();
            storageManager.saveThemeToCache('light');
            
            global.chrome.storage.local.get.mockResolvedValue({
                [StorageManager.STORAGE_KEY]: 'dark'
            });
            await storageManager.loadTheme();
            await storageManager.saveTheme('dark');

            const stats = storageManager.getStatistics();

            expect(stats.loads).toBe(1);
            expect(stats.saves).toBe(1);
            expect(stats.cacheHits).toBe(1);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.errors).toBe(0);
            expect(stats.lastOperation).toBe('save');
        });
    });

    describe('destroy', () => {
        test('должен вызывать родительский destroy', () => {
            const destroySpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(storageManager)), 'destroy');
            
            storageManager.destroy();

            expect(destroySpy).toHaveBeenCalled();
        });
    });
});
