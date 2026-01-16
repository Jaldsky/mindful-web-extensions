/**
 * Тесты для StorageManager (tracker_manager)
 */

const StorageManager = require('../../../../src/managers/tracker/core/StorageManager.js');

describe('StorageManager (Tracker)', () => {
    let storageManager;
    let memoryStorage;

    beforeEach(() => {
        // Настраиваем chrome API
        if (!global.chrome) {
            global.chrome = {};
        }
        
        if (!global.chrome.storage) {
            global.chrome.storage = {
                local: {
                    get: jest.fn(),
                    set: jest.fn(),
                    remove: jest.fn()
                }
            };
        }

        memoryStorage = {};

        // Настраиваем моки по умолчанию
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
        global.chrome.storage.local.remove.mockImplementation((keys) => {
            (Array.isArray(keys) ? keys : [keys]).forEach((key) => {
                delete memoryStorage[key];
            });
            return Promise.resolve();
        });

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

        test('должен иметь начальные значения', () => {
            expect(storageManager.userId).toBeNull();
            expect(storageManager.backendUrl).toBe('http://localhost:8000/api/v1/events/save');
        });
    });

    describe('getOrCreateUserId', () => {
        test('должен загружать существующий userId', async () => {
            const testUserId = 'test-user-id-123';
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_user_id: testUserId
            });

            const userId = await storageManager.getOrCreateUserId();

            expect(userId).toBe(testUserId);
            expect(storageManager.userId).toBe(testUserId);
            expect(global.chrome.storage.local.get).toHaveBeenCalledWith(['mindful_user_id']);
        });

        test('должен создавать новый userId если не существует', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const userId = await storageManager.getOrCreateUserId();

            expect(userId).toBeDefined();
            expect(userId).toMatch(/^[0-9a-f-]{36}$/); // UUID v4 format
            expect(storageManager.userId).toBe(userId);
            expect(global.chrome.storage.local.set).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки', async () => {
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            await expect(storageManager.getOrCreateUserId()).rejects.toThrow('Storage error');
        });
    });

    describe('loadBackendUrl', () => {
        test('должен загружать URL из хранилища', async () => {
            const testUrl = 'http://test.com/api';
            memoryStorage.mindful_backend_url = testUrl;

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(testUrl);
            expect(storageManager.backendUrl).toBe(testUrl);
        });

        test('должен использовать URL по умолчанию если не найден', async () => {
            const url = await storageManager.loadBackendUrl();

            expect(url).toBe('http://localhost:8000/api/v1/events/save');
        });

        test('должен обрабатывать ошибки и возвращать URL по умолчанию', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe('http://localhost:8000/api/v1/events/save');
        });
    });

    describe('saveBackendUrl', () => {
        test('должен сохранять URL', async () => {
            const testUrl = 'http://newtest.com/api';

            const result = await storageManager.saveBackendUrl(testUrl);

            expect(result).toBe(true);
            expect(storageManager.backendUrl).toBe(testUrl);
            expect(memoryStorage.mindful_backend_url).toBe(testUrl);
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Save error'));

            const result = await storageManager.saveBackendUrl('http://test.com');

            expect(result).toBe(false);
        });
    });

    describe('restoreEventQueue', () => {
        test('должен восстанавливать очередь событий', async () => {
            const testQueue = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];
            memoryStorage.mindful_event_queue = testQueue;

            const queue = await storageManager.restoreEventQueue();

            expect(queue).toEqual(testQueue);
        });

        test('должен возвращать пустой массив если очередь не найдена', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const queue = await storageManager.restoreEventQueue();

            expect(queue).toEqual([]);
        });

        test('должен обрабатывать ошибки', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const queue = await storageManager.restoreEventQueue();

            expect(queue).toEqual([]);
        });
    });

    describe('saveEventQueue', () => {
        test('должен сохранять очередь событий', async () => {
            const testQueue = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];

            const result = await storageManager.saveEventQueue(testQueue);

            expect(result).toBe(true);
            expect(memoryStorage.mindful_event_queue).toEqual(testQueue);
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Save error'));

            const result = await storageManager.saveEventQueue([]);

            expect(result).toBe(false);
        });
    });

    describe('loadDomainExceptions', () => {
        test('должен загружать список исключений доменов', async () => {
            memoryStorage.mindful_domain_exceptions = ['Example.com', 'test.com', 'example.com'];

            const domains = await storageManager.loadDomainExceptions();

            expect(domains).toEqual(['example.com', 'test.com']);
            expect(storageManager.getDomainExceptions()).toEqual(['example.com', 'test.com']);
        });

        test('должен возвращать пустой массив при ошибке', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const domains = await storageManager.loadDomainExceptions();

            expect(domains).toEqual([]);
            expect(storageManager.getDomainExceptions()).toEqual([]);
        });
    });

    describe('saveDomainExceptions', () => {
        test('должен сохранять нормализованный список исключений', async () => {
            const result = await storageManager.saveDomainExceptions(['Example.com', 'sub.Example.com', 'example.com']);

            expect(result).toBe(true);
            expect(memoryStorage.mindful_domain_exceptions).toEqual(['example.com', 'sub.example.com']);
        });

        test('должен возвращать false при ошибке сохранения', async () => {
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Save error'));

            const result = await storageManager.saveDomainExceptions(['example.com']);

            expect(result).toBe(false);
        });
    });

    describe('loadAnonymousSession', () => {
        test('должен загружать анонимную сессию из хранилища', async () => {
            const testAnonId = 'anon-id-123';
            const testAnonToken = 'anon-token-456';
            memoryStorage.mindful_anon_id = testAnonId;
            memoryStorage.mindful_anon_token = testAnonToken;

            const result = await storageManager.loadAnonymousSession();

            expect(result.anonId).toBe(testAnonId);
            expect(result.anonToken).toBe(testAnonToken);
            expect(storageManager.anonId).toBe(testAnonId);
            expect(storageManager.anonToken).toBe(testAnonToken);
        });

        test('должен возвращать null если сессия не найдена', async () => {
            const result = await storageManager.loadAnonymousSession();

            expect(result.anonId).toBeNull();
            expect(result.anonToken).toBeNull();
        });

        test('должен обрабатывать ошибки и возвращать null', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const result = await storageManager.loadAnonymousSession();

            expect(result.anonId).toBeNull();
            expect(result.anonToken).toBeNull();
        });
    });

    describe('loadAuthSession', () => {
        test('должен загружать авторизационную сессию из хранилища', async () => {
            const testAccessToken = 'access-token-123';
            const testRefreshToken = 'refresh-token-456';
            memoryStorage.mindful_auth_access_token = testAccessToken;
            memoryStorage.mindful_auth_refresh_token = testRefreshToken;

            const result = await storageManager.loadAuthSession();

            expect(result.accessToken).toBe(testAccessToken);
            expect(result.refreshToken).toBe(testRefreshToken);
            expect(storageManager.accessToken).toBe(testAccessToken);
            expect(storageManager.refreshToken).toBe(testRefreshToken);
        });

        test('должен возвращать null если сессия не найдена', async () => {
            const result = await storageManager.loadAuthSession();

            expect(result.accessToken).toBeNull();
            expect(result.refreshToken).toBeNull();
        });

        test('должен обрабатывать ошибки и возвращать null', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const result = await storageManager.loadAuthSession();

            expect(result.accessToken).toBeNull();
            expect(result.refreshToken).toBeNull();
        });
    });

    describe('saveAnonymousSession', () => {
        test('должен сохранять анонимную сессию в хранилище', async () => {
            const testAnonId = 'anon-id-123';
            const testAnonToken = 'anon-token-456';

            const result = await storageManager.saveAnonymousSession(testAnonId, testAnonToken);

            expect(result).toBe(true);
            expect(storageManager.anonId).toBe(testAnonId);
            expect(storageManager.anonToken).toBe(testAnonToken);
            expect(memoryStorage.mindful_anon_id).toBe(testAnonId);
            expect(memoryStorage.mindful_anon_token).toBe(testAnonToken);
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Save error'));

            const result = await storageManager.saveAnonymousSession('anon-id', 'anon-token');

            expect(result).toBe(false);
        });
    });

    describe('saveAuthSession', () => {
        test('должен сохранять авторизационную сессию в хранилище', async () => {
            const testAccessToken = 'access-token-123';
            const testRefreshToken = 'refresh-token-456';

            const result = await storageManager.saveAuthSession(testAccessToken, testRefreshToken);

            expect(result).toBe(true);
            expect(storageManager.accessToken).toBe(testAccessToken);
            expect(storageManager.refreshToken).toBe(testRefreshToken);
            expect(memoryStorage.mindful_auth_access_token).toBe(testAccessToken);
            expect(memoryStorage.mindful_auth_refresh_token).toBe(testRefreshToken);
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Save error'));

            const result = await storageManager.saveAuthSession('access-token', 'refresh-token');

            expect(result).toBe(false);
        });
    });

    describe('clearAuthSession', () => {
        test('должен очищать авторизационную сессию из хранилища', async () => {
            storageManager.accessToken = 'access-token';
            storageManager.refreshToken = 'refresh-token';
            memoryStorage.mindful_auth_access_token = 'access-token';
            memoryStorage.mindful_auth_refresh_token = 'refresh-token';

            const result = await storageManager.clearAuthSession();

            expect(result).toBe(true);
            expect(storageManager.accessToken).toBeNull();
            expect(storageManager.refreshToken).toBeNull();
            expect(memoryStorage.mindful_auth_access_token).toBeUndefined();
            expect(memoryStorage.mindful_auth_refresh_token).toBeUndefined();
        });

        test('должен обрабатывать ошибки при очистке', async () => {
            global.chrome.storage.local.remove.mockRejectedValueOnce(new Error('Remove error'));

            const result = await storageManager.clearAuthSession();

            expect(result).toBe(false);
        });
    });

    describe('loadTrackingEnabled', () => {
        test('должен загружать статус отслеживания из хранилища', async () => {
            memoryStorage.mindful_tracking_enabled = true;

            const result = await storageManager.loadTrackingEnabled();

            expect(result).toBe(true);
            expect(storageManager.trackingEnabled).toBe(true);
        });

        test('должен использовать значение по умолчанию если не найдено', async () => {
            const result = await storageManager.loadTrackingEnabled();

            expect(result).toBe(true); // DEFAULT_TRACKING_ENABLED
            expect(storageManager.trackingEnabled).toBe(true);
        });

        test('должен использовать значение по умолчанию если тип не boolean', async () => {
            memoryStorage.mindful_tracking_enabled = 'true';

            const result = await storageManager.loadTrackingEnabled();

            expect(result).toBe(true); // DEFAULT_TRACKING_ENABLED
        });

        test('должен обрабатывать ошибки и возвращать значение по умолчанию', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

            const result = await storageManager.loadTrackingEnabled();

            expect(result).toBe(true); // DEFAULT_TRACKING_ENABLED
        });
    });

    describe('saveTrackingEnabled', () => {
        test('должен сохранять статус отслеживания в хранилище', async () => {
            const result = await storageManager.saveTrackingEnabled(false);

            expect(result).toBe(true);
            expect(storageManager.trackingEnabled).toBe(false);
            expect(memoryStorage.mindful_tracking_enabled).toBe(false);
        });

        test('должен выбрасывать TypeError для неверного типа', async () => {
            await expect(storageManager.saveTrackingEnabled('true')).rejects.toThrow(TypeError);
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValueOnce(new Error('Save error'));

            const result = await storageManager.saveTrackingEnabled(true);

            expect(result).toBe(false);
        });
    });

    describe('getUserId / getBackendUrl', () => {
        test('getUserId должен возвращать текущий userId', () => {
            storageManager.userId = 'test-id';

            expect(storageManager.getUserId()).toBe('test-id');
        });

        test('getBackendUrl должен возвращать текущий URL', () => {
            storageManager.backendUrl = 'http://test.com/api';

            expect(storageManager.getBackendUrl()).toBe('http://test.com/api');
        });
    });

    describe('getAccessToken / getRefreshToken / getAnonId / getAnonToken', () => {
        test('getAccessToken должен возвращать текущий access токен', () => {
            storageManager.accessToken = 'access-token-123';

            expect(storageManager.getAccessToken()).toBe('access-token-123');
        });

        test('getRefreshToken должен возвращать текущий refresh токен', () => {
            storageManager.refreshToken = 'refresh-token-456';

            expect(storageManager.getRefreshToken()).toBe('refresh-token-456');
        });

        test('getAnonId должен возвращать текущий anon ID', () => {
            storageManager.anonId = 'anon-id-789';

            expect(storageManager.getAnonId()).toBe('anon-id-789');
        });

        test('getAnonToken должен возвращать текущий anon токен', () => {
            storageManager.anonToken = 'anon-token-012';

            expect(storageManager.getAnonToken()).toBe('anon-token-012');
        });

        test('должны возвращать null если значения не установлены', () => {
            expect(storageManager.getAccessToken()).toBeNull();
            expect(storageManager.getRefreshToken()).toBeNull();
            expect(storageManager.getAnonId()).toBeNull();
            expect(storageManager.getAnonToken()).toBeNull();
        });
    });

    describe('clearAll', () => {
        test('должен очищать все данные из хранилища', async () => {
            storageManager.userId = 'test-id';
            storageManager.backendUrl = 'http://test.com';
            storageManager.domainExceptions = ['example.com'];
            memoryStorage.mindful_domain_exceptions = ['example.com'];

            const result = await storageManager.clearAll();

            expect(result).toBe(true);
            expect(storageManager.userId).toBeNull();
            expect(storageManager.backendUrl).toBe('http://localhost:8000/api/v1/events/save');
            expect(global.chrome.storage.local.remove).toHaveBeenCalled();
            expect(storageManager.getDomainExceptions()).toEqual([]);
            expect(memoryStorage.mindful_domain_exceptions).toBeUndefined();
        });

        test('должен обрабатывать ошибки при очистке', async () => {
            global.chrome.storage.local.remove.mockRejectedValueOnce(new Error('Remove error'));

            const result = await storageManager.clearAll();

            expect(result).toBe(false);
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            storageManager.userId = 'test-id';
            storageManager.backendUrl = 'http://test.com';
            storageManager.domainExceptions = ['example.com'];
            storageManager.trackingEnabled = true;

            storageManager.destroy();

            expect(storageManager.userId).toBeNull();
            expect(storageManager.backendUrl).toBeNull();
            expect(storageManager.domainExceptions).toEqual([]);
            expect(storageManager.trackingEnabled).toBe(true);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(storageManager.getState).toBeDefined();
            expect(storageManager.updateState).toBeDefined();
            expect(storageManager.destroy).toBeDefined();
        });

        test('должен иметь CONSTANTS', () => {
            expect(storageManager.CONSTANTS).toBeDefined();
        });
    });
});
