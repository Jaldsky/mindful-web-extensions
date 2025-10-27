/**
 * Тесты для theme_manager/SyncManager
 * Тестирует функциональность синхронизации темы между страницами
 */

const SyncManager = require('../../../src/managers/theme/SyncManager.js');

describe('theme_manager/SyncManager', () => {
    let syncManager;
    let mockOnChanged;

    beforeEach(() => {
        // Мокируем chrome.storage.onChanged
        mockOnChanged = {
            addListener: jest.fn(),
            removeListener: jest.fn()
        };

        global.chrome = {
            storage: {
                local: {},
                onChanged: mockOnChanged
            }
        };

        syncManager = new SyncManager({ enableLogging: false });
    });

    afterEach(() => {
        if (syncManager) {
            syncManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно', () => {
            expect(syncManager).toBeInstanceOf(SyncManager);
            expect(syncManager.storageListener).toBeNull();
        });

        test('должен создаваться с callback', () => {
            const callback = jest.fn();
            const manager = new SyncManager({ 
                enableLogging: false,
                onThemeChange: callback 
            });

            expect(manager.onThemeChangeCallback).toBe(callback);
            manager.destroy();
        });

        test('должен инициализировать статистику', () => {
            expect(syncManager.statistics).toBeDefined();
            expect(syncManager.statistics.changes).toBe(0);
            expect(syncManager.statistics.errors).toBe(0);
            expect(syncManager.statistics.lastChange).toBeNull();
        });

        test('должен иметь правильные константы', () => {
            expect(SyncManager.STORAGE_KEY).toBe('mindful_theme');
        });
    });

    describe('startListening', () => {
        test('должен добавлять слушателя изменений', () => {
            const callback = jest.fn();
            const result = syncManager.startListening(callback);

            expect(result).toBe(true);
            expect(mockOnChanged.addListener).toHaveBeenCalled();
            expect(syncManager.storageListener).not.toBeNull();
        });

        test('должен добавлять слушателя с callback', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            expect(syncManager.onThemeChangeCallback).toBe(callback);
            expect(mockOnChanged.addListener).toHaveBeenCalled();
        });

        test('должен удалять старого слушателя перед добавлением нового', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);
            const firstListener = syncManager.storageListener;

            syncManager.startListening(callback);

            expect(mockOnChanged.removeListener).toHaveBeenCalledWith(firstListener);
            expect(mockOnChanged.addListener).toHaveBeenCalledTimes(2);
        });

        test('должен возвращать false если API недоступен', () => {
            delete global.chrome.storage.onChanged;

            const result = syncManager.startListening();

            expect(result).toBe(false);
        });

        test('должен обрабатывать ошибки при добавлении слушателя', () => {
            mockOnChanged.addListener.mockImplementation(() => {
                throw new Error('API error');
            });

            const result = syncManager.startListening();

            expect(result).toBe(false);
        });
    });

    describe('Storage Listener', () => {
        test('должен вызывать callback при изменении темы', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            // Получаем созданный слушатель
            const listener = mockOnChanged.addListener.mock.calls[0][0];

            // Симулируем изменение темы
            const changes = {
                [SyncManager.STORAGE_KEY]: {
                    oldValue: 'light',
                    newValue: 'dark'
                }
            };
            listener(changes, 'local');

            expect(callback).toHaveBeenCalledWith('dark');
            expect(syncManager.statistics.changes).toBe(1);
        });

        test('должен игнорировать изменения других ключей', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            const listener = mockOnChanged.addListener.mock.calls[0][0];

            const changes = {
                'other_key': {
                    newValue: 'value'
                }
            };
            listener(changes, 'local');

            expect(callback).not.toHaveBeenCalled();
            expect(syncManager.statistics.changes).toBe(0);
        });

        test('должен игнорировать изменения из sync area', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            const listener = mockOnChanged.addListener.mock.calls[0][0];

            const changes = {
                [SyncManager.STORAGE_KEY]: {
                    newValue: 'dark'
                }
            };
            listener(changes, 'sync');

            expect(callback).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки в callback', () => {
            const callback = jest.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });
            syncManager.startListening(callback);

            const listener = mockOnChanged.addListener.mock.calls[0][0];

            const changes = {
                [SyncManager.STORAGE_KEY]: {
                    newValue: 'dark'
                }
            };

            // Не должно бросать ошибку
            expect(() => listener(changes, 'local')).not.toThrow();
            expect(syncManager.statistics.errors).toBe(1);
        });

        test('должен возвращать false без callback', () => {
            // startListening требует callback, иначе возвращает false
            const result = syncManager.startListening();

            expect(result).toBe(false);
            expect(mockOnChanged.addListener).not.toHaveBeenCalled();
        });

        test('должен обновлять статистику при изменении', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            const listener = mockOnChanged.addListener.mock.calls[0][0];

            const changes = {
                [SyncManager.STORAGE_KEY]: {
                    newValue: 'dark'
                }
            };
            listener(changes, 'local');

            expect(syncManager.statistics.lastChange).toBeDefined();
        });
    });

    describe('stopListening', () => {
        test('должен удалять слушателя', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);
            const listener = syncManager.storageListener;

            syncManager.stopListening();

            expect(mockOnChanged.removeListener).toHaveBeenCalledWith(listener);
            expect(syncManager.storageListener).toBeNull();
        });

        test('должен работать если слушателя нет', () => {
            expect(() => syncManager.stopListening()).not.toThrow();
            expect(mockOnChanged.removeListener).not.toHaveBeenCalled();
        });

        test('должен обрабатывать недоступность API', () => {
            syncManager.startListening();
            delete global.chrome.storage.onChanged;

            expect(() => syncManager.stopListening()).not.toThrow();
        });
    });

    describe('isListening', () => {
        test('должен возвращать true когда слушатель активен', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            expect(syncManager.isListening()).toBe(true);
        });

        test('должен возвращать false когда слушатель неактивен', () => {
            expect(syncManager.isListening()).toBe(false);
        });

        test('должен возвращать false после остановки', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);
            syncManager.stopListening();

            expect(syncManager.isListening()).toBe(false);
        });
    });

    describe('getStatistics', () => {
        test('должен возвращать статистику', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            const listener = mockOnChanged.addListener.mock.calls[0][0];

            // Симулируем несколько изменений
            listener({ [SyncManager.STORAGE_KEY]: { newValue: 'dark' } }, 'local');
            listener({ [SyncManager.STORAGE_KEY]: { newValue: 'light' } }, 'local');

            const stats = syncManager.getStatistics();

            expect(stats.changes).toBe(2);
            expect(stats.errors).toBe(0);
            expect(stats.lastChange).toBeDefined();
        });
    });

    describe('destroy', () => {
        test('должен останавливать прослушивание', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            syncManager.destroy();

            expect(mockOnChanged.removeListener).toHaveBeenCalled();
            expect(syncManager.storageListener).toBeNull();
        });

        test('должен очищать ресурсы', () => {
            const callback = jest.fn();
            syncManager.startListening(callback);

            const destroySpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(syncManager)), 'destroy');
            
            syncManager.destroy();

            expect(syncManager.onThemeChangeCallback).toBeNull();
            expect(destroySpy).toHaveBeenCalled();
        });

        test('должен работать если слушателя нет', () => {
            expect(() => syncManager.destroy()).not.toThrow();
        });
    });
});
