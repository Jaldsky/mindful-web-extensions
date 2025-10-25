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
        UPDATE_INTERVAL: 2000, // Интервал обновления (мс)
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
        TIMEOUT: 10000, // Таймаут запроса (мс)
        RETRY_ATTEMPTS: 3, // Количество попыток повтора
        RETRY_DELAY: 5000 // Задержка между попытками (мс)
    },

    /**
     * Настройки трекера событий
     */
    TRACKER: {
        BATCH_SIZE: 10, // Размер батча событий
        BATCH_TIMEOUT: 30000, // Таймаут батча (мс)
        ONLINE_CHECK_INTERVAL: 30000, // Интервал проверки онлайн (мс)
        MAX_QUEUE_SIZE: 1000 // Максимальный размер очереди
    },

    /**
     * Ключи для Chrome Storage
     */
    STORAGE_KEYS: {
        // Общие
        USER_ID: 'mindful_user_id',
        BACKEND_URL: 'mindful_backend_url',
        
        // Tracker
        EVENT_QUEUE: 'mindful_event_queue',
        
        // Settings
        SETTINGS: 'mindful_settings'
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
        
        // Подключение
        TEST_CONNECTION: 'testConnection',
        CHECK_CONNECTION: 'checkConnection',
        
        // Настройки
        UPDATE_BACKEND_URL: 'updateBackendUrl',
        RELOAD_EXTENSION: 'reloadExtension',
        OPEN_OPTIONS: 'openOptions'
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
        PROCESSING_DELAY: 100 // Задержка обработки очереди (мс)
    },

    /**
     * Настройки валидации
     */
    VALIDATION: {
        URL_PATTERN: /^https?:\/\/.+/,
        MAX_HISTORY_SIZE: 50
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
        COLORS: {
            LOG: '#4CAF50',
            ERROR: '#f44336',
            WARN: '#ff9800',
            INFO: '#2196F3'
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
