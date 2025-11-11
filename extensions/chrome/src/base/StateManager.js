const CONFIG = require('../config/config.js');

/**
 * @typedef {Object} ManagerState
 * @property {boolean} isOnline - Статус подключения к сети
 * @property {boolean} isTracking - Статус активности отслеживания
 * @property {number} lastUpdate - Временная метка последнего обновления
 */

/**
 * Базовый менеджер для управления состоянием.
 * 
 * @class StateManager
 */
class StateManager {
    /**
     * Создает экземпляр StateManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {Object} [options.initialState] - Начальное состояние
     * @param {Function} [options.getTranslateFn] - Функция получения функции перевода
     * @param {Function} [options.logError] - Функция логирования ошибок
     * @param {Function} [options.log] - Функция логирования
     */
    constructor(options = {}) {
        /** @type {ManagerState} */
        this.state = {
            ...CONFIG.BASE.DEFAULT_STATE,
            ...(options.initialState || {})
        };
        
        this.options = { ...options };
        this.getTranslateFn = options.getTranslateFn;
        this.logError = options.logError;
        this.log = options.log;
    }

    /**
     * Обновляет внутреннее состояние.
     * 
     * @param {Partial<ManagerState>} newState - Новое состояние для слияния
     * @throws {TypeError} Если newState не является объектом
     * @returns {void}
     */
    updateState(newState) {
        if (!newState || typeof newState !== 'object') {
            const t = this.getTranslateFn ? this.getTranslateFn() : (key) => key;
            throw new TypeError(t('logs.baseManager.stateUpdateError'));
        }

        try {
            this.state = { ...this.state, ...newState };
        } catch (error) {
            if (this.logError) {
                this.logError({ key: 'logs.baseManager.updateStateError' }, error);
            }
            throw error;
        }
    }

    /**
     * Получает текущее состояние (копию).
     * 
     * @returns {ManagerState} Копия текущего состояния
     */
    getState() {
        try {
            if (!this.state || typeof this.state !== 'object') {
                return {};
            }
            return { ...this.state };
        } catch (error) {
            if (this.logError) {
                this.logError({ key: 'logs.baseManager.getStateError' }, error);
            }
            return {};
        }
    }

    /**
     * Сбрасывает состояние к начальному.
     * 
     * @returns {void}
     */
    resetState() {
        try {
            this.state = {
                ...CONFIG.BASE.DEFAULT_STATE,
                ...(this.options.initialState || {})
            };
            if (this.log) {
                this.log({ key: 'logs.baseManager.stateReset' });
            }
        } catch (error) {
            if (this.logError) {
                this.logError({ key: 'logs.baseManager.resetStateError' }, error);
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
    module.exports.default = StateManager;
}
