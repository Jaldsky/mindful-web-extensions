/**
 * Тесты для StorageManager класса
 * Тестирует функциональность работы с chrome.storage для локалей
 */

const StorageManager = require('../../../src/managers/locale/StorageManager.js');
const CONFIG = require('../../../src/config/config.js');

describe('StorageManager', () => {
    let storageManager;
    let mockStorage;

    beforeEach(() => {
        // Мокируем chrome.storage.local
        mockStorage = {
            data: {},
            get: jest.fn((keys, callback) => {
                const result = {};
                keys.forEach(key => {
                    if (mockStorage.data[key]) {
                        result[key] = mockStorage.data[key];
                    }
                });
                callback(result);
            }),
            set: jest.fn((items, callback) => {
                Object.assign(mockStorage.data, items);
                callback();
            })
        };

        global.chrome = {
            storage: {
                local: mockStorage
            },
            runtime: {
                lastError: null
            }
        };

        storageManager = new StorageManager({ enableLogging: false });
    });

    afterEach(() => {
        if (storageManager) {
            storageManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(storageManager).toBeDefined();
            expect(storageManager.statistics).toBeDefined();
            expect(storageManager.statistics.loads).toBe(0);
            expect(storageManager.statistics.saves).toBe(0);
            expect(storageManager.statistics.errors).toBe(0);
        });

    });

    describe('loadLocale', () => {
        test('should load saved locale from storage', async () => {
            mockStorage.data[CONFIG.LOCALE.STORAGE_KEY] = 'ru';

            const locale = await storageManager.loadLocale();

            expect(locale).toBe('ru');
            expect(storageManager.statistics.loads).toBe(1);
            expect(mockStorage.get).toHaveBeenCalledWith(
                [CONFIG.LOCALE.STORAGE_KEY],
                expect.any(Function)
            );
        });

        test('should return null when no locale is saved', async () => {
            const locale = await storageManager.loadLocale();

            expect(locale).toBeNull();
            expect(storageManager.statistics.loads).toBe(1);
        });

        test('should handle storage errors', async () => {
            // Мокируем get с ошибкой
            mockStorage.get = jest.fn((keys, callback) => {
                chrome.runtime.lastError = new Error('Storage error');
                callback({});
                chrome.runtime.lastError = null;
            });

            const locale = await storageManager.loadLocale();

            expect(locale).toBeNull();
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('should return null when storage is unavailable', async () => {
            delete global.chrome.storage;

            const locale = await storageManager.loadLocale();

            expect(locale).toBeNull();
            expect(storageManager.statistics.errors).toBe(1);
        });
    });

    describe('saveLocale', () => {
        test('should save locale to storage', async () => {
            const result = await storageManager.saveLocale('en');

            expect(result).toBe(true);
            expect(storageManager.statistics.saves).toBe(1);
            expect(mockStorage.data[CONFIG.LOCALE.STORAGE_KEY]).toBe('en');
            expect(mockStorage.set).toHaveBeenCalledWith(
                { [CONFIG.LOCALE.STORAGE_KEY]: 'en' },
                expect.any(Function)
            );
        });

        test('should handle invalid locale', async () => {
            const result = await storageManager.saveLocale(null);

            expect(result).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
            expect(storageManager.statistics.saves).toBe(0);
        });

        test('should handle non-string locale', async () => {
            const result = await storageManager.saveLocale(123);

            expect(result).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('should handle storage errors', async () => {
            // Мокируем set с ошибкой
            mockStorage.set = jest.fn((items, callback) => {
                chrome.runtime.lastError = new Error('Storage error');
                callback();
                chrome.runtime.lastError = null;
            });

            const result = await storageManager.saveLocale('en');

            expect(result).toBe(false);
            expect(storageManager.statistics.errors).toBe(1);
        });

        test('should update state after successful save', async () => {
            await storageManager.saveLocale('ru');

            const state = storageManager.getState();
            expect(state.currentLocale).toBe('ru');
            expect(state.lastSaveTime).toBeDefined();
        });
    });

    describe('destroy', () => {
        test('should cleanup resources', () => {
            storageManager.statistics.loads = 5;
            storageManager.statistics.saves = 3;
            storageManager.statistics.errors = 1;

            storageManager.destroy();

            expect(storageManager.statistics.loads).toBe(0);
            expect(storageManager.statistics.saves).toBe(0);
            expect(storageManager.statistics.errors).toBe(0);
        });
    });

    describe('performance tracking', () => {
        test('should track operation performance', async () => {
            await storageManager.loadLocale();

            const metrics = storageManager.getPerformanceMetrics();
            expect(metrics.loadLocale_lastDuration).toBeDefined();
            expect(typeof metrics.loadLocale_lastDuration).toBe('number');
        });
    });

    describe('Branch Coverage - Error Handling', () => {
        test('loadLocale - должен обрабатывать исключения при загрузке', async () => {
            // Ломаем Promise для вызова catch блока
            jest.spyOn(global, 'Promise').mockImplementationOnce(() => {
                throw new Error('Promise error');
            });

            const result = await storageManager.loadLocale();

            expect(result).toBeNull();
            expect(storageManager.statistics.errors).toBeGreaterThan(0);
            
            // Восстанавливаем Promise
            global.Promise.mockRestore();
        });

        test('loadLocale - должен обрабатывать недоступность storage', async () => {
            // Удаляем chrome.storage
            const originalStorage = global.chrome.storage;
            global.chrome.storage = null;

            const result = await storageManager.loadLocale();

            expect(result).toBeNull();
            expect(storageManager.statistics.errors).toBeGreaterThan(0);

            // Восстанавливаем storage
            global.chrome.storage = originalStorage;
        });

        test('saveLocale - должен обрабатывать недоступность storage', async () => {
            // Удаляем chrome.storage
            const originalStorage = global.chrome.storage;
            global.chrome.storage = null;

            const result = await storageManager.saveLocale('en');

            expect(result).toBe(false);
            expect(storageManager.statistics.errors).toBeGreaterThan(0);

            // Восстанавливаем storage
            global.chrome.storage = originalStorage;
        });

        test('saveLocale - должен обрабатывать исключения при сохранении', async () => {
            // Мокируем set чтобы выбросить исключение
            mockStorage.set = jest.fn(() => {
                throw new Error('Storage set error');
            });

            const result = await storageManager.saveLocale('en');

            expect(result).toBe(false);
            expect(storageManager.statistics.errors).toBeGreaterThan(0);
        });

        test('destroy - должен обрабатывать ошибки при уничтожении', () => {
            // Делаем statistics недоступным для записи
            Object.defineProperty(storageManager, 'statistics', {
                get() {
                    throw new Error('Cannot access statistics');
                },
                set() {
                    throw new Error('Cannot set statistics');
                }
            });

            // Не должно выбросить ошибку
            expect(() => storageManager.destroy()).not.toThrow();
        });

        test('_isStorageAvailable - должен возвращать false когда storage.local отсутствует', () => {
            const originalLocal = global.chrome.storage.local;
            global.chrome.storage.local = null;

            const result = storageManager._isStorageAvailable();

            expect(result).toBe(false);

            global.chrome.storage.local = originalLocal;
        });

        test('loadLocale - когда результат null но нет ошибок', async () => {
            // Пустой storage (локаль не сохранена)
            mockStorage.data = {};

            const result = await storageManager.loadLocale();

            expect(result).toBeNull();
            expect(storageManager.statistics.loads).toBe(1);
            expect(storageManager.statistics.errors).toBe(0);
        });
    });
});
