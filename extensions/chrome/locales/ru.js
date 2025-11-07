/**
 * Russian translations for Mindful Web Extension
 * @module locales/ru
 */

const RU = {
    // Общее
    common: {
        appName: 'Mindful Web',
        language: 'Язык',
        languageName: 'Русский',
        languageCode: 'ru',
        close: 'Закрыть',
        cancel: 'Отмена',
        ok: 'ОК',
        yes: 'Да',
        no: 'Нет',
        timeUnitMs: 'мс'
    },

    // Логи (для внутреннего логирования, INFO/ERROR)
    logs: {
        app: {
            initStart: 'Начало инициализации AppManager',
            initSuccess: 'AppManager инициализирован (без периодических обновлений)',
            initError: 'Ошибка инициализации AppManager',
            alreadyInitialized: 'AppManager уже инициализирован',
            initializationError: 'Ошибка инициализации AppManager',
            initialStatusLoaded: 'Начальный статус загружен',
            initialStatusError: 'Ошибка загрузки начального статуса',
            handlersSetup: 'Настройка обработчиков событий',
            handlersCount: 'Настроено обработчиков: {count}',
            openSettings: 'Открытие страницы настроек',
            testConnection: {
                start: 'Тестирование подключения',
                success: 'Тест подключения: успешно',
                fail: 'Тест подключения: неудача',
                error: 'Ошибка тестирования подключения'
            },
            localeChanged: 'Локаль изменена',
            localeChangeError: 'Ошибка при изменении локали',
            trackingToggleRequest: 'Запрос изменения состояния отслеживания',
            trackingToggleError: 'Ошибка переключения состояния отслеживания',
            trackingStateUpdated: 'Состояние отслеживания обновлено',
            trackingStateUpdateFailed: 'Не удалось обновить состояние отслеживания',
            periodicUpdatesAlreadyStarted: 'Периодические обновления уже запущены',
            periodicUpdatesStart: 'Запуск периодических обновлений',
            periodicUpdatesError: 'Ошибка периодического обновления',
            periodicUpdatesStopped: 'Периодические обновления остановлены',
            alreadyDestroyed: 'AppManager уже был уничтожен',
            destroyStart: 'Очистка ресурсов AppManager',
            destroyed: 'AppManager уничтожен',
            destroyError: 'Ошибка при уничтожении AppManager',
            eventHandlersRemoved: 'Обработчики событий удалены',
            eventHandlersRemoveError: 'Ошибка удаления обработчиков событий',
            managersDestroyed: 'Все менеджеры уничтожены',
            managersDestroyError: 'Ошибка уничтожения менеджеров'
        },
        diagnostics: {
            created: 'DiagnosticsManager инициализирован',
            serviceWorkerRequired: 'ServiceWorkerManager обязателен',
            notificationManagerRequired: 'NotificationManager обязателен',
            translateFnRequired: 'translateFn должен быть функцией',
            resultsHeader: 'Результаты диагностики',
            checkNames: {
                serviceWorker: 'Service Worker',
                connection: 'Подключение',
                tracking: 'Отслеживание',
                stats: 'Статистика'
            },
            overall: 'Общий статус',
            duration: 'Время выполнения (мс)',
            startedAt: 'Время запуска',
            generalError: 'Общая ошибка диагностики',
            checkLine: '{emoji} {name}:',
            checkError: 'Ошибка в проверке: {name}',
            checkStart: 'Запуск проверки: {name}',
            checkCompleted: 'Проверка {name} завершена за {duration}мс',
            checkExecutionError: 'Ошибка выполнения проверки {name}',
            checkUnexpectedError: 'Неожиданная ошибка при проверке {name}',
            diagnosticsStart: 'Запуск диагностики',
            diagnosticsCompleted: 'Диагностика завершена',
            diagnosticsCriticalError: 'Критическая ошибка диагностики',
            parallelExecution: 'Выполнение проверок параллельно',
            sequentialExecution: 'Выполнение проверок последовательно',
            checkFailed: 'Проверка завершилась с ошибкой',
            serviceWorkerAvailable: 'Service Worker доступен',
            serviceWorkerUnavailable: 'Service Worker недоступен',
            serverAvailable: 'Сервер доступен',
            serverUnavailable: 'Сервер недоступен',
            serverConnectionError: 'Ошибка проверки подключения к серверу',
            trackingStatusInvalid: 'Получены некорректные данные о статусе отслеживания',
            trackingActive: 'активно',
            trackingInactive: 'неактивно',
            trackingStatus: 'Отслеживание',
            trackingStatusError: 'Ошибка получения статуса отслеживания',
            statsInvalid: 'Получены некорректные данные статистики',
            statsReceived: 'Статистика получена',
            statsWithData: '({events} событий, {domains} доменов)',
            statsQueue: '[Очередь: {queue}]',
            statsError: 'Ошибка получения статистики',
            noResults: 'Нет результатов диагностики для отображения',
            diagnosticsCompletedMessage: 'Диагностика завершена за {duration}мс',
            errorsCount: 'Ошибки: {count}/{total}',
            warningsCount: 'Предупреждения: {count}/{total}',
            allChecksPassed: 'Все проверки пройдены',
            cleanupStart: 'Очистка ресурсов DiagnosticsManager',
            destroyed: 'DiagnosticsManager уничтожен',
            destroyError: 'Ошибка при уничтожении DiagnosticsManager'
        },
        dom: {
            created: 'DOMManager инициализирован',
            documentApiUnavailable: 'document API недоступен',
            getElementByIdUnavailable: 'document.getElementById недоступен',
            elementsInitialized: 'DOM элементы инициализированы',
            initializationError: 'Ошибка инициализации DOM элементов',
            elementNotFound: 'Элемент с ID "{id}" не найден',
            criticalElementsMissing: 'Отсутствуют критичные DOM элементы: {elements}',
            updateImpossible: 'Невозможно обновить {elementName}: элемент не найден',
            elementUpdated: '{elementName} обновлен успешно',
            elementUpdateError: 'Ошибка обновления {elementName}',
            connectionStatusUpdateError: 'Ошибка обновления статуса подключения',
            trackingStatusUpdateError: 'Ошибка обновления статуса отслеживания',
            countersUpdated: 'Счетчики обновлены',
            elementsReload: 'Перезагрузка DOM элементов',
            elementsStatisticsError: 'Ошибка получения статистики элементов',
            translateFnSet: 'Функция локализации установлена',
            statusesRefreshed: 'Статусы обновлены с текущей локализацией',
            cleanupStart: 'Очистка ресурсов DOMManager',
            destroyed: 'DOMManager уничтожен',
            destroyError: 'Ошибка при уничтожении DOMManager',
            // Названия элементов для логирования
            elementNames: {
                connectionStatus: 'статус подключения',
                trackingStatus: 'статус отслеживания',
                trackingToggle: 'кнопка переключения отслеживания',
                eventsCounter: 'счетчик событий',
                domainsCounter: 'счетчик доменов',
                queueSize: 'размер очереди',
                button: 'кнопка'
            },
            // Ошибки валидации
            validation: {
                isOnlineMustBeBoolean: 'isOnline должен быть булевым значением',
                isTrackingMustBeBoolean: 'isTracking должен быть булевым значением',
                targetIsTrackingMustBeBoolean: 'targetIsTracking должен быть булевым значением',
                countersMustBeObject: 'counters должен быть объектом',
                textMustBeString: 'text должен быть строкой',
                disabledMustBeBoolean: 'disabled должен быть булевым значением',
                translateFnMustBeFunction: 'translateFn должен быть функцией'
            }
        },
        notification: {
            created: 'NotificationManager создан',
            warnMessageRequired: 'message обязателен и должен быть строкой',
            warnInvalidType: 'Неверный тип "{type}", используется INFO',
            notificationCreated: 'Уведомление создано: {type}',
            creationError: 'Ошибка создания уведомления',
            documentBodyUnavailable: 'document.body недоступен',
            notificationNotFound: 'Уведомление не найдено или уже удалено',
            notificationRemoved: 'Уведомление удалено из DOM',
            removalError: 'Ошибка при удалении уведомления из DOM',
            removeError: 'Ошибка удаления уведомления',
            cleared: 'Очищено уведомлений: {count}',
            clearError: 'Ошибка очистки уведомлений',
            cleanupStart: 'Очистка ресурсов NotificationManager',
            destroyed: 'NotificationManager уничтожен',
            destroyError: 'Ошибка при уничтожении NotificationManager'
        },
        serviceWorker: {
            created: 'ServiceWorkerManager создан',
            messageListenerSetup: 'Слушатель сообщений настроен',
            messageListenerSetupError: 'Ошибка настройки слушателя сообщений',
            messageTypeMustBeString: 'Тип сообщения должен быть непустой строкой',
            messageSending: 'Отправка сообщения типа: {type}',
            messageReceived: 'Получен ответ на сообщение типа: {type}',
            messageTimeout: 'Таймаут при отправке сообщения "{type}" ({timeout}мс)',
            messageSendError: 'Ошибка отправки сообщения "{type}"',
            connectionStatus: 'Статус подключения: {status}',
            connectionCheckError: 'Ошибка проверки подключения',
            trackingStatusReceived: 'Получен статус отслеживания',
            trackingStatusError: 'Ошибка получения статуса отслеживания',
            isEnabledMustBeBoolean: 'isEnabled должен быть булевым значением',
            trackingStateUpdateError: 'Ошибка обновления состояния отслеживания',
            statsReceived: 'Получена статистика',
            statsError: 'Ошибка получения статистики',
            statsSkipped: 'Запрос статистики пропущен: {reason}',
            detailedStatsReceived: 'Получена подробная статистика',
            detailedStatsError: 'Ошибка получения подробной статистики',
            detailedStatsSkipped: 'Запрос подробной статистики пропущен: {reason}',
            trackingDisabled: 'Отслеживание отключено',
            noConnection: 'Нет подключения',
            messageBlocked: 'Сообщение заблокировано: {type}, причина: {reason}',
            pingSuccess: 'Ping успешен',
            serviceWorkerUnavailable: 'Service Worker недоступен',
            generateDomainsError: 'Ошибка генерации доменов',
            cleanupStart: 'Очистка ресурсов ServiceWorkerManager',
            destroyed: 'ServiceWorkerManager уничтожен',
            destroyError: 'Ошибка при уничтожении ServiceWorkerManager'
        },
        locale: {
            created: 'LocaleManager создан',
            alreadyInitialized: 'LocaleManager уже инициализирован',
            initStart: 'Начало инициализации LocaleManager',
            savedLocaleLoaded: 'Загружена сохранённая локаль',
            browserLocaleSet: 'Установлена локаль браузера',
            initSuccess: 'LocaleManager инициализирован',
            initError: 'Ошибка инициализации LocaleManager',
            detectBrowserLocaleError: 'Ошибка определения локали браузера',
            unsupported: 'Неподдерживаемая локаль: {locale}',
            alreadySet: 'Локаль уже установлена: {locale}',
            changed: 'Локаль изменена',
            listenerAdded: 'Добавлен слушатель изменения локали',
            listenerRemoved: 'Удалён слушатель изменения локали',
            listenerError: 'Ошибка в слушателе изменения локали',
            listenerMustBeFunction: 'Listener должен быть функцией',
            statisticsReset: 'Вся статистика локализации сброшена',
            statisticsResetError: 'Ошибка сброса статистики локализации',
            alreadyDestroyed: 'LocaleManager уже был уничтожен',
            destroyStart: 'Очистка ресурсов LocaleManager',
            destroyed: 'LocaleManager уничтожен',
            destroyError: 'Ошибка при уничтожении LocaleManager'
        },
        translation: {
            created: 'TranslationManager создан',
            missing: 'Перевод не найден для ключа: {key}',
            translateError: 'Ошибка получения перевода для ключа: {key}',
            unsupported: 'Неподдерживаемая локаль: {locale}',
            alreadySet: 'Локаль уже установлена: {locale}',
            changed: 'Локаль изменена',
            statsReset: 'Статистика переводов сброшена',
            destroyStart: 'Очистка ресурсов TranslationManager',
            destroyed: 'TranslationManager уничтожен',
            destroyError: 'Ошибка при уничтожении TranslationManager'
        },
        localeDom: {
            created: 'DOMManager локализации создан',
            translationCallbackMustBeFunction: 'translationCallback должен быть функцией',
            rootNotProvided: 'Root элемент не предоставлен',
            elementLocalizeError: 'Ошибка локализации элемента',
            localizedCount: 'Локализовано элементов: {count}',
            domLocalizeError: 'Ошибка локализации DOM',
            elementNotFound: 'Элемент не найден: {selector}',
            elementLocalized: 'Элемент локализован: {selector}',
            elementLocalizeSelectorError: 'Ошибка локализации элемента: {selector}',
            elementsNotFound: 'Элементы не найдены: {selector}',
            elementsLocalized: 'Элементы локализованы: {selector}',
            elementsLocalizeError: 'Ошибка локализации элементов: {selector}',
            elementNotProvided: 'Элемент не предоставлен',
            attrsAdded: 'Атрибуты локализации добавлены',
            addAttrsError: 'Ошибка добавления атрибутов локализации',
            attrsRemoved: 'Атрибуты локализации удалены',
            removeAttrsError: 'Ошибка удаления атрибутов локализации',
            getElementsError: 'Ошибка получения локализуемых элементов',
            countElementsError: 'Ошибка подсчёта локализуемых элементов',
            statsReset: 'Статистика локализации сброшена',
            destroyStart: 'Очистка ресурсов DOMManager локализации',
            destroyed: 'DOMManager локализации уничтожен',
            destroyError: 'Ошибка при уничтожении DOMManager локализации'
        },
        localeStorage: {
            created: 'Locale StorageManager создан',
            storageUnavailable: 'chrome.storage.local недоступен',
            loadError: 'Ошибка загрузки локали',
            notFound: 'Сохраненная локаль не найдена',
            loaded: 'Локаль загружена',
            invalidLocale: 'Невалидная локаль для сохранения',
            saveError: 'Ошибка сохранения локали',
            saved: 'Локаль сохранена',
            destroyStart: 'Очистка ресурсов StorageManager',
            destroyed: 'StorageManager уничтожен',
            destroyError: 'Ошибка при уничтожении StorageManager'
        },
        developerTools: {
            elementsNotFound: 'Элементы developer tools не найдены',
            toggled: 'Developer tools переключены',
            toggleError: 'Ошибка переключения developer tools',
            stateRestored: 'Состояние developer tools восстановлено',
            restoreError: 'Ошибка восстановления состояния developer tools',
            panelNotFound: 'Панель разработчика не найдена',
            panelOpened: 'Панель разработчика открыта, вкладка: {tab}',
            openError: 'Ошибка открытия панели разработчика',
            panelClosed: 'Панель разработчика закрыта',
            closeError: 'Ошибка закрытия панели разработчика',
            tabSwitched: 'Переключено на вкладку: {tabName}',
            tabNotFound: 'Вкладка {tabName} не найдена',
            switchTabError: 'Ошибка переключения вкладок'
        },
        diagnosticsData: {
            getStatusStatisticsError: 'Ошибка получения статистики статусов',
            getStatusHistoryError: 'Ошибка получения истории статусов',
            getStatusPerformanceMetricsError: 'Ошибка получения метрик производительности',
            statusHistoryCleared: 'История статусов очищена: {count} записей',
            clearStatusHistoryError: 'Ошибка очистки истории статусов',
            getValidationStatisticsError: 'Ошибка получения статистики валидации',
            getValidationHistoryError: 'Ошибка получения истории валидации',
            validationHistoryCleared: 'История валидаций очищена: {count} записей',
            clearValidationHistoryError: 'Ошибка очистки истории валидации',
            getValidationPerformanceMetricsError: 'Ошибка получения метрик производительности валидации',
            managersValidationCompleted: 'Валидация менеджеров завершена',
            managersValidationError: 'Ошибка валидации менеджеров',
            getDiagnosticsError: 'Ошибка получения диагностики'
        },
        diagnosticsWorkflow: {
            runStart: 'Запуск диагностики',
            runCompleted: 'Диагностика завершена',
            runError: 'Ошибка диагностики ({totalTime}мс)',
            statusErrorWarning: 'Предупреждение: не удалось отобразить статус ошибки диагностики',
            cleared: 'Результаты диагностики очищены',
            clearError: 'Ошибка очистки диагностики',
            elementsNotFound: 'Элементы диагностики не найдены',
            renderError: 'Ошибка отрисовки диагностики'
        },
        optionsDom: {
            domApiUnavailable: 'DOM API недоступен',
            criticalInitializationError: 'Критическая ошибка инициализации',
            bodyNotAvailable: 'Предупреждение: document.body еще не доступен',
            domApiAvailable: 'DOM API доступен',
            elementsInitialized: 'DOM элементы инициализированы',
            initializationError: 'Ошибка инициализации DOM элементов',
            elementNotFound: 'Элемент с ID "{id}" не найден',
            missingElements: 'Отсутствуют критичные DOM элементы: {elements}',
            updateElementNotFound: 'Невозможно обновить {elementName}: элемент не найден',
            elementNotInDOM: '{elementName} не находится в DOM',
            verificationFailed: 'Верификация обновления {elementName} не удалась',
            updateSuccess: '{elementName} обновлен успешно ({duration}мс)',
            updateError: 'Ошибка обновления {elementName} ({duration}мс)',
            backendUrlNotFound: 'Элемент backendUrl не найден',
            urlValueRetrieved: 'Значение URL получено',
            urlMustBeString: 'url должен быть строкой',
            textMustBeString: 'text должен быть строкой',
            disabledMustBeBoolean: 'disabled должен быть булевым значением',
            getStatisticsError: 'Ошибка получения статистики элементов',
            destroyStart: 'Очистка ресурсов DOMManager',
            destroyed: 'DOMManager уничтожен',
            destroyError: 'Ошибка при уничтожении DOMManager'
        },
        initialization: {
            alreadyInitialized: 'OptionsManager уже инициализирован',
            initStart: 'Начало инициализации OptionsManager',
            initSuccess: 'OptionsManager инициализирован успешно',
            initError: 'Ошибка инициализации OptionsManager ({initTime}мс)',
            initStatusErrorWarning: 'Предупреждение: не удалось отобразить статус ошибки инициализации',
            loadStart: 'Загрузка настроек',
            loadSuccess: 'Настройки загружены успешно',
            loadError: 'Ошибка загрузки настроек ({loadTime}мс)',
            loadStatusErrorWarning: 'Предупреждение: не удалось отобразить статус ошибки',
            activityLoadError: 'Ошибка начальной загрузки активности',
            uiUpdateError: 'Не удалось обновить UI после загрузки настроек',
            uiUpdateWarning: 'Предупреждение: не удалось отобразить предупреждение о проблеме с UI',
            domainExceptionsUpdateError: 'Не удалось обновить список исключений доменов в UI',
            storageApiUnavailable: 'Storage API недоступен. Пожалуйста, перезагрузите расширение.',
            storageApiUnavailableError: 'chrome.storage API недоступен'
        },
        lifecycle: {
            eventHandlersRemoved: 'Обработчики событий удалены',
            removeEventHandlersError: 'Ошибка удаления обработчиков событий',
            managersDestroyed: 'Все менеджеры уничтожены',
            destroyManagersError: 'Ошибка уничтожения менеджеров',
            alreadyDestroyed: 'OptionsManager уже был уничтожен',
            destroyStart: 'Очистка ресурсов OptionsManager',
            destroyed: 'OptionsManager уничтожен',
            destroyError: 'Ошибка при уничтожении OptionsManager'
        },
        logs: {
            containerNotFound: 'Контейнер для логов не найден',
            loadError: 'Ошибка загрузки логов',
            clearError: 'Ошибка очистки логов',
            noLogsToCopy: 'Нет логов для копирования',
            logsCopied: 'Логи скопированы в буфер обмена',
            copyError: 'Ошибка копирования логов',
            autoRefreshStarted: 'Автоматическое обновление логов запущено (каждые {interval}{timeUnit})',
            autoRefreshStopped: 'Автоматическое обновление логов остановлено',
            noLogsAvailable: 'Логи отсутствуют. Логи будут появляться здесь при взаимодействии с расширением.',
            noLogsMatchFilters: 'Нет логов, соответствующих текущим фильтрам.',
            loadErrorMessage: 'Ошибка загрузки логов: {message}'
        },
        options: {
            domManagerInitError: 'Критическая ошибка инициализации DOMManager',
            storageManagerInitError: 'Критическая ошибка инициализации StorageManager',
            statusManagerInitError: 'Ошибка инициализации StatusManager',
            domManagerInitFailed: 'Ошибка инициализации DOM Manager: {message}',
            storageManagerInitFailed: 'Ошибка инициализации Storage Manager: {message}'
        },
        ui: {
            domainExceptions: {
                localeTextError: 'Ошибка получения текста локали для ключа: {key}',
                domainInputErrorDisplayError: 'Ошибка отображения ошибки ввода домена',
                domainAdded: 'Домен добавлен в исключения',
                domainRemoved: 'Домен удален из исключений',
                domainExceptionsListNotFound: 'Список исключений доменов не найден в DOM'
            },
            activity: {
                activityDataUpdated: 'Данные активности обновлены',
                loadActivityStatsError: 'Ошибка загрузки статистики активности',
                setActivityRangeError: 'Ошибка установки диапазона активности',
                activityAutoRefreshStarted: 'Автообновление активности запущено (каждые {interval}мс)',
                startActivityAutoRefreshError: 'Ошибка запуска автообновления активности',
                activityAutoRefreshStopped: 'Автообновление активности остановлено',
                stopActivityAutoRefreshError: 'Ошибка остановки автообновления активности',
                updateActivityChartError: 'Ошибка обновления графика активности'
            },
            settings: {
                buttonNotFound: 'Кнопка {buttonKey} не найдена для отображения состояния',
                saveSettingsStart: 'Начало операции сохранения настроек',
                saveButtonStateUpdateFailed: 'Предупреждение: не удалось обновить состояние кнопки сохранения',
                backendUrlGetFailed: 'Не удалось получить значение URL из DOM',
                validationFailed: 'Валидация не прошла',
                validationSuccess: 'Валидация URL успешна',
                backgroundScriptNotNotified: 'Background script не был уведомлен (продолжаем работу)',
                domainExceptionsNotNotified: 'Background script не получил обновление исключений доменов (продолжаем работу)',
                settingsSaved: 'Настройки успешно сохранены',
                saveSettingsError: 'Ошибка сохранения настроек ({totalTime}мс)',
                resetSettingsStart: 'Начало операции сброса настроек',
                resetButtonStateUpdateFailed: 'Предупреждение: не удалось обновить состояние кнопки сброса',
                uiUpdateAfterResetFailed: 'Не удалось обновить UI после сброса настроек',
                settingsReset: 'Настройки сброшены к значениям по умолчанию',
                resetSettingsError: 'Ошибка сброса настроек ({totalTime}мс)',
                verificationFailed: 'Верификация сохранения не удалась',
                domainExceptionsSaveFailed: 'Не удалось сохранить список исключений доменов',
                domainExceptionsResetFailed: 'Не удалось сбросить список исключений доменов'
            },
            eventHandlers: {
                setupEventHandlersStart: 'Настройка обработчиков событий',
                settingsFormNotFound: 'Предупреждение: форма настроек не найдена, обработчик submit не установлен',
                resetBtnNotFound: 'Предупреждение: кнопка сброса не найдена, обработчик не установлен',
                saveBtnNotFound: 'Предупреждение: кнопка сохранения не найдена',
                runDiagnosticsBtnNotFound: 'Предупреждение: кнопка диагностики не найдена, обработчик не установлен',
                toggleDeveloperToolsBtnNotFound: 'Предупреждение: кнопка developer tools не найдена, обработчик не установлен',
                eventHandlersSetup: 'Обработчики событий настроены'
            },
            localeDisplay: {
                toggleLanguageError: 'Ошибка переключения языка',
                localeChanged: 'Локаль изменена',
                localeChangeError: 'Ошибка при изменении локали'
            },
            themeDisplay: {
                themeManagerSet: 'ThemeManager установлен',
                themeManagerNotSet: 'ThemeManager не установлен',
                toggleThemeStart: 'Переключение темы',
                themeToggled: 'Тема переключена',
                toggleThemeError: 'Ошибка переключения темы',
                updateThemeDisplayError: 'Ошибка обновления отображения темы'
            }
        },
        status: {
            initSuccess: 'StatusManager инициализирован',
            displayed: 'Статус отображен и верифицирован',
            messageMustBeString: 'message должен быть непустой строкой',
            invalidType: 'Неверный тип "{type}", используется INFO',
            elementNotSet: 'Элемент статуса не установлен',
            displayError: 'Ошибка отображения статуса',
            hidden: 'Статус скрыт и верифицирован ({time}мс)',
            hideError: 'Ошибка скрытия статуса ({time}мс)',
            clearHistoryError: 'Ошибка очистки истории',
            getStatisticsError: 'Ошибка получения статистики',
            invalidElementType: 'statusElement не является HTMLElement',
            invalidDuration: 'defaultDuration не может быть отрицательным',
            historyExceedsMaxSize: 'История превышает максимальный размер: {size}/{maxSize}',
            queueExceedsMaxSize: 'Очередь превышает максимальный размер: {size}/{maxSize}',
            invalidHistoryFormat: 'История имеет некорректный формат',
            invalidQueueFormat: 'Очередь имеет некорректный формат',
            visibleButNoType: 'Статус видим, но тип не установлен',
            visibleButNoMessage: 'Статус видим, но сообщение не установлено',
            validationError: 'Ошибка валидации состояния',
            validationExecutionError: 'Ошибка при выполнении валидации',
            destroyStart: 'Очистка ресурсов StatusManager',
            destroyed: 'StatusManager уничтожен',
            destroyError: 'Ошибка при уничтожении StatusManager',
            historyEntryAdded: 'Запись добавлена в историю',
            addHistoryError: 'Ошибка добавления в историю',
            getHistoryError: 'Ошибка получения истории',
            historyCleared: 'История очищена: {count} записей',
            queueFull: 'Очередь переполнена, пропуск сообщения',
            queueEntryAdded: 'Сообщение добавлено в очередь',
            addQueueError: 'Ошибка добавления в очередь',
            queueProcessCompleted: 'Обработка очереди завершена',
            queueProcessError: 'Критическая ошибка обработки очереди',
            queueCleared: 'Очередь очищена: {count} сообщений',
            clearQueueError: 'Ошибка очистки очереди',
            statusElementMustBeHTMLElement: 'statusElement должен быть HTMLElement',
            criticalValidationError: 'Критическая ошибка валидации',
            elementNotInDOM: 'Предупреждение: statusElement не находится в DOM',
            elementValid: 'statusElement валиден',
            hideTimeoutCleared: 'Таймер скрытия очищен',
            hideScheduled: 'Скрытие статуса запланировано через {duration}мс',
            elementUnavailableDisplaySkipped: 'Элемент статуса недоступен, отображение пропущено',
            displayVerificationFailed: 'Верификация отображения не удалась',
            elementUnavailableHideSkipped: 'Элемент статуса недоступен, скрытие пропущено',
            hideVerificationFailed: 'Верификация скрытия не удалась'
        },
        storage: {
            apiUnavailable: 'chrome.storage API недоступен',
            criticalInitError: 'Критическая ошибка инициализации',
            apiAvailable: 'chrome.storage API доступен',
            invalidValueUsingDefault: 'Некорректное значение, используется значение по умолчанию',
            loadingBackendUrl: 'Загрузка URL бэкенда из хранилища',
            backendUrlLoaded: 'URL бэкенда загружен',
            loadingDomainExceptions: 'Загрузка списка исключений доменов',
            domainExceptionsLoaded: 'Список исключений доменов загружен',
            loadDomainExceptionsError: 'Ошибка загрузки исключений доменов',
            backendUrlMustBeString: 'backendUrl должен быть непустой строкой',
            savingBackendUrl: 'Сохранение URL бэкенда в хранилище',
            backendUrlSavedAndVerified: 'URL бэкенда успешно сохранен и верифицирован',
            verificationFailed: 'Верификация сохранения не удалась',
            domainsMustBeArray: 'domains должен быть массивом строк',
            savingDomainExceptions: 'Сохранение исключений доменов в хранилище',
            domainExceptionsSaved: 'Исключения доменов успешно сохранены',
            resettingToDefault: 'Сброс настроек к значениям по умолчанию',
            resetToDefault: 'Настройки сброшены к значениям по умолчанию',
            urlMustBeString: 'url должен быть непустой строкой',
            sendingNotification: 'Отправка уведомления background script',
            notificationTimeout: 'Таймаут уведомления',
            notificationSent: 'Уведомление успешно отправлено background script',
            backgroundScriptNoResponse: 'Background script не ответил (это нормально если он перезагружается)',
            sendingDomainExceptions: 'Отправка исключений доменов background script',
            domainExceptionsNotificationTimeout: 'Таймаут уведомления исключений доменов',
            domainExceptionsSent: 'Исключения доменов отправлены background script',
            domainExceptionsNoResponse: 'Background script не ответил на обновление исключений доменов',
            destroyStart: 'Очистка ресурсов StorageManager',
            destroyed: 'StorageManager уничтожен',
            destroyError: 'Ошибка при уничтожении StorageManager'
        },
        validation: {
            initialized: 'ValidationManager инициализирован',
            urlParsingError: 'Ошибка парсинга URL',
            urlNormalized: 'URL нормализован',
            urlValid: 'URL валиден ({time}мс)',
            unexpectedValidationError: 'Неожиданная ошибка валидации',
            historyEntryAdded: 'Запись добавлена в историю валидации',
            addHistoryError: 'Ошибка добавления в историю валидации',
            getHistoryError: 'Ошибка получения истории валидации',
            historyCleared: 'История валидации очищена',
            clearHistoryError: 'Ошибка очистки истории валидации',
            internalStateCleared: 'Внутреннее состояние валидации очищено',
            getStatisticsError: 'Ошибка получения статистики валидации',
            stateValidationError: 'Ошибка валидации состояния',
            destroyStart: 'Очистка ресурсов ValidationManager',
            destroyed: 'ValidationManager уничтожен',
            destroyError: 'Ошибка при уничтожении ValidationManager',
            stateIssue: {
                strictProtocolMustBeBoolean: 'strictProtocol должен быть boolean',
                enableHistoryMustBeBoolean: 'enableHistory должен быть boolean',
                maxHistorySizeMustBePositive: 'maxHistorySize должен быть положительным числом',
                historyMustBeArray: 'history должен быть массивом',
                performanceMetricsMustBeMap: 'performanceMetrics должен быть Map',
                validationStatsMustBeMap: 'validationStats должен быть Map',
                lastValidationTimeMustBeNumberOrNull: 'lastValidationTime должен быть положительным числом или null',
                lastValidationResultMustBeObjectOrNull: 'lastValidationResult должен быть объектом или null',
                lastValidationResultIsValidMustBeBoolean: 'lastValidationResult.isValid должен быть boolean',
                validationExecutionError: 'Ошибка при выполнении валидации'
            }
        },
        theme: {
            themeManager: {
                created: 'ThemeManager создан',
                loadingAndApplying: 'Загрузка и применение темы',
                appliedFromCache: 'Тема применена из кеша',
                loadedAndApplied: 'Тема загружена и применена',
                loadError: 'Ошибка загрузки темы',
                invalidTheme: 'Невалидная тема',
                applyError: 'Ошибка применения темы',
                invalidThemeForSave: 'Невалидная тема для сохранения',
                saveError: 'Ошибка сохранения темы',
                userCallbackError: 'Ошибка в пользовательском callback',
                listenerSetupError: 'Ошибка установки слушателя',
                cleanupStart: 'Очистка ресурсов ThemeManager',
                destroyed: 'ThemeManager уничтожен',
                destroyError: 'Ошибка при уничтожении ThemeManager'
            },
            application: {
                created: 'ApplicationManager создан',
                invalidThemeAttempt: 'Попытка применить невалидную тему',
                themeApplied: 'Тема применена к DOM',
                applyError: 'Ошибка применения темы',
                cleanupStart: 'Очистка ресурсов ApplicationManager'
            },
            storage: {
                created: 'StorageManager создан',
                themeFromCache: 'Тема получена из кеша',
                cacheReadError: 'Ошибка чтения из кеша',
                themeSavedToCache: 'Тема сохранена в кеш',
                cacheSaveError: 'Ошибка сохранения в кеш',
                storageApiUnavailable: 'Chrome storage API недоступен',
                themeLoaded: 'Тема загружена из storage',
                loadError: 'Ошибка загрузки темы',
                invalidThemeForSave: 'Невалидная тема для сохранения',
                themeSaved: 'Тема сохранена в storage',
                saveError: 'Ошибка сохранения темы',
                cleanupStart: 'Очистка ресурсов StorageManager'
            },
            sync: {
                created: 'SyncManager создан',
                storageApiUnavailable: 'Chrome storage onChanged API недоступен',
                callbackNotSet: 'Callback не установлен',
                themeChanged: 'Тема изменена из storage',
                callbackError: 'Ошибка в callback изменения темы',
                listenerSetupError: 'Ошибка установки слушателя темы',
                listenerSet: 'Слушатель изменений темы установлен',
                listenerRemoved: 'Слушатель изменений темы удален',
                removeListenerError: 'Ошибка удаления слушателя',
                cleanupStart: 'Очистка ресурсов SyncManager',
                destroyed: 'SyncManager уничтожен',
                destroyError: 'Ошибка при уничтожении SyncManager'
            },
            init: {
                created: 'ThemeInitializer создан',
                themeAppliedFromCache: 'Тема применена из кеша',
                themeLoadedFromStorage: 'Тема загружена из storage',
                cacheReadError: 'Ошибка чтения темы из кеша',
                storageLoadError: 'Ошибка загрузки темы из storage',
                initError: 'Ошибка инициализации темы'
            }
        }
    },

    // Страница приложения
    app: {
        title: 'Mindful Web',
        subtitle: 'Отслеживайте своё внимание',
        
        // Секция статуса
        status: {
            connection: 'Подключение:',
            tracking: 'Отслеживание:',
            checking: 'Проверка...',
            online: 'Онлайн',
            offline: 'Офлайн',
            active: 'Активно',
            inactive: 'Неактивно',
            connectionSuccess: 'Подключено',
            connectionFailed: 'Нет связи',
            connectionError: 'Сбой связи'
        },
        
        // Секция статистики
        stats: {
            title: 'Активность за сегодня',
            eventsTracked: 'Событий отслежено:',
            domainsVisited: 'Посещено доменов:',
            queueSize: 'Размер очереди:'
        },
        
        // Кнопки
        buttons: {
            settings: 'Настройки',
            testConnection: 'Проверить подключение',
            testConnectionLoading: 'Проверка...',
            enableTracking: 'Включить отслеживание',
            disableTracking: 'Отключить отслеживание',
            trackingEnableLoading: 'Включение...',
            trackingDisableLoading: 'Отключение...'
        },
        
        // Уведомления
        notifications: {
            connectionSuccess: 'Подключение успешно!',
            connectionFailed: 'Ошибка подключения',
            connectionError: 'Ошибка теста подключения',
            initError: 'Ошибка инициализации',
            trackingEnabled: 'Отслеживание включено',
            trackingDisabled: 'Отслеживание отключено',
            trackingToggleError: 'Не удалось обновить состояние отслеживания'
        }
    },

    // Страница настроек
    options: {
        title: 'Mindful Web - Настройки',
        heading: 'Настройки Mindful Web',
        
        // Форма
        form: {
            backendUrlLabel: 'URL бэкенда:',
            backendUrlPlaceholder: 'http://localhost:8000/api/v1/events/send',
            backendUrlHelp: 'Введите URL конечной точки API вашего бэкенда Mindful Web',
            domainExceptionsLabel: 'Исключения доменов:',
            domainExceptionsPlaceholder: 'example.com',
            domainExceptionsHelp: 'Запросы на сервер не будут отправляться для этих доменов',
            domainExceptionsAdd: 'Добавить домен',
            domainExceptionsRemove: 'Удалить из списка исключений',
            domainExceptionsInvalid: 'Введите корректный домен (например, example.com)',
            domainExceptionsDuplicate: 'Этот домен уже добавлен в список исключений',
            domainExceptionsListLabel: 'Список исключённых доменов'
        },
        
        // Тема
        theme: {
            label: 'Тема:',
            light: 'Светлая',
            dark: 'Тёмная',
            toggleButton: 'Переключить тему'
        },
        
        // Кнопки
        buttons: {
            save: 'Сохранить настройки',
            saving: 'Сохранение...',
            reset: 'Сбросить настройки',
            resetting: 'Сброс...',
            runDiagnostics: 'Диагностика',
            analyzing: 'Анализ...',
            clearDiagnostics: 'Очистить',
            developerTools: 'Инструменты разработчика',
            showDeveloperTools: 'Показать инструменты разработчика',
            hideDeveloperTools: 'Скрыть инструменты разработчика',
            clearLogs: 'Очистить',
            copyLogs: 'Копировать'
        },
        
        // Диагностика
        diagnostics: {
            // Статусы
            status: 'Статус:',
            notRun: 'Не запущено',
            running: 'Проверка...',
            success: 'Успешно',
            failed: 'Ошибка',
            
            // Сообщения статусов
            statusOk: 'Все проверки пройдены',
            statusWarning: 'Обнаружены предупреждения',
            statusError: 'Некоторые проверки не прошли',
            statusUnknown: 'Неизвестный статус',
            
            // Метки таблицы
            labelTotal: 'Всего',
            labelSuccess: 'Успешно',
            labelWarnings: 'Предупреждения',
            labelTime: 'Время'
        },
        
        // Вкладки
        tabs: {
            logs: 'Логи',
            diagnostics: 'Диагностика',
            activity: 'Активность'
        },
        
        // Фильтры логов
        logsFilters: {
            levelLabel: 'Тип:',
            levelAll: 'ВСЕ',
            levelInfo: 'ИНФО',
            levelError: 'ОШИБКИ',
            classLabel: 'Класс:',
            classAll: 'Все',
            serverOnlyLabel: 'Только запросы на сервер',
            logsCounterLabel: 'Логов:'
        },
        
        // Статусные сообщения
        status: {
            loadError: 'Ошибка загрузки настроек',
            saveError: 'Ошибка сохранения настроек',
            resetError: 'Ошибка сброса настроек',
            uiUpdateError: 'Внимание: Обнаружена проблема обновления интерфейса',
            diagnosticsError: 'Ошибка диагностики',
            storageUnavailable: 'Storage API недоступен. Пожалуйста, перезагрузите расширение.',
            saveFailed: 'Не удалось проверить сохранение настроек. Попробуйте снова.',
            themeChanged: 'Тема успешно изменена!'
        },

        // Подробная активность
        activity: {
            title: 'Активность за сегодня',
            refresh: 'Обновить',
            labels: {
                eventsTracked: 'Событий отслежено:',
                activeEvents: 'Active событий:',
                inactiveEvents: 'Inactive событий:',
                domainsVisited: 'Посещено доменов:',
                queueSize: 'Размер очереди:',
                domainsTitle: 'Домены'
            },
            metricsTitle: 'Статистика',
            noDomains: 'Домены отсутствуют',
            lastUpdate: 'Обновлено:',
            refreshEvery: 'Автообновление:',
            axis: {
                unitEventsShort: 'соб'
            },
            ranges: {
                r1m: '1м',
                r5m: '5м',
                r15m: '15м',
                r30m: '30м',
                r1h: '1ч',
                r6h: '6ч',
                r1d: '1д'
            }
        },
        
        // Уведомления
        notifications: {
            logsClearedShort: 'Очищено',
            logsClearErrorShort: 'Ошибка',
            logsCopiedShort: 'Скопировано',
            logsCopyErrorShort: 'Ошибка'
        }
        
    },

    // Метки кнопок (соответствует структуре CONFIG)
    buttonLabels: {
        testConnection: {
            default: '🔍 Проверить подключение',
            loading: '🔍 Проверка...'
        },
        runDiagnostics: {
            default: '🔧 Запустить диагностику',
            loading: '🔧 Анализ...'
        },
        save: {
            default: 'Сохранить настройки',
            loading: 'Сохранение...'
        },
        reset: {
            default: 'Сбросить настройки',
            loading: 'Сброс...'
        }
    },

    // Сообщения валидации
    validation: {
        required: 'Это поле обязательно для заполнения',
        invalidUrl: 'Неверный формат URL. URL должен начинаться с http:// или https://',
        urlTooShort: 'URL слишком короткий',
        urlTooLong: 'URL слишком длинный'
    },

    // Консольные команды отладки
    console: {
        app: {
            title: 'Доступные команды для отладки:',
            main: 'Основные:',
            connection: 'Подключение:',
            statistics: 'Статистика:',
            commands: {
                getAppDiagnostics: 'Получить диагностическую информацию',
                runAppDiagnostics: 'Запустить полную диагностику',
                testAppConnection: 'Проверить подключение к серверу',
                getTrackingStatus: 'Получить статус отслеживания',
                getTodayStats: 'Получить статистику за сегодня',
                getDOMMetrics: 'Метрики производительности DOM',
                getNotificationStats: 'Статистика уведомлений'
            }
        },
        options: {
            title: 'Доступные команды для отладки:',
            main: 'Основные:',
            url: 'URL:',
            statuses: 'Статусы:',
            validation: 'Валидация:',
            commands: {
                getAllMetrics: 'Получить все метрики и статистику',
                getOptionsDiagnostics: 'Полная диагностика',
                validateManagersState: 'Проверить состояние менеджеров',
                getCurrentBackendUrl: 'Текущий URL',
                getDefaultBackendUrl: 'URL по умолчанию',
                isCurrentUrlValid: 'Проверить валидность URL',
                getStatusStatistics: 'Статистика статусов',
                getStatusHistory: 'История статусов',
                getStatusPerformanceMetrics: 'Метрики производительности',
                getValidationStatistics: 'Статистика валидаций',
                getValidationHistory: 'История валидаций',
                getValidationPerformanceMetrics: 'Метрики производительности'
            }
        }
    }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RU;
}

// Для использования в браузере
if (typeof window !== 'undefined') {
    window.LOCALE_RU = RU;
}
