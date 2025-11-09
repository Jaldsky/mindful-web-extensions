/**
 * Тесты для StorageManager
 */

const StorageManager = require('../../../src/managers/options/core/StorageManager.js');

describe('StorageManager', () => {
    let storageManager;
    let memoryStorage;

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

        memoryStorage = {};

        // Настраиваем моки chrome.storage
        global.chrome.storage.local.get.mockImplementation((keys) => {
            if (!Array.isArray(keys)) {
                return Promise.resolve({});
            }

            const result = {};
            keys.forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(memoryStorage, key)) {
                    result[key] = memoryStorage[key];
                }
            });
            return Promise.resolve(result);
        });

        global.chrome.storage.local.set.mockImplementation((items) => {
            Object.assign(memoryStorage, items);
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
            }).toThrow();

            global.chrome.storage = originalStorage;
        });
    });

    describe('loadBackendUrl', () => {
        test('должен загружать URL из хранилища', async () => {
            const testUrl = 'http://test.com/api';
            memoryStorage.mindful_backend_url = testUrl;

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(testUrl);
            expect(global.chrome.storage.local.get).toHaveBeenCalledWith(['mindful_backend_url']);
        });

        test('должен возвращать значение по умолчанию если URL не найден', async () => {
            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
        });

        test('должен валидировать загруженное значение', async () => {
            memoryStorage.mindful_backend_url = '';

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
        });

        test('должен обрабатывать ошибки загрузки', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            await expect(storageManager.loadBackendUrl()).rejects.toThrow('Storage error');
        });
    });

    describe('saveBackendUrl', () => {
        test('должен сохранять URL в хранилище', async () => {
            const testUrl = 'http://test.com/api';

            const result = await storageManager.saveBackendUrl(testUrl);

            expect(result).toBe(true);
            expect(memoryStorage.mindful_backend_url).toBe(testUrl);
        });

        test('должен верифицировать сохранение', async () => {
            const testUrl = 'http://test.com/api';

            const result = await storageManager.saveBackendUrl(testUrl);

            expect(result).toBe(true);
            expect(global.chrome.storage.local.get).toHaveBeenCalled();
        });

        test('должен выбрасывать ошибку если верификация не удалась', async () => {
            const testUrl = 'http://test.com/api';

            global.chrome.storage.local.get.mockImplementationOnce(() => Promise.resolve({
                mindful_backend_url: 'http://wrong.com'
            }));

            await expect(storageManager.saveBackendUrl(testUrl))
                .rejects.toThrow();
        });

        test('должен валидировать входные данные', async () => {
            await expect(storageManager.saveBackendUrl('')).rejects.toThrow(TypeError);
            await expect(storageManager.saveBackendUrl(null)).rejects.toThrow(TypeError);
            await expect(storageManager.saveBackendUrl(123)).rejects.toThrow(TypeError);
        });
    });

    describe('loadDomainExceptions', () => {
        test('должен загружать и нормализовать домены', async () => {
            memoryStorage.mindful_domain_exceptions = ['Example.com', ' ', 'sub.Example.com', 'example.com'];

            const domains = await storageManager.loadDomainExceptions();

            expect(domains).toEqual(['example.com', 'sub.example.com']);
        });

        test('должен возвращать пустой массив при ошибке', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const domains = await storageManager.loadDomainExceptions();

            expect(domains).toEqual([]);
        });
    });

    describe('saveDomainExceptions', () => {
        test('должен сохранять нормализованный список доменов', async () => {
            const result = await storageManager.saveDomainExceptions(['Example.com', 'test.com', 'example.com']);

            expect(result).toBe(true);
            expect(memoryStorage.mindful_domain_exceptions).toEqual(['example.com', 'test.com']);
        });

        test('должен выбрасывать ошибку если аргумент не массив', async () => {
            await expect(storageManager.saveDomainExceptions('example.com')).rejects.toThrow(TypeError);
        });
    });

    describe('notifyDomainExceptionsUpdate', () => {
        test('должен отправлять обновление исключений доменов', async () => {
            const result = await storageManager.notifyDomainExceptionsUpdate(['Example.com']);

            expect(result).toBe(true);
            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'updateDomainExceptions',
                domains: ['example.com']
            });
        });

        test('должен возвращать false при ошибке отправки', async () => {
            global.chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Send error'));

            const result = await storageManager.notifyDomainExceptionsUpdate(['example.com']);

            expect(result).toBe(false);
        });

        test('должен выбрасывать ошибку при неверном типе данных', async () => {
            await expect(storageManager.notifyDomainExceptionsUpdate('example.com')).rejects.toThrow(TypeError);
        });
    });

    describe('resetToDefault', () => {
        test('должен сбрасывать настройки к значениям по умолчанию', async () => {
            const url = await storageManager.resetToDefault();

            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
            expect(memoryStorage.mindful_backend_url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
            expect(memoryStorage.mindful_domain_exceptions).toEqual([]);
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

            // Сохраняем
            await storageManager.saveBackendUrl(testUrl);
            
            // Загружаем
            const loadedUrl = await storageManager.loadBackendUrl();
            
            expect(loadedUrl).toBe(testUrl);
        });

        test('reset -> load должен возвращать значение по умолчанию', async () => {
            await storageManager.resetToDefault();
            const url = await storageManager.loadBackendUrl();
            
            expect(url).toBe(StorageManager.DEFAULT_VALUES.BACKEND_URL);
        });
    });
});
