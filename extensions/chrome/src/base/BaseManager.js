const CONFIG = require('../config/config.js');
const EN = require('../locales/en.js');
const RU = require('../locales/ru.js');

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
     * Поддерживаемые локали
     * @readonly
     * @static
     */
    static SUPPORTED_LOCALES = {
        EN: 'en',
        RU: 'ru'
    };

    /**
     * Локаль по умолчанию
     * @readonly
     * @static
     */
    static DEFAULT_LOCALE = BaseManager.SUPPORTED_LOCALES.EN;

    /**
     * Кэш локали для синхронного доступа
     * @private
     * @static
     * @type {string|null}
     */
    static _localeCache = null;

    /**
     * Флаг, указывающий, что локаль уже загружается из chrome.storage.local
     * @private
     * @static
     * @type {Promise<void>|null}
     */
    static _localeLoadingPromise = null;

    /**
     * Определяет локаль браузера.
     * 
     * @static
     * @returns {string|null} Код локали или null, если не удалось определить
     */
    static detectBrowserLocale() {
        try {
            const browserLang = typeof navigator !== 'undefined' 
                ? (navigator.language || navigator.userLanguage)
                : null;
            
            if (!browserLang) {
                return null;
            }

            const langCode = browserLang.substring(0, 2).toLowerCase();
            
            const supportedLocales = Object.values(BaseManager.SUPPORTED_LOCALES);
            if (supportedLocales.includes(langCode)) {
                return langCode;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Инициализирует кэш локали из localStorage или chrome.storage.local (синхронно).
     * Вызывается автоматически при первом обращении к _getTranslateFn().
     * В Service Worker контексте пытается прочитать из chrome.storage.local синхронно.
     * 
     * @private
     * @static
     * @returns {string} Код локали ('en' или 'ru')
     */
    static _initLocaleCache() {
        if (BaseManager._localeCache !== null) {
            return BaseManager._localeCache;
        }

        try {
            if (typeof localStorage !== 'undefined') {
                const cachedLocale = localStorage.getItem(CONFIG.LOCALE.CACHE_KEY);
                const supportedLocales = Object.values(BaseManager.SUPPORTED_LOCALES);
                if (supportedLocales.includes(cachedLocale)) {
                    BaseManager._localeCache = cachedLocale;
                    return cachedLocale;
                }
            }
        } catch (e) {
        }

        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // В Service Worker контексте chrome.storage.local.get() асинхронный,
                // синхронное чтение невозможно, поэтому используем локаль браузера временно
                // Кэш будет обновлен позже через updateLocaleCache() когда локаль будет загружена из chrome.storage.local
                // Если в кеше нет локали, используем локаль браузера по умолчанию
            }
        } catch (e) {
            // Игнорируем ошибки chrome.storage
        }

        // Если в кеше нет локали, используем локаль браузера по умолчанию
        const browserLocale = BaseManager.detectBrowserLocale() || BaseManager.DEFAULT_LOCALE;
        BaseManager._localeCache = browserLocale;
        return browserLocale;
    }

    /**
     * Обновляет кэш локали.
     * Сохраняет локаль в localStorage (для синхронного доступа) и в chrome.storage.local (для Service Worker контекста).
     * 
     * @static
     * @param {string} locale - Код локали
     * @returns {void}
     */
    static updateLocaleCache(locale) {
        const supportedLocales = Object.values(BaseManager.SUPPORTED_LOCALES);
        if (supportedLocales.includes(locale)) {
            BaseManager._localeCache = locale;

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(CONFIG.LOCALE.CACHE_KEY, locale);
                }
            } catch (e) {
            }

            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ [CONFIG.LOCALE.STORAGE_KEY]: locale }, () => {
                        if (chrome.runtime.lastError) {
                            // Игнорируем ошибки сохранения в chrome.storage.local
                        }
                    });
                }
            } catch (e) {
            }
        }
    }

    /**
     * Загружает локаль из chrome.storage.local для Service Worker контекста.
     * Используется для обновления кэша локали перед логированием в Service Worker контексте.
     * 
     * @protected
     * @async
     * @returns {Promise<void>}
     */
    async _loadLocaleFromStorage() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get([CONFIG.LOCALE.STORAGE_KEY], (items) => {
                        resolve(items[CONFIG.LOCALE.STORAGE_KEY] || null);
                    });
                });
                if (result && (result === 'en' || result === 'ru')) {
                    BaseManager.updateLocaleCache(result);
                }
            }
        } catch (e) {
            // Игнорируем ошибки загрузки локали
        } finally {
            // Сбрасываем Promise после завершения загрузки, чтобы можно было загрузить локаль снова при необходимости
            BaseManager._localeLoadingPromise = null;
        }
    }

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
     * Получает универсальную функцию перевода.
     * Использует основную функцию перевода, если она установлена, иначе временную на основе сохраненной локали.
     * 
     * @protected
     * @returns {Function} Функция перевода: (key: string, params?: Object) => string
     */
    _getTranslateFn() {
        // Если основная функция перевода установлена, используем её
        if (this.options && typeof this.options.translateFn === 'function') {
            return this.options.translateFn;
        }
        
        // Иначе используем временную функцию на основе сохраненной локали (из кэша)
        // Всегда используем актуальную локаль из кэша, который обновляется через updateLocaleCache()
        // В Service Worker контексте кэш будет обновлен позже через updateLocaleCache() когда локаль будет загружена из chrome.storage.local
        const locale = BaseManager._localeCache !== null 
            ? BaseManager._localeCache 
            : BaseManager._initLocaleCache();
        
        // Возвращаем функцию, которая всегда использует актуальную локаль из кэша при каждом вызове
        return (key, params = {}) => {
            // Всегда используем актуальную локаль из кэша, который обновляется через updateLocaleCache()
            const currentLocale = BaseManager._localeCache !== null 
                ? BaseManager._localeCache 
                : locale;
            const currentTranslations = currentLocale === 'ru' ? RU : EN;
            
            const keys = key.split('.');
            let value = currentTranslations;
            for (const k of keys) {
                value = value?.[k];
            }
            if (typeof value !== 'string') return key;
            return Object.keys(params).reduce((str, paramKey) => 
                str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]), value);
        };
    }

    /**
     * Получает перевод по ключу.
     * Поддерживает вложенные ключи через точку (например, 'app.title').
     * 
     * @param {string} key - Ключ перевода
     * @param {Object} [params] - Параметры для подстановки
     * @returns {string} Переведенная строка или ключ, если перевод не найден
     */
    t(key, params = {}) {
        const translate = this._getTranslateFn();
        return translate(key, params);
    }

    /**
     * Логирует сообщение, если логирование включено.
     * Автоматически загружает локаль из chrome.storage.local перед логированием в Service Worker контексте.
     * 
     * @protected
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {*} [data] - Дополнительные данные
     * @returns {void}
     */
    _log(message, data) {
        if (this.enableLogging) {
            // В Service Worker контексте загружаем локаль из chrome.storage.local перед логированием
            // Используем существующий Promise, если локаль уже загружается
            if (typeof localStorage === 'undefined' && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                if (!BaseManager._localeLoadingPromise) {
                    BaseManager._localeLoadingPromise = this._loadLocaleFromStorage();
                }
                // Ждем завершения загрузки локали перед логированием
                BaseManager._localeLoadingPromise.then(() => {
                    this._doLog(message, data);
                }).catch(() => {
                    // Если загрузка не удалась, логируем с текущей локалью
                    this._doLog(message, data);
                });
            } else {
                // В обычном контексте логируем сразу
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

    /**
     * Логирует ошибку.
     * Автоматически загружает локаль из chrome.storage.local перед логированием в Service Worker контексте.
     * 
     * @protected
     * @param {string|{key:string,params?:Object,fallback?:string}} message - Сообщение или объект перевода
     * @param {Error|*} [error] - Объект ошибки
     * @returns {void}
     */
    _logError(message, error) {
        // В Service Worker контексте загружаем локаль из chrome.storage.local перед логированием
        // Используем существующий Promise, если локаль уже загружается
        if (typeof localStorage === 'undefined' && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            if (!BaseManager._localeLoadingPromise) {
                BaseManager._localeLoadingPromise = this._loadLocaleFromStorage();
            }
            // Ждем завершения загрузки локали перед логированием
            BaseManager._localeLoadingPromise.then(() => {
                this._doLogError(message, error);
            }).catch(() => {
                // Если загрузка не удалась, логируем с текущей локалью
                this._doLogError(message, error);
            });
        } else {
            // В обычном контексте логируем сразу
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
                
                // Используем универсальную функцию перевода
                const translate = this._getTranslateFn();
                const resolved = translate(key, params);
                
                // Если перевод не найден (вернул ключ), используем fallback или ключ
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
            
            // Логи производительности отключены, так как они неинформативны для пользователя
            // const threshold = CONFIG.LOGS?.PERFORMANCE_LOG_THRESHOLD || 10;
            // if (duration > threshold) {
            //     this._log(`${operationName} завершена за ${duration}мс`);
            // }
            
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
     * Получает список служебных сообщений, которые обрабатываются независимо от статуса отслеживания.
     * 
     * @protected
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @returns {Array<string>} Массив типов служебных сообщений
     */
    _getSystemMessages(messageTypes) {
        if (!messageTypes || typeof messageTypes !== 'object') {
            return [];
        }

        return [
            messageTypes.PING,
            messageTypes.GET_STATUS,
            messageTypes.GET_TRACKING_STATUS,
            messageTypes.GET_TODAY_STATS,
            messageTypes.GET_DETAILED_STATS,
            messageTypes.SET_TRACKING_ENABLED,
            messageTypes.CHECK_CONNECTION,
            messageTypes.UPDATE_BACKEND_URL,
            messageTypes.UPDATE_DOMAIN_EXCEPTIONS
        ].filter(Boolean);
    }

    /**
     * Проверяет, является ли сообщение служебным.
     * 
     * @protected
     * @param {string} messageType - Тип сообщения
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @returns {boolean} true, если сообщение служебное
     */
    _isSystemMessage(messageType, messageTypes) {
        if (!messageType || typeof messageType !== 'string') {
            return false;
        }

        const systemMessages = this._getSystemMessages(messageTypes);
        return systemMessages.includes(messageType);
    }

    /**
     * Проверяет, нужно ли блокировать сообщение на основе статуса отслеживания и подключения.
     * 
     * @protected
     * @param {string} messageType - Тип сообщения
     * @param {Object} messageTypes - Объект с типами сообщений (например, CONFIG.MESSAGE_TYPES)
     * @param {Function} getTrackingStatus - Функция, возвращающая статус отслеживания (boolean)
     * @param {Function} getOnlineStatus - Функция, возвращающая статус подключения (boolean)
     * @returns {{shouldBlock: boolean, reason?: string}} Результат проверки
     */
    _shouldBlockMessage(messageType, messageTypes, getTrackingStatus, getOnlineStatus) {
        // Служебные сообщения не блокируются
        if (this._isSystemMessage(messageType, messageTypes)) {
            return { shouldBlock: false };
        }

        // Проверяем статус отслеживания
        const isTracking = typeof getTrackingStatus === 'function' 
            ? getTrackingStatus() 
            : (this.state?.isTracking !== undefined ? Boolean(this.state.isTracking) : true);

        if (!isTracking) {
            return { 
                shouldBlock: true, 
                reason: 'Tracking is disabled' 
            };
        }

        // Проверяем статус подключения
        const isOnline = typeof getOnlineStatus === 'function' 
            ? getOnlineStatus() 
            : (this.state?.isOnline !== undefined ? Boolean(this.state.isOnline) : true);

        if (!isOnline) {
            return { 
                shouldBlock: true, 
                reason: 'No connection' 
            };
        }

        return { shouldBlock: false };
    }

    /**
     * Проверяет, является ли ошибка связанной с блокировкой сообщения
     * (отслеживание отключено или нет подключения).
     * 
     * @protected
     * @param {Error} error - Объект ошибки
     * @returns {boolean} true, если ошибка связана с блокировкой сообщения
     */
    _isBlockingError(error) {
        if (!error || !error.message) {
            return false;
        }

        const message = String(error.message).toLowerCase();
        // Проверяем как переведенные сообщения, так и ключи локализации
        return message.includes('tracking is disabled') || 
               message.includes('no connection') ||
               message.includes('отслеживание отключено') ||
               message.includes('нет подключения') ||
               message.includes('logs.serviceworker.trackingdisabled') ||
               message.includes('logs.serviceworker.noconnection');
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
