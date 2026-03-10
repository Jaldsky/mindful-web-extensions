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
        MAX_HISTORY_SIZE: 50, // Максимальный размер истории
        // Начальное состояние менеджера
        DEFAULT_STATE: {
            isOnline: false,
            isTracking: false,
            lastUpdate: 0
        }
    },

    /**
     * Настройки Backend API
     */
    BACKEND: (() => {
        const BASE_URL = process.env.MW_BACKEND_URL || 'http://localhost:8000'; // Базовый URL backend сервера
        const EVENTS_ENDPOINT = '/api/v1/events/save'; // Эндпоинт для отправки событий
        const HEALTHCHECK_PATH = '/api/v1/healthcheck'; // Путь для healthcheck endpoint
        const AUTH_ANON_PATH = '/api/v1/auth/anonymous'; // Путь для создания анонимной сессии
        const AUTH_LOGIN_PATH = '/api/v1/auth/login'; // Путь для логина пользователя
        const AUTH_LOGOUT_PATH = '/api/v1/auth/logout'; // Путь для выхода пользователя
        const AUTH_REFRESH_PATH = '/api/v1/auth/refresh'; // Путь для обновления токена
        const AUTH_SESSION_PATH = '/api/v1/auth/session'; // Путь для проверки текущей сессии
        const AUTH_REGISTER_PATH = '/api/v1/auth/register'; // Путь для регистрации пользователя
        const AUTH_VERIFY_PATH = '/api/v1/auth/verify'; // Путь для подтверждения email
        const AUTH_RESEND_CODE_PATH = '/api/v1/auth/resend-code'; // Путь для повторной отправки кода
        const AUTH_OAUTH_AUTHORIZE_PATH = '/api/v1/auth/oauth/google/authorize'; // OAuth: редирект на Google
        const AUTH_OAUTH_CALLBACK_PATH = '/api/v1/auth/oauth/google/callback'; // OAuth: обмен code на токены
        const DEFAULT_URL = BASE_URL + EVENTS_ENDPOINT; // Полный URL по умолчанию
        
        return {
            BASE_URL,
            EVENTS_ENDPOINT,
            HEALTHCHECK_PATH,
            AUTH_ANON_PATH,
            AUTH_LOGIN_PATH,
            AUTH_LOGOUT_PATH,
            AUTH_REFRESH_PATH,
            AUTH_SESSION_PATH,
            AUTH_REGISTER_PATH,
            AUTH_VERIFY_PATH,
            AUTH_RESEND_CODE_PATH,
            AUTH_OAUTH_AUTHORIZE_PATH,
            AUTH_OAUTH_CALLBACK_PATH,
            DEFAULT_URL,
            TIMEOUT: 10000, // Таймаут запроса (мс)
            RETRY_ATTEMPTS: 3, // Количество попыток повтора
            RETRY_DELAY: 20000, // Задержка между попытками (мс)
            // HTTP методы
            METHODS: {
                POST: 'POST',
                GET: 'GET'
            },
            // HTTP заголовки
            HEADERS: {
                CONTENT_TYPE: 'Content-Type',
                AUTHORIZATION: 'Authorization',
                ACCEPT_LANGUAGE: 'Accept-Language'
            },
            // Значения заголовков
            HEADER_VALUES: {
                CONTENT_TYPE_JSON: 'application/json'
            },
            // HTTP статусы
            STATUS_CODES: {
                NO_CONTENT: 204 // No Content - нет тела ответа
            },
            // Ключи для payload
            PAYLOAD_KEYS: {
                DATA: 'data'
            },
            // Шаблон сообщения об ошибке HTTP
            ERROR_MESSAGE_TEMPLATE: 'HTTP {status}: {message}'
        };
    })(),

    /**
     * URL приложения (фронтенд) для ссылок Terms of Service и Privacy Policy.
     * Использует CONFIG.BACKEND.BASE_URL, чтобы не зависеть от process.env в рантайме.
     */
    get APP() {
        const backendBase = this.BACKEND.BASE_URL || 'http://localhost:8000';
        const appBase = (typeof backendBase === 'string' && backendBase.includes('localhost'))
            ? 'http://localhost:5173'
            : (backendBase.replace ? backendBase.replace(/\/$/, '') : backendBase);
        return {
            BASE_URL: appBase,
            TERMS_PATH: '/terms',
            PRIVACY_PATH: '/privacy',
            ANALYTICS_PATH: '/analytics',
            TERMS_URL: `${appBase}/terms`,
            PRIVACY_URL: `${appBase}/privacy`,
            ANALYTICS_URL: `${appBase}/analytics`
        };
    },

    /**
     * Настройки трекера событий
     */
    TRACKER: {
        BATCH_SIZE: 100, // Размер батча событий
        BATCH_TIMEOUT: 30000, // Таймаут батча (мс)
        ONLINE_CHECK_INTERVAL: 30000, // Интервал проверки онлайн (мс)
        MAX_QUEUE_SIZE: 30, // Максимальный размер очереди
        FAILURE_DISABLE_THRESHOLD: 5, // Количество неудачных отправок перед отключением трекера
        // Процент старых событий для удаления при переполнении очереди
        OLD_EVENTS_REMOVAL_PERCENT: 0.1, // 10% самых старых событий
        // Статус отслеживания по умолчанию
        DEFAULT_TRACKING_ENABLED: true, // Включено по умолчанию
        // Типы событий
        EVENT_TYPES: {
            ACTIVE: 'active', // Событие активности
            INACTIVE: 'inactive' // Событие неактивности
        },
        // Статусы вкладок
        TAB_STATUS: {
            COMPLETE: 'complete' // Вкладка полностью загружена
        },
        // Префиксы доменов
        DOMAIN_PREFIXES: {
            WWW: 'www.', // Префикс www
            CHROME_EXTENSION: 'chrome-extension://' // Префикс chrome extension
        },
        // Причины установки расширения
        INSTALL_REASONS: {
            INSTALL: 'install', // Первая установка
            UPDATE: 'update' // Обновление расширения
        },
        // Шаблон для генерации UUID v4
        UUID_TEMPLATE: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' // Шаблон UUID v4
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
            STATUS_INACTIVE: 'status-value status-inactive',
            STATUS_WARNING: 'status-value status-warning'
        },
        // ID элементов DOM
        ELEMENT_IDS: {
            CONNECTION_STATUS: 'connectionStatus',
            TRACKING_STATUS: 'trackingStatus',
            USER_INFO: 'userInfo',
            EVENTS_COUNT: 'eventsCount',
            DOMAINS_COUNT: 'domainsCount',
            QUEUE_SIZE: 'queueSize',
            OPEN_SETTINGS: 'openSettings',
            TEST_CONNECTION: 'testConnection',
            TOGGLE_TRACKING: 'toggleTracking',
            APP_MAIN: 'appMain',
            APP_ONBOARDING_OVERLAY: 'appOnboardingOverlay',
            APP_WELCOME_SCREEN: 'appWelcomeScreen',
            APP_LOGIN_SCREEN: 'appLoginScreen',
            APP_REGISTER_SCREEN: 'appRegisterScreen',
            APP_VERIFY_SCREEN: 'appVerifyScreen',
            APP_VERIFY_FORM: 'appVerifyForm',
            APP_VERIFY_DESCRIPTION: 'appVerifyDescription',
            APP_VERIFY_EMAIL: 'appVerifyEmail',
            APP_VERIFY_CODE: 'appVerifyCode',
            APP_VERIFY_CODE_CONTAINER: 'appVerifyCodeContainer',
            APP_REGISTER_VERIFY_LINK: 'appRegisterVerifyLink',
            APP_VERIFY_SUBMIT: 'appVerifySubmit',
            APP_VERIFY_BACK: 'appVerifyBack',
            APP_RESEND_CODE_LINK: 'appResendCodeLink',
            APP_RESEND_SCREEN: 'appResendScreen',
            APP_RESEND_FORM: 'appResendForm',
            APP_RESEND_EMAIL: 'appResendEmail',
            APP_RESEND_EMAIL_ERROR: 'appResendEmailError',
            APP_RESEND_SUBMIT: 'appResendSubmit',
            APP_RESEND_BACK: 'appResendBack',
            APP_TRY_ANON_BTN: 'appTryAnonBtn',
            APP_SIGN_IN_BTN: 'appSignInBtn',
            APP_LOGIN_FORM: 'appLoginForm',
            APP_LOGIN_USERNAME: 'appLoginUsername',
            APP_LOGIN_PASSWORD: 'appLoginPassword',
            APP_LOGIN_SUBMIT: 'appLoginSubmit',
            APP_LOGIN_BACK: 'appLoginBack',
            APP_LOGIN_GOOGLE_BTN: 'appLoginGoogleBtn',
            APP_REGISTER_LINK: 'appRegisterLink',
            APP_REGISTER_FORM: 'appRegisterForm',
            APP_REGISTER_USERNAME: 'appRegisterUsername',
            APP_REGISTER_USERNAME_ERROR: 'appRegisterUsernameError',
            APP_REGISTER_EMAIL: 'appRegisterEmail',
            APP_REGISTER_PASSWORD: 'appRegisterPassword',
            APP_REGISTER_CONFIRM_PASSWORD: 'appRegisterConfirmPassword',
            APP_REGISTER_CONFIRM_PASSWORD_ERROR: 'appRegisterConfirmPasswordError',
            APP_REGISTER_SUBMIT: 'appRegisterSubmit',
            APP_REGISTER_CANCEL: 'appRegisterCancel',
            APP_LOGIN_CONTAINER: 'appLoginContainer',
            APP_MAIN_LOGIN_FORM: 'appMainLoginForm',
            APP_MAIN_LOGIN_USERNAME: 'appMainLoginUsername',
            APP_MAIN_LOGIN_PASSWORD: 'appMainLoginPassword',
            APP_MAIN_LOGIN_SUBMIT: 'appMainLoginSubmit',
            APP_MAIN_LOGIN_BACK: 'appMainLoginBack',
            APP_MAIN_LOGIN_GOOGLE_BTN: 'appMainLoginGoogleBtn',
            APP_MAIN_REGISTER_LINK: 'appMainRegisterLink',
            APP_MAIN_REGISTER_VERIFY_LINK: 'appMainRegisterVerifyLink',
            APP_MAIN_REGISTER_FORM: 'appMainRegisterForm',
            APP_MAIN_REGISTER_USERNAME: 'appMainRegisterUsername',
            APP_MAIN_REGISTER_USERNAME_ERROR: 'appMainRegisterUsernameError',
            APP_MAIN_REGISTER_EMAIL: 'appMainRegisterEmail',
            APP_MAIN_REGISTER_PASSWORD: 'appMainRegisterPassword',
            APP_MAIN_REGISTER_CONFIRM_PASSWORD: 'appMainRegisterConfirmPassword',
            APP_MAIN_REGISTER_CONFIRM_PASSWORD_ERROR: 'appMainRegisterConfirmPasswordError',
            APP_MAIN_REGISTER_SUBMIT: 'appMainRegisterSubmit',
            APP_MAIN_REGISTER_BACK: 'appMainRegisterBack',
            APP_AUTH_HEADER_LOGO: 'appAuthHeaderLogo',
            APP_AUTH_HEADER_SUBTITLE: 'appAuthHeaderSubtitle',
            OPEN_LOGIN: 'openLogin',
            APP_THEME_TOGGLE: 'appThemeToggle',
            APP_LOCALE_TOGGLE: 'appLocaleToggle'
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
            CLEAR_ALL_DATA_BTN: 'clearAllDataBtn',
            STATUS: 'status',
            RUN_DIAGNOSTICS: 'runDiagnostics',
            TOGGLE_DEVELOPER_TOOLS: 'toggleDeveloperTools',
            DOMAIN_EXCEPTION_INPUT: 'domainExceptionInput',
            ADD_DOMAIN_EXCEPTION_BTN: 'addDomainExceptionBtn',
            DOMAIN_EXCEPTIONS_LIST: 'domainExceptionsList',
            AUTH_FORM: 'authForm',
            AUTH_USERNAME: 'authUsername',
            AUTH_PASSWORD: 'authPassword',
            AUTH_LOGIN_BTN: 'authLoginBtn',
            AUTH_LOGOUT_BTN: 'authLogoutBtn',
            AUTH_STATUS: 'authStatus',
            ONBOARDING_OVERLAY: 'onboardingOverlay',
            ONBOARDING_TRY_BTN: 'onboardingTryBtn',
            ONBOARDING_LOGIN_BTN: 'onboardingLoginBtn',
            REGISTER_FORM: 'registerForm',
            REGISTER_USERNAME: 'registerUsername',
            REGISTER_EMAIL: 'registerEmail',
            REGISTER_PASSWORD: 'registerPassword',
            REGISTER_SUBMIT_BTN: 'registerSubmitBtn',
            REGISTER_CANCEL_BTN: 'registerCancelBtn',
            REGISTER_LINK: 'registerLink',
            CONNECTION_STATUS: 'connectionStatus',
            TEST_CONNECTION: 'testConnection'
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
        ANON_ID: 'mindful_anon_id',
        AUTH_ACCESS_TOKEN: 'mindful_auth_access_token',
        AUTH_REFRESH_TOKEN: 'mindful_auth_refresh_token',
        ONBOARDING_COMPLETED: 'mindful_onboarding_completed',
        PENDING_VERIFICATION_EMAIL: 'mindful_pending_verification_email',
        BACKEND_URL: 'mindful_backend_url',
        LOCALE: 'mindful_locale',
        DOMAIN_EXCEPTIONS: 'mindful_domain_exceptions',
        
        // Tracker
        EVENT_QUEUE: 'mindful_event_queue',
        TRACKING_ENABLED: 'mindful_tracking_enabled',
        
        // Settings
        SETTINGS: 'mindful_settings',
        
        // Theme
        THEME: 'mindful_theme'
    },

    /**
     * Все ключи chrome.storage.local, используемые расширением.
     * Используется для полной очистки (например, после переустановки или сброса ID).
     */
    get ALL_STORAGE_KEYS_FOR_CLEAR() {
        return [
            ...Object.values(this.STORAGE_KEYS),
            this.LOGS.STORAGE_KEY,
            'mindful_connection_status'
        ];
    },

    /**
     * Ключи localStorage (кеш темы/локали), которые нужно очищать при полном сбросе.
     */
    get LOCAL_STORAGE_KEYS_FOR_CLEAR() {
        return [
            this.THEME.CACHE_KEY,
            this.LOCALE.CACHE_KEY,
            this.LOCALE.STORAGE_KEY
        ];
    },

    /**
     * Настройки локализации
     */
    LOCALE: {
        DEFAULT: 'en',
        AVAILABLE: ['en', 'ru'],
        STORAGE_KEY: 'mindful_locale',
        CACHE_KEY: 'mindful_locale_cache',
        // Поддерживаемые локали (объект для удобного доступа)
        SUPPORTED_LOCALES: {
            EN: 'en',
            RU: 'ru'
        }
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
     * Настройки темы
     */
    THEME: {
        DEFAULT: 'light',
        AVAILABLE: ['light', 'dark'],
        STORAGE_KEY: 'mindful_theme',
        CACHE_KEY: 'mindful_theme_cache',
        ATTRIBUTE: 'data-theme',
        THEMES: {
            LIGHT: 'light',
            DARK: 'dark'
        },
        /**
         * Настройки инициализации темы
         */
        INIT: {
            ENABLE_LOGGING: true // Включить логирование при инициализации темы
        }
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
        AUTH_LOGIN: 'authLogin',
        AUTH_LOGOUT: 'authLogout',
        GET_AUTH_STATUS: 'getAuthStatus',
        AUTH_OAUTH_START: 'authOAuthStart',
        OAUTH_CALLBACK: 'oauthCallback',
        AUTH_REGISTER: 'authRegister',
        AUTH_VERIFY: 'authVerify',
        AUTH_RESEND_CODE: 'authResendCode',
        CLEAR_SESSION: 'clearSession',
        RELOAD_EXTENSION: 'reloadExtension',
        OPEN_OPTIONS: 'openOptions',
        
        // Отладка
        GENERATE_RANDOM_DOMAINS: 'generateRandomDomains',
        
        // Служебные сообщения (не блокируются при отключенном отслеживании)
        // Ключи должны соответствовать ключам в MESSAGE_TYPES (например, 'PING', 'GET_STATUS')
        SYSTEM_MESSAGES: [
            'PING',
            'GET_STATUS',
            'GET_TRACKING_STATUS',
            'GET_TODAY_STATS',
            'GET_DETAILED_STATS',
            'SET_TRACKING_ENABLED',
            'CHECK_CONNECTION',
            'UPDATE_BACKEND_URL',
            'UPDATE_DOMAIN_EXCEPTIONS',
            'AUTH_LOGIN',
            'AUTH_LOGOUT',
            'GET_AUTH_STATUS',
            'AUTH_OAUTH_START',
            'OAUTH_CALLBACK',
            'AUTH_REGISTER',
            'AUTH_VERIFY',
            'AUTH_RESEND_CODE',
            'CLEAR_SESSION'
        ],
        
        // Паттерны для определения блокирующих ошибок
        BLOCKING_ERROR_PATTERNS: [
            'tracking is disabled',
            'no connection',
            'отслеживание отключено',
            'нет подключения',
            'logs.serviceworker.trackingdisabled',
            'logs.serviceworker.noconnection'
        ]
    },

    /**
     * Настройки для генерации случайных доменов (отладка)
     */
    RANDOM_DOMAINS: {
        MIN_COUNT: 1, // Минимальное количество доменов
        MAX_COUNT: 1000, // Максимальное количество доменов
        DEFAULT_COUNT: 100, // Количество по умолчанию
        TLDs: ['com', 'net', 'org', 'io', 'app', 'dev', 'site'], // Список TLD для генерации
        MIN_DOMAIN_LENGTH: 5, // Минимальная длина домена
        MAX_DOMAIN_LENGTH: 10 // Максимальная длина домена (5 + 5)
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
        PERFORMANCE_LOG_THRESHOLD: 10, // Порог логирования операций (мс) - логируются только операции > 10мс
        STORAGE_KEY: 'mindful_logs', // Ключ для хранения логов в chrome.storage.local
        DEFAULT_CLASS_NAME: 'Unknown' // Дефолтное имя класса для логирования
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
            '1m': 60 * 1000,
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
    module.exports.default = CONFIG;
}

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.MINDFUL_CONFIG = CONFIG;
}
