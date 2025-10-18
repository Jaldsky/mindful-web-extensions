/**
 * Базовый класс для управления состоянием и константами.
 * Содержит общую логику для всех компонентов popup.
 * 
 * @class BaseManager
 */
class BaseManager {
    /**
     * Создает экземпляр BaseManager.
     * 
     * @param {Object} options - Опции конфигурации
     */
    constructor(options = {}) {
        this.CONSTANTS = {
            UPDATE_INTERVAL: 2000,
            NOTIFICATION_DURATION: 3000,
            PING_TIMEOUT: 5000,
            THROTTLE_DELAY: 1000
        };
        
        this.state = {
            isOnline: false,
            isTracking: false,
            lastUpdate: 0
        };
        
        this.options = { ...options };
    }

    /**
     * Обновляет внутреннее состояние.
     * 
     * @param {Object} newState - Новое состояние
     * @returns {void}
     */
    updateState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Получает текущее состояние.
     * 
     * @returns {Object} Текущее состояние
     */
    getState() {
        return { ...this.state };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseManager;
}

if (typeof window !== 'undefined') {
    window.BaseManager = BaseManager;
}
