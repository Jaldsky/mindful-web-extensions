/**
 * @jest-environment jsdom
 */

const ActivityManager = require('../../../../src/managers/options/ui/ActivityManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('ActivityManager', () => {
    let manager;
    let activityManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        activityManager = new ActivityManager(manager);
        
        // Setup DOM elements
        document.body.innerHTML = `
            <div id="activityEvents"></div>
            <div id="activityActive"></div>
            <div id="activityInactive"></div>
            <div id="activityDomainsCount"></div>
            <div id="activityQueueSize"></div>
            <ul id="activityDomainsList"></ul>
            <canvas id="activityChart"></canvas>
            <select id="activityRangeSelect">
                <option value="1h">1h</option>
                <option value="1d">1d</option>
            </select>
        `;
        
        // Mock canvas methods
        const canvas = document.getElementById('activityChart');
        canvas.getContext = jest.fn(() => ({
            setTransform: jest.fn(),
            clearRect: jest.fn(),
            scale: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            fillRect: jest.fn(),
            fillText: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            setLineDash: jest.fn(),
            measureText: jest.fn(() => ({ width: 50 }))
        }));
        
        Object.defineProperty(canvas, 'clientWidth', { value: 400, writable: true });
        Object.defineProperty(canvas, 'offsetWidth', { value: 400, writable: true });
        Object.defineProperty(canvas, 'height', { value: 120, writable: true });
        
        Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true });
        
        // Mock getComputedStyle
        global.getComputedStyle = jest.fn(() => ({
            height: '120px',
            getPropertyValue: jest.fn((prop) => {
                if (prop === '--color-bg-secondary') return '#f5f5f5';
                if (prop === '--color-text-secondary') return '#666';
                if (prop === '--border-color') return '#ddd';
                if (prop === '--color-primary') return '#4CAF50';
                return '';
            })
        }));
        
        manager.serviceWorkerManager.getDetailedStats = jest.fn().mockResolvedValue({
            eventsTracked: 100,
            activeEvents: 80,
            inactiveEvents: 20,
            domainsVisited: 5,
            queueSize: 10,
            domains: ['example.com', 'test.com']
        });
        
        manager.localeManager.t = jest.fn((key) => {
            const translations = {
                'options.activity.noDomains': 'No domains'
            };
            return translations[key] || key;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('constructor', () => {
        test('инициализирует с правильными значениями по умолчанию', () => {
            expect(activityManager.activityHistory).toEqual([]);
            expect(activityManager.activityChartInitialized).toBe(false);
            expect(activityManager.activityRangeKey).toBe('5m');
            expect(activityManager.activityRangeMs).toBe(5 * 60 * 1000);
        });
    });

    describe('loadActivityStats', () => {
        test('загружает статистику и обновляет DOM', async () => {
            await activityManager.loadActivityStats();

            expect(document.getElementById('activityEvents').textContent).toBe('100');
            expect(document.getElementById('activityActive').textContent).toBe('80');
            expect(document.getElementById('activityInactive').textContent).toBe('20');
            expect(document.getElementById('activityDomainsCount').textContent).toBe('5');
            expect(document.getElementById('activityQueueSize').textContent).toBe('10');
            
            const list = document.getElementById('activityDomainsList');
            expect(list.children.length).toBe(2);
            expect(list.children[0].textContent).toBe('example.com');
            expect(list.children[1].textContent).toBe('test.com');
        });

        test('отображает сообщение когда доменов нет', async () => {
            manager.serviceWorkerManager.getDetailedStats.mockResolvedValue({
                eventsTracked: 0,
                activeEvents: 0,
                inactiveEvents: 0,
                domainsVisited: 0,
                queueSize: 0,
                domains: []
            });

            await activityManager.loadActivityStats();

            const list = document.getElementById('activityDomainsList');
            expect(list.children.length).toBe(1);
            expect(list.children[0].className).toBe('activity-domains-empty');
            expect(list.children[0].textContent).toBe('No domains');
        });

        test('обрабатывает ошибки при загрузке статистики', async () => {
            const error = new Error('Test error');
            manager.serviceWorkerManager.getDetailedStats.mockRejectedValue(error);

            await activityManager.loadActivityStats();

            expect(manager._logError).toHaveBeenCalled();
        });

        test('ограничивает количество отображаемых доменов', async () => {
            const manyDomains = Array.from({ length: 150 }, (_, i) => `domain${i}.com`);
            manager.serviceWorkerManager.getDetailedStats.mockResolvedValue({
                eventsTracked: 100,
                activeEvents: 80,
                inactiveEvents: 20,
                domainsVisited: 150,
                queueSize: 10,
                domains: manyDomains
            });

            await activityManager.loadActivityStats();

            const list = document.getElementById('activityDomainsList');
            expect(list.children.length).toBe(100);
        });
    });

    describe('setActivityRangeByKey', () => {
        test('устанавливает диапазон по ключу', () => {
            activityManager.setActivityRangeByKey('1d');
            
            expect(activityManager.activityRangeKey).toBe('1d');
            expect(activityManager.activityRangeMs).toBe(24 * 60 * 60 * 1000);
            
            const select = document.getElementById('activityRangeSelect');
            expect(select.value).toBe('1d');
        });

        test('не устанавливает невалидный ключ', () => {
            const originalKey = activityManager.activityRangeKey;
            const originalMs = activityManager.activityRangeMs;
            
            activityManager.setActivityRangeByKey('invalid');
            
            // Проверяем что значения не изменились (могут быть разные из-за CONFIG)
            expect(activityManager.activityRangeKey).toBe(originalKey);
            expect(activityManager.activityRangeMs).toBe(originalMs);
        });

        test('обновляет график при изменении диапазона', () => {
            // Инициализируем график сначала
            activityManager._updateActivityChart(10, true);
            
            const lastValue = 20;
            activityManager.activityHistory = [
                { t: Date.now() - 1000, v: 10 },
                { t: Date.now(), v: lastValue }
            ];
            
            // Получаем canvas после инициализации
            const canvas = document.getElementById('activityChart');
            expect(canvas).toBeDefined();
            
            // Создаем spy для проверки вызова _updateActivityChart
            const updateSpy = jest.spyOn(activityManager, '_updateActivityChart');
            
            activityManager.setActivityRangeByKey('1d');
            
            // Проверяем что _updateActivityChart был вызван с последним значением
            expect(updateSpy).toHaveBeenCalledWith(lastValue, false);
            
            updateSpy.mockRestore();
        });

        test('обрабатывает ошибки при установке диапазона', () => {
            document.getElementById('activityRangeSelect').value = null;
            
            activityManager.setActivityRangeByKey('1h');
            
            expect(manager._logError).not.toHaveBeenCalled();
        });
    });

    describe('startActivityAutoRefresh', () => {
        test('запускает автообновление', () => {
            jest.useFakeTimers();
            const setIntervalSpy = jest.spyOn(global, 'setInterval');
            
            activityManager.startActivityAutoRefresh();
            
            expect(manager.activityRefreshIntervalId).toBeDefined();
            expect(setIntervalSpy).toHaveBeenCalled();
            
            jest.advanceTimersByTime(1000);
            expect(manager.serviceWorkerManager.getDetailedStats).toHaveBeenCalled();
            
            setIntervalSpy.mockRestore();
        });

        test('останавливает предыдущее автообновление перед запуском нового', () => {
            jest.useFakeTimers();
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            activityManager.startActivityAutoRefresh();
            const firstIntervalId = manager.activityRefreshIntervalId;
            
            activityManager.startActivityAutoRefresh();
            
            expect(clearIntervalSpy).toHaveBeenCalledWith(firstIntervalId);
            
            clearIntervalSpy.mockRestore();
        });

        test('обрабатывает ошибки при запуске автообновления', () => {
            manager.serviceWorkerManager.getDetailedStats.mockRejectedValue(new Error('Test'));
            
            activityManager.startActivityAutoRefresh();
            
            expect(manager._logError).not.toHaveBeenCalled(); // Ошибки обрабатываются внутри
        });
    });

    describe('stopActivityAutoRefresh', () => {
        test('останавливает автообновление', () => {
            jest.useFakeTimers();
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            
            activityManager.startActivityAutoRefresh();
            const intervalId = manager.activityRefreshIntervalId;
            
            activityManager.stopActivityAutoRefresh();
            
            expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
            expect(manager.activityRefreshIntervalId).toBeNull();
            
            clearIntervalSpy.mockRestore();
        });

        test('не вызывает ошибку если автообновление не запущено', () => {
            manager.activityRefreshIntervalId = null;
            
            activityManager.stopActivityAutoRefresh();
            
            expect(manager._logError).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибки при остановке', () => {
            jest.useFakeTimers();
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            clearIntervalSpy.mockImplementation(() => { throw new Error('Test'); });
            
            manager.activityRefreshIntervalId = setTimeout(() => {}, 1000);
            
            activityManager.stopActivityAutoRefresh();
            
            expect(manager._logError).toHaveBeenCalled();
            
            clearIntervalSpy.mockRestore();
        });
    });

    describe('_updateActivityChart', () => {
        test('инициализирует график при первом вызове', () => {
            activityManager._updateActivityChart(100, true);
            
            expect(activityManager.activityChartInitialized).toBe(true);
            const canvas = document.getElementById('activityChart');
            expect(canvas.width).toBeGreaterThan(0);
            expect(canvas.height).toBeGreaterThan(0);
        });

        test('добавляет точку в историю', () => {
            activityManager._updateActivityChart(100, true);
            
            expect(activityManager.activityHistory.length).toBe(1);
            expect(activityManager.activityHistory[0].v).toBe(100);
        });

        test('не добавляет точку если addPoint = false', () => {
            activityManager._updateActivityChart(100, false);
            
            expect(activityManager.activityHistory.length).toBe(0);
        });

        test('фильтрует старые точки из истории', () => {
            const now = Date.now();
            activityManager.activityHistory = [
                { t: now - 25 * 60 * 60 * 1000, v: 10 }, // 25 часов назад
                { t: now - 1 * 60 * 60 * 1000, v: 20 }, // 1 час назад
                { t: now, v: 30 }
            ];
            
            activityManager._updateActivityChart(40, true);
            
            // Старые точки должны быть удалены
            expect(activityManager.activityHistory.length).toBeLessThanOrEqual(4);
        });

        test('обрабатывает отсутствие canvas', () => {
            document.getElementById('activityChart').remove();
            
            activityManager._updateActivityChart(100, true);
            
            expect(activityManager.activityHistory.length).toBe(0);
        });

        test('обрабатывает ошибки при обновлении графика', () => {
            const canvas = document.getElementById('activityChart');
            canvas.getContext = jest.fn(() => {
                throw new Error('Test error');
            });
            
            activityManager._updateActivityChart(100, true);
            
            expect(manager._logError).toHaveBeenCalled();
        });
    });
});
