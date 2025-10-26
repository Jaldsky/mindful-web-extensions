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
        
        // Buttons
        buttons: {
            save: 'Save Settings',
            saving: 'Saving...',
            reset: 'Reset to Default',
            resetting: 'Resetting...',
            runDiagnostics: 'Run Diagnostics',
            analyzing: 'Analyzing...',
            reloadExtension: 'Reload Extension'
        },
        
        // Diagnostics section
        diagnostics: {
            title: 'Diagnostics & Tools'
        },
        
        // Status messages
        status: {
            settingsSaved: 'Settings saved successfully!',
            settingsReset: 'Settings reset to default',
            loadError: 'Error loading settings',
            saveError: 'Error saving settings',
            resetError: 'Error resetting settings',
            uiUpdateError: 'Warning: UI update issue detected',
            diagnosticsError: 'Diagnostics Error',
            reloadError: 'Reload Error',
            reloading: 'Reloading extension...',
            storageUnavailable: 'Storage API unavailable. Please reload the extension.',
            saveFailed: 'Settings save verification failed. Please try again.'
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
