function createBaseOptionsManager() {
    return {
        _log: jest.fn(),
        _logError: jest.fn(),
        isInitialized: false,
        logsFilter: { level: 'all', className: 'all', serverOnly: false },
        domManager: {
            elements: {},
            setBackendUrlValue: jest.fn(),
            setButtonState: jest.fn(),
            getBackendUrlValue: jest.fn(),
            getPerformanceMetrics: jest.fn(() => ({})),
            getElementsStatistics: jest.fn(() => ({})),
            destroy: jest.fn()
        },
        storageManager: {
            loadBackendUrl: jest.fn(),
            saveBackendUrl: jest.fn(),
            notifyBackgroundScript: jest.fn(),
            loadDomainExceptions: jest.fn(),
            saveDomainExceptions: jest.fn(),
            notifyDomainExceptionsUpdate: jest.fn(),
            resetToDefault: jest.fn(),
            getDefaultBackendUrl: jest.fn(),
            getPerformanceMetrics: jest.fn(() => ({})),
            destroy: jest.fn()
        },
        statusManager: {
            showWarning: jest.fn(),
            showError: jest.fn(),
            showSuccess: jest.fn(),
            destroy: jest.fn(),
            getStatistics: jest.fn(() => ({})),
            getHistory: jest.fn(() => []),
            getPerformanceMetrics: jest.fn(() => ({})),
            clearHistory: jest.fn(() => 0),
            validateState: jest.fn(() => ({ isValid: true }))
        },
        validationManager: {
            validateBackendUrl: jest.fn(),
            getPerformanceMetrics: jest.fn(() => ({})),
            getValidationStatistics: jest.fn(() => ({})),
            getHistory: jest.fn(() => []),
            clearHistory: jest.fn(() => 0),
            isValidUrl: jest.fn(() => true),
            validateState: jest.fn(() => ({ isValid: true })),
            destroy: jest.fn()
        },
        diagnosticsManager: {
            runDiagnostics: jest.fn(),
            destroy: jest.fn()
        },
        serviceWorkerManager: {
            destroy: jest.fn()
        },
        notificationManager: {
            destroy: jest.fn()
        },
        localeManager: {
            init: jest.fn().mockResolvedValue(),
            localizeDOM: jest.fn(),
            t: jest.fn((key) => key),
            addLocaleChangeListener: jest.fn(),
            toggleLocale: jest.fn(),
            getCurrentLocale: jest.fn(() => 'en'),
            destroy: jest.fn()
        },
        logsManager: {
            stopAutoRefresh: jest.fn()
        },
        diagnosticsWorkflowManager: {
            updateStatus: jest.fn()
        },
        uiManager: {
            updateLanguageDisplay: jest.fn(),
            setupEventHandlers: jest.fn(),
            onLocaleChange: jest.fn(),
            setThemeManager: jest.fn(),
            toggleTheme: jest.fn(),
            updateThemeDisplay: jest.fn(),
            getDomainExceptions: jest.fn(() => []),
            setDomainExceptions: jest.fn()
        },
        domainExceptionsManager: {
            getDomainExceptions: jest.fn(() => []),
            setDomainExceptions: jest.fn(),
            domainExceptions: new Set()
        },
        setDomainExceptions: jest.fn(),
        eventHandlers: new Map(),
        originalButtonTexts: new Map(),
        activityRefreshIntervalId: null
    };
}

module.exports = {
    createBaseOptionsManager
};
