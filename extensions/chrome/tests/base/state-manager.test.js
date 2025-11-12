/**
 * @jest-environment jsdom
 */

const StateManager = require('../../src/base/StateManager.js');

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        stateManager = new StateManager({
            initialState: { custom: 'value' },
            getTranslateFn: () => (key) => key,
            logError: jest.fn(),
            log: jest.fn()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с начальным состоянием', () => {
            expect(stateManager.state.custom).toBe('value');
            expect(stateManager.state.isOnline).toBe(false);
        });

        test('создает экземпляр без опций', () => {
            const manager = new StateManager();
            expect(manager.state.isOnline).toBe(false);
        });
    });

    describe('updateState', () => {
        test('обновляет состояние', () => {
            stateManager.updateState({ isOnline: true });
            
            expect(stateManager.state.isOnline).toBe(true);
        });

        test('объединяет новое состояние со старым', () => {
            stateManager.updateState({ isOnline: true });
            stateManager.updateState({ isTracking: true });
            
            expect(stateManager.state.isOnline).toBe(true);
            expect(stateManager.state.isTracking).toBe(true);
        });

        test('выбрасывает ошибку для невалидного входа', () => {
            expect(() => stateManager.updateState(null)).toThrow(TypeError);
            expect(() => stateManager.updateState('string')).toThrow(TypeError);
            expect(() => stateManager.updateState(123)).toThrow(TypeError);
        });
    });

    describe('getState', () => {
        test('возвращает копию состояния', () => {
            stateManager.updateState({ isOnline: true });
            
            const state = stateManager.getState();
            state.isOnline = false;
            
            expect(stateManager.state.isOnline).toBe(true);
        });

        test('возвращает пустой объект если state не объект', () => {
            stateManager.state = null;
            
            const state = stateManager.getState();
            
            expect(state).toEqual({});
        });

        test('обрабатывает ошибки и возвращает пустой объект', () => {
            Object.defineProperty(stateManager, 'state', {
                get() {
                    throw new Error('State error');
                }
            });
            
            const state = stateManager.getState();
            
            expect(state).toEqual({});
            expect(stateManager.logError).toHaveBeenCalled();
        });

        test('не логирует ошибки если logError не определен', () => {
            const manager = new StateManager();
            Object.defineProperty(manager, 'state', {
                get() {
                    throw new Error('State error');
                }
            });
            
            const state = manager.getState();
            
            expect(state).toEqual({});
        });
    });

    describe('resetState', () => {
        test('сбрасывает состояние к начальному', () => {
            stateManager.updateState({ isOnline: true, custom: 'changed' });
            stateManager.resetState();
            
            expect(stateManager.state.custom).toBe('value');
            expect(stateManager.state.isOnline).toBe(false);
        });

        test('логирует сброс если log определен', () => {
            stateManager.resetState();
            
            expect(stateManager.log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.baseManager.stateReset' })
            );
        });

        test('не логирует если log не определен', () => {
            const manager = new StateManager();
            
            expect(() => manager.resetState()).not.toThrow();
        });

        test('обрабатывает ошибки при сбросе', () => {
            Object.defineProperty(stateManager, 'state', {
                set() {
                    throw new Error('Reset error');
                },
                get() {
                    return {};
                }
            });
            
            expect(() => stateManager.resetState()).not.toThrow();
            expect(stateManager.logError).toHaveBeenCalled();
        });
    });
});
