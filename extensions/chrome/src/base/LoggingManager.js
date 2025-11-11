const CONFIG = require('../config/config.js');
const LocaleManager = require('./LocaleManager.js');

/**
 * Базовый менеджер для логирования.
 * 
 * @class LoggingManager
 */
class LoggingManager {
    /**
     * Создает экземпляр LoggingManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     * @param {Function} [options.translateFn] - Функция перевода
     * @param {Function} [options.getClassName] - Функция получения имени класса
     */
    constructor(options = {}) {
        this.enableLogging = options.enableLogging || false;
        this.translateFn = options.translateFn;
        this.getClassName = options.getClassName || (() => CONFIG.LOGS.DEFAULT_CLASS_NAME);
        this.localeManager = new LocaleManager();
    }

    /**
     * Логирует сообщение, если логирование включено.
     * 
     * @protected
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _log(message, data) {
        if (this.enableLogging) {
            const localePromise = this.localeManager._getLocaleLoadingPromise();
            if (localePromise) {
                localePromise.then(() => {
                    this._doLog(message, data);
                }).catch(() => {
                    this._doLog(message, data);
                });
            } else {
                this._doLog(message, data);
            }
        }
    }

    /**
     * Выполняет фактическое логирование сообщения.
     * 
     * @private
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _doLog(message, data) {
        const className = this.getClassName();
        const isConsoleEnabledInConfig = (CONFIG.LOGGING && CONFIG.LOGGING.CONSOLE_OUTPUT) === true;
        const hasProcessEnv = typeof process !== 'undefined' && !!process.env;
        const testModeValue = (CONFIG.MODES && CONFIG.MODES.TEST) || 'test';
        const isTestEnv = hasProcessEnv && process.env.NODE_ENV === testModeValue;
        const shouldConsole = isConsoleEnabledInConfig || isTestEnv;
        const { resolvedMessage, messageKey, messageParams } = this._resolveMessage(message);
        if (shouldConsole) {
            // eslint-disable-next-line no-console
            console.log(`[${className}] ${resolvedMessage}`, data !== undefined ? data : '');
        }
        this._saveLogToStorage('INFO', resolvedMessage, data, messageKey, messageParams);
    }

    /**
     * Логирует ошибку.
     * 
     * @protected
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {Error|*} [error] - Объект ошибки
     * @returns {void}
     */
    _logError(message, error) {
        const localePromise = this.localeManager._getLocaleLoadingPromise();
        if (localePromise) {
            localePromise.then(() => {
                this._doLogError(message, error);
            }).catch(() => {
                this._doLogError(message, error);
            });
        } else {
            this._doLogError(message, error);
        }
    }

    /**
     * Выполняет фактическое логирование ошибки.
     * 
     * @private
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {Error|*} [error] - Объект ошибки
     * @returns {void}
     */
    _doLogError(message, error) {
        const className = this.getClassName();
        const isConsoleEnabledInConfig = (CONFIG.LOGGING && CONFIG.LOGGING.CONSOLE_OUTPUT) === true;
        const hasProcessEnv = typeof process !== 'undefined' && !!process.env;
        const testModeValue = (CONFIG.MODES && CONFIG.MODES.TEST) || 'test';
        const isTestEnv = hasProcessEnv && process.env.NODE_ENV === testModeValue;
        const shouldConsole = isConsoleEnabledInConfig || isTestEnv;
        const { resolvedMessage, messageKey, messageParams } = this._resolveMessage(message);
        if (shouldConsole) {
            // eslint-disable-next-line no-console
            console.error(`[${className}] ${resolvedMessage}`, error || '');
        }
        this._saveLogToStorage('ERROR', resolvedMessage, error, messageKey, messageParams);
    }

    /**
     * Разрешает сообщение логирования: поддерживает строки и объекты { key, params, fallback }.
     * 
     * @private
     * @param {*} message
     * @returns {{resolvedMessage:string, messageKey:string|null, messageParams:Object|null}}
     */
    _resolveMessage(message) {
        try {
            if (message && typeof message === 'object' && typeof message.key === 'string') {
                const key = message.key;
                const params = message.params || {};
                
                const translate = this.localeManager._getTranslateFn(this.translateFn);
                const resolved = translate(key, params);
                
                if (!resolved || resolved === key) {
                    const finalResolved = message.fallback || key;
                    return { resolvedMessage: finalResolved, messageKey: key, messageParams: params };
                }
                
                return { resolvedMessage: resolved, messageKey: key, messageParams: params };
            }
            return { resolvedMessage: String(message), messageKey: null, messageParams: null };
        } catch (_e) {
            return { resolvedMessage: String(message), messageKey: null, messageParams: null };
        }
    }

    /**
     * Форматирует Error объект для логирования.
     * 
     * @private
     * @param {Error} error - Объект ошибки
     * @returns {Object} Отформатированный объект для логирования
     */
    _formatErrorForLogging(error) {
        const translate = this.localeManager._getTranslateFn(this.translateFn);
        const formatted = {
            message: error.message || translate('logs.baseManager.unknownError')
        };
        
        if (error.status !== undefined) formatted.status = error.status;
        if (error.method !== undefined) formatted.method = error.method;
        if (error.url !== undefined) formatted.url = error.url;
        if (error.errorText !== undefined) formatted.errorText = error.errorText;
        if (error.code !== undefined) formatted.code = error.code;
        if (error.attempt !== undefined) formatted.attempt = error.attempt;
        
        return formatted;
    }

    /**
     * Сохраняет лог в chrome.storage.local для отображения в панели разработчика.
     * 
     * @private
     * @param {string} level - Уровень лога (INFO, ERROR)
     * @param {string} message - Сообщение лога
     * @param {*} [data] - Дополнительные данные
     * @param {string|null} [messageKey] - Ключ сообщения
     * @param {Object|null} [messageParams] - Параметры сообщения
     * @returns {void}
     */
    _saveLogToStorage(level, message, data, messageKey, messageParams) {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            return;
        }

        try {
            const className = this.getClassName();
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                className,
                message,
                messageKey: messageKey || null,
                messageParams: messageParams || null,
                data: data !== undefined ? (data instanceof Error ? this._formatErrorForLogging(data) : data) : null
            };

            const getResult = chrome.storage.local.get([CONFIG.LOGS.STORAGE_KEY], (result) => {
                if (chrome.runtime.lastError) {
                    return;
                }

                const logs = result[CONFIG.LOGS.STORAGE_KEY] || [];
                logs.push(logEntry);

                const maxLogs = CONFIG.LOGS.MAX_LOGS;
                if (logs.length > maxLogs) {
                    logs.splice(0, logs.length - maxLogs);
                }

                const setResult = chrome.storage.local.set({ [CONFIG.LOGS.STORAGE_KEY]: logs }, () => {
                    if (chrome.runtime.lastError) {
                        // Ignore storage errors
                    }
                });

                if (setResult && typeof setResult.catch === 'function') {
                    setResult.catch(() => {
                        // Ignore promise rejection
                    });
                }
            });

            if (getResult && typeof getResult.catch === 'function') {
                getResult.catch(() => {
                    // Ignore promise rejection
                });
            }
        } catch (error) {
            // Ignore storage errors
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoggingManager;
    module.exports.default = LoggingManager;
}
