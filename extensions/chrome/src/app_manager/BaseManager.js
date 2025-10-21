/**
 * @typedef {Object} ManagerState
 * @property {boolean} isOnline - Статус подключения к сети
 * @property {boolean} isTracking - Статус активности отслеживания
 * @property {number} lastUpdate - Временная метка последнего обновления
 */

/**
 * Базовый класс для управления состоянием и константами.
 * Содержит общую логику для всех компонентов popup.
 * Все менеджеры должны наследоваться от этого класса.
 * 
 * @class BaseManager
 */
class BaseManager {
    /**
     * Константы по умолчанию для всех менеджеров
     * @readonly
     * @enum {number}
     */
    static DEFAULT_CONSTANTS = {
        UPDATE_INTERVAL: 2000,
        NOTIFICATION_DURATION: 3000,
        PING_TIMEOUT: 5000,
        THROTTLE_DELAY: 1000
    };

    /**
     * Создает экземпляр BaseManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {Object} [options.constants] - Переопределение констант
     * @param {Object} [options.initialState] - Начальное состояние
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(options = {}) {
        /** @type {Object} */
        this.CONSTANTS = {
            ...BaseManager.DEFAULT_CONSTANTS,
            ...(options.constants || {})
        };
        
        /** @type {ManagerState} */
        this.state = {
            isOnline: false,
            isTracking: false,
            lastUpdate: 0,
            ...(options.initialState || {})
        };
        
        /** @type {Object} */
        this.options = { ...options };
        
        /** @type {boolean} */
        this.enableLogging = options.enableLogging || false;
    }

    /**
     * Логирует сообщение, если логирование включено.
     * 
     * @protected
     * @param {string} message - Сообщение для логирования
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _log(message, data) {
        if (this.enableLogging) {
            const className = this.constructor.name;
            console.log(`[${className}] ${message}`, data !== undefined ? data : '');
        }
    }

    /**
     * Логирует ошибку.
     * 
     * @protected
     * @param {string} message - Сообщение об ошибке
     * @param {Error|*} [error] - Объект ошибки
     * @returns {void}
     */
    _logError(message, error) {
        const className = this.constructor.name;
        console.error(`[${className}] ${message}`, error || '');
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
            throw new TypeError('Новое состояние должно быть объектом');
        }

        try {
            this.state = { ...this.state, ...newState };
            this._log('Состояние обновлено', this.state);
        } catch (error) {
            this._logError('Ошибка обновления состояния', error);
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
            return { ...this.state };
        } catch (error) {
            this._logError('Ошибка получения состояния', error);
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
                isOnline: false,
                isTracking: false,
                lastUpdate: 0,
                ...(this.options.initialState || {})
            };
            this._log('Состояние сброшено');
        } catch (error) {
            this._logError('Ошибка сброса состояния', error);
        }
    }

    /**
     * Получает значение константы.
     * 
     * @param {string} key - Ключ константы
     * @returns {*} Значение константы или undefined
     */
    getConstant(key) {
        return this.CONSTANTS[key];
    }

    /**
     * Очищает ресурсы менеджера.
     * Переопределите этот метод в дочерних классах для специфичной очистки.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Базовая очистка ресурсов');
        this.resetState();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseManager;
}

if (typeof window !== 'undefined') {
    window.BaseManager = BaseManager;
}

export default BaseManager;
