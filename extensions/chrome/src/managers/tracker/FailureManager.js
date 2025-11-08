const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../../config.js');

/**
 * Менеджер для управления ошибками и retry логикой.
 * Отвечает за отслеживание неудачных отправок, retry механизм и отключение трекера при критических ошибках.
 * 
 * @class FailureManager
 * @extends BaseManager
 */
class FailureManager extends BaseManager {
    /**
     * Максимальное количество последовательных неудачных отправок,
     * после которого трекер будет автоматически отключен
     * @readonly
     * @static
     */
    static DEFAULT_MAX_FAILURES_BEFORE_DISABLE = CONFIG.TRACKER.FAILURE_DISABLE_THRESHOLD || 5;

    /**
     * Создает экземпляр FailureManager.
     * 
     * @param {Object} dependencies - Зависимости менеджера
     * @param {Object} dependencies.trackingController - Контроллер трекера для управления состоянием
     * @param {Object} [options={}] - Опции конфигурации
     * @param {number} [options.maxFailuresBeforeDisable] - Максимальное количество неудач перед отключением
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     */
    constructor(dependencies, options = {}) {
        super(options);

        /** 
         * Контроллер трекера для управления состоянием отслеживания
         * @type {Object|null}
         */
        this.trackingController = dependencies?.trackingController || null;

        /** 
         * Счетчик последовательных неудачных отправок
         * @type {number}
         */
        this.consecutiveFailures = 0;

        /** 
         * Флаг достижения порога ошибок (трекер будет отключен)
         * @type {boolean}
         */
        this.failureThresholdReached = false;

        /** 
         * Флаг процесса отключения трекера (защита от повторных вызовов)
         * @type {boolean}
         */
        this.disableInProgress = false;

        /** 
         * Максимальное количество последовательных неудач перед отключением трекера
         * @type {number}
         */
        this.maxFailuresBeforeDisable = options.maxFailuresBeforeDisable || FailureManager.DEFAULT_MAX_FAILURES_BEFORE_DISABLE;
        
        this.updateState({
            consecutiveFailures: this.consecutiveFailures,
            failureThresholdReached: this.failureThresholdReached
        });
        
        this._log({ key: 'logs.failure.created' });
    }

    /**
     * Сбрасывает счетчик неудачных отправок.
     * 
     * @returns {void}
     */
    resetFailureCounters() {
        if (this.consecutiveFailures === 0 && !this.failureThresholdReached) {
            return;
        }

        this.consecutiveFailures = 0;
        this.failureThresholdReached = false;
        this.updateState({
            consecutiveFailures: this.consecutiveFailures,
            failureThresholdReached: this.failureThresholdReached
        });
        
        this._log({ key: 'logs.failure.countersReset' });
    }

    /**
     * Регистрирует неудачную попытку отправки событий.
     * 
     * Увеличивает счетчик последовательных неудач. Если достигнут порог ошибок,
     * автоматически отключает трекер через _disableTrackingDueToFailures.
     * 
     * @async
     * @param {Object} [context={}] - Контекст ошибки (reason, error и т.д.)
     * @returns {Promise<boolean>} true, если достигнут порог ошибок и трекер будет отключен
     */
    async registerSendFailure(context = {}) {
        this.consecutiveFailures += 1;
        this.updateState({ consecutiveFailures: this.consecutiveFailures });

        this._log({ key: 'logs.failure.sendFailure', params: { consecutiveFailures: this.consecutiveFailures, threshold: this.maxFailuresBeforeDisable } }, context);

        if (this.consecutiveFailures >= this.maxFailuresBeforeDisable && !this.failureThresholdReached) {
            this.failureThresholdReached = true;
            this.updateState({ failureThresholdReached: true });
            await this._disableTrackingDueToFailures(context);
            return true;
        }
        
        return false;
    }

    /**
     * Отключает трекер после превышения порога ошибок.
     * 
     * @private
     * @param {Object} context - Дополнительная информация для логирования
     * @param {Function} [context.saveQueueFn] - Функция для сохранения очереди
     * @returns {Promise<void>}
     */
    async _disableTrackingDueToFailures(context = {}) {
        if (!this.trackingController) {
            this._log({ key: 'logs.failure.trackerCannotBeDisabled' }, context);
            return;
        }

        if (this.disableInProgress) {
            this._log({ key: 'logs.failure.disableInProgress' });
            return;
        }

        this.disableInProgress = true;

        try {
            this._log({ key: 'logs.failure.disablingTracker', params: { consecutiveFailures: this.consecutiveFailures } }, context);
            await this.trackingController.disableTracking();
            
            // Сохраняем очередь, если предоставлена функция сохранения
            if (context.saveQueueFn && typeof context.saveQueueFn === 'function') {
                try {
                    await context.saveQueueFn();
                } catch (error) {
                    this._logError({ key: 'logs.failure.saveQueueError' }, error);
                }
            }
        } catch (error) {
            this._logError({ key: 'logs.failure.disableError' }, error);
        } finally {
            this.disableInProgress = false;
        }
    }

    /**
     * Проверяет, достигнут ли порог ошибок.
     * 
     * @returns {boolean} true, если порог ошибок достигнут
     */
    isThresholdReached() {
        return this.failureThresholdReached;
    }

    /**
     * Получает текущее количество последовательных неудач.
     * 
     * @returns {number} Количество последовательных неудач
     */
    getConsecutiveFailures() {
        return this.consecutiveFailures;
    }

    /**
     * Уничтожает менеджер и освобождает ресурсы.
     * 
     * @returns {void}
     */
    destroy() {
        this.trackingController = null;
        this.consecutiveFailures = 0;
        this.failureThresholdReached = false;
        super.destroy();
        this._log({ key: 'logs.failure.destroyed' });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FailureManager;
    module.exports.default = FailureManager;
}

if (typeof window !== 'undefined') {
    window.FailureManager = FailureManager;
}
