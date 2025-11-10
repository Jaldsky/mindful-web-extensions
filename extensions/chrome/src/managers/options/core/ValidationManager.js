const BaseManager = require('../../../base/BaseManager.js');
const CONFIG = require('../../../config/config.js');

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Валидна ли проверяемая величина
 * @property {string} [error] - Сообщение об ошибке (если не валидна)
 * @property {*} [value] - Обработанное значение
 */

/**
 * @typedef {Object} ValidationHistoryEntry
 * @property {string} url - Проверяемый URL
 * @property {boolean} isValid - Результат валидации
 * @property {string} [error] - Ошибка валидации
 * @property {number} timestamp - Время валидации
 * @property {number} duration - Длительность валидации (мс)
 */

/**
 * Менеджер для валидации данных настроек.
 * Отвечает за проверку корректности введенных пользователем данных.
 * Включает измерение производительности, историю валидаций и статистику.
 * 
 * @class ValidationManager
 * @extends BaseManager
 */
class ValidationManager extends BaseManager {
    /**
     * Типы ошибок валидации
     * @readonly
     * @enum {string}
     */
    static VALIDATION_ERRORS = {
        EMPTY_URL: 'URL cannot be empty',
        INVALID_URL: 'Please enter a valid URL',
        INVALID_PROTOCOL: 'URL must use http:// or https:// protocol',
        INVALID_FORMAT: 'Invalid URL format'
    };

    /**
     * Разрешенные протоколы для URL
     * @readonly
     * @enum {string}
     */
    static ALLOWED_PROTOCOLS = ['http:', 'https:'];

    /**
     * Максимальный размер истории валидаций
     * @readonly
     * @static
     */
    static MAX_HISTORY_SIZE = CONFIG.VALIDATION.MAX_HISTORY_SIZE;

    /**
     * Создает экземпляр ValidationManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить детальное логирование
     * @param {boolean} [options.strictProtocol=true] - Строгая проверка протокола
     * @param {boolean} [options.enableHistory=false] - Включить историю валидаций
     * @param {number} [options.maxHistorySize=100] - Максимальный размер истории
     */
    constructor(options = {}) {
        super(options);
        
        /** @type {boolean} */
        this.strictProtocol = options.strictProtocol !== false;
        
        /** @type {boolean} */
        this.enableHistory = options.enableHistory || false;
        
        /** @type {number} */
        this.maxHistorySize = options.maxHistorySize || ValidationManager.MAX_HISTORY_SIZE;
        
        /** @type {ValidationHistoryEntry[]} */
        this.history = [];
        
        /** @type {Map<string, number>} */
        this.validationStats = new Map([
            ['totalValidations', 0],
            ['successfulValidations', 0],
            ['failedValidations', 0],
            ['emptyUrlErrors', 0],
            ['invalidUrlErrors', 0],
            ['invalidProtocolErrors', 0],
            ['invalidFormatErrors', 0]
        ]);
        
        this.updateState({
            lastValidationTime: null,
            lastValidationResult: null
        });
    }

