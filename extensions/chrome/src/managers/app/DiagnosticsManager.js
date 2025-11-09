const BaseManager = require('../../base/BaseManager.js');
const CONFIG = require('../../config/config.js');

/**
 * @typedef {Object} DiagnosticCheck
 * @property {'ok'|'warning'|'error'} status - Статус проверки
 * @property {string} message - Сообщение о результате
 * @property {number} duration - Время выполнения проверки в мс
 * @property {*} [data] - Дополнительные данные проверки
 * @property {string} [error] - Сообщение об ошибке, если есть
 */

/**
 * @typedef {Object} DiagnosticResults
 * @property {string} timestamp - ISO строка времени запуска диагностики
 * @property {number} totalDuration - Общее время выполнения диагностики в мс
 * @property {Object.<string, DiagnosticCheck>} checks - Результаты проверок
 * @property {'ok'|'warning'|'error'} overall - Общий статус диагностики
 * @property {string} [error] - Общая ошибка, если диагностика не удалась
 */

/**
 * Менеджер диагностики для проверки состояния расширения.
 * Отвечает за запуск и отображение результатов диагностики.
 * 
 * @class DiagnosticsManager
 * @extends BaseManager
 */
class DiagnosticsManager extends BaseManager {
    /**
     * Статусы диагностических проверок
     * @readonly
     * @static
     */
    static CHECK_STATUS = CONFIG.DIAGNOSTICS.CHECK_STATUS;

    /**
     * Названия проверок
     * @readonly
     * @static
     */
    static CHECK_NAMES = CONFIG.DIAGNOSTICS.CHECK_NAMES;

    /**
     * Эмодзи для статусов
     * @readonly
     * @static
     */
    static STATUS_EMOJI = CONFIG.DIAGNOSTICS.STATUS_EMOJI;

    /**
     * Создает экземпляр DiagnosticsManager.
     * 
     * @param {Object} serviceWorkerManager - Менеджер Service Worker
     * @param {Object} notificationManager - Менеджер уведомлений
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.parallelExecution=true] - Выполнять проверки параллельно
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @throws {TypeError} Если зависимости не предоставлены
     */
    constructor(serviceWorkerManager, notificationManager, options = {}) {
        super(options);

        const t = this._getTranslateFn();

        if (!serviceWorkerManager) {
            throw new TypeError(t('logs.diagnostics.serviceWorkerRequired'));
        }

        if (!notificationManager) {
            throw new TypeError(t('logs.diagnostics.notificationManagerRequired'));
        }
        
        /** @type {Object} */
        this.serviceWorkerManager = serviceWorkerManager;
        
        /** @type {Object} */
        this.notificationManager = notificationManager;
        
        /** @type {Function} */
        this.translateFn = options.translateFn || (() => '');
        
        if (!this.translateFn || typeof this.translateFn !== 'function') {
            throw new TypeError(t('logs.diagnostics.translateFnRequired'));
        }
        
        /** @type {boolean} */
        this.parallelExecution = options.parallelExecution !== false;
        
        this._log({ key: 'logs.diagnostics.created' }, { 
            parallelExecution: this.parallelExecution 
        });
    }

