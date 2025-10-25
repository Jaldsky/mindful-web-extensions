/**
 * Тесты для TabTrackingManager
 */

const TabTrackingManager = require('../../src/tracker_manager/TabTrackingManager.js');
const EventQueueManager = require('../../src/tracker_manager/EventQueueManager.js');
const BackendManager = require('../../src/tracker_manager/BackendManager.js');
const StatisticsManager = require('../../src/tracker_manager/StatisticsManager.js');
const StorageManager = require('../../src/tracker_manager/StorageManager.js');

describe('TabTrackingManager', () => {
    let tabTrackingManager;
    let eventQueueManager;
    let backendManager;
    let statisticsManager;
    let storageManager;

    beforeEach(() => {
        // Настраиваем chrome API (всегда переопределяем для чистоты тестов)
        global.chrome = {
            tabs: {
                onActivated: { addListener: jest.fn(), removeListener: jest.fn() },
                onUpdated: { addListener: jest.fn(), removeListener: jest.fn() },
                onRemoved: { addListener: jest.fn(), removeListener: jest.fn() },
                get: jest.fn().mockResolvedValue({ id: 1, url: 'https://test.com' }),
                query: jest.fn().mockResolvedValue([])
            },
            windows: {
                onFocusChanged: { addListener: jest.fn(), removeListener: jest.fn() },
                WINDOW_ID_NONE: -1
            },
            storage: {
                local: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue()
                }
            }
        };

        // Создаем зависимости
        backendManager = new BackendManager({ userId: 'test-user', enableLogging: false });
        statisticsManager = new StatisticsManager({ enableLogging: false });
        storageManager = new StorageManager({ enableLogging: false });
        eventQueueManager = new EventQueueManager(
            { backendManager, statisticsManager, storageManager },
            { enableLogging: false }
        );

        jest.spyOn(eventQueueManager, 'addEvent');

        // Создаем TabTrackingManager
        tabTrackingManager = new TabTrackingManager(
            { eventQueueManager },
            { enableLogging: false }
        );
    });

    afterEach(() => {
        if (tabTrackingManager) {
            tabTrackingManager.destroy();
        }
        if (eventQueueManager) {
            eventQueueManager.destroy();
        }
        if (backendManager) {
            backendManager.destroy();
        }
        if (statisticsManager) {
            statisticsManager.destroy();
        }
        if (storageManager) {
            storageManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться успешно с зависимостями', () => {
            expect(tabTrackingManager).toBeInstanceOf(TabTrackingManager);
        });

        test('должен выбрасывать ошибку без зависимостей', () => {
            expect(() => {
                new TabTrackingManager();
            }).toThrow();
        });

        test('должен иметь начальные значения', () => {
            expect(tabTrackingManager.previousActiveTab).toBeNull();
            expect(tabTrackingManager.eventListeners).toBeInstanceOf(Map);
        });

        test('должен иметь performanceMetrics Map', () => {
            expect(tabTrackingManager.performanceMetrics).toBeInstanceOf(Map);
        });
    });

    describe('init', () => {
        test('должен инициализировать отслеживание', async () => {
            global.chrome.tabs.query.mockResolvedValue([
                { id: 1, url: 'https://test.com', active: true }
            ]);

            await tabTrackingManager.init();

            expect(global.chrome.tabs.onActivated.addListener).toHaveBeenCalled();
            expect(global.chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
            expect(global.chrome.tabs.onRemoved.addListener).toHaveBeenCalled();
            expect(global.chrome.windows.onFocusChanged.addListener).toHaveBeenCalled();
            expect(tabTrackingManager.getState().isTracking).toBe(true);
        });

        test('должен инициализировать предыдущую вкладку', async () => {
            const testTab = { id: 1, url: 'https://test.com', active: true };
            global.chrome.tabs.query.mockResolvedValue([testTab]);

            await tabTrackingManager.init();

            expect(tabTrackingManager.previousActiveTab).toEqual(testTab);
        });
    });

    describe('_extractDomain', () => {
        test('должен извлекать домен из URL', () => {
            const domain = tabTrackingManager._extractDomain('https://www.test.com/path');
            
            expect(domain).toBe('test.com');
        });

        test('должен убирать www. префикс', () => {
            const domain = tabTrackingManager._extractDomain('https://www.example.com');
            
            expect(domain).toBe('example.com');
        });

        test('должен возвращать null для невалидных URL', () => {
            const domain1 = tabTrackingManager._extractDomain('invalid-url');
            const domain2 = tabTrackingManager._extractDomain('chrome-extension://abc123');
            const domain3 = tabTrackingManager._extractDomain('https://localhost');
            
            expect(domain1).toBeNull();
            expect(domain2).toBeNull();
            expect(domain3).toBeNull();
        });
    });

    describe('_handleTabActivated', () => {
        test('должен обрабатывать активацию вкладки', async () => {
            const testTab = { id: 1, url: 'https://test.com', active: true };
            global.chrome.tabs.get.mockResolvedValue(testTab);

            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
            expect(tabTrackingManager.previousActiveTab).toEqual(testTab);
        });

        test('должен отправлять inactive для предыдущей вкладки', async () => {
            tabTrackingManager.previousActiveTab = { id: 1, url: 'https://old.com' };
            
            const newTab = { id: 2, url: 'https://new.com', active: true };
            global.chrome.tabs.get.mockResolvedValue(newTab);

            await tabTrackingManager._handleTabActivated({ tabId: 2 });

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'old.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'new.com');
        });
    });

    describe('stopTracking', () => {
        test('должен останавливать отслеживание', async () => {
            await tabTrackingManager.init();
            
            tabTrackingManager.stopTracking();

            expect(global.chrome.tabs.onActivated.removeListener).toHaveBeenCalled();
            expect(global.chrome.tabs.onUpdated.removeListener).toHaveBeenCalled();
            expect(global.chrome.tabs.onRemoved.removeListener).toHaveBeenCalled();
            expect(global.chrome.windows.onFocusChanged.removeListener).toHaveBeenCalled();
            expect(tabTrackingManager.getState().isTracking).toBe(false);
        });

        test('должен очищать eventListeners', async () => {
            await tabTrackingManager.init();
            expect(tabTrackingManager.eventListeners.size).toBeGreaterThan(0);

            tabTrackingManager.stopTracking();
            expect(tabTrackingManager.eventListeners.size).toBe(0);
        });
    });

    describe('getPreviousActiveTab', () => {
        test('должен возвращать предыдущую активную вкладку', () => {
            const testTab = { id: 1, url: 'https://test.com' };
            tabTrackingManager.previousActiveTab = testTab;

            expect(tabTrackingManager.getPreviousActiveTab()).toEqual(testTab);
        });
    });

    describe('destroy', () => {
        test('должен очищать ресурсы', async () => {
            await tabTrackingManager.init();
            tabTrackingManager.previousActiveTab = { id: 1, url: 'https://test.com' };

            tabTrackingManager.destroy();

            expect(tabTrackingManager.eventListeners.size).toBe(0);
            expect(tabTrackingManager.previousActiveTab).toBeNull();
            expect(tabTrackingManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(tabTrackingManager.getState).toBeDefined();
            expect(tabTrackingManager.updateState).toBeDefined();
            expect(tabTrackingManager.destroy).toBeDefined();
        });
    });
});
