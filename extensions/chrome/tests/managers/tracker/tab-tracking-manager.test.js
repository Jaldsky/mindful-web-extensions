/**
 * Тесты для TabTrackingManager
 */

const TabTrackingManager = require('../../../src/managers/tracker/TabTrackingManager.js');
const EventQueueManager = require('../../../src/managers/tracker/EventQueueManager.js');
const BackendManager = require('../../../src/managers/tracker/BackendManager.js');
const StatisticsManager = require('../../../src/managers/tracker/StatisticsManager.js');
const StorageManager = require('../../../src/managers/tracker/StorageManager.js');

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

    describe('_handleTabUpdated', () => {
        test('должен обрабатывать обновление вкладки', () => {
            const testTab = { id: 1, url: 'https://test.com', active: true };

            tabTrackingManager._handleTabUpdated(testTab);

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
            expect(tabTrackingManager.previousActiveTab).toEqual(testTab);
        });

        test('должен отправлять inactive для предыдущей вкладки при обновлении', () => {
            tabTrackingManager.previousActiveTab = { id: 1, url: 'https://old.com' };
            
            const newTab = { id: 2, url: 'https://new.com', active: true };

            tabTrackingManager._handleTabUpdated(newTab);

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'old.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'new.com');
        });

        test('должен игнорировать вкладки без URL', () => {
            const testTab = { id: 1, active: true };

            tabTrackingManager._handleTabUpdated(testTab);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен игнорировать вкладки с невалидными доменами', () => {
            const testTab = { id: 1, url: 'chrome://extensions', active: true };

            tabTrackingManager._handleTabUpdated(testTab);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('не должен отправлять inactive для той же вкладки', () => {
            tabTrackingManager.previousActiveTab = { id: 1, url: 'https://test.com' };
            
            const sameTab = { id: 1, url: 'https://test.com', active: true };

            tabTrackingManager._handleTabUpdated(sameTab);

            expect(eventQueueManager.addEvent).toHaveBeenCalledTimes(1);
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
        });
    });

    describe('_handleTabRemoved', () => {
        test('должен обрабатывать закрытие окна', async () => {
            const testTab = { id: 1, url: 'https://test.com', active: true };
            global.chrome.tabs.query.mockResolvedValue([testTab]);

            await tabTrackingManager._handleTabRemoved(1, { windowClosing: true });

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'test.com');
        });

        test('должен игнорировать закрытие вкладки без закрытия окна', async () => {
            await tabTrackingManager._handleTabRemoved(1, { windowClosing: false });

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при закрытии вкладки', async () => {
            global.chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

            await tabTrackingManager._handleTabRemoved(1, { windowClosing: true });

            // Не должно выбрасывать ошибку
        });

        test('должен игнорировать вкладки без валидного домена при закрытии', async () => {
            const testTab = { id: 1, url: 'chrome://extensions', active: true };
            global.chrome.tabs.query.mockResolvedValue([testTab]);

            await tabTrackingManager._handleTabRemoved(1, { windowClosing: true });

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен обрабатывать пустой массив вкладок', async () => {
            global.chrome.tabs.query.mockResolvedValue([]);

            await tabTrackingManager._handleTabRemoved(1, { windowClosing: true });

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });
    });

    describe('_handleWindowFocusChanged', () => {
        test('должен обрабатывать потерю фокуса всеми окнами', async () => {
            tabTrackingManager.previousActiveTab = { id: 1, url: 'https://test.com' };

            await tabTrackingManager._handleWindowFocusChanged(chrome.windows.WINDOW_ID_NONE);

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'test.com');
        });

        test('должен обрабатывать получение фокуса окном', async () => {
            const testTab = { id: 1, url: 'https://test.com', active: true };
            global.chrome.tabs.query.mockResolvedValue([testTab]);

            await tabTrackingManager._handleWindowFocusChanged(1);

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
            expect(tabTrackingManager.previousActiveTab).toEqual(testTab);
        });

        test('должен игнорировать окна без активных вкладок', async () => {
            global.chrome.tabs.query.mockResolvedValue([]);

            await tabTrackingManager._handleWindowFocusChanged(1);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен игнорировать вкладки без URL при изменении фокуса', async () => {
            const testTab = { id: 1, active: true };
            global.chrome.tabs.query.mockResolvedValue([testTab]);

            await tabTrackingManager._handleWindowFocusChanged(1);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен игнорировать вкладки с невалидными доменами при изменении фокуса', async () => {
            const testTab = { id: 1, url: 'chrome://extensions', active: true };
            global.chrome.tabs.query.mockResolvedValue([testTab]);

            await tabTrackingManager._handleWindowFocusChanged(1);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при изменении фокуса окна', async () => {
            global.chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

            await tabTrackingManager._handleWindowFocusChanged(1);

            // Не должно выбрасывать ошибку
        });

        test('не должен отправлять inactive если нет предыдущей вкладки', async () => {
            tabTrackingManager.previousActiveTab = null;

            await tabTrackingManager._handleWindowFocusChanged(chrome.windows.WINDOW_ID_NONE);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('не должен отправлять inactive если предыдущая вкладка без URL', async () => {
            tabTrackingManager.previousActiveTab = { id: 1 };

            await tabTrackingManager._handleWindowFocusChanged(chrome.windows.WINDOW_ID_NONE);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('не должен отправлять inactive для невалидного домена', async () => {
            tabTrackingManager.previousActiveTab = { id: 1, url: 'chrome://extensions' };

            await tabTrackingManager._handleWindowFocusChanged(chrome.windows.WINDOW_ID_NONE);

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });
    });

    describe('_initializePreviousTab - обработка ошибок', () => {
        test('должен обрабатывать ошибки инициализации', async () => {
            global.chrome.tabs.query.mockRejectedValue(new Error('Query failed'));

            await tabTrackingManager._initializePreviousTab();

            expect(tabTrackingManager.previousActiveTab).toBeNull();
        });

        test('должен обрабатывать пустой массив вкладок', async () => {
            global.chrome.tabs.query.mockResolvedValue([]);

            await tabTrackingManager._initializePreviousTab();

            expect(tabTrackingManager.previousActiveTab).toBeNull();
        });
    });

    describe('_handleTabActivated - обработка ошибок', () => {
        test('должен обрабатывать ошибки получения информации о вкладке', async () => {
            global.chrome.tabs.get.mockRejectedValue(new Error('Tab not found'));

            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            // Не должно выбрасывать ошибку
        });

        test('должен игнорировать вкладки без URL', async () => {
            global.chrome.tabs.get.mockResolvedValue({ id: 1, active: true });

            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('должен игнорировать вкладки с невалидными доменами', async () => {
            global.chrome.tabs.get.mockResolvedValue({ id: 1, url: 'chrome://extensions', active: true });

            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            expect(eventQueueManager.addEvent).not.toHaveBeenCalled();
        });

        test('не должен отправлять inactive для той же вкладки', async () => {
            const testTab = { id: 1, url: 'https://test.com', active: true };
            tabTrackingManager.previousActiveTab = testTab;
            
            global.chrome.tabs.get.mockResolvedValue(testTab);

            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            expect(eventQueueManager.addEvent).toHaveBeenCalledTimes(1);
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
        });

        test('не должен отправлять inactive для предыдущей вкладки с невалидным доменом', async () => {
            tabTrackingManager.previousActiveTab = { id: 1, url: 'chrome://extensions' };
            
            const newTab = { id: 2, url: 'https://new.com', active: true };
            global.chrome.tabs.get.mockResolvedValue(newTab);

            await tabTrackingManager._handleTabActivated({ tabId: 2 });

            expect(eventQueueManager.addEvent).toHaveBeenCalledTimes(1);
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'new.com');
        });
    });

    describe('_extractDomain - дополнительные тесты', () => {
        test('должен обрабатывать URL с портом', () => {
            const domain = tabTrackingManager._extractDomain('https://example.com:8080/path');
            
            expect(domain).toBe('example.com');
        });

        test('должен обрабатывать URL с поддоменами', () => {
            const domain = tabTrackingManager._extractDomain('https://subdomain.example.com');
            
            expect(domain).toBe('subdomain.example.com');
        });

        test('должен возвращать null для localhost', () => {
            const domain = tabTrackingManager._extractDomain('http://localhost:3000');
            
            expect(domain).toBeNull();
        });

        test('должен обрабатывать IP адреса', () => {
            const domain = tabTrackingManager._extractDomain('http://192.168.1.1');
            
            // IP адреса не имеют точки в доменном имени и будут возвращены как есть
            expect(domain).toBeTruthy();
        });

        test('должен возвращать null для file:// протокола', () => {
            const domain = tabTrackingManager._extractDomain('file:///path/to/file.html');
            
            expect(domain).toBeNull();
        });

        test('должен обрабатывать ошибки парсинга URL', () => {
            const domain = tabTrackingManager._extractDomain('not a url at all');
            
            expect(domain).toBeNull();
        });

        test('должен возвращать null для пустой строки', () => {
            const domain = tabTrackingManager._extractDomain('');
            
            expect(domain).toBeNull();
        });

        test('должен корректно обрабатывать about:blank', () => {
            const domain = tabTrackingManager._extractDomain('about:blank');
            
            expect(domain).toBeNull();
        });

        test('должен обрабатывать data: URLs', () => {
            const domain = tabTrackingManager._extractDomain('data:text/html,<html></html>');
            
            expect(domain).toBeNull();
        });
    });

    describe('Интеграция событий', () => {
        test('должен обрабатывать последовательность событий активации вкладок', async () => {
            await tabTrackingManager.init();

            const tab1 = { id: 1, url: 'https://site1.com', active: true };
            const tab2 = { id: 2, url: 'https://site2.com', active: true };
            const tab3 = { id: 3, url: 'https://site3.com', active: true };

            global.chrome.tabs.get.mockResolvedValueOnce(tab1);
            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            global.chrome.tabs.get.mockResolvedValueOnce(tab2);
            await tabTrackingManager._handleTabActivated({ tabId: 2 });

            global.chrome.tabs.get.mockResolvedValueOnce(tab3);
            await tabTrackingManager._handleTabActivated({ tabId: 3 });

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'site1.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'site1.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'site2.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'site2.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'site3.com');
        });

        test('должен правильно обрабатывать цикл: активация -> обновление -> закрытие', async () => {
            await tabTrackingManager.init();

            const tab = { id: 1, url: 'https://test.com', active: true };

            // Активация
            global.chrome.tabs.get.mockResolvedValue(tab);
            await tabTrackingManager._handleTabActivated({ tabId: 1 });

            // Обновление (например, навигация на другую страницу)
            const updatedTab = { ...tab, url: 'https://test.com/page2' };
            tabTrackingManager._handleTabUpdated(updatedTab);

            // Закрытие
            global.chrome.tabs.query.mockResolvedValue([updatedTab]);
            await tabTrackingManager._handleTabRemoved(1, { windowClosing: true });

            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('active', 'test.com');
            expect(eventQueueManager.addEvent).toHaveBeenCalledWith('inactive', 'test.com');
        });
    });

    describe('Метрики производительности', () => {
        test('должен иметь Map для метрик', async () => {
            await tabTrackingManager.init();

            expect(tabTrackingManager.performanceMetrics).toBeInstanceOf(Map);
        });

        test('должен очищать метрики при destroy', () => {
            tabTrackingManager.performanceMetrics.set('test', 123);
            
            tabTrackingManager.destroy();

            expect(tabTrackingManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Состояние отслеживания', () => {
        test('должен правильно обновлять состояние при init', async () => {
            expect(tabTrackingManager.getState().isTracking).toBe(false);

            await tabTrackingManager.init();

            expect(tabTrackingManager.getState().isTracking).toBe(true);
        });

        test('должен правильно обновлять previousTabId', async () => {
            const testTab = { id: 123, url: 'https://test.com', active: true };
            global.chrome.tabs.get.mockResolvedValue(testTab);

            await tabTrackingManager._handleTabActivated({ tabId: 123 });

            expect(tabTrackingManager.getState().previousTabId).toBe(123);
        });
    });
});
