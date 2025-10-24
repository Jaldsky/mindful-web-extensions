const BaseManager = require('../BaseManager.js');

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
     * @enum {string}
     */
    static CHECK_STATUS = {
        OK: 'ok',
        WARNING: 'warning',
        ERROR: 'error'
    };

    /**
     * Названия проверок
     * @readonly
     * @enum {string}
     */
    static CHECK_NAMES = {
        SERVICE_WORKER: 'serviceWorker',
        CONNECTION: 'connection',
        TRACKING: 'tracking',
        STATS: 'stats'
    };

    /**
     * Эмодзи для статусов
     * @readonly
     * @enum {string}
     */
    static STATUS_EMOJI = {
        ok: '✅',
        warning: '⚠️',
        error: '❌',
        unknown: '❓'
    };

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

        if (!serviceWorkerManager) {
            throw new TypeError('ServiceWorkerManager обязателен');
        }

        if (!notificationManager) {
            throw new TypeError('NotificationManager обязателен');
        }
        
        /** @type {Object} */
        this.serviceWorkerManager = serviceWorkerManager;
        
        /** @type {Object} */
        this.notificationManager = notificationManager;
        
        /** @type {boolean} */
        this.parallelExecution = options.parallelExecution !== false;
        
        /** @type {DiagnosticResults|null} */
        this.lastResults = null;
        
        this._log('DiagnosticsManager инициализирован', { 
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
            this._log(`Запуск проверки: ${checkName}`);
            
            const result = await checkFunction.call(this);
            const duration = Math.round(performance.now() - startTime);
            
            this._log(`Проверка ${checkName} завершена за ${duration}мс`, result);
            
            return {
                ...result,
                duration
            };
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            
            this._logError(`Ошибка при выполнении проверки ${checkName}`, error);
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message: `Неожиданная ошибка при проверке ${checkName}`,
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
        
        this._log('Запуск диагностики', options);

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
                this._log('Выполнение проверок параллельно');
                
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
                        this._logError('Проверка завершилась с ошибкой', settled.reason);
                    }
                });
            } else {
                this._log('Выполнение проверок последовательно');
                
                for (const checkName of checksToRun) {
                    results.checks[checkName] = await this._executeCheck(
                        checkMap[checkName], 
                        checkName
                    );
                }
            }

            results.overall = this.calculateOverallStatus(results.checks);

            results.totalDuration = Math.round(performance.now() - startTime);

            this.lastResults = results;
            
            this._log('Диагностика завершена', {
                overall: results.overall,
                duration: results.totalDuration
            });
            
            return results;
        } catch (error) {
            this._logError('Критическая ошибка диагностики', error);
            
            results.error = error.message;
            results.overall = DiagnosticsManager.CHECK_STATUS.ERROR;
            results.totalDuration = Math.round(performance.now() - startTime);
            
            this.lastResults = results;
            
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
            
            return {
                status: isAvailable 
                    ? DiagnosticsManager.CHECK_STATUS.OK 
                    : DiagnosticsManager.CHECK_STATUS.ERROR,
                message: isAvailable 
                    ? 'Service Worker доступен' 
                    : 'Service Worker недоступен',
                data: { available: isAvailable }
            };
        } catch (error) {
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message: 'Service Worker недоступен',
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
            
            return {
                status: isOnline 
                    ? DiagnosticsManager.CHECK_STATUS.OK 
                    : DiagnosticsManager.CHECK_STATUS.ERROR,
                message: isOnline 
                    ? 'Сервер доступен' 
                    : 'Сервер недоступен',
                data: { online: isOnline }
            };
        } catch (error) {
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message: 'Ошибка проверки подключения к серверу',
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
                return {
                    status: DiagnosticsManager.CHECK_STATUS.WARNING,
                    message: 'Получены некорректные данные о статусе отслеживания',
                    data: status
                };
            }
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.OK,
                message: `Отслеживание ${status.isTracking ? 'активно' : 'неактивно'}`,
                data: {
                    tracking: status.isTracking,
                    online: status.isOnline
                }
            };
        } catch (error) {
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message: 'Ошибка получения статуса отслеживания',
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
                return {
                    status: DiagnosticsManager.CHECK_STATUS.WARNING,
                    message: 'Получены некорректные данные статистики',
                    data: stats
                };
            }
            
            const hasData = stats.events > 0 || stats.domains > 0;
            const queueNotEmpty = stats.queue > 0;
            
            let message = 'Статистика получена';
            if (hasData) {
                message += ` (${stats.events} событий, ${stats.domains} доменов)`;
            }
            if (queueNotEmpty) {
                message += ` [Очередь: ${stats.queue}]`;
            }
            
            return {
                status: DiagnosticsManager.CHECK_STATUS.OK,
                message,
                data: stats
            };
        } catch (error) {
            return {
                status: DiagnosticsManager.CHECK_STATUS.ERROR,
                message: 'Ошибка получения статистики',
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
     * Отображает результаты диагностики пользователю.
     * 
     * @param {DiagnosticResults} results - Результаты диагностики
     * @returns {void}
     */
    displayDiagnosticResults(results) {
        if (!results) {
            this._logError('Нет результатов диагностики для отображения');
            return;
        }

        const emoji = DiagnosticsManager.STATUS_EMOJI[results.overall] ||
            DiagnosticsManager.STATUS_EMOJI.unknown;

        const checksCount = Object.keys(results.checks).length;
        const errorCount = Object.values(results.checks)
            .filter(c => c.status === DiagnosticsManager.CHECK_STATUS.ERROR).length;
        const warningCount = Object.values(results.checks)
            .filter(c => c.status === DiagnosticsManager.CHECK_STATUS.WARNING).length;

        let message = `${emoji} Диагностика завершена за ${results.totalDuration}мс`;
        
        if (errorCount > 0) {
            message += ` | Ошибки: ${errorCount}/${checksCount}`;
        } else if (warningCount > 0) {
            message += ` | Предупреждения: ${warningCount}/${checksCount}`;
        } else {
            message += ' | Все проверки пройдены';
        }

        const notificationType = results.overall === DiagnosticsManager.CHECK_STATUS.OK 
            ? 'success' 
            : 'error';

        this.notificationManager.showNotification(message, notificationType);

        // eslint-disable-next-line no-console
        console.group('📊 Результаты диагностики');
        // eslint-disable-next-line no-console
        console.log('Общий статус:', results.overall);
        // eslint-disable-next-line no-console
        console.log('Время выполнения:', `${results.totalDuration}мс`);
        // eslint-disable-next-line no-console
        console.log('Время запуска:', results.timestamp);
        
        if (results.error) {
            // eslint-disable-next-line no-console
            console.error('Общая ошибка:', results.error);
        }
        
        // eslint-disable-next-line no-console
        console.group('Проверки:');
        Object.entries(results.checks).forEach(([name, check]) => {
            const checkEmoji = DiagnosticsManager.STATUS_EMOJI[check.status] ||
                DiagnosticsManager.STATUS_EMOJI.unknown;
            // eslint-disable-next-line no-console
            console.log(
                `${checkEmoji} ${name}:`, 
                `${check.message} (${check.duration}мс)`,
                check.data || ''
            );
            if (check.error) {
                // eslint-disable-next-line no-console
                console.error(`  Ошибка: ${check.error}`);
            }
        });
        // eslint-disable-next-line no-console
        console.groupEnd();
        // eslint-disable-next-line no-console
        console.groupEnd();
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Очистка ресурсов DiagnosticsManager');
        
        try {
            this.lastResults = null;
            this._log('DiagnosticsManager уничтожен');
        } catch (error) {
            this._logError('Ошибка при уничтожении DiagnosticsManager', error);
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
