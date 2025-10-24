/**
 * Тесты для DOMManager класса options_manager
 * Тестирует функциональность работы с DOM элементами страницы настроек
 */

const DOMManager = require('../../src/options_manager/DOMManager.js');

describe('OptionsDOMManager', () => {
    let domManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <form id="settingsForm">
                <input type="url" id="backendUrl" />
                <button type="submit" id="saveBtn">Save</button>
                <button type="button" id="resetBtn">Reset</button>
            </form>
            <div id="status"></div>
        `;

        domManager = new DOMManager();
    });

    afterEach(() => {
        if (domManager) {
            domManager.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(domManager).toBeDefined();
            expect(domManager.elements).toBeDefined();
            expect(domManager.state).toBeDefined();
        });

        test('should cache DOM elements', () => {
            expect(domManager.elements.settingsForm).toBeDefined();
            expect(domManager.elements.backendUrl).toBeDefined();
            expect(domManager.elements.saveBtn).toBeDefined();
            expect(domManager.elements.resetBtn).toBeDefined();
            expect(domManager.elements.status).toBeDefined();
        });

        test('should set strictMode from options', () => {
            const strictManager = new DOMManager({ strictMode: true });
            expect(strictManager.strictMode).toBe(true);
            strictManager.destroy();
        });

        test('should default strictMode to false', () => {
            expect(domManager.strictMode).toBe(false);
        });
    });

    describe('static properties', () => {
        test('should have ELEMENT_IDS constant', () => {
            expect(DOMManager.ELEMENT_IDS).toBeDefined();
            expect(DOMManager.ELEMENT_IDS.SETTINGS_FORM).toBe('settingsForm');
            expect(DOMManager.ELEMENT_IDS.BACKEND_URL).toBe('backendUrl');
            expect(DOMManager.ELEMENT_IDS.SAVE_BTN).toBe('saveBtn');
            expect(DOMManager.ELEMENT_IDS.RESET_BTN).toBe('resetBtn');
            expect(DOMManager.ELEMENT_IDS.STATUS).toBe('status');
        });
    });

    describe('getBackendUrlValue', () => {
        test('should return the value of backend URL input', () => {
            domManager.elements.backendUrl.value = 'http://example.com';
            const value = domManager.getBackendUrlValue();
            expect(value).toBe('http://example.com');
        });

        test('should trim whitespace from URL value', () => {
            domManager.elements.backendUrl.value = '  http://example.com  ';
            const value = domManager.getBackendUrlValue();
            expect(value).toBe('http://example.com');
        });

        test('should return empty string if input is empty', () => {
            domManager.elements.backendUrl.value = '';
            const value = domManager.getBackendUrlValue();
            expect(value).toBe('');
        });

        test('should return empty string if element is null', () => {
            domManager.elements.backendUrl = null;
            const value = domManager.getBackendUrlValue();
            expect(value).toBe('');
        });
    });

    describe('setBackendUrlValue', () => {
        test('should set the value of backend URL input', () => {
            const url = 'http://example.com';
            const result = domManager.setBackendUrlValue(url);

            expect(result).toBe(true);
            expect(domManager.elements.backendUrl.value).toBe(url);
        });

        test('should handle empty string', () => {
            const result = domManager.setBackendUrlValue('');

            expect(result).toBe(true);
            expect(domManager.elements.backendUrl.value).toBe('');
        });

        test('should throw TypeError for non-string parameter', () => {
            expect(() => domManager.setBackendUrlValue(123)).toThrow(TypeError);
            expect(() => domManager.setBackendUrlValue(null)).toThrow(TypeError);
            expect(() => domManager.setBackendUrlValue(undefined)).toThrow(TypeError);
            expect(() => domManager.setBackendUrlValue({})).toThrow(TypeError);
        });

        test('should return false if element is missing', () => {
            domManager.elements.backendUrl.remove();
            domManager.reloadElements();

            const result = domManager.setBackendUrlValue('http://example.com');
            expect(result).toBe(false);
        });
    });

    describe('setButtonState', () => {
        test('should set button text and disabled state', () => {
            const button = domManager.elements.saveBtn;
            const text = 'Saving...';
            const disabled = true;

            const result = domManager.setButtonState(button, text, disabled);

            expect(result).toBe(true);
            expect(button.textContent).toBe(text);
            expect(button.disabled).toBe(disabled);
        });

        test('should enable button when disabled is false', () => {
            const button = domManager.elements.saveBtn;
            button.disabled = true;

            domManager.setButtonState(button, 'Save', false);

            expect(button.disabled).toBe(false);
            expect(button.textContent).toBe('Save');
        });

        test('should handle reset button', () => {
            const button = domManager.elements.resetBtn;
            const text = 'Resetting...';
            const disabled = true;

            const result = domManager.setButtonState(button, text, disabled);

            expect(result).toBe(true);
            expect(button.textContent).toBe(text);
            expect(button.disabled).toBe(disabled);
        });

        test('should throw error for invalid text parameter', () => {
            const button = domManager.elements.saveBtn;

            expect(() => domManager.setButtonState(button, 123, true)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, null, true)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, undefined, true)).toThrow(TypeError);
        });

        test('should throw error for invalid disabled parameter', () => {
            const button = domManager.elements.saveBtn;

            expect(() => domManager.setButtonState(button, 'Test', 'invalid')).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, 'Test', null)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, 'Test', 1)).toThrow(TypeError);
        });

        test('should return false for null button', () => {
            const result = domManager.setButtonState(null, 'Test', false);
            expect(result).toBe(false);
        });

        test('should return false for undefined button', () => {
            const result = domManager.setButtonState(undefined, 'Test', false);
            expect(result).toBe(false);
        });
    });

    describe('reloadElements', () => {
        test('should reload elements', () => {
            expect(() => domManager.reloadElements()).not.toThrow();

            expect(domManager.elements).toBeDefined();
        });

        test('should reload elements after DOM changes', () => {
            const oldElement = domManager.elements.saveBtn;
            oldElement.remove();

            const newButton = document.createElement('button');
            newButton.id = 'saveBtn';
            document.body.appendChild(newButton);
            
            domManager.reloadElements();

            expect(domManager.elements.saveBtn).toBe(newButton);
            expect(domManager.elements.saveBtn).not.toBe(oldElement);
        });
    });

    describe('inheritance from BaseManager', () => {
        test('should have BaseManager methods', () => {
            expect(typeof domManager.updateState).toBe('function');
            expect(typeof domManager.getState).toBe('function');
            expect(typeof domManager.resetState).toBe('function');
            expect(typeof domManager.getConstant).toBe('function');
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
            const newState = { customProperty: 'test value' };
            domManager.updateState(newState);
            
            const state = domManager.getState();
            expect(state.customProperty).toBe('test value');
        });

        test('should have resetState method', () => {
            domManager.updateState({ customProperty: 'test' });
            domManager.resetState();
            
            const state = domManager.getState();
            expect(state.customProperty).toBeUndefined();
        });

        test('should have getConstant method', () => {
            const updateInterval = domManager.getConstant('UPDATE_INTERVAL');
            expect(updateInterval).toBe(2000);
        });
    });

    describe('destroy method', () => {
        test('should clean up resources', () => {
            domManager.destroy();
            expect(domManager.elements).toEqual({});
        });

        test('should be safe to call multiple times', () => {
            expect(() => {
                domManager.destroy();
                domManager.destroy();
            }).not.toThrow();
        });
    });

    describe('error handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            const element = domManager.elements.backendUrl;
            element.remove();
            domManager.reloadElements();

            expect(() => {
                domManager.setBackendUrlValue('http://example.com');
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
            expect(() => {
                new DOMManager({ strictMode: true });
            }).toThrow(/Отсутствуют критичные DOM элементы/);

            document.getElementById = originalGetElementById;
            consoleErrorSpy.mockRestore();
        });

        test('should not throw in non-strict mode when elements are missing', () => {
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn(() => null);

            expect(() => {
                new DOMManager({ strictMode: false });
            }).not.toThrow();

            document.getElementById = originalGetElementById;
        });
    });

    describe('_cacheDOMElements', () => {
        test('should cache all elements correctly', () => {
            const elements = domManager.elements;

            expect(elements.settingsForm).toBeInstanceOf(HTMLFormElement);
            expect(elements.backendUrl).toBeInstanceOf(HTMLInputElement);
            expect(elements.saveBtn).toBeInstanceOf(HTMLButtonElement);
            expect(elements.resetBtn).toBeInstanceOf(HTMLButtonElement);
            expect(elements.status).toBeInstanceOf(HTMLDivElement);
        });
    });

    describe('_validateElements', () => {
        test('should validate all elements in strict mode', () => {
            expect(() => {
                new DOMManager({ strictMode: true });
            }).not.toThrow();
        });

        test('should throw error if any element is missing in strict mode', () => {
            document.getElementById('saveBtn').remove();

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            expect(() => {
                new DOMManager({ strictMode: true });
            }).toThrow();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('_safeUpdateElement', () => {
        test('should safely update element', () => {
            const element = domManager.elements.backendUrl;
            const updateFn = (el) => { el.value = 'test'; };

            const result = domManager._safeUpdateElement(element, updateFn, 'test element');

            expect(result).toBe(true);
            expect(element.value).toBe('test');
        });

        test('should return false for null element', () => {
            const updateFn = (el) => { el.value = 'test'; };

            const result = domManager._safeUpdateElement(null, updateFn, 'test element');

            expect(result).toBe(false);
        });

        test('should handle errors in update function', () => {
            const element = domManager.elements.backendUrl;
            const updateFn = () => { throw new Error('Update error'); };

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = domManager._safeUpdateElement(element, updateFn, 'test element');

            expect(result).toBe(false);
            consoleErrorSpy.mockRestore();
        });
    });

    describe('logging', () => {
        test('should log when enableLogging is true', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            const loggingManager = new DOMManager({ enableLogging: true });

            expect(consoleLogSpy).toHaveBeenCalled();

            loggingManager.destroy();
            consoleLogSpy.mockRestore();
        });

        test('should not log when enableLogging is false', () => {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            const nonLoggingManager = new DOMManager({ enableLogging: false });

            expect(consoleLogSpy).not.toHaveBeenCalled();

            nonLoggingManager.destroy();
            consoleLogSpy.mockRestore();
        });
    });

    describe('integration tests', () => {
        test('should handle complete form workflow', () => {
            domManager.setBackendUrlValue('http://example.com');
            expect(domManager.getBackendUrlValue()).toBe('http://example.com');

            domManager.setButtonState(domManager.elements.saveBtn, 'Saving...', true);
            expect(domManager.elements.saveBtn.disabled).toBe(true);

            domManager.setButtonState(domManager.elements.saveBtn, 'Save', false);
            expect(domManager.elements.saveBtn.disabled).toBe(false);
        });

        test('should handle multiple button states', () => {
            const saveBtn = domManager.elements.saveBtn;
            const resetBtn = domManager.elements.resetBtn;

            domManager.setButtonState(saveBtn, 'Saving...', true);
            domManager.setButtonState(resetBtn, 'Resetting...', true);

            expect(saveBtn.disabled).toBe(true);
            expect(resetBtn.disabled).toBe(true);
            expect(saveBtn.textContent).toBe('Saving...');
            expect(resetBtn.textContent).toBe('Resetting...');
        });
    });

    describe('window and module exports', () => {
        test('should export to module.exports', () => {
            expect(DOMManager).toBeDefined();
            expect(typeof DOMManager).toBe('function');
        });

        test('should have default export', () => {
            const exported = require('../../src/options_manager/DOMManager.js');
            expect(exported).toBeDefined();
            expect(exported.default).toBe(DOMManager);
        });
    });
});