    /**
     * Валидирует URL бэкенда с измерением производительности и сбором статистики.
     * 
     * @param {string} url - URL для валидации
     * @returns {ValidationResult} Результат валидации
     */
    validateBackendUrl(url) {
        return this._executeWithTiming('validateBackendUrl', () => {
            const startTime = performance.now();
            let errorType = null;
            
            try {
                this.validationStats.set('totalValidations', 
                    (this.validationStats.get('totalValidations') || 0) + 1);

                if (!url || typeof url !== 'string') {
                    errorType = 'emptyUrlErrors';
                    return this._createValidationResult(
                        false, 
                        ValidationManager.VALIDATION_ERRORS.EMPTY_URL,
                        undefined,
                        startTime
                    );
                }

                const trimmedUrl = url.trim();
                
                if (trimmedUrl === '') {
                    errorType = 'emptyUrlErrors';
                    return this._createValidationResult(
                        false, 
                        ValidationManager.VALIDATION_ERRORS.EMPTY_URL,
                        undefined,
                        startTime
                    );
                }

                let parsedUrl;
                try {
                    parsedUrl = new URL(trimmedUrl);
                } catch (error) {
                    this._log({ key: 'logs.validation.urlParsingError' }, { error: error.message, url: trimmedUrl.substring(0, CONFIG.VALIDATION.MAX_URL_LENGTH_FOR_LOGGING) });
                    errorType = 'invalidUrlErrors';
                    return this._createValidationResult(
                        false, 
                        ValidationManager.VALIDATION_ERRORS.INVALID_URL,
                        undefined,
                        startTime
                    );
                }

                if (this.strictProtocol) {
                    if (!ValidationManager.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
                        errorType = 'invalidProtocolErrors';
                        return this._createValidationResult(
                            false, 
                            ValidationManager.VALIDATION_ERRORS.INVALID_PROTOCOL,
                            undefined,
                            startTime
                        );
                    }
                }

                if (!parsedUrl.host || parsedUrl.host === '') {
                    errorType = 'invalidFormatErrors';
                    return this._createValidationResult(
                        false, 
                        ValidationManager.VALIDATION_ERRORS.INVALID_FORMAT,
                        undefined,
                        startTime
                    );
                }

                if (parsedUrl.href !== trimmedUrl) {
                    this._log({ key: 'logs.validation.urlNormalized' }, {
                        original: trimmedUrl,
                        normalized: parsedUrl.href
                    });
                }

                const result = this._createValidationResult(true, null, trimmedUrl, startTime);
                
                return result;
            } catch (error) {
                this._logError({ key: 'logs.validation.unexpectedValidationError' }, error);
                errorType = 'invalidUrlErrors';
                return this._createValidationResult(
                    false, 
                    ValidationManager.VALIDATION_ERRORS.INVALID_URL,
                    undefined,
                    startTime
                );
            } finally {
                if (errorType) {
                    this.validationStats.set(errorType, 
                        (this.validationStats.get(errorType) || 0) + 1);
                }
                
                this.updateState({
                    lastValidationTime: Date.now()
                });
            }
        });
    }

    /**
     * Создает объект результата валидации с обновлением статистики и истории.
     * 
     * @private
     * @param {boolean} isValid - Валидность
     * @param {string|null} error - Ошибка
     * @param {*} [value] - Обработанное значение
     * @param {number} [startTime] - Время начала валидации (performance.now())
     * @returns {ValidationResult} Результат валидации
     */
    _createValidationResult(isValid, error, value, startTime) {
        const result = {
            isValid,
            error: error || undefined,
            value: value !== undefined ? value : undefined
        };

        if (isValid) {
            this.validationStats.set('successfulValidations', 
                (this.validationStats.get('successfulValidations') || 0) + 1);
        } else {
            this.validationStats.set('failedValidations', 
                (this.validationStats.get('failedValidations') || 0) + 1);
        }

        if (this.enableHistory && startTime !== undefined) {
            const duration = Math.round(performance.now() - startTime);
            const urlForHistory = typeof value === 'string' ? value : '';
            this._addToHistory(urlForHistory, isValid, error, duration);
        }
        
        this.updateState({
            lastValidationResult: result
        });
        
        return result;
    }

    /**
     * Добавляет запись в историю валидаций.
     * 
     * @private
     * @param {string} url - Проверяемый URL
     * @param {boolean} isValid - Результат валидации
     * @param {string} [error] - Ошибка валидации
     * @param {number} duration - Длительность валидации (мс)
     * @returns {void}
     */
    _addToHistory(url, isValid, error, duration) {
        try {
            const entry = {
                url: url.substring(0, CONFIG.VALIDATION.MAX_URL_LENGTH_FOR_HISTORY),
                isValid,
                error: error || undefined,
                timestamp: Date.now(),
                duration
            };
            
            this.history.unshift(entry);

            if (this.history.length > this.maxHistorySize) {
                this.history = this.history.slice(0, this.maxHistorySize);
            }
        } catch (error) {
            this._logError({ key: 'logs.validation.addHistoryError' }, error);
        }
    }

    /**
     * Проверяет, является ли строка валидным URL.
     * Упрощенная версия validateBackendUrl для быстрой проверки.
     * 
     * @param {string} url - URL для проверки
     * @returns {boolean} true если URL валиден
     */
    isValidUrl(url) {
        const result = this.validateBackendUrl(url);
        return result.isValid;
    }

    /**
     * Получает историю валидаций с возможностью фильтрации.
     * 
     * @param {Object} [options={}] - Опции фильтрации
     * @param {boolean} [options.validOnly] - Только успешные валидации
     * @param {boolean} [options.invalidOnly] - Только неуспешные валидации
     * @param {number} [options.limit] - Максимальное количество записей
     * @returns {ValidationHistoryEntry[]} История валидаций
     */
    getHistory(options = {}) {
        try {
            let result = [...this.history];
            
            if (options.validOnly) {
                result = result.filter(entry => entry.isValid);
            }
            
            if (options.invalidOnly) {
                result = result.filter(entry => !entry.isValid);
            }
            
            if (options.limit && options.limit > 0) {
                result = result.slice(0, options.limit);
            }
            
            return result;
        } catch (error) {
            this._logError({ key: 'logs.validation.getHistoryError' }, error);
            return [];
        }
    }