    /**
     * Выполняет одну проверку с измерением времени.
     * 
     * @private
     * @param {Function} checkFunction - Функция проверки
     * @param {string} checkName - Название проверки
     * @returns {Promise<DiagnosticCheck>} Результат проверки с временем выполнения
     */
    async _executeCheck(checkFunction, checkName) {
        const startTime = performance.now();
        
        try {
            this._log({ key: 'logs.diagnostics.checkStart', params: { name: checkName } });
            
            const result = await checkFunction.call(this);
            const duration = Math.round(performance.now() - startTime);
            
            this._log({ key: 'logs.diagnostics.checkCompleted', params: { name: checkName, duration } }, result);
            
            return {
                ...result,
                duration
            };
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            
            this._logError({ key: 'logs.diagnostics.checkExecutionError', params: { name: checkName } }, error);
            
            const message = this.translateFn('logs.diagnostics.checkUnexpectedError', { name: checkName });
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                error: error.message,
                duration
            };
        }
    }

    /**
     * Запускает полную диагностику системы.
     * 
     * @param {Object} [options={}] - Опции выполнения
     * @param {string[]} [options.checks] - Список проверок для выполнения (все по умолчанию)
     * @param {boolean} [options.parallel] - Переопределить режим выполнения
     * @returns {Promise<DiagnosticResults>} Результаты диагностики
     */
    async runDiagnostics(options = {}) {
        const startTime = performance.now();
        const timestamp = new Date().toISOString();
        
        this._log({ key: 'logs.diagnostics.diagnosticsStart' }, options);

        /** @type {DiagnosticResults} */
        const results = {
            timestamp,
            totalDuration: 0,
            checks: {},
            overall: DiagnosticsManager.CHECK_STATUS.OK
        };

        try {
            const parallel = options.parallel !== undefined 
                ? options.parallel 
                : this.parallelExecution;

            const checksToRun = options.checks || Object.values(DiagnosticsManager.CHECK_NAMES);
            
            const checkMap = {
                [DiagnosticsManager.CHECK_NAMES.SERVICE_WORKER]: this.checkServiceWorker,
                [DiagnosticsManager.CHECK_NAMES.CONNECTION]: this.checkServerConnection,
                [DiagnosticsManager.CHECK_NAMES.TRACKING]: this.checkTrackingStatus,
                [DiagnosticsManager.CHECK_NAMES.STATS]: this.checkStats
            };

            if (parallel) {
                this._log({ key: 'logs.diagnostics.parallelExecution' });
                
                const checkPromises = checksToRun.map(checkName => 
                    this._executeCheck(checkMap[checkName], checkName)
                        .then(result => ({ checkName, result }))
                );

                const settledResults = await Promise.allSettled(checkPromises);

                settledResults.forEach(settled => {
                    if (settled.status === 'fulfilled') {
                        const { checkName, result } = settled.value;
                        results.checks[checkName] = result;
                    } else {
                        this._logError({ key: 'logs.diagnostics.checkFailed' }, settled.reason);
                    }
                });
            } else {
                this._log({ key: 'logs.diagnostics.sequentialExecution' });
                
                for (const checkName of checksToRun) {
                    results.checks[checkName] = await this._executeCheck(
                        checkMap[checkName], 
                        checkName
                    );
                }
            }

            results.overall = this.calculateOverallStatus(results.checks);

            results.totalDuration = Math.round(performance.now() - startTime);
            
            this._log({ key: 'logs.diagnostics.diagnosticsCompleted' }, {
                overall: results.overall,
                duration: results.totalDuration
            });
            
            return results;
        } catch (error) {
            this._logError({ key: 'logs.diagnostics.diagnosticsCriticalError' }, error);
            
            results.error = error.message;
            results.overall = DiagnosticsManager.CHECK_STATUS.ERROR;
            results.totalDuration = Math.round(performance.now() - startTime);
            
            return results;
        }
    }

    /**
     * Проверяет доступность Service Worker.
     * 
     * @private
     * @returns {Promise<DiagnosticCheck>} Результат проверки
     */
    async checkServiceWorker() {
        try {
            const isAvailable = await this.serviceWorkerManager.ping();
            
            const message = isAvailable 
                ? this.translateFn('logs.diagnostics.serviceWorkerAvailable')
                : this.translateFn('logs.diagnostics.serviceWorkerUnavailable');
            
            return {
                status: isAvailable 
                    ? DiagnosticsManager.CHECK_STATUS.OK 
                    : DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                data: { available: isAvailable }
            };
        } catch (error) {
            const message = this.translateFn('logs.diagnostics.serviceWorkerUnavailable');
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                error: error.message
            };
        }
    }

    /**
     * Проверяет подключение к серверу.
     * 
     * @private
     * @returns {Promise<DiagnosticCheck>} Результат проверки
     */
    async checkServerConnection() {
        try {
            const isOnline = await this.serviceWorkerManager.checkConnection();
            
            const message = isOnline 
                ? this.translateFn('logs.diagnostics.serverAvailable')
                : this.translateFn('logs.diagnostics.serverUnavailable');
            
            return {
                status: isOnline 
                    ? DiagnosticsManager.CHECK_STATUS.OK 
                    : DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                data: { online: isOnline }
            };
        } catch (error) {
            const message = this.translateFn('logs.diagnostics.serverConnectionError');
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                error: error.message
            };
        }
    }

    /**
     * Проверяет состояние отслеживания.
     * 
     * @private
     * @returns {Promise<DiagnosticCheck>} Результат проверки
     */
    async checkTrackingStatus() {
        try {
            const status = await this.serviceWorkerManager.getTrackingStatus();

            if (!status || typeof status !== 'object') {
                const message = this.translateFn('logs.diagnostics.trackingStatusInvalid');
                
                return {
                    status: DiagnosticsManager.CHECK_STATUS.WARNING,
                    message,
                    data: status
                };
            }
            
            const trackingText = status.isTracking 
                ? this.translateFn('logs.diagnostics.trackingActive')
                : this.translateFn('logs.diagnostics.trackingInactive');
            
            const trackingLabel = this.translateFn('logs.diagnostics.trackingStatus');
            
            const message = `${trackingLabel} ${trackingText}`;
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.OK,
                message,
                data: {
                    tracking: status.isTracking,
                    online: status.isOnline
                }
            };
        } catch (error) {
            const message = this.translateFn('logs.diagnostics.trackingStatusError');
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                error: error.message
            };
        }
    }

    /**
     * Проверяет статистику.
     * 
     * @private
     * @returns {Promise<DiagnosticCheck>} Результат проверки
     */
    async checkStats() {
        try {
            const stats = await this.serviceWorkerManager.getTodayStats();

            if (!stats || typeof stats !== 'object') {
                const message = this.translateFn('logs.diagnostics.statsInvalid');
                
                return {
                    status: DiagnosticsManager.CHECK_STATUS.WARNING,
                    message,
                    data: stats
                };
            }
            
            const hasData = stats.events > 0 || stats.domains > 0;
            const queueNotEmpty = stats.queue > 0;
            
            let message = this.translateFn('logs.diagnostics.statsReceived');
            
            if (hasData) {
                const dataText = this.translateFn('logs.diagnostics.statsWithData', { events: stats.events, domains: stats.domains });
                message += dataText;
            }
            if (queueNotEmpty) {
                const queueText = this.translateFn('logs.diagnostics.statsQueue', { queue: stats.queue });
                message += queueText;
            }
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.OK,
                message,
                data: stats
            };
        } catch (error) {
            const message = this.translateFn('logs.diagnostics.statsError');
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message,
                error: error.message
            };
        }
    }

    /**
     * Вычисляет общий статус диагностики на основе результатов проверок.
     * 
     * @param {Object.<string, DiagnosticCheck>} checks - Результаты проверок
     * @returns {'ok'|'warning'|'error'} Общий статус
     */
    calculateOverallStatus(checks) {
        if (!checks || typeof checks !== 'object' || Object.keys(checks).length === 0) {
            return DiagnosticsManager.CHECK_STATUS.ERROR;
        }
        
        const statuses = Object.values(checks).map(check => check.status);

        if (statuses.some(status => status === DiagnosticsManager.CHECK_STATUS.ERROR)) {
            return DiagnosticsManager.CHECK_STATUS.ERROR;
        }

        if (statuses.some(status => status === DiagnosticsManager.CHECK_STATUS.WARNING)) {
            return DiagnosticsManager.CHECK_STATUS.WARNING;
        }

        if (statuses.every(status => status === DiagnosticsManager.CHECK_STATUS.OK)) {
            return DiagnosticsManager.CHECK_STATUS.OK;
        }

        return DiagnosticsManager.CHECK_STATUS.WARNING;
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.diagnostics.cleanupStart' });
        
        try {
            this._log({ key: 'logs.diagnostics.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.diagnostics.destroyError' }, error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiagnosticsManager;
    module.exports.default = DiagnosticsManager;
}

if (typeof window !== 'undefined') {
    window.DiagnosticsManager = DiagnosticsManager;
}
