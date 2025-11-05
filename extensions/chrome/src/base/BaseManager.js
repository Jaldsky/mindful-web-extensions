const CONFIG = require('../../config.js');
const EN = require('../../locales/en.js');
const RU = require('../../locales/ru.js');

/**
 * @typedef {Object} ManagerState
 * @property {boolean} isOnline - Статус подключения к сети
 * @property {boolean} isTracking - Статус активности отслеживания
 * @property {number} lastUpdate - Временная метка последнего обновления
 */

/**
 * Базовый класс для управления состоянием и константами.
 * Содержит общую логику для всех компонентов app.
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
    static DEFAULT_CONSTANTS = CONFIG.BASE;

    /**
     * Создает экземпляр BaseManager.
     * 
     * @param {Object} [options={}] - Опции конфигурации
     * @param {Object} [options.constants] - Переопределение констант
     * @param {Object} [options.initialState] - Начальное состояние
     * @param {boolean} [options.enableLogging=false] - Включить логирование
     * @param {boolean} [options.enablePerformanceTracking=true] - Включить отслеживание производительности
     * @param {Function} [options.translateFn] - Функция перевода: (key: string, params?: Object) => string
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
        
        /** @type {boolean} */
        this.enablePerformanceTracking = options.enablePerformanceTracking !== false;
        
        /** @type {Map<string, number>} */
        this.performanceMetrics = new Map();
    }

    /**
     * Получает временную функцию локализации на основе языка браузера.
     * Используется в конструкторе до того, как translateFn будет доступен.
     * 
     * @protected
     * @returns {Function} Функция перевода: (key: string, params?: Object) => string
     */
    _getTemporaryTranslateFn() {
        const defaultLocale = typeof navigator !== 'undefined' && navigator.language?.startsWith('ru') ? 'ru' : 'en';
        const translations = defaultLocale === 'ru' ? RU : EN;
        
        return (key, params = {}) => {
            const keys = key.split('.');
            let value = translations;
            for (const k of keys) {
                value = value?.[k];
            }
            if (typeof value !== 'string') return key;
            return Object.keys(params).reduce((str, paramKey) => 
                str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]), value);
        };
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
            const className = this.constructor.name;
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
            // Всегда сохраняем лог в storage для панели расширения
            this._saveLogToStorage('INFO', resolvedMessage, data, messageKey, messageParams);
        }
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
        const className = this.constructor.name;
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
        // Всегда сохраняем лог ошибки в storage для панели расширения
        this._saveLogToStorage('ERROR', resolvedMessage, error, messageKey, messageParams);
    }

    /**
     * Разрешает сообщение логирования: поддерживает строки и объекты { key, params, fallback }.
     * @private
     * @param {*} message
     * @returns {{resolvedMessage:string, messageKey:string|null, messageParams:Object|null}}
     */
    _resolveMessage(message) {
        try {
            if (message && typeof message === 'object' && typeof message.key === 'string') {
                const key = message.key;
                const params = message.params || {};
                const translate = this.options && typeof this.options.translateFn === 'function'
                    ? this.options.translateFn
                    : null;
                const resolved = translate ? translate(key, params) : (message.fallback || key);
                return { resolvedMessage: resolved, messageKey: key, messageParams: params };
            }
            return { resolvedMessage: String(message), messageKey: null, messageParams: null };
        } catch (_e) {
            return { resolvedMessage: String(message), messageKey: null, messageParams: null };
        }
    }

    /**
     * Сохраняет лог в chrome.storage.local для отображения в панели разработчика.
     * 
     * @private
     * @param {string} level - Уровень лога (INFO, ERROR)
     * @param {string} message - Сообщение лога
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _saveLogToStorage(level, message, data, messageKey, messageParams) {
        // Проверяем доступность chrome.storage
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            return;
        }

        try {
            const className = this.constructor.name;
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                className,
                message,
                messageKey: messageKey || null,
                messageParams: messageParams || null,
                data: data !== undefined ? (data instanceof Error ? { message: data.message, stack: data.stack } : data) : null
            };

            // Получаем текущие логи и добавляем новый
            const getResult = chrome.storage.local.get(['mindful_logs'], (result) => {
                if (chrome.runtime.lastError) {
                    // Игнорируем ошибки, чтобы не нарушать основной функционал
                    return;
                }

                const logs = result.mindful_logs || [];
                logs.push(logEntry);
                
                // Ограничиваем количество логов
                const maxLogs = CONFIG.LOGS?.MAX_LOGS || 1000;
                if (logs.length > maxLogs) {
                    logs.splice(0, logs.length - maxLogs);
                }

                // Сохраняем обновленные логи
                const setResult = chrome.storage.local.set({ mindful_logs: logs }, () => {
                    if (chrome.runtime.lastError) {
                        // Игнорируем ошибки сохранения
                    }
                });
                
                // Обработка Promise API (для тестов)
                if (setResult && typeof setResult.catch === 'function') {
                    setResult.catch(() => {
                        // Игнорируем ошибки
                    });
                }
            });
            
            // Обработка Promise API (для тестов)
            if (getResult && typeof getResult.catch === 'function') {
                getResult.catch(() => {
                    // Игнорируем ошибки
                });
            }
        } catch (error) {
            // Игнорируем ошибки, чтобы не нарушать основной функционал
        }
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
     * Выполняет синхронную операцию с измерением времени.
     * 
     * @protected
     * @param {string} operationName - Название операции
     * @param {Function} operation - Функция операции
     * @returns {*} Результат операции
     */
    _executeWithTiming(operationName, operation) {
        if (!this.enablePerformanceTracking) {
            return operation();
        }

        const startTime = performance.now();
        
        try {
            const result = operation();
            const duration = Math.round(performance.now() - startTime);
            
            this.performanceMetrics.set(`${operationName}_lastDuration`, duration);
            
            // Логируем только операции длительностью больше порога
            const threshold = CONFIG.LOGS?.PERFORMANCE_LOG_THRESHOLD || 10;
            if (duration > threshold) {
                this._log(`${operationName} завершена за ${duration}мс`);
            }
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this._logError(`${operationName} завершилась с ошибкой за ${duration}мс`, error);
            throw error;
        }
    }

    /**
     * Выполняет асинхронную операцию с измерением времени.
     * 
     * @protected
     * @param {string} operationName - Название операции
     * @param {Function} operation - Асинхронная функция операции
     * @returns {Promise<*>} Результат операции
     */
    async _executeWithTimingAsync(operationName, operation) {
        if (!this.enablePerformanceTracking) {
            return await operation();
        }

        const startTime = performance.now();
        
        try {
            const result = await operation();
            const duration = Math.round(performance.now() - startTime);
            
            this.performanceMetrics.set(`${operationName}_lastDuration`, duration);
            
            // Логируем только операции длительностью больше порога
            const threshold = CONFIG.LOGS?.PERFORMANCE_LOG_THRESHOLD || 10;
            if (duration > threshold) {
                this._log(`${operationName} завершена за ${duration}мс`);
            }
            
            return result;
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            this._logError(`${operationName} завершилась с ошибкой за ${duration}мс`, error);
            throw error;
        }
    }

    /**
     * Получает метрики производительности операций.
     * 
     * @returns {Object} Объект с метриками
     */
    getPerformanceMetrics() {
        try {
            return Object.fromEntries(this.performanceMetrics);
        } catch (error) {
            this._logError('Ошибка получения метрик производительности', error);
            return {};
        }
    }

    /**
     * Очищает метрики производительности.
     * 
     * @protected
     * @returns {void}
     */
    _clearPerformanceMetrics() {
        try {
            if (this.performanceMetrics) {
                this.performanceMetrics.clear();
                this._log('Метрики производительности очищены');
            }
        } catch (error) {
            this._logError('Ошибка очистки метрик производительности', error);
        }
    }

    /**
     * Очищает ресурсы менеджера.
     * Переопределите этот метод в дочерних классах для специфичной очистки.
     * 
     * @returns {void}
     */
    destroy() {
        this._log('Базовая очистка ресурсов');
        this._clearPerformanceMetrics();
        this.resetState();
    }
}

if (typeof window !== 'undefined') {
    window.BaseManager = BaseManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseManager;
    module.exports.default = BaseManager;
}
