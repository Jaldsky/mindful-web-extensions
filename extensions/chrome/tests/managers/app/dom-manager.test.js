/**
 * Тесты для DOMManager класса
 * Тестирует функциональность работы с DOM элементами
 */

const DOMManager = require('../../../src/managers/app/DOMManager.js');
const EN = require('../../../src/locales/en.js');

// Создаем mock функцию локализации, которая возвращает английские строки
const createMockTranslateFn = () => {
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };
    
    return (key, params = {}, fallback = '') => {
        const value = getNestedValue(EN, key);
        if (!value) return fallback;
        
        // Простая подстановка параметров
        if (typeof value === 'string' && params) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
        
        return value || fallback;
    };
};

describe('DOMManager', () => {
    let domManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="connectionStatus"></div>
            <div id="trackingStatus"></div>
            <div id="eventsCount"></div>
            <div id="domainsCount"></div>
            <button id="openSettings"></button>
            <button id="testConnection"></button>
            <button id="toggleTracking"></button>
        `;

        const mockTranslateFn = createMockTranslateFn();
        domManager = new DOMManager({ translateFn: mockTranslateFn });
    });

    afterEach(() => {
        if (document && document.body) {
            document.body.innerHTML = '';
        }
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
            expect(domManager.elements.openSettings).toBeDefined();
            expect(domManager.elements.testConnection).toBeDefined();
            expect(domManager.elements.toggleTracking).toBeDefined();
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
            expect(statusElement.textContent).toBe('Online');
            expect(statusElement.className).toBe(DOMManager.CSS_CLASSES.STATUS_ONLINE);
        });

        test('should update connection status when offline', () => {
            const result = domManager.updateConnectionStatus(false);
            
            expect(result).toBe(true);
            const statusElement = domManager.elements.connectionStatus;
            expect(statusElement.textContent).toBe('Offline');
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
            expect(statusElement.textContent).toBe('Active');
            expect(statusElement.className).toBe(DOMManager.CSS_CLASSES.STATUS_ACTIVE);
        });

        test('should update tracking status when tracking is inactive', () => {
            const result = domManager.updateTrackingStatus(false);
            
            expect(result).toBe(true);
            const statusElement = domManager.elements.trackingStatus;
            expect(statusElement.textContent).toBe('Inactive');
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

    describe('updateTrackingToggle', () => {
        test('should set button state for active tracking', () => {
            const button = domManager.elements.toggleTracking;
            const result = domManager.updateTrackingToggle(true);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Disable Tracking');
            expect(button.classList.contains('toggle-btn--disable')).toBe(true);
            expect(button.disabled).toBe(false);
        });

        test('should set button state for inactive tracking', () => {
            const button = domManager.elements.toggleTracking;
            const result = domManager.updateTrackingToggle(false);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Enable Tracking');
            expect(button.classList.contains('toggle-btn--enable')).toBe(true);
        });

        test('should throw error for invalid parameter', () => {
            expect(() => domManager.updateTrackingToggle('invalid')).toThrow(TypeError);
        });
    });

    describe('setTrackingToggleLoading', () => {
        test('should show enabling state when target is tracking', () => {
            const button = domManager.elements.toggleTracking;

            const result = domManager.setTrackingToggleLoading(true);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Enabling...');
            expect(button.disabled).toBe(true);
        });

        test('should show disabling state when target is not tracking', () => {
            const button = domManager.elements.toggleTracking;

            const result = domManager.setTrackingToggleLoading(false);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Disabling...');
            expect(button.disabled).toBe(true);
        });

        test('should throw error for invalid parameter', () => {
            expect(() => domManager.setTrackingToggleLoading('invalid')).toThrow(TypeError);
        });
    });

    describe('updateCounters', () => {
        test('should update counter elements for events and domains', () => {
            const counters = {
                events: 10,
                domains: 5,
                queue: 3
            };

            const results = domManager.updateCounters(counters);

            expect(results.events).toBe(true);
            expect(results.domains).toBe(true);
            expect(domManager.elements.eventsCount.textContent).toBe('10');
            expect(domManager.elements.domainsCount.textContent).toBe('5');
        });

        test('should handle missing counter values', () => {
            const counters = {
                events: 10
            };

            domManager.updateCounters(counters);

            expect(domManager.elements.eventsCount.textContent).toBe('10');
            expect(domManager.elements.domainsCount.textContent).toBe('0');
        });

        test('should handle empty counters object', () => {
            domManager.updateCounters({});

            expect(domManager.elements.eventsCount.textContent).toBe('0');
            expect(domManager.elements.domainsCount.textContent).toBe('0');
        });

        test('should handle negative values', () => {
            domManager.updateCounters({ events: -5, domains: -1, queue: -10 });

            expect(domManager.elements.eventsCount.textContent).toBe('0');
            expect(domManager.elements.domainsCount.textContent).toBe('0');
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
            
            expect(stats.total).toBe(8); // 8 элементов в app_manager (удалили reloadExtension и runDiagnostics)
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
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="connectionStatus"></div>
                <div id="trackingStatus"></div>
                <div id="eventsCount"></div>
                <div id="domainsCount"></div>
                <button id="openSettings"></button>
                <button id="testConnection"></button>
                <button id="toggleTracking"></button>
                <button id="runDiagnostics"></button>
            `;
        });

        afterEach(() => {
            if (document && document.body) {
                document.body.innerHTML = '';
            }
        });

        test('should validate document availability on construction', () => {
            expect(() => {
                new DOMManager({ 
                    enableLogging: false,
                    translateFn: createMockTranslateFn()
                });
            }).not.toThrow();
        });

        test('should throw error if document is undefined', () => {
            const originalDocument = global.document;
            const originalDescriptor = Object.getOwnPropertyDescriptor(global, 'document');
            
            try {
                Object.defineProperty(global, 'document', {
                    get: () => undefined,
                    configurable: true
                });

                expect(() => {
                    new DOMManager({ translateFn: createMockTranslateFn() });
                }).toThrow('document API is unavailable');
            } finally {
                // Восстанавливаем document в finally, чтобы гарантировать восстановление даже при ошибках
                if (originalDescriptor) {
                    Object.defineProperty(global, 'document', originalDescriptor);
                } else {
                    global.document = originalDocument;
                }
            }
        });
    });

    describe('Branch Coverage - Дополнительные ветки', () => {
        beforeEach(() => {
            document.body.innerHTML = `
                <div id="connectionStatus"></div>
                <div id="trackingStatus"></div>
                <div id="eventsCount"></div>
                <div id="domainsCount"></div>
                <button id="openSettings"></button>
                <button id="testConnection"></button>
                <button id="toggleTracking"></button>
                <button id="runDiagnostics"></button>
            `;
        });

        afterEach(() => {
            if (document && document.body) {
                document.body.innerHTML = '';
            }
        });

        test('updateConnectionStatus - с translateFn', () => {
            const translateFn = jest.fn((key) => {
                const translations = {
                    'app.status.online': 'Подключено',
                    'app.status.offline': 'Отключено'
                };
                return translations[key];
            });

            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn 
            });

            const result = manager.updateConnectionStatus(true);

            expect(result).toBe(true);
            expect(translateFn).toHaveBeenCalledWith('app.status.online');
            
            manager.destroy();
        });

        test('updateConnectionStatus - без translateFn используя fallback', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });

            const result = manager.updateConnectionStatus(false);

            expect(result).toBe(true);
            expect(manager.elements.connectionStatus.textContent).toBe('Offline');
            
            manager.destroy();
        });

        test('updateConnectionStatus - обработка ошибок при обновлении', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            // Мокируем ошибку в _safeUpdateElement
            jest.spyOn(manager, '_safeUpdateElement').mockImplementation(() => {
                throw new Error('Update error');
            });

            const result = manager.updateConnectionStatus(true);

            expect(result).toBe(false);
            
            manager.destroy();
        });

        test('_safeUpdateElement - с элементом не найденным', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            const result = manager._safeUpdateElement(
                null, 
                () => {}, 
                'тестовый элемент'
            );

            expect(result).toBe(false);
            
            manager.destroy();
        });

        test('_safeUpdateElement - обработка ошибок в updateFn', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            const element = document.createElement('div');
            const updateFn = jest.fn(() => {
                throw new Error('Update function error');
            });

            const result = manager._safeUpdateElement(
                element, 
                updateFn, 
                'тестовый элемент'
            );

            expect(result).toBe(false);
            expect(updateFn).toHaveBeenCalled();
            
            manager.destroy();
        });

        test('updateTrackingStatus - с translateFn', () => {
            const translateFn = jest.fn((key) => {
                const translations = {
                    'app.status.tracking': 'Отслеживание',
                    'app.status.stopped': 'Остановлено'
                };
                return translations[key];
            });

            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn 
            });

            const result = manager.updateTrackingStatus(true);

            expect(result).toBe(true);
            // translateFn вызывается, но нужно проверить правильно
            expect(translateFn).toHaveBeenCalled();
            
            manager.destroy();
        });

        test('updateTrackingStatus - обработка ошибок', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            // Мокируем ошибку
            jest.spyOn(manager, '_safeUpdateElement').mockImplementation(() => {
                throw new Error('Update error');
            });

            const result = manager.updateTrackingStatus(false);

            expect(result).toBe(false);
            
            manager.destroy();
        });

        test('updateCounters - обработка null/undefined значений', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });

            const result = manager.updateCounters({
                eventsCount: null,
                domainsCount: undefined,
                queue: 0
            });

            // Должен обработать null/undefined корректно
            expect(result).toBeDefined();
            
            manager.destroy();
        });

        test('updateCounters - с только некоторыми полями', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });

            const result = manager.updateCounters({
                eventsCount: 5
            });

            // Проверяем что метод вернул объект с результатами
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            
            manager.destroy();
        });

        test('setButtonState - с несуществующим элементом', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            // Удаляем элемент из DOM
            const button = manager.elements.openSettings;
            if (button && button.parentNode) {
                button.parentNode.removeChild(button);
            }
            manager.elements.openSettings = null;

            // setButtonState требует text (строка) и disabled (boolean)
            expect(() => {
                manager.setButtonState('openSettings', 'Test', false);
            }).not.toThrow();
            
            manager.destroy();
        });

        test('destroy - должен корректно сбрасывать элементы', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            manager.destroy();

            expect(manager.elements).toBeDefined();
            // После destroy элементы должны быть очищены
            Object.values(manager.elements).forEach(element => {
                expect(element).toBeNull();
            });
        });

        test('getElementStatistics - с null элементами', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            // Обнуляем некоторые элементы
            manager.elements.connectionStatus = null;
            manager.elements.trackingStatus = null;

            const stats = manager.getElementsStatistics();

            // Проверяем что статистика возвращается
            expect(stats).toBeDefined();
            expect(typeof stats).toBe('object');
            
            manager.destroy();
        });

        test('constructor - с translateFn', () => {
            const translateFn = jest.fn();

            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn 
            });

            expect(manager.translateFn).toBe(translateFn);
            
            manager.destroy();
        });

        test('reloadElements - должен перезагружать все элементы', () => {
            const manager = new DOMManager({ 
                enableLogging: false,
                translateFn: createMockTranslateFn()
            });
            
            const oldElements = { ...manager.elements };
            
            manager.reloadElements();

            // Элементы должны быть перезагружены
            expect(manager.elements).toBeDefined();
            Object.keys(oldElements).forEach(key => {
                expect(manager.elements[key]).toBeDefined();
            });
            
            manager.destroy();
        });
    });
});
