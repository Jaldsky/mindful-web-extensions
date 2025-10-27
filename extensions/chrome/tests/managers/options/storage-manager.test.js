/**
 * Тесты для StorageManager
 */

const StorageManager = require('../../../src/managers/options/StorageManager.js');

describe('StorageManager', () => {
    let storageManager;

    beforeEach(() => {
        // Убеждаемся что chrome API существует
        if (!global.chrome) {
            global.chrome = {};
        }
        
        if (!global.chrome.storage) {
            global.chrome.storage = {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            };
        }
        
        if (!global.chrome.runtime) {
            global.chrome.runtime = {
                sendMessage: jest.fn()
            };
        }

        // Настраиваем моки chrome.storage
        global.chrome.storage.local.get.mockImplementation((keys) => {
            return Promise.resolve({});
        });

        global.chrome.storage.local.set.mockImplementation((items) => {
            return Promise.resolve();
        });

        global.chrome.runtime.sendMessage.mockResolvedValue({ success: true });

        storageManager = new StorageManager({ enableLogging: false });
    });

    afterEach(() => {
        if (storageManager) {
            storageManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(storageManager).toBeInstanceOf(StorageManager);
        });

        test('должен выбрасывать ошибку если chrome.storage недоступен', () => {
            const originalStorage = global.chrome.storage;
            delete global.chrome.storage;

            expect(() => {
                new StorageManager();
            }).toThrow('chrome.storage API недоступен');

            global.chrome.storage = originalStorage;
        });
    });

    describe('loadBackendUrl', () => {
        test('должен загружать URL из хранилища', async () => {
            const testUrl = 'http://test.com/api';
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: testUrl
            });

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(testUrl);
            expect(global.chrome.storage.local.get).toHaveBeenCalledWith(['mindful_backend_url']);
        });

        test('должен возвращать значение по умолчанию если URL не найден', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
        });

        test('должен валидировать загруженное значение', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: ''
            });

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
        });

        test('должен обрабатывать ошибки загрузки', async () => {
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            await expect(storageManager.loadBackendUrl()).rejects.toThrow('Storage error');
        });
    });

    describe('saveBackendUrl', () => {
        test('должен сохранять URL в хранилище', async () => {
            const testUrl = 'http://test.com/api';
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: testUrl
            });

            const result = await storageManager.saveBackendUrl(testUrl);

            expect(result).toBe(true);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                mindful_backend_url: testUrl
            });
        });

        test('должен верифицировать сохранение', async () => {
            const testUrl = 'http://test.com/api';
            
            // Первый вызов для верификации после сохранения
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            const result = await storageManager.saveBackendUrl(testUrl);

            expect(result).toBe(true);
            expect(global.chrome.storage.local.get).toHaveBeenCalled();
        });

        test('должен выбрасывать ошибку если верификация не удалась', async () => {
            const testUrl = 'http://test.com/api';
            
            // Верификация возвращает другое значение
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: 'http://wrong.com'
            });

            await expect(storageManager.saveBackendUrl(testUrl))
                .rejects.toThrow('Верификация сохранения не удалась');
        });

        test('должен валидировать входные данные', async () => {
            await expect(storageManager.saveBackendUrl('')).rejects.toThrow(TypeError);
            await expect(storageManager.saveBackendUrl(null)).rejects.toThrow(TypeError);
            await expect(storageManager.saveBackendUrl(123)).rejects.toThrow(TypeError);
        });
    });

    describe('resetToDefault', () => {
        test('должен сбрасывать настройки к значениям по умолчанию', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: StorageManager.DEFAULT_VALUES.BACKEND_URL
            });

            const url = await storageManager.resetToDefault();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
            expect(global.chrome.storage.local.set).toHaveBeenCalled();
        });

        test('должен использовать saveBackendUrl для сброса', async () => {
            const saveSpy = jest.spyOn(storageManager, 'saveBackendUrl');
            
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: StorageManager.DEFAULT_VALUES.BACKEND_URL
            });

            await storageManager.resetToDefault();

            expect(saveSpy).toHaveBeenCalledWith(StorageManager.DEFAULT_VALUES.BACKEND_URL);
            saveSpy.mockRestore();
        });
    });

    describe('notifyBackgroundScript', () => {
        test('должен отправлять сообщение background script', async () => {
            const testUrl = 'http://test.com/api';

            const result = await storageManager.notifyBackgroundScript(testUrl);

            expect(result).toBe(true);
            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'updateBackendUrl',
                url: testUrl
            });
        });

        test('должен обрабатывать таймаут', async () => {
            jest.useFakeTimers();
            
            global.chrome.runtime.sendMessage.mockImplementation(() => {
                return new Promise((resolve) => {
                    setTimeout(() => resolve({ success: true }), 10000);
                });
            });

            const promise = storageManager.notifyBackgroundScript('http://test.com');
            
            jest.advanceTimersByTime(6000);
            const result = await promise;

            expect(result).toBe(false);
            
            jest.useRealTimers();
        });

        test('должен возвращать false при ошибке отправки', async () => {
            global.chrome.runtime.sendMessage.mockRejectedValue(new Error('Send error'));

            const result = await storageManager.notifyBackgroundScript('http://test.com');

            expect(result).toBe(false);
        });

        test('должен валидировать входные данные', async () => {
            await expect(storageManager.notifyBackgroundScript('')).rejects.toThrow(TypeError);
            await expect(storageManager.notifyBackgroundScript(null)).rejects.toThrow(TypeError);
        });
    });

    describe('getDefaultBackendUrl', () => {
        test('должен возвращать URL по умолчанию', () => {
            const url = storageManager.getDefaultBackendUrl();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
            expect(typeof url).toBe('string');
        });
    });

    describe('Метрики производительности', () => {
        test('должен собирать метрики для loadBackendUrl', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: 'http://test.com'
            });

            await storageManager.loadBackendUrl();

            const metrics = storageManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('loadBackendUrl_lastDuration');
            expect(typeof metrics.loadBackendUrl_lastDuration).toBe('number');
        });

        test('должен собирать метрики для saveBackendUrl', async () => {
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: 'http://test.com'
            });

            await storageManager.saveBackendUrl('http://test.com');

            const metrics = storageManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('saveBackendUrl_lastDuration');
        });

        test('должен собирать метрики для notifyBackgroundScript', async () => {
            await storageManager.notifyBackgroundScript('http://test.com');

            const metrics = storageManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('notifyBackgroundScript_lastDuration');
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            storageManager.destroy();

            const metrics = storageManager.getPerformanceMetrics();
            expect(Object.keys(metrics).length).toBe(0);
        });

        test('не должен выбрасывать ошибку при повторном вызове', () => {
            expect(() => {
                storageManager.destroy();
                storageManager.destroy();
            }).not.toThrow();
        });
    });

    describe('Интеграционные тесты', () => {
        test('полный цикл: save -> load -> verify', async () => {
            const testUrl = 'http://integration-test.com/api';
            
            let storedValue = null;
            
            global.chrome.storage.local.set.mockImplementation((items) => {
                storedValue = items.mindful_backend_url;
                return Promise.resolve();
            });
            
            global.chrome.storage.local.get.mockImplementation(() => {
                return Promise.resolve({
                    mindful_backend_url: storedValue
                });
            });

            // Сохраняем
            await storageManager.saveBackendUrl(testUrl);
            
            // Загружаем
            const loadedUrl = await storageManager.loadBackendUrl();
            
            expect(loadedUrl).toBe(testUrl);
        });

        test('reset -> load должен возвращать значение по умолчанию', async () => {
            let storedValue = 'http://custom.com';
            
            global.chrome.storage.local.set.mockImplementation((items) => {
                storedValue = items.mindful_backend_url;
                return Promise.resolve();
            });
            
            global.chrome.storage.local.get.mockImplementation(() => {
                return Promise.resolve({
                    mindful_backend_url: storedValue
                });
            });

            await storageManager.resetToDefault();
            const url = await storageManager.loadBackendUrl();
            
            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
        });
    });
});
