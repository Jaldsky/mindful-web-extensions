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
        no: 'No',
        timeUnitMs: 'ms'
    },

    // Logs (for internal logging, INFO/ERROR)
    logs: {
        app: {
            initStart: 'Starting AppManager initialization',
            initSuccess: 'AppManager initialized (no periodic updates)',
            initError: 'AppManager initialization error',
            alreadyInitialized: 'AppManager already initialized',
            initializationError: 'AppManager initialization error',
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
            localeChanged: 'Locale changed',
            localeChangeError: 'Error changing locale',
            trackingToggleRequest: 'Request to change tracking state',
            trackingToggleError: 'Error toggling tracking state',
            trackingStateUpdated: 'Tracking state updated',
            trackingStateUpdateFailed: 'Failed to update tracking state',
            periodicUpdatesAlreadyStarted: 'Periodic updates already started',
            periodicUpdatesStart: 'Starting periodic updates',
            periodicUpdatesError: 'Periodic update error',
            periodicUpdatesStopped: 'Periodic updates stopped',
            alreadyDestroyed: 'AppManager already destroyed',
            destroyStart: 'Cleaning up AppManager resources',
            destroyed: 'AppManager destroyed',
            destroyError: 'Error destroying AppManager',
            eventHandlersRemoved: 'Event handlers removed',
            eventHandlersRemoveError: 'Error removing event handlers',
            managersDestroyed: 'All managers destroyed',
            managersDestroyError: 'Error destroying managers'
        },
        diagnostics: {
            created: 'DiagnosticsManager initialized',
            serviceWorkerRequired: 'ServiceWorkerManager is required',
            notificationManagerRequired: 'NotificationManager is required',
            translateFnRequired: 'translateFn must be a function',
            resultsHeader: 'Diagnostics results',
            checkNames: {
                serviceWorker: 'Service Worker',
                connection: 'Connection',
                tracking: 'Tracking',
                stats: 'Statistics'
            },
            overall: 'Overall status',
            duration: 'Duration (ms)',
            startedAt: 'Started at',
            generalError: 'General diagnostics error',
            checkLine: '{emoji} {name}:',
            checkError: 'Error in check: {name}',
            checkStart: 'Starting check: {name}',
            checkCompleted: 'Check {name} completed in {duration}ms',
            checkExecutionError: 'Error executing check {name}',
            checkUnexpectedError: 'Unexpected error during check {name}',
            diagnosticsStart: 'Starting diagnostics',
            diagnosticsCompleted: 'Diagnostics completed',
            diagnosticsCriticalError: 'Critical diagnostics error',
            parallelExecution: 'Executing checks in parallel',
            sequentialExecution: 'Executing checks sequentially',
            checkFailed: 'Check failed with error',
            serviceWorkerAvailable: 'Service Worker available',
            serviceWorkerUnavailable: 'Service Worker unavailable',
            serverAvailable: 'Server available',
            serverUnavailable: 'Server unavailable',
            serverConnectionError: 'Server connection check error',
            trackingStatusInvalid: 'Received invalid tracking status data',
            trackingActive: 'active',
            trackingInactive: 'inactive',
            trackingStatus: 'Tracking',
            trackingStatusError: 'Error getting tracking status',
            statsInvalid: 'Received invalid statistics data',
            statsReceived: 'Statistics received',
            statsWithData: '({events} events, {domains} domains)',
            statsQueue: '[Queue: {queue}]',
            statsError: 'Error getting statistics',
            noResults: 'No diagnostic results to display',
            diagnosticsCompletedMessage: 'Diagnostics completed in {duration}ms',
            errorsCount: 'Errors: {count}/{total}',
            warningsCount: 'Warnings: {count}/{total}',
            allChecksPassed: 'All checks passed',
            cleanupStart: 'Cleaning up DiagnosticsManager resources',
            destroyed: 'DiagnosticsManager destroyed',
            destroyError: 'Error destroying DiagnosticsManager'
        },
        dom: {
            created: 'DOMManager initialized',
            documentApiUnavailable: 'document API is unavailable',
            getElementByIdUnavailable: 'document.getElementById is unavailable',
            elementsInitialized: 'DOM elements initialized',
            initializationError: 'DOM elements initialization error',
            elementNotFound: 'Element with ID "{id}" not found',
            criticalElementsMissing: 'Critical DOM elements missing: {elements}',
            updateImpossible: 'Cannot update {elementName}: element not found',
            elementUpdated: '{elementName} updated successfully',
            elementUpdateError: 'Error updating {elementName}',
            connectionStatusUpdateError: 'Error updating connection status',
            trackingStatusUpdateError: 'Error updating tracking status',
            countersUpdated: 'Counters updated',
            elementsReload: 'Reloading DOM elements',
            elementsStatisticsError: 'Error getting elements statistics',
            translateFnSet: 'Localization function set',
            statusesRefreshed: 'Statuses updated with current localization',
            cleanupStart: 'Cleaning up DOMManager resources',
            destroyed: 'DOMManager destroyed',
            destroyError: 'Error destroying DOMManager',
            // Element names for logging
            elementNames: {
                connectionStatus: 'connection status',
                trackingStatus: 'tracking status',
                trackingToggle: 'tracking toggle button',
                eventsCounter: 'events counter',
                domainsCounter: 'domains counter',
                queueSize: 'queue size',
                button: 'button'
            },
            // Validation errors
            validation: {
                isOnlineMustBeBoolean: 'isOnline must be a boolean',
                isTrackingMustBeBoolean: 'isTracking must be a boolean',
                targetIsTrackingMustBeBoolean: 'targetIsTracking must be a boolean',
                countersMustBeObject: 'counters must be an object',
                textMustBeString: 'text must be a string',
                disabledMustBeBoolean: 'disabled must be a boolean',
                translateFnMustBeFunction: 'translateFn must be a function'
            }
        },
        notification: {
            created: 'NotificationManager created',
            warnMessageRequired: 'message is required and must be a string',
            warnInvalidType: 'Invalid type "{type}", using INFO',
            notificationCreated: 'Notification created: {type}',
            creationError: 'Error creating notification',
            documentBodyUnavailable: 'document.body is unavailable',
            notificationNotFound: 'Notification not found or already removed',
            notificationRemoved: 'Notification removed from DOM',
            removalError: 'Error removing notification from DOM',
            removeError: 'Error removing notification',
            cleared: 'Cleared notifications: {count}',
            clearError: 'Error clearing notifications',
            cleanupStart: 'Cleaning up NotificationManager resources',
            destroyed: 'NotificationManager destroyed',
            destroyError: 'Error destroying NotificationManager'
        },
        serviceWorker: {
            created: 'ServiceWorkerManager created',
            messageListenerSetup: 'Message listener setup',
            messageListenerSetupError: 'Error setting up message listener',
            messageTypeMustBeString: 'Message type must be a non-empty string',
            messageSending: 'Sending message type: {type}',
            messageReceived: 'Received response for message type: {type}',
            messageTimeout: 'Timeout sending message "{type}" ({timeout}ms)',
            messageSendError: 'Error sending message "{type}"',
            connectionStatus: 'Connection status: {status}',
            connectionCheckError: 'Error checking connection',
            trackingStatusReceived: 'Tracking status received',
            trackingStatusError: 'Error getting tracking status',
            isEnabledMustBeBoolean: 'isEnabled must be a boolean',
            trackingStateUpdateError: 'Error updating tracking state',
            statsReceived: 'Statistics received',
            statsError: 'Error getting statistics',
            statsSkipped: 'Statistics request skipped: {reason}',
            detailedStatsReceived: 'Detailed statistics received',
            detailedStatsError: 'Error getting detailed statistics',
            detailedStatsSkipped: 'Detailed statistics request skipped: {reason}',
            trackingDisabled: 'Tracking disabled',
            noConnection: 'No connection',
            messageBlocked: 'Message blocked: {type}, reason: {reason}',
            pingSuccess: 'Ping successful',
            serviceWorkerUnavailable: 'Service Worker unavailable',
            generateDomainsError: 'Error generating domains',
            cleanupStart: 'Cleaning up ServiceWorkerManager resources',
            destroyed: 'ServiceWorkerManager destroyed',
            destroyError: 'Error destroying ServiceWorkerManager'
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
            listenerMustBeFunction: 'Listener must be a function',
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
            translationCallbackMustBeFunction: 'translationCallback must be a function',
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
        },
        localeStorage: {
            created: 'Locale StorageManager created',
            storageUnavailable: 'chrome.storage.local is unavailable',
            loadError: 'Error loading locale',
            notFound: 'Saved locale not found',
            loaded: 'Locale loaded',
            invalidLocale: 'Invalid locale for saving',
            saveError: 'Error saving locale',
            saved: 'Locale saved',
            destroyStart: 'Cleaning up StorageManager resources',
            destroyed: 'StorageManager destroyed',
            destroyError: 'Error destroying StorageManager'
        },
        developerTools: {
            elementsNotFound: 'Developer tools elements not found',
            toggled: 'Developer tools toggled',
            toggleError: 'Error toggling developer tools',
            stateRestored: 'Developer tools state restored',
            restoreError: 'Error restoring developer tools state',
            panelNotFound: 'Developer panel not found',
            panelOpened: 'Developer panel opened, tab: {tab}',
            openError: 'Error opening developer panel',
            panelClosed: 'Developer panel closed',
            closeError: 'Error closing developer panel',
            tabSwitched: 'Switched to tab: {tabName}',
            tabNotFound: 'Tab {tabName} not found',
            switchTabError: 'Error switching tabs'
        },
        diagnosticsData: {
            getStatusStatisticsError: 'Error getting status statistics',
            getStatusHistoryError: 'Error getting status history',
            getStatusPerformanceMetricsError: 'Error getting performance metrics',
            statusHistoryCleared: 'Status history cleared: {count} records',
            clearStatusHistoryError: 'Error clearing status history',
            getValidationStatisticsError: 'Error getting validation statistics',
            getValidationHistoryError: 'Error getting validation history',
            validationHistoryCleared: 'Validation history cleared: {count} records',
            clearValidationHistoryError: 'Error clearing validation history',
            getValidationPerformanceMetricsError: 'Error getting validation performance metrics',
            managersValidationCompleted: 'Managers validation completed',
            managersValidationError: 'Error validating managers',
            getDiagnosticsError: 'Error getting diagnostics'
        },
        diagnosticsWorkflow: {
            runStart: 'Starting diagnostics',
            runCompleted: 'Diagnostics completed',
            runError: 'Diagnostics error ({totalTime}ms)',
            statusErrorWarning: 'Warning: failed to display diagnostics error status',
            cleared: 'Diagnostics results cleared',
            clearError: 'Error clearing diagnostics',
            elementsNotFound: 'Diagnostics elements not found',
            renderError: 'Error rendering diagnostics'
        },
        optionsDom: {
            domApiUnavailable: 'DOM API unavailable',
            criticalInitializationError: 'Critical initialization error',
            bodyNotAvailable: 'Warning: document.body is not yet available',
            domApiAvailable: 'DOM API available',
            elementsInitialized: 'DOM elements initialized',
            initializationError: 'Error initializing DOM elements',
            elementNotFound: 'Element with ID "{id}" not found',
            missingElements: 'Missing critical DOM elements: {elements}',
            updateElementNotFound: 'Cannot update {elementName}: element not found',
            elementNotInDOM: '{elementName} is not in DOM',
            verificationFailed: 'Update verification for {elementName} failed',
            updateSuccess: '{elementName} updated successfully ({duration}ms)',
            updateError: 'Error updating {elementName} ({duration}ms)',
            backendUrlNotFound: 'Element backendUrl not found',
            urlValueRetrieved: 'URL value retrieved',
            urlMustBeString: 'url must be a string',
            textMustBeString: 'text must be a string',
            disabledMustBeBoolean: 'disabled must be a boolean',
            getStatisticsError: 'Error getting elements statistics',
            destroyStart: 'Cleaning up DOMManager resources',
            destroyed: 'DOMManager destroyed',
            destroyError: 'Error destroying DOMManager'
        },
        initialization: {
            alreadyInitialized: 'OptionsManager already initialized',
            initStart: 'Starting OptionsManager initialization',
            initSuccess: 'OptionsManager initialized successfully',
            initError: 'OptionsManager initialization error ({initTime}ms)',
            initStatusErrorWarning: 'Warning: failed to display initialization error status',
            loadStart: 'Loading settings',
            loadSuccess: 'Settings loaded successfully',
            loadError: 'Error loading settings ({loadTime}ms)',
            loadStatusErrorWarning: 'Warning: failed to display error status',
            activityLoadError: 'Error loading initial activity',
            uiUpdateError: 'Failed to update UI after loading settings',
            uiUpdateWarning: 'Warning: failed to display UI update warning',
            domainExceptionsUpdateError: 'Failed to update domain exceptions list in UI',
            storageApiUnavailable: 'Storage API unavailable. Please reload the extension.',
            storageApiUnavailableError: 'chrome.storage API unavailable'
        },
        lifecycle: {
            eventHandlersRemoved: 'Event handlers removed',
            removeEventHandlersError: 'Error removing event handlers',
            managersDestroyed: 'All managers destroyed',
            destroyManagersError: 'Error destroying managers',
            alreadyDestroyed: 'OptionsManager already destroyed',
            destroyStart: 'Cleaning up OptionsManager resources',
            destroyed: 'OptionsManager destroyed',
            destroyError: 'Error destroying OptionsManager'
        },
        logs: {
            containerNotFound: 'Logs container not found',
            loadError: 'Error loading logs',
            clearError: 'Error clearing logs',
            noLogsToCopy: 'No logs to copy',
            logsCopied: 'Logs copied to clipboard',
            copyError: 'Error copying logs',
            autoRefreshStarted: 'Auto refresh started (every {interval}{timeUnit})',
            autoRefreshStopped: 'Auto refresh stopped',
            noLogsAvailable: 'No logs available. Logs will appear here when you interact with the extension.',
            noLogsMatchFilters: 'No logs match the current filters.',
            loadErrorMessage: 'Error loading logs: {message}'
        },
        options: {
            domManagerInitError: 'Critical DOMManager initialization error',
            storageManagerInitError: 'Critical StorageManager initialization error',
            statusManagerInitError: 'StatusManager initialization error',
            domManagerInitFailed: 'DOM Manager initialization failed: {message}',
            storageManagerInitFailed: 'Storage Manager initialization failed: {message}'
        },
        ui: {
            domainExceptions: {
                localeTextError: 'Error getting locale text for key: {key}',
                domainInputErrorDisplayError: 'Error displaying domain input error',
                domainAdded: 'Domain added to exceptions',
                domainRemoved: 'Domain removed from exceptions',
                domainExceptionsListNotFound: 'Domain exceptions list not found in DOM'
            },
            activity: {
                activityDataUpdated: 'Activity data updated',
                loadActivityStatsError: 'Error loading activity stats',
                setActivityRangeError: 'Error setting activity range',
                activityAutoRefreshStarted: 'Activity auto refresh started (every {interval}ms)',
                startActivityAutoRefreshError: 'Error starting activity auto refresh',
                activityAutoRefreshStopped: 'Activity auto refresh stopped',
                stopActivityAutoRefreshError: 'Error stopping activity auto refresh',
                updateActivityChartError: 'Error updating activity chart'
            },
            settings: {
                buttonNotFound: 'Button {buttonKey} not found for displaying state',
                saveSettingsStart: 'Starting settings save operation',
                saveButtonStateUpdateFailed: 'Warning: failed to update save button state',
                backendUrlGetFailed: 'Failed to get URL value from DOM',
                validationFailed: 'Validation failed',
                validationSuccess: 'URL validation successful',
                backgroundScriptNotNotified: 'Background script was not notified (continuing)',
                domainExceptionsNotNotified: 'Background script did not receive domain exceptions update (continuing)',
                settingsSaved: 'Settings saved successfully',
                saveSettingsError: 'Error saving settings ({totalTime}ms)',
                resetSettingsStart: 'Starting settings reset operation',
                resetButtonStateUpdateFailed: 'Warning: failed to update reset button state',
                uiUpdateAfterResetFailed: 'Failed to update UI after resetting settings',
                settingsReset: 'Settings reset to default values',
                resetSettingsError: 'Error resetting settings ({totalTime}ms)',
                verificationFailed: 'Save verification failed',
                domainExceptionsSaveFailed: 'Failed to save domain exceptions list',
                domainExceptionsResetFailed: 'Failed to reset domain exceptions list'
            },
            eventHandlers: {
                setupEventHandlersStart: 'Setting up event handlers',
                settingsFormNotFound: 'Warning: settings form not found, submit handler not set',
                resetBtnNotFound: 'Warning: reset button not found, handler not set',
                saveBtnNotFound: 'Warning: save button not found',
                runDiagnosticsBtnNotFound: 'Warning: diagnostics button not found, handler not set',
                toggleDeveloperToolsBtnNotFound: 'Warning: developer tools button not found, handler not set',
                eventHandlersSetup: 'Event handlers set up'
            },
            localeDisplay: {
                toggleLanguageError: 'Error toggling language',
                localeChanged: 'Locale changed',
                localeChangeError: 'Error changing locale'
            },
            themeDisplay: {
                themeManagerSet: 'ThemeManager set',
                themeManagerNotSet: 'ThemeManager not set',
                toggleThemeStart: 'Toggling theme',
                themeToggled: 'Theme toggled',
                toggleThemeError: 'Error toggling theme',
                updateThemeDisplayError: 'Error updating theme display'
            }
        },
        status: {
            initSuccess: 'StatusManager initialized',
            displayed: 'Status displayed and verified',
            messageMustBeString: 'message must be a non-empty string',
            invalidType: 'Invalid type "{type}", using INFO',
            elementNotSet: 'Status element not set',
            displayError: 'Error displaying status',
            hidden: 'Status hidden and verified ({time}ms)',
            hideError: 'Error hiding status ({time}ms)',
            getStatisticsError: 'Error getting statistics',
            invalidElementType: 'statusElement is not an HTMLElement',
            invalidDuration: 'defaultDuration cannot be negative',
            historyExceedsMaxSize: 'History exceeds maximum size: {size}/{maxSize}',
            queueExceedsMaxSize: 'Queue exceeds maximum size: {size}/{maxSize}',
            invalidHistoryFormat: 'History has incorrect format',
            invalidQueueFormat: 'Queue has incorrect format',
            visibleButNoType: 'Status is visible but type is not set',
            visibleButNoMessage: 'Status is visible but message is not set',
            validationError: 'Error validating state',
            validationExecutionError: 'Error during validation execution',
            destroyStart: 'Cleaning up StatusManager resources',
            destroyed: 'StatusManager destroyed',
            destroyError: 'Error destroying StatusManager',
            historyEntryAdded: 'History entry added',
            addHistoryError: 'Error adding to history',
            getHistoryError: 'Error getting history',
            historyCleared: 'History cleared: {count} entries',
            clearHistoryError: 'Error clearing history',
            queueFull: 'Queue is full, skipping message',
            queueEntryAdded: 'Message added to queue',
            addQueueError: 'Error adding to queue',
            queueProcessCompleted: 'Queue processing completed',
            queueProcessError: 'Critical queue processing error',
            queueCleared: 'Queue cleared: {count} messages',
            clearQueueError: 'Error clearing queue',
            statusElementMustBeHTMLElement: 'statusElement must be HTMLElement',
            criticalValidationError: 'Critical validation error',
            elementNotInDOM: 'Warning: statusElement is not in DOM',
            elementValid: 'statusElement is valid',
            hideTimeoutCleared: 'Hide timeout cleared',
            hideScheduled: 'Status hide scheduled in {duration}ms',
            elementUnavailableDisplaySkipped: 'Status element unavailable, display skipped',
            displayVerificationFailed: 'Display verification failed',
            elementUnavailableHideSkipped: 'Status element unavailable, hide skipped',
            hideVerificationFailed: 'Hide verification failed'
        },
        storage: {
            apiUnavailable: 'chrome.storage API is unavailable',
            criticalInitError: 'Critical initialization error',
            apiAvailable: 'chrome.storage API is available',
            invalidValueUsingDefault: 'Invalid value, using default value',
            loadingBackendUrl: 'Loading backend URL from storage',
            backendUrlLoaded: 'Backend URL loaded',
            loadingDomainExceptions: 'Loading domain exceptions list',
            domainExceptionsLoaded: 'Domain exceptions list loaded',
            loadDomainExceptionsError: 'Error loading domain exceptions',
            backendUrlMustBeString: 'backendUrl must be a non-empty string',
            savingBackendUrl: 'Saving backend URL to storage',
            backendUrlSavedAndVerified: 'Backend URL saved and verified',
            verificationFailed: 'Verification failed',
            domainsMustBeArray: 'domains must be an array of strings',
            savingDomainExceptions: 'Saving domain exceptions to storage',
            domainExceptionsSaved: 'Domain exceptions saved',
            resettingToDefault: 'Resetting settings to default values',
            resetToDefault: 'Settings reset to default values',
            urlMustBeString: 'url must be a non-empty string',
            sendingNotification: 'Sending notification to background script',
            notificationTimeout: 'Notification timeout',
            notificationSent: 'Notification sent to background script',
            backgroundScriptNoResponse: 'Background script did not respond (this is normal if it is reloading)',
            sendingDomainExceptions: 'Sending domain exceptions to background script',
            domainExceptionsNotificationTimeout: 'Domain exceptions notification timeout',
            domainExceptionsSent: 'Domain exceptions sent to background script',
            domainExceptionsNoResponse: 'Background script did not respond to domain exceptions update',
            destroyStart: 'Cleaning up StorageManager resources',
            destroyed: 'StorageManager destroyed',
            destroyError: 'Error destroying StorageManager'
        },
        validation: {
            initialized: 'ValidationManager initialized',
            urlParsingError: 'URL parsing error',
            urlNormalized: 'URL normalized',
            urlValid: 'URL valid ({time}ms)',
            unexpectedValidationError: 'Unexpected validation error',
            historyEntryAdded: 'History entry added',
            addHistoryError: 'Error adding to validation history',
            getHistoryError: 'Error getting validation history',
            historyCleared: 'Validation history cleared',
            clearHistoryError: 'Error clearing validation history',
            internalStateCleared: 'Internal validation state cleared',
            getStatisticsError: 'Error getting validation statistics',
            stateValidationError: 'Error validating state',
            destroyStart: 'Cleaning up ValidationManager resources',
            destroyed: 'ValidationManager destroyed',
            destroyError: 'Error destroying ValidationManager',
            stateIssue: {
                strictProtocolMustBeBoolean: 'strictProtocol must be boolean',
                enableHistoryMustBeBoolean: 'enableHistory must be boolean',
                maxHistorySizeMustBePositive: 'maxHistorySize must be a positive number',
                historyMustBeArray: 'history must be an array',
                performanceMetricsMustBeMap: 'performanceMetrics must be Map',
                validationStatsMustBeMap: 'validationStats must be Map',
                lastValidationTimeMustBeNumberOrNull: 'lastValidationTime must be a positive number or null',
                lastValidationResultMustBeObjectOrNull: 'lastValidationResult must be an object or null',
                lastValidationResultIsValidMustBeBoolean: 'lastValidationResult.isValid must be boolean',
                validationExecutionError: 'Error during validation execution'
            }
        },
        theme: {
            themeManager: {
                created: 'ThemeManager created',
                loadingAndApplying: 'Loading and applying theme',
                appliedFromCache: 'Theme applied from cache',
                loadedAndApplied: 'Theme loaded and applied',
                loadError: 'Error loading theme',
                invalidTheme: 'Invalid theme',
                applyError: 'Error applying theme',
                invalidThemeForSave: 'Invalid theme for saving',
                saveError: 'Error saving theme',
                userCallbackError: 'Error in user callback',
                listenerSetupError: 'Error setting up listener',
                cleanupStart: 'Cleaning up ThemeManager resources',
                destroyed: 'ThemeManager destroyed',
                destroyError: 'Error destroying ThemeManager'
            },
            application: {
                created: 'ApplicationManager created',
                invalidThemeAttempt: 'Attempt to apply invalid theme',
                themeApplied: 'Theme applied to DOM',
                applyError: 'Error applying theme',
                cleanupStart: 'Cleaning up ApplicationManager resources'
            },
            storage: {
                created: 'StorageManager created',
                themeFromCache: 'Theme retrieved from cache',
                cacheReadError: 'Error reading from cache',
                themeSavedToCache: 'Theme saved to cache',
                cacheSaveError: 'Error saving to cache',
                storageApiUnavailable: 'Chrome storage API unavailable',
                themeLoaded: 'Theme loaded from storage',
                loadError: 'Error loading theme',
                invalidThemeForSave: 'Invalid theme for saving',
                themeSaved: 'Theme saved to storage',
                saveError: 'Error saving theme',
                cleanupStart: 'Cleaning up StorageManager resources'
            },
            sync: {
                created: 'SyncManager created',
                storageApiUnavailable: 'Chrome storage onChanged API unavailable',
                callbackNotSet: 'Callback not set',
                themeChanged: 'Theme changed from storage',
                callbackError: 'Error in theme change callback',
                listenerSetupError: 'Error setting up theme listener',
                listenerSet: 'Theme change listener set',
                listenerRemoved: 'Theme change listener removed',
                removeListenerError: 'Error removing listener',
                cleanupStart: 'Cleaning up SyncManager resources',
                destroyed: 'SyncManager destroyed',
                destroyError: 'Error destroying SyncManager'
            }
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
            inactive: 'Inactive',
            connectionSuccess: 'Connection successful',
            connectionFailed: 'Connection failed',
            connectionError: 'Connection error'
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
            testConnectionLoading: 'Checking...',
            enableTracking: 'Enable Tracking',
            disableTracking: 'Disable Tracking',
            trackingEnableLoading: 'Enabling...',
            trackingDisableLoading: 'Disabling...'
        },
        
        // Notifications
        notifications: {
            connectionSuccess: 'Connection Successful!',
            connectionFailed: 'Connection Failed',
            connectionError: 'Connection Test Error',
            initError: 'Initialization Error',
            trackingEnabled: 'Tracking enabled',
            trackingDisabled: 'Tracking disabled',
            trackingToggleError: 'Failed to update tracking state'
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
            backendUrlHelp: 'Enter the URL of your Mindful Web backend API endpoint',
            domainExceptionsLabel: 'Domain exclusions:',
            domainExceptionsPlaceholder: 'example.com',
            domainExceptionsHelp: 'Requests will not be sent for these domains',
            domainExceptionsAdd: 'Add domain',
            domainExceptionsRemove: 'Remove from exclusions',
            domainExceptionsInvalid: 'Please enter a valid domain (example.com)',
            domainExceptionsDuplicate: 'This domain is already in the exclusion list',
            domainExceptionsListLabel: 'Excluded domains list'
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
