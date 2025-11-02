/**
 * English translations for Mindful Web Extension
 * @module locales/en
 */

const EN = {
    // Common
    common: {
        appName: 'Mindful Web',
        language: 'Language',
        languageName: 'English',
        languageCode: 'en',
        close: 'Close',
        cancel: 'Cancel',
        ok: 'OK',
        yes: 'Yes',
        no: 'No'
    },

    // Logs (for internal logging, INFO/ERROR)
    logs: {
        app: {
            initStart: 'Starting AppManager initialization',
            initSuccess: 'AppManager initialized (no periodic updates)',
            initError: 'AppManager initialization error',
            initialStatusLoaded: 'Initial status loaded',
            initialStatusError: 'Initial status loading error',
            handlersSetup: 'Setting up event handlers',
            handlersCount: 'Handlers set up: {count}',
            openSettings: 'Open settings page',
            testConnection: {
                start: 'Testing connection',
                success: 'Test connection: success',
                fail: 'Test connection: fail',
                error: 'Test connection error'
            },
            localeChanged: 'Locale changed'
        },
        diagnostics: {
            resultsHeader: 'Diagnostics results',
            overall: 'Overall status',
            duration: 'Duration (ms)',
            startedAt: 'Started at',
            generalError: 'General diagnostics error',
            checkLine: '{emoji} {name}:',
            checkError: 'Error in check: {name}'
        },
        notification: {
            warnMessageRequired: 'message is required and must be a string',
            warnInvalidType: 'Invalid type "{type}", INFO will be used'
        },
        locale: {
            created: 'LocaleManager created',
            alreadyInitialized: 'LocaleManager is already initialized',
            initStart: 'Starting LocaleManager initialization',
            savedLocaleLoaded: 'Saved locale loaded',
            browserLocaleSet: 'Browser locale set',
            initSuccess: 'LocaleManager initialized',
            initError: 'LocaleManager initialization error',
            detectBrowserLocaleError: 'Error detecting browser locale',
            unsupported: 'Unsupported locale: {locale}',
            alreadySet: 'Locale already set: {locale}',
            changed: 'Locale changed',
            listenerAdded: 'Locale change listener added',
            listenerRemoved: 'Locale change listener removed',
            listenerError: 'Error in locale change listener',
            statisticsReset: 'All localization statistics reset',
            statisticsResetError: 'Error resetting localization statistics',
            alreadyDestroyed: 'LocaleManager already destroyed',
            destroyStart: 'Destroying LocaleManager',
            destroyed: 'LocaleManager destroyed',
            destroyError: 'Error destroying LocaleManager'
        },
        translation: {
            created: 'TranslationManager created',
            missing: 'Missing translation for key: {key}',
            translateError: 'Error translating key: {key}',
            unsupported: 'Unsupported locale: {locale}',
            alreadySet: 'Locale already set: {locale}',
            changed: 'Locale changed',
            statsReset: 'Translation statistics reset',
            destroyStart: 'Destroying TranslationManager',
            destroyed: 'TranslationManager destroyed',
            destroyError: 'Error destroying TranslationManager'
        },
        localeDom: {
            created: 'Localization DOMManager created',
            rootNotProvided: 'Root element is not provided',
            elementLocalizeError: 'Element localization error',
            localizedCount: 'Elements localized: {count}',
            domLocalizeError: 'DOM localization error',
            elementNotFound: 'Element not found: {selector}',
            elementLocalized: 'Element localized: {selector}',
            elementLocalizeSelectorError: 'Element localization error: {selector}',
            elementsNotFound: 'Elements not found: {selector}',
            elementsLocalized: 'Elements localized: {selector}',
            elementsLocalizeError: 'Elements localization error: {selector}',
            elementNotProvided: 'Element is not provided',
            attrsAdded: 'Localization attributes added',
            addAttrsError: 'Error adding localization attributes',
            attrsRemoved: 'Localization attributes removed',
            removeAttrsError: 'Error removing localization attributes',
            getElementsError: 'Error getting localizable elements',
            countElementsError: 'Error counting localizable elements',
            statsReset: 'Localization statistics reset',
            destroyStart: 'Destroying Localization DOMManager',
            destroyed: 'Localization DOMManager destroyed',
            destroyError: 'Error destroying Localization DOMManager'
        }
    },

    // App page
    app: {
        title: 'Mindful Web',
        subtitle: 'Track your attention',
        
        // Status section
        status: {
            connection: 'Connection:',
            tracking: 'Tracking:',
            checking: 'Checking...',
            online: 'Online',
            offline: 'Offline',
            active: 'Active',
            inactive: 'Inactive'
        },
        
        // Stats section
        stats: {
            title: "Today's Activity",
            eventsTracked: 'Events tracked:',
            domainsVisited: 'Domains visited:',
            queueSize: 'Queue size:'
        },
        
        // Buttons
        buttons: {
            settings: 'Settings',
            testConnection: 'Test Connection',
            testConnectionLoading: 'Checking...'
        },
        
        // Notifications
        notifications: {
            connectionSuccess: 'Connection Successful!',
            connectionFailed: 'Connection Failed',
            connectionError: 'Connection Test Error',
            initError: 'Initialization Error'
        }
    },

    // Options page
    options: {
        title: 'Mindful Web - Settings',
        heading: 'Mindful Web Settings',
        
        // Form
        form: {
            backendUrlLabel: 'Backend URL:',
            backendUrlPlaceholder: 'http://localhost:8000/api/v1/events/send',
            backendUrlHelp: 'Enter the URL of your Mindful Web backend API endpoint'
        },
        
        // Theme
        theme: {
            label: 'Theme:',
            light: 'Light',
            dark: 'Dark',
            toggleButton: 'Toggle Theme'
        },
        
        // Buttons
        buttons: {
            save: 'Save Settings',
            saving: 'Saving...',
            reset: 'Reset to Default',
            resetting: 'Resetting...',
            runDiagnostics: 'Diagnostics',
            analyzing: 'Analyzing...',
            clearDiagnostics: 'Clear',
            developerTools: 'Developer Tools',
            showDeveloperTools: 'Show Developer Tools',
            hideDeveloperTools: 'Hide Developer Tools',
            clearLogs: 'Clear',
            copyLogs: 'Copy'
        },
        
        // Diagnostics
        diagnostics: {
            // Status labels
            status: 'Status:',
            notRun: 'Not run',
            running: 'Checking...',
            success: 'Passed',
            failed: 'Failed',
            
            // Status messages
            statusOk: 'All checks passed',
            statusWarning: 'Some warnings detected',
            statusError: 'Some checks failed',
            statusUnknown: 'Unknown status',
            
            // Table labels
            labelTotal: 'Total',
            labelSuccess: 'Passed',
            labelWarnings: 'Warnings',
            labelTime: 'Time'
        },
        
        // Tabs
        tabs: {
            logs: 'Logs',
            diagnostics: 'Diagnostics',
            activity: 'Activity'
        },
        
        // Logs filters
        logsFilters: {
            levelLabel: 'Type:',
            levelAll: 'ALL',
            levelInfo: 'INFO',
            levelError: 'ERROR',
            classLabel: 'Class:',
            classAll: 'All',
            serverOnlyLabel: 'Show only server requests',
            logsCounterLabel: 'Logs:'
        },
        
        // Status messages
        status: {
            loadError: 'Error loading settings',
            saveError: 'Error saving settings',
            resetError: 'Error resetting settings',
            uiUpdateError: 'Warning: UI update issue detected',
            diagnosticsError: 'Diagnostics Error',
            storageUnavailable: 'Storage API unavailable. Please reload the extension.',
            saveFailed: 'Settings save verification failed. Please try again.',
            themeChanged: 'Theme changed successfully!'
        },

        // Activity details
        activity: {
            title: "Today's Activity",
            refresh: 'Refresh',
            labels: {
                eventsTracked: 'Events tracked:',
                activeEvents: 'Active events:',
                inactiveEvents: 'Inactive events:',
                domainsVisited: 'Domains visited:',
                queueSize: 'Queue size:',
                domainsTitle: 'Domains'
            },
            metricsTitle: 'Statistics',
            noDomains: 'No domains yet',
            lastUpdate: 'Last update:',
            refreshEvery: 'Auto-refresh:',
            axis: {
                unitEventsShort: 'evt'
            },
            ranges: {
                r1m: '1m',
                r5m: '5m',
                r15m: '15m',
                r30m: '30m',
                r1h: '1h',
                r6h: '6h',
                r1d: '1d'
            }
        },
        
        // Notifications
        notifications: {
            logsClearedShort: 'Cleared',
            logsClearErrorShort: 'Clear error',
            logsCopiedShort: 'Copied',
            logsCopyErrorShort: 'Copy error'
        }
        
    },

    // Button labels (matching CONFIG structure)
    buttonLabels: {
        testConnection: {
            default: '🔍 Test Connection',
            loading: '🔍 Checking...'
        },
        runDiagnostics: {
            default: '🔧 Run Diagnostics',
            loading: '🔧 Analyzing...'
        },
        save: {
            default: 'Save Settings',
            loading: 'Saving...'
        },
        reset: {
            default: 'Reset to Default',
            loading: 'Resetting...'
        }
    },

    // Validation messages
    validation: {
        required: 'This field is required',
        invalidUrl: 'Invalid URL format. URL must start with http:// or https://',
        urlTooShort: 'URL is too short',
        urlTooLong: 'URL is too long'
    },

    // Console debug commands
    console: {
        app: {
            title: 'Available debug commands:',
            main: 'Main:',
            connection: 'Connection:',
            statistics: 'Statistics:',
            commands: {
                getAppDiagnostics: 'Get diagnostic information',
                runAppDiagnostics: 'Run full diagnostics',
                testAppConnection: 'Test server connection',
                getTrackingStatus: 'Get tracking status',
                getTodayStats: 'Get today\'s statistics',
                getDOMMetrics: 'DOM performance metrics',
                getNotificationStats: 'Notification statistics'
            }
        },
        options: {
            title: 'Available debug commands:',
            main: 'Main:',
            url: 'URL:',
            statuses: 'Statuses:',
            validation: 'Validation:',
            commands: {
                getAllMetrics: 'Get all metrics and statistics',
                getOptionsDiagnostics: 'Full diagnostics',
                validateManagersState: 'Check managers state',
                getCurrentBackendUrl: 'Current URL',
                getDefaultBackendUrl: 'Default URL',
                isCurrentUrlValid: 'Check URL validity',
                getStatusStatistics: 'Status statistics',
                getStatusHistory: 'Status history',
                getStatusPerformanceMetrics: 'Performance metrics',
                getValidationStatistics: 'Validation statistics',
                getValidationHistory: 'Validation history',
                getValidationPerformanceMetrics: 'Performance metrics'
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EN;
}

// For browser use
if (typeof window !== 'undefined') {
    window.LOCALE_EN = EN;
}
