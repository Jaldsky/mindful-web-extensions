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
        no: 'Нет'
    },

    // Логи (для внутреннего логирования, INFO/ERROR)
    logs: {
        app: {
            initStart: 'Начало инициализации AppManager',
            initSuccess: 'AppManager инициализирован (без периодических обновлений)',
            initError: 'Ошибка инициализации AppManager',
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
            localeChanged: 'Локаль изменена'
        },
        diagnostics: {
            resultsHeader: 'Результаты диагностики',
            overall: 'Общий статус',
            duration: 'Время выполнения (мс)',
            startedAt: 'Время запуска',
            generalError: 'Общая ошибка диагностики',
            checkLine: '{emoji} {name}:',
            checkError: 'Ошибка в проверке: {name}'
        },
        notification: {
            warnMessageRequired: 'message обязателен и должен быть строкой',
            warnInvalidType: 'Неверный тип "{type}", используется INFO'
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
            inactive: 'Неактивно'
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
            testConnectionLoading: 'Проверка...'
        },
        
        // Уведомления
        notifications: {
            connectionSuccess: 'Подключение успешно!',
            connectionFailed: 'Ошибка подключения',
            connectionError: 'Ошибка теста подключения',
            initError: 'Ошибка инициализации'
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
            backendUrlHelp: 'Введите URL конечной точки API вашего бэкенда Mindful Web'
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
            diagnostics: 'Диагностика'
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
            settingsSaved: 'Настройки успешно сохранены!',
            settingsReset: 'Настройки сброшены к значениям по умолчанию',
            loadError: 'Ошибка загрузки настроек',
            saveError: 'Ошибка сохранения настроек',
            resetError: 'Ошибка сброса настроек',
            uiUpdateError: 'Внимание: Обнаружена проблема обновления интерфейса',
            diagnosticsError: 'Ошибка диагностики',
            storageUnavailable: 'Storage API недоступен. Пожалуйста, перезагрузите расширение.',
            saveFailed: 'Не удалось проверить сохранение настроек. Попробуйте снова.',
            themeChanged: 'Тема успешно изменена!'
        },
        
        // Уведомления
        notifications: {
            logsCleared: 'Логи успешно очищены',
            logsClearError: 'Ошибка очистки логов',
            logsCopied: 'Логи скопированы в буфер обмена',
            logsCopyError: 'Ошибка копирования логов'
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
