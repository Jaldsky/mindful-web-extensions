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
            runDiagnostics: 'Запустить диагностику',
            analyzing: 'Анализ...',
            developerTools: 'Инструменты разработчика',
            showDeveloperTools: 'Показать инструменты разработчика',
            hideDeveloperTools: 'Скрыть инструменты разработчика',
            clearLogs: 'Очистить',
            copyLogs: 'Копировать'
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
        },
        
        // Диагностика
        diagnostics: {
            statusOk: 'Все проверки пройдены',
            statusWarning: 'Обнаружены предупреждения',
            statusError: 'Обнаружены ошибки',
            statusUnknown: 'Неизвестный статус',
            labelTotal: 'Всего',
            labelSuccess: 'Успешно',
            labelWarnings: 'Предупреждения',
            labelErrors: 'Ошибки',
            labelTime: 'Время'
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
