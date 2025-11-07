/**
 * Централизованная конфигурация для Mindful Web Chrome Extension
 * Все константы, настройки и значения по умолчанию собраны в одном месте
 * 
 * @module config
 */

/**
 * Конфигурация
 */
const CONFIG = {
    /**
     * Базовые константы для всех менеджеров
     */
    BASE: {
        UPDATE_INTERVAL: 20000, // Интервал обновления (мс)
        NOTIFICATION_DURATION: 3000, // Длительность уведомлений (мс)
        PING_TIMEOUT: 5000, // Таймаут ping запроса (мс)
        THROTTLE_DELAY: 1000, // Задержка throttle (мс)
        MAX_HISTORY_SIZE: 50 // Максимальный размер истории
    },

    /**
     * Настройки Backend API
     */
    BACKEND: {
        DEFAULT_URL: 'http://localhost:8000/api/v1/events/send',
        HEALTHCHECK_URL: 'http://localhost:8000/api/v1/healthcheck',
        TIMEOUT: 10000, // Таймаут запроса (мс)
        RETRY_ATTEMPTS: 3, // Количество попыток повтора
        RETRY_DELAY: 20000 // Задержка между попытками (мс)
    },

    /**
     * Настройки трекера событий
     */
    TRACKER: {
        BATCH_SIZE: 100, // Размер батча событий
        BATCH_TIMEOUT: 30000, // Таймаут батча (мс)
        ONLINE_CHECK_INTERVAL: 30000, // Интервал проверки онлайн (мс)
        MAX_QUEUE_SIZE: 30, // Максимальный размер очереди
        FAILURE_DISABLE_THRESHOLD: 5 // Количество неудачных отправок перед отключением трекера
    },

    /**
     * Настройки диагностики
     */
    DIAGNOSTICS: {
        // Статусы проверок
        CHECK_STATUS: {
            OK: 'ok',
            WARNING: 'warning',
            ERROR: 'error'
        },
        // Названия проверок (технические ключи)
        CHECK_NAMES: {
            SERVICE_WORKER: 'serviceWorker',
            CONNECTION: 'connection',
            TRACKING: 'tracking',
            STATS: 'stats'
        },
        // Эмодзи для статусов
        STATUS_EMOJI: {
            ok: '✅',
            warning: '⚠️',
            error: '❌',
            unknown: '❓'
        },
        // Эмодзи для UI элементов
        UI_EMOJI: {
            SUCCESS: '✅',
            WARNING: '⚠️',
            TIME: '⏱️'
        },
        // Маппинг статусов диагностики на статусы UI
        STATUS_MAP: {
            ok: 'success',
            warning: 'success',
            error: 'failed'
        },
        // Задержка перед отображением результатов (мс)
        MIN_DISPLAY_DELAY: 500
    },

    /**
     * Настройки DOM менеджера для app страницы
     */
    APP_DOM: {
        // CSS классы для статусов
        CSS_CLASSES: {
            STATUS_ONLINE: 'status-value status-online',
            STATUS_OFFLINE: 'status-value status-offline',
            STATUS_ACTIVE: 'status-value status-active',
            STATUS_INACTIVE: 'status-value status-inactive'
        },
        // ID элементов DOM
        ELEMENT_IDS: {
            CONNECTION_STATUS: 'connectionStatus',
            TRACKING_STATUS: 'trackingStatus',
            EVENTS_COUNT: 'eventsCount',
            DOMAINS_COUNT: 'domainsCount',
            QUEUE_SIZE: 'queueSize',
            OPEN_SETTINGS: 'openSettings',
            TEST_CONNECTION: 'testConnection',
            TOGGLE_TRACKING: 'toggleTracking'
        }
    },

    /**
     * Настройки DOM менеджера для options страницы
     */
    OPTIONS_DOM: {
        // ID элементов DOM
        ELEMENT_IDS: {
            SETTINGS_FORM: 'settingsForm',
            BACKEND_URL: 'backendUrl',
            SAVE_BTN: 'saveBtn',
            RESET_BTN: 'resetBtn',
            STATUS: 'status',
            RUN_DIAGNOSTICS: 'runDiagnostics',
            TOGGLE_DEVELOPER_TOOLS: 'toggleDeveloperTools',
            DOMAIN_EXCEPTION_INPUT: 'domainExceptionInput',
            ADD_DOMAIN_EXCEPTION_BTN: 'addDomainExceptionBtn',
            DOMAIN_EXCEPTIONS_LIST: 'domainExceptionsList'
        },
        // Дефолтные названия элементов для логирования
        DEFAULT_ELEMENT_NAMES: {
            ELEMENT: 'element',
            BACKEND_URL_FIELD: 'поле URL бэкенда',
            BUTTON: 'кнопка'
        }
    },

    /**
     * Ключи для Chrome Storage
     */
    STORAGE_KEYS: {
        // Общие
        USER_ID: 'mindful_user_id',
        BACKEND_URL: 'mindful_backend_url',
        LOCALE: 'mindful_locale',
        DOMAIN_EXCEPTIONS: 'mindful_domain_exceptions',
        
        // Tracker
        EVENT_QUEUE: 'mindful_event_queue',
        TRACKING_ENABLED: 'mindful_tracking_enabled',
        
        // Settings
        SETTINGS: 'mindful_settings'
    },

    /**
     * Настройки локализации
     */
    LOCALE: {
        DEFAULT: 'en',
        AVAILABLE: ['en', 'ru'],
        STORAGE_KEY: 'mindful_locale',
        CACHE_KEY: 'mindful_locale_cache'
    },

    /**
     * Настройки DOM локализации
     */
    LOCALE_DOM: {
        // Атрибут для указания ключа перевода
        I18N_ATTRIBUTE: 'data-i18n',
        // Атрибут для указания целевого атрибута элемента
        I18N_ATTR_ATTRIBUTE: 'data-i18n-attr'
    },

    /**
     * Типы сообщений для коммуникации между компонентами
     */
    MESSAGE_TYPES: {
        // Базовые
        PING: 'ping',
        
        // Статус
        GET_STATUS: 'getStatus',
        GET_TRACKING_STATUS: 'getTrackingStatus',
        GET_TODAY_STATS: 'getTodayStats',
        GET_DETAILED_STATS: 'getDetailedStats',
        SET_TRACKING_ENABLED: 'setTrackingEnabled',
        
        // Подключение
        TEST_CONNECTION: 'testConnection',
        CHECK_CONNECTION: 'checkConnection',
        
        // Настройки
        UPDATE_BACKEND_URL: 'updateBackendUrl',
        UPDATE_DOMAIN_EXCEPTIONS: 'updateDomainExceptions',
        RELOAD_EXTENSION: 'reloadExtension',
        OPEN_OPTIONS: 'openOptions',
        
        // Отладка
        GENERATE_RANDOM_DOMAINS: 'generateRandomDomains'
    },

    /**
     * Метки кнопок для UI
     */
    BUTTON_LABELS: {
        // App Manager
        TEST_CONNECTION: {
            DEFAULT: '🔍 Test Connection',
            LOADING: '🔍 Checking...'
        },
        RUN_DIAGNOSTICS: {
            DEFAULT: '🔧 Run Diagnostics',
            LOADING: '🔧 Analyzing...'
        },
        
        // Options Manager
        SAVE: {
            DEFAULT: 'Save Settings',
            LOADING: 'Saving...'
        },
        RESET: {
            DEFAULT: 'Reset to Default',
            LOADING: 'Resetting...'
        }
    },

    /**
     * Сообщения для статусов
     */
    STATUS_MESSAGES: {
        // Успех
        SUCCESS: {
            SAVE: 'Settings saved successfully',
            RESET: 'Settings reset to default',
            LOAD: 'Settings loaded successfully'
        },
        
        // Ошибки
        ERROR: {
            SAVE: 'Failed to save settings',
            LOAD: 'Failed to load settings',
            RESET: 'Failed to reset settings',
            VALIDATION: 'Invalid URL format',
            STORAGE: 'Storage API unavailable',
            CONNECTION: 'Connection test failed',
            UI_UPDATE: 'Failed to update UI'
        },
        
        // Информация
        INFO: {
            LOADING: 'Loading...',
            SAVING: 'Saving...',
            RESETTING: 'Resetting...'
        }
    },

    /**
     * Типы статусов
     */
    STATUS_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },

    /**
     * Настройки статусов
     */
    STATUS_SETTINGS: {
        DEFAULT_DURATION: 3000, // Длительность по умолчанию (мс)
        MAX_HISTORY_SIZE: 50, // Максимальный размер истории
        MAX_QUEUE_SIZE: 10, // Максимальный размер очереди
        PROCESSING_DELAY: 100, // Задержка обработки очереди (мс)
        // CSS классы для статусных сообщений
        CSS_CLASSES: {
            BASE: 'status-message',
            VISIBLE: 'visible',
            HIDDEN: 'hidden'
        },
        // Максимальная длина сообщения для логирования (символов)
        MAX_LOG_MESSAGE_LENGTH: 50
    },

    /**
     * Настройки валидации
     */
    VALIDATION: {
        URL_PATTERN: /^https?:\/\/.+/,
        MAX_HISTORY_SIZE: 50,
        MAX_URL_LENGTH_FOR_HISTORY: 100, // Максимальная длина URL для истории
        MAX_URL_LENGTH_FOR_LOGGING: 50 // Максимальная длина URL для логирования
    },

    /**
     * Настройки уведомлений
     */
    NOTIFICATIONS: {
        MAX_COUNT: 3, // Максимальное количество одновременных уведомлений
        DEFAULT_DURATION: 3000, // Длительность по умолчанию (мс)
        POSITION: 'top-right', // Позиция уведомлений
        AUTO_CLEAR: true // Автоматическая очистка
    },

    /**
     * Режимы работы
     */
    MODES: {
        DEVELOPMENT: 'development',
        PRODUCTION: 'production',
        TEST: 'test'
    },

    /**
     * Настройки производительности
     */
    PERFORMANCE: {
        ENABLE_TRACKING: true, // Включить отслеживание производительности
        LOG_THRESHOLD: 100 // Порог логирования медленных операций (мс)
    },

    /**
     * Настройки логирования
     */
    LOGGING: {
        ENABLE_BY_DEFAULT: true,
        PREFIX: '[Mindful Web]',
        // Управляет выводом в консоль DevTools. Логи всегда сохраняются в storage,
        // но в консоль попадают только если этот флаг true.
        CONSOLE_OUTPUT: false,
        COLORS: {
            LOG: '#4CAF50',
            ERROR: '#f44336',
            WARN: '#ff9800',
            INFO: '#2196F3'
        }
    },

    /**
     * Настройки панели логов
     */
    LOGS: {
        MAX_LOGS: 1000, // Максимальное количество логов в хранилище
        AUTO_REFRESH_INTERVAL: 1000, // Интервал автообновления логов (мс)
        SELECTION_TIMEOUT: 5000, // Таймаут для выделения текста перед возобновлением обновления (мс)
        PERFORMANCE_LOG_THRESHOLD: 10 // Порог логирования операций (мс) - логируются только операции > 10мс
    },

    /**
     * Настройки панели активности и графика
     */
    ACTIVITY: {
        AUTO_REFRESH_INTERVAL: 1000, // Частота автообновления панели активности (мс)
        MAX_DOMAINS_DISPLAY: 100, // Максимум доменов в списке
        CHART_MAX_POINTS: 600, // Максимум точек в истории для графика
        CHART_HEIGHT: 120, // Высота канваса в CSS пикселях
        CHART_PADDING: 20, // Внутренние отступы графика
        GRID_Y_COUNT: 4, // Количество делений по Oy
        GRID_X_COUNT: 3, // Количество делений по Ox
        HISTORY_MAX_MS: 24 * 60 * 60 * 1000, // 24 часа хранения истории
        RANGES: {
            '1m': 1 * 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        },
        DEFAULT_RANGE_KEY: '5m'
    },

    /**
     * Настройки UI менеджеров
     */
    UI: {
        /**
         * Настройки обратной связи кнопок
         */
        BUTTON_FEEDBACK: {
            DEFAULT_DURATION: 2000, // Дефолтная длительность обратной связи (мс)
            ERROR_DURATION: 4000, // Длительность для ошибок (мс)
            WARNING_DURATION: 3000, // Длительность для предупреждений (мс)
            MIN_PROCESSING_FEEDBACK_MS: 900, // Минимальная длительность обратной связи (мс)
            MAX_TEXT_LENGTH: 18 // Максимальная длина текста кнопки (символов)
        },
        /**
         * Настройки логирования
         */
        LOGGING: {
            MAX_URL_LENGTH: 50 // Максимальная длина URL для логирования (символов)
        },
        /**
         * Настройки исключений доменов
         */
        DOMAIN_EXCEPTIONS: {
            REMOVE_SYMBOL: '✕', // Символ удаления
            CSS_CLASSES: {
                ITEM: 'domain-exception-item',
                REMOVE_BUTTON: 'domain-exception-remove'
            }
        },
        /**
         * Настройки графика активности
         */
        CHART: {
            FONT_SIZE: 12, // Размер шрифта (px)
            SPACING: 2, // Отступ между элементами (px)
            TEXT_OFFSET: 6, // Отступ для текста (px)
            POINT_RADIUS: 2.5, // Радиус точки на графике (px)
            LINE_WIDTH: {
                AXIS: 1.25, // Толщина линии оси (px)
                GRID: 1, // Толщина линии сетки (px)
                DATA: 2 // Толщина линии графика (px)
            },
            DASH_PATTERN: [2, 4], // Паттерн пунктирной линии
            POSITION_THRESHOLD: 1.5, // Порог для проверки позиции (px)
            PADDING: {
                RIGHT: 6, // Правый отступ (px)
                TEXT: 8 // Отступ для текста (px)
            },
            DEFAULT_WIDTH: 300, // Дефолтная ширина canvas (px)
            DEFAULT_HEIGHT: 120, // Дефолтная высота canvas (px)
            COLORS: {
                BACKGROUND: '#f5f5f5',
                AXIS: '#777',
                GRID: '#ddd',
                TEXT: '#666',
                DATA: '#4CAF50'
            }
        },
        /**
         * Настройки локализации
         */
        LOCALE_DISPLAY: {
            FLAGS: {
                RU: '🇷🇺',
                EN: '🇺🇸'
            }
        },
        /**
         * Настройки темы
         */
        THEME_DISPLAY: {
            ICONS: {
                DARK: '🌙',
                LIGHT: '☀️'
            }
        }
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.MINDFUL_CONFIG = CONFIG;
}
