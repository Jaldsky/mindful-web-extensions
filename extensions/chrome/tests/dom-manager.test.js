/**
 * Тесты для DOMManager класса
 * Тестирует функциональность работы с DOM элементами
 */

const DOMManager = require('../src/DOMManager.js');

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

    describe('cacheDOMElements', () => {
        test('should return object with cached elements', () => {
            const elements = domManager.cacheDOMElements();

            expect(elements).toHaveProperty('connectionStatus');
            expect(elements).toHaveProperty('trackingStatus');
            expect(elements).toHaveProperty('eventsCount');
            expect(elements).toHaveProperty('domainsCount');
            expect(elements).toHaveProperty('queueSize');
            expect(elements).toHaveProperty('openSettings');
            expect(elements).toHaveProperty('testConnection');
            expect(elements).toHaveProperty('reloadExtension');
            expect(elements).toHaveProperty('runDiagnostics');
        });
    });

    describe('updateConnectionStatus', () => {
        test('should update connection status when online', () => {
            domManager.updateConnectionStatus(true);

            const statusElement = domManager.elements.connectionStatus;
            expect(statusElement.textContent).toContain('Подключено');
            expect(statusElement.className).toContain('status-online');
        });

        test('should update connection status when offline', () => {
            domManager.updateConnectionStatus(false);
            
            const statusElement = domManager.elements.connectionStatus;
            expect(statusElement.textContent).toContain('Отключено');
            expect(statusElement.className).toContain('status-offline');
        });

        test('should update state when connection status changes', () => {
            domManager.updateConnectionStatus(true);
            expect(domManager.state.isOnline).toBe(true);
            
            domManager.updateConnectionStatus(false);
            expect(domManager.state.isOnline).toBe(false);
        });
    });

    describe('updateTrackingStatus', () => {
        test('should update tracking status when tracking is active', () => {
            domManager.updateTrackingStatus(true);
            
            const statusElement = domManager.elements.trackingStatus;
            expect(statusElement.textContent).toContain('Активно');
            expect(statusElement.className).toContain('status-active');
        });

        test('should update tracking status when tracking is inactive', () => {
            domManager.updateTrackingStatus(false);
            
            const statusElement = domManager.elements.trackingStatus;
            expect(statusElement.textContent).toContain('Неактивно');
            expect(statusElement.className).toContain('status-inactive');
        });

        test('should update state when tracking status changes', () => {
            domManager.updateTrackingStatus(true);
            expect(domManager.state.isTracking).toBe(true);
            
            domManager.updateTrackingStatus(false);
            expect(domManager.state.isTracking).toBe(false);
        });
    });

    describe('updateCounters', () => {
        test('should update all counter elements', () => {
            const counters = {
                events: 10,
                domains: 5,
                queue: 3
            };

            domManager.updateCounters(counters);

            expect(domManager.elements.eventsCount.textContent).toBe('10');
            expect(domManager.elements.domainsCount.textContent).toBe('5');
            expect(domManager.elements.queueSize.textContent).toBe('3');
        });

        test('should handle missing counter values', () => {
            const counters = {
                events: 10
                // domains and queue are missing
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
    });

    describe('setButtonState', () => {
        test('should set button text and disabled state', () => {
            const button = document.createElement('button');
            const text = 'Test Button';
            const disabled = true;

            domManager.setButtonState(button, text, disabled);

            expect(button.textContent).toBe(text);
            expect(button.disabled).toBe(disabled);
        });

        test('should enable button when disabled is false', () => {
            const button = document.createElement('button');
            button.disabled = true;

            domManager.setButtonState(button, 'Test', false);

            expect(button.disabled).toBe(false);
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
    });
});
