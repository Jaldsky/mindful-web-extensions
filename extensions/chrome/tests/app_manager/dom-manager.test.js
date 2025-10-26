/**
 * Тесты для DOMManager класса
 * Тестирует функциональность работы с DOM элементами
 */

const DOMManager = require('../../src/app_manager/DOMManager.js');

describe('DOMManager', () => {
    let domManager;

    beforeEach(() => {
        domManager = new DOMManager();
    });

    afterEach(() => {
        document.body.innerHTML = `
            <div id="connectionStatus"></div>
            <div id="trackingStatus"></div>
            <div id="eventsCount"></div>
            <div id="domainsCount"></div>
            <div id="queueSize"></div>
            <button id="openSettings"></button>
            <button id="testConnection"></button>
            <button id="reloadExtension"></button>
            <button id="runDiagnostics"></button>
        `;
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(domManager).toBeDefined();
            expect(domManager.elements).toBeDefined();
            expect(domManager.state).toBeDefined();
        });

        test('should cache DOM elements', () => {
            expect(domManager.elements.connectionStatus).toBeDefined();
            expect(domManager.elements.trackingStatus).toBeDefined();
            expect(domManager.elements.eventsCount).toBeDefined();
            expect(domManager.elements.domainsCount).toBeDefined();
            expect(domManager.elements.queueSize).toBeDefined();
            expect(domManager.elements.openSettings).toBeDefined();
            expect(domManager.elements.testConnection).toBeDefined();
            expect(domManager.elements.reloadExtension).toBeDefined();
            expect(domManager.elements.runDiagnostics).toBeDefined();
        });
    });

    describe('static properties', () => {
        test('should have CSS_CLASSES constant', () => {
            expect(DOMManager.CSS_CLASSES).toBeDefined();
            expect(DOMManager.CSS_CLASSES.STATUS_ONLINE).toBe('status-value status-online');
            expect(DOMManager.CSS_CLASSES.STATUS_OFFLINE).toBe('status-value status-offline');
            expect(DOMManager.CSS_CLASSES.STATUS_ACTIVE).toBe('status-value status-active');
            expect(DOMManager.CSS_CLASSES.STATUS_INACTIVE).toBe('status-value status-inactive');
        });

        test('should have ELEMENT_IDS constant', () => {
            expect(DOMManager.ELEMENT_IDS).toBeDefined();
            expect(DOMManager.ELEMENT_IDS.CONNECTION_STATUS).toBe('connectionStatus');
            expect(DOMManager.ELEMENT_IDS.TRACKING_STATUS).toBe('trackingStatus');
        });
    });

    describe('updateConnectionStatus', () => {
        test('should update connection status when online', () => {
            const result = domManager.updateConnectionStatus(true);

            expect(result).toBe(true);
            const statusElement = domManager.elements.connectionStatus;
            expect(statusElement.textContent).toContain('Connected');
            expect(statusElement.className).toBe(DOMManager.CSS_CLASSES.STATUS_ONLINE);
        });

        test('should update connection status when offline', () => {
            const result = domManager.updateConnectionStatus(false);
            
            expect(result).toBe(true);
            const statusElement = domManager.elements.connectionStatus;
            expect(statusElement.textContent).toContain('Disconnected');
            expect(statusElement.className).toBe(DOMManager.CSS_CLASSES.STATUS_OFFLINE);
        });

        test('should update state when connection status changes', () => {
            domManager.updateConnectionStatus(true);
            expect(domManager.state.isOnline).toBe(true);
            
            domManager.updateConnectionStatus(false);
            expect(domManager.state.isOnline).toBe(false);
        });

        test('should throw error for invalid parameter', () => {
            expect(() => domManager.updateConnectionStatus('invalid')).toThrow(TypeError);
            expect(() => domManager.updateConnectionStatus(null)).toThrow(TypeError);
            expect(() => domManager.updateConnectionStatus(123)).toThrow(TypeError);
        });

        test('should handle missing element gracefully', () => {
            const element = domManager.elements.connectionStatus;
            element.remove();
            domManager.reloadElements(); // Перезагружаем элементы
            
            const result = domManager.updateConnectionStatus(true);
            expect(result).toBe(false);
        });
    });

    describe('updateTrackingStatus', () => {
        test('should update tracking status when tracking is active', () => {
            const result = domManager.updateTrackingStatus(true);
            
            expect(result).toBe(true);
            const statusElement = domManager.elements.trackingStatus;
            expect(statusElement.textContent).toContain('Active');
            expect(statusElement.className).toBe(DOMManager.CSS_CLASSES.STATUS_ACTIVE);
        });

        test('should update tracking status when tracking is inactive', () => {
            const result = domManager.updateTrackingStatus(false);
            
            expect(result).toBe(true);
            const statusElement = domManager.elements.trackingStatus;
            expect(statusElement.textContent).toContain('Inactive');
            expect(statusElement.className).toBe(DOMManager.CSS_CLASSES.STATUS_INACTIVE);
        });

        test('should update state when tracking status changes', () => {
            domManager.updateTrackingStatus(true);
            expect(domManager.state.isTracking).toBe(true);
            
            domManager.updateTrackingStatus(false);
            expect(domManager.state.isTracking).toBe(false);
        });

        test('should throw error for invalid parameter', () => {
            expect(() => domManager.updateTrackingStatus('invalid')).toThrow(TypeError);
        });
    });

    describe('updateCounters', () => {
        test('should update all counter elements', () => {
            const counters = {
                events: 10,
                domains: 5,
                queue: 3
            };

            const results = domManager.updateCounters(counters);

            expect(results.events).toBe(true);
            expect(results.domains).toBe(true);
            expect(results.queue).toBe(true);
            expect(domManager.elements.eventsCount.textContent).toBe('10');
            expect(domManager.elements.domainsCount.textContent).toBe('5');
            expect(domManager.elements.queueSize.textContent).toBe('3');
        });

        test('should handle missing counter values', () => {
            const counters = {
                events: 10
            };

            domManager.updateCounters(counters);

            expect(domManager.elements.eventsCount.textContent).toBe('10');
            expect(domManager.elements.domainsCount.textContent).toBe('0');
            expect(domManager.elements.queueSize.textContent).toBe('0');
        });

        test('should handle empty counters object', () => {
            domManager.updateCounters({});

            expect(domManager.elements.eventsCount.textContent).toBe('0');
            expect(domManager.elements.domainsCount.textContent).toBe('0');
            expect(domManager.elements.queueSize.textContent).toBe('0');
        });

        test('should handle negative values', () => {
            domManager.updateCounters({ events: -5, domains: -1, queue: -10 });

            expect(domManager.elements.eventsCount.textContent).toBe('0');
            expect(domManager.elements.domainsCount.textContent).toBe('0');
            expect(domManager.elements.queueSize.textContent).toBe('0');
        });

        test('should throw error for invalid parameter', () => {
            expect(() => domManager.updateCounters(null)).toThrow(TypeError);
            expect(() => domManager.updateCounters('invalid')).toThrow(TypeError);
        });
    });

    describe('setButtonState', () => {
        test('should set button text and disabled state', () => {
            const button = document.createElement('button');
            const text = 'Test Button';
            const disabled = true;

            const result = domManager.setButtonState(button, text, disabled);

            expect(result).toBe(true);
            expect(button.textContent).toBe(text);
            expect(button.disabled).toBe(disabled);
        });

        test('should enable button when disabled is false', () => {
            const button = document.createElement('button');
            button.disabled = true;

            domManager.setButtonState(button, 'Test', false);

            expect(button.disabled).toBe(false);
        });

        test('should throw error for invalid parameters', () => {
            const button = document.createElement('button');
            
            expect(() => domManager.setButtonState(button, 123, true)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, 'Test', 'invalid')).toThrow(TypeError);
        });

        test('should return false for null button', () => {
            const result = domManager.setButtonState(null, 'Test', false);
            expect(result).toBe(false);
        });
    });

    describe('reloadElements', () => {
        test('should reload elements', () => {
            expect(() => domManager.reloadElements()).not.toThrow();
        });
    });

    describe('inheritance from BaseManager', () => {
        test('should have BaseManager methods', () => {
            expect(typeof domManager.updateState).toBe('function');
            expect(typeof domManager.getState).toBe('function');
        });

        test('should have CONSTANTS property', () => {
            expect(domManager.CONSTANTS).toBeDefined();
            expect(domManager.CONSTANTS.UPDATE_INTERVAL).toBeDefined();
            expect(domManager.CONSTANTS.NOTIFICATION_DURATION).toBeDefined();
        });

        test('should have initial state', () => {
            const state = domManager.getState();
            expect(state).toHaveProperty('isOnline');
            expect(state).toHaveProperty('isTracking');
            expect(state).toHaveProperty('lastUpdate');
        });

        test('should update state correctly', () => {
            const newState = { isOnline: true, isTracking: true };
            domManager.updateState(newState);
            
            const state = domManager.getState();
            expect(state.isOnline).toBe(true);
            expect(state.isTracking).toBe(true);
        });

        test('should have resetState method', () => {
            domManager.updateState({ isOnline: true, isTracking: true });
            domManager.resetState();
            
            const state = domManager.getState();
            expect(state.isOnline).toBe(false);
            expect(state.isTracking).toBe(false);
        });

        test('should have getConstant method', () => {
            const updateInterval = domManager.getConstant('UPDATE_INTERVAL');
            expect(updateInterval).toBe(20000);
        });
    });

    describe('destroy method', () => {
        test('should clean up resources', () => {
            domManager.destroy();
            expect(domManager.elements).toEqual({});
        });
    });

    describe('error handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            const element = domManager.elements.connectionStatus;
            element.remove();

            expect(() => {
                domManager.updateConnectionStatus(true);
            }).not.toThrow();
        });

        test('should handle null/undefined elements', () => {
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn(() => null);

            expect(() => {
                new DOMManager();
            }).not.toThrow();

            document.getElementById = originalGetElementById;
        });

        test('should throw in strict mode when elements are missing', () => {
            const originalGetElementById = document.getElementById;
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            document.getElementById = jest.fn(() => null);

            expect(() => {
                new DOMManager({ strictMode: true });
            }).toThrow(Error);

            document.getElementById = originalGetElementById;
            consoleErrorSpy.mockRestore();
        });
    });

    describe('Performance Metrics', () => {
        test('should have performanceMetrics Map', () => {
            expect(domManager.performanceMetrics).toBeInstanceOf(Map);
        });

        test('getPerformanceMetrics should return object', () => {
            const metrics = domManager.getPerformanceMetrics();
            
            expect(typeof metrics).toBe('object');
        });

        test('should clear performance metrics on destroy', () => {
            domManager.performanceMetrics.set('test', 100);
            
            domManager.destroy();
            
            expect(domManager.performanceMetrics.size).toBe(0);
        });
    });

    describe('Elements Statistics', () => {
        test('getElementsStatistics should return statistics object', () => {
            const stats = domManager.getElementsStatistics();
            
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('available');
            expect(stats).toHaveProperty('missing');
            expect(stats).toHaveProperty('inDOM');
            expect(stats).toHaveProperty('notInDOM');
        });

        test('should count total elements correctly', () => {
            const stats = domManager.getElementsStatistics();
            
            expect(stats.total).toBe(9); // 9 элементов в app_manager
            expect(stats.available).toBeGreaterThan(0);
        });

        test('should detect missing elements', () => {
            domManager.elements.testConnection = null;
            
            const stats = domManager.getElementsStatistics();
            
            expect(stats.missing).toContain('testConnection');
        });

        test('should detect elements not in DOM', () => {
            const detachedElement = document.createElement('div');
            domManager.elements.testElement = detachedElement;
            
            const stats = domManager.getElementsStatistics();
            
            expect(stats.notInDOM).toContain('testElement');
        });

        test('should handle errors gracefully', () => {
            domManager.elements = null;
            
            const stats = domManager.getElementsStatistics();
            
            expect(stats).toEqual({});
        });
    });

    describe('DOM Availability Validation', () => {
        test('should validate document availability on construction', () => {
            expect(() => {
                new DOMManager({ enableLogging: false });
            }).not.toThrow();
        });

        test('should throw error if document is undefined', () => {
            const originalDocument = global.document;
            const originalDescriptor = Object.getOwnPropertyDescriptor(global, 'document');
            
            Object.defineProperty(global, 'document', {
                get: () => undefined,
                configurable: true
            });

            expect(() => {
                new DOMManager();
            }).toThrow('document API недоступен');

            // Восстанавливаем document
            if (originalDescriptor) {
                Object.defineProperty(global, 'document', originalDescriptor);
            } else {
                global.document = originalDocument;
            }
        });
    });
});
