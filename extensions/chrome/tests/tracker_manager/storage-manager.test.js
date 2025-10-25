/**
 * Тесты для StorageManager (tracker_manager)
 */

const StorageManager = require('../../src/tracker_manager/StorageManager.js');

describe('StorageManager (Tracker)', () => {
    let storageManager;

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

        // Настраиваем моки по умолчанию
        global.chrome.storage.local.get.mockResolvedValue({});
        global.chrome.storage.local.set.mockResolvedValue();
        global.chrome.storage.local.remove.mockResolvedValue();

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
            expect(storageManager.backendUrl).toBe('http://localhost:8000/api/v1/events/send');
        });

        test('должен иметь performanceMetrics Map', () => {
            expect(storageManager.performanceMetrics).toBeInstanceOf(Map);
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
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: testUrl
            });

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe(testUrl);
            expect(storageManager.backendUrl).toBe(testUrl);
        });

        test('должен использовать URL по умолчанию если не найден', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe('http://localhost:8000/api/v1/events/send');
        });

        test('должен обрабатывать ошибки и возвращать URL по умолчанию', async () => {
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

            const url = await storageManager.loadBackendUrl();

            expect(url).toBe('http://localhost:8000/api/v1/events/send');
        });
    });

    describe('saveBackendUrl', () => {
        test('должен сохранять URL', async () => {
            const testUrl = 'http://newtest.com/api';

            const result = await storageManager.saveBackendUrl(testUrl);

            expect(result).toBe(true);
            expect(storageManager.backendUrl).toBe(testUrl);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                mindful_backend_url: testUrl
            });
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValue(new Error('Save error'));

            const result = await storageManager.saveBackendUrl('http://test.com');

            expect(result).toBe(false);
        });
    });

    describe('restoreEventQueue', () => {
        test('должен восстанавливать очередь событий', async () => {
            const testQueue = [
                { event: 'active', domain: 'test.com', timestamp: '2024-01-01' }
            ];
            global.chrome.storage.local.get.mockResolvedValue({
                mindful_event_queue: testQueue
            });

            const queue = await storageManager.restoreEventQueue();

            expect(queue).toEqual(testQueue);
        });

        test('должен возвращать пустой массив если очередь не найдена', async () => {
            global.chrome.storage.local.get.mockResolvedValue({});

            const queue = await storageManager.restoreEventQueue();

            expect(queue).toEqual([]);
        });

        test('должен обрабатывать ошибки', async () => {
            global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

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
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                mindful_event_queue: testQueue
            });
        });

        test('должен обрабатывать ошибки при сохранении', async () => {
            global.chrome.storage.local.set.mockRejectedValue(new Error('Save error'));

            const result = await storageManager.saveEventQueue([]);

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

    describe('clearAll', () => {
        test('должен очищать все данные из хранилища', async () => {
            storageManager.userId = 'test-id';
            storageManager.backendUrl = 'http://test.com';

            const result = await storageManager.clearAll();

            expect(result).toBe(true);
            expect(storageManager.userId).toBeNull();
            expect(storageManager.backendUrl).toBe('http://localhost:8000/api/v1/events/send');
            expect(global.chrome.storage.local.remove).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при очистке', async () => {
            global.chrome.storage.local.remove.mockRejectedValue(new Error('Remove error'));

            const result = await storageManager.clearAll();

            expect(result).toBe(false);
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', () => {
            storageManager.userId = 'test-id';
            storageManager.performanceMetrics.set('test', 100);

            storageManager.destroy();

            expect(storageManager.performanceMetrics.size).toBe(0);
            expect(storageManager.userId).toBeNull();
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
