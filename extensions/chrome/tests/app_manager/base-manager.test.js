/**
 * Тесты для BaseManager класса
 * Тестирует базовую функциональность управления состоянием
 */

const BaseManager = require('../../src/app_manager/BaseManager.js');

describe('BaseManager', () => {
    let baseManager;

    beforeEach(() => {
        baseManager = new BaseManager();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(baseManager).toBeDefined();
            expect(baseManager.state).toBeDefined();
            expect(baseManager.CONSTANTS).toBeDefined();
        });

        test('should have default constants', () => {
            expect(baseManager.CONSTANTS.UPDATE_INTERVAL).toBe(2000);
            expect(baseManager.CONSTANTS.NOTIFICATION_DURATION).toBe(3000);
            expect(baseManager.CONSTANTS.PING_TIMEOUT).toBe(5000);
            expect(baseManager.CONSTANTS.THROTTLE_DELAY).toBe(1000);
        });

        test('should have default state', () => {
            expect(baseManager.state.isOnline).toBe(false);
            expect(baseManager.state.isTracking).toBe(false);
            expect(baseManager.state.lastUpdate).toBe(0);
        });

        test('should accept custom constants', () => {
            const customManager = new BaseManager({
                constants: { UPDATE_INTERVAL: 5000 }
            });

            expect(customManager.CONSTANTS.UPDATE_INTERVAL).toBe(5000);
            expect(customManager.CONSTANTS.NOTIFICATION_DURATION).toBe(3000);
        });

        test('should accept initial state', () => {
            const customManager = new BaseManager({
                initialState: { isOnline: true }
            });

            expect(customManager.state.isOnline).toBe(true);
        });
    });

    describe('state management', () => {
        test('should update state', () => {
            baseManager.updateState({ isOnline: true });

            expect(baseManager.state.isOnline).toBe(true);
        });

        test('should merge state', () => {
            baseManager.updateState({ isOnline: true });
            baseManager.updateState({ isTracking: true });

            expect(baseManager.state.isOnline).toBe(true);
            expect(baseManager.state.isTracking).toBe(true);
        });

        test('should get state copy', () => {
            baseManager.updateState({ isOnline: true });
            const state = baseManager.getState();

            expect(state.isOnline).toBe(true);
            
            // Изменение копии не должно влиять на оригинал
            state.isOnline = false;
            expect(baseManager.state.isOnline).toBe(true);
        });

        test('should throw error when updating with invalid state', () => {
            expect(() => {
                baseManager.updateState(null);
            }).toThrow(TypeError);

            expect(() => {
                baseManager.updateState('invalid');
            }).toThrow(TypeError);
        });

        test('should reset state', () => {
            baseManager.updateState({
                isOnline: true,
                isTracking: true,
                lastUpdate: 12345
            });

            baseManager.resetState();

            expect(baseManager.state.isOnline).toBe(false);
            expect(baseManager.state.isTracking).toBe(false);
            expect(baseManager.state.lastUpdate).toBe(0);
        });

        test('should reset to custom initial state', () => {
            const customManager = new BaseManager({
                initialState: { isOnline: true }
            });

            customManager.updateState({ isOnline: false });
            customManager.resetState();

            expect(customManager.state.isOnline).toBe(true);
        });
    });

    describe('constants', () => {
        test('should get constant value', () => {
            const updateInterval = baseManager.getConstant('UPDATE_INTERVAL');
            
            expect(updateInterval).toBe(2000);
        });

        test('should return undefined for non-existent constant', () => {
            const nonExistent = baseManager.getConstant('NON_EXISTENT');
            
            expect(nonExistent).toBeUndefined();
        });

        test('should merge custom constants with defaults', () => {
            const customManager = new BaseManager({
                constants: { UPDATE_INTERVAL: 5000 }
            });

            expect(customManager.getConstant('UPDATE_INTERVAL')).toBe(5000);
            expect(customManager.getConstant('PING_TIMEOUT')).toBe(5000);
        });
    });

    describe('logging', () => {
        test('should have logging methods', () => {
            expect(typeof baseManager._log).toBe('function');
            expect(typeof baseManager._logError).toBe('function');
        });

        test('should not log when logging is disabled', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            baseManager._log('test message');
            
            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should log when logging is enabled', () => {
            const loggingManager = new BaseManager({ enableLogging: true });
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            loggingManager._log('test message');
            
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        test('should always log errors', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            baseManager._logError('error message', new Error('test'));
            
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('destroy', () => {
        test('should reset state on destroy', () => {
            baseManager.updateState({ isOnline: true });
            baseManager.destroy();

            expect(baseManager.state.isOnline).toBe(false);
        });

        test('should not throw errors', () => {
            expect(() => baseManager.destroy()).not.toThrow();
        });
    });
});