    /**
     * Очищает историю валидации.
     * 
     * @returns {number} Количество удаленных записей
     */
    clearHistory() {
        try {
            const count = this.history.length;
            this.history = [];
            this._log({ key: 'logs.validation.historyCleared' }, { deletedCount: count });
            return count;
        } catch (error) {
            this._logError({ key: 'logs.validation.clearHistoryError' }, error);
            return 0;
        }
    }

    /**
     * Очищает внутреннее состояние валидации.
     * 
     * @private
     * @returns {void}
     */
    _clearValidationHistory() {
        this.updateState({
            lastValidationTime: null,
            lastValidationResult: null
        });
        this._log({ key: 'logs.validation.internalStateCleared' });
    }

    /**
     * Получает статистику валидаций.
     * 
     * @returns {Object} Объект со статистикой
     */
    getValidationStatistics() {
        try {
            const stats = Object.fromEntries(this.validationStats);

            const total = stats.totalValidations || 0;
            if (total > 0) {
                stats.successRate = Math.round((stats.successfulValidations / total) * 100);
                stats.failureRate = Math.round((stats.failedValidations / total) * 100);
            } else {
                stats.successRate = 0;
                stats.failureRate = 0;
            }
            
            stats.historySize = this.history.length;
            stats.maxHistorySize = this.maxHistorySize;
            
            return stats;
        } catch (error) {
            this._logError({ key: 'logs.validation.getStatisticsError' }, error);
            return {};
        }
    }

    /**
     * Проверяет валидность состояния менеджера.
     * 
     * @returns {Object} Результат проверки
     */
    validateState() {
        const issues = [];

        try {
            if (typeof this.strictProtocol !== 'boolean') {
                issues.push(this.t('logs.validation.stateIssue.strictProtocolMustBeBoolean'));
            }
            
            if (typeof this.enableHistory !== 'boolean') {
                issues.push(this.t('logs.validation.stateIssue.enableHistoryMustBeBoolean'));
            }
            
            if (typeof this.maxHistorySize !== 'number' || this.maxHistorySize <= 0) {
                issues.push(this.t('logs.validation.stateIssue.maxHistorySizeMustBePositive'));
            }
            
            if (!Array.isArray(this.history)) {
                issues.push(this.t('logs.validation.stateIssue.historyMustBeArray'));
            }
            
            if (!(this.performanceMetrics instanceof Map)) {
                issues.push(this.t('logs.validation.stateIssue.performanceMetricsMustBeMap'));
            }
            
            if (!(this.validationStats instanceof Map)) {
                issues.push(this.t('logs.validation.stateIssue.validationStatsMustBeMap'));
            }

            if (this.state.lastValidationTime !== null && 
                (typeof this.state.lastValidationTime !== 'number' || this.state.lastValidationTime < 0)) {
                issues.push(this.t('logs.validation.stateIssue.lastValidationTimeMustBeNumberOrNull'));
            }

            if (this.state.lastValidationResult !== null && 
                typeof this.state.lastValidationResult !== 'object') {
                issues.push(this.t('logs.validation.stateIssue.lastValidationResultMustBeObjectOrNull'));
            }

            if (this.state.lastValidationResult && 
                typeof this.state.lastValidationResult.isValid !== 'boolean') {
                issues.push(this.t('logs.validation.stateIssue.lastValidationResultIsValidMustBeBoolean'));
            }

            const isValid = issues.length === 0;

            return {
                isValid,
                issues,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this._logError({ key: 'logs.validation.stateValidationError' }, error);
            return {
                isValid: false,
                issues: [this.t('logs.validation.stateIssue.validationExecutionError')],
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Очищает ресурсы при уничтожении менеджера.
     * 
     * @returns {void}
     */
    destroy() {
        this._log({ key: 'logs.validation.destroyStart' });
        
        try {
            this.history = [];

            if (this.validationStats) {
                this.validationStats.clear();
            }

            this._clearValidationHistory();
            
            this._log({ key: 'logs.validation.destroyed' });
        } catch (error) {
            this._logError({ key: 'logs.validation.destroyError' }, error);
        }
        
        super.destroy();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationManager;
    module.exports.default = ValidationManager;
}

if (typeof window !== 'undefined') {
    window.ValidationManager = ValidationManager;
}
