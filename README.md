# 🌐 Mindful Web Extensions
*Browser extensions for mindful internet tracking*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-green)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![Privacy](https://img.shields.io/badge/Privacy-First-green)](https://github.com/Jaldsky/mindful-web)

> **Mindful Web Extensions** — browser extensions for tracking internet activity and restoring control over your attention.

---

## 🌍 About / О проекте

### 🇬🇧 English
Mindful Web Extensions is a set of browser extensions that help track your internet activity. The extension works in the background and collects data about tab switching, domains you visit, and activity time. All data is stored locally first and sent to your backend in batches for optimal performance.

### 🇷🇺 Русский
Mindful Web Extensions — это набор расширений для браузеров, которые помогают отслеживать активность пользователя в интернете. Расширение работает в фоновом режиме и собирает данные о переключении между вкладками, доменах, которые вы посещаете, и времени активности. Все данные сначала сохраняются локально и отправляются на ваш бэкенд батчами для оптимальной производительности.

## ✨ Features / Возможности

### 🇬🇧 English
- 🕒 **Activity Tracking**: Automatic tracking of tab switching and focus changes
- 📊 **Domain Analysis**: Statistics collection for visited websites
- 🔄 **Offline Mode**: Local data storage when internet is unavailable
- 📦 **Batch Processing**: Optimized data sending to server
- 🔒 **Privacy-First**: Only domains, never full URLs or content
- ⚙️ **Configurable**: Customizable backend URL and settings

### 🇷🇺 Русский
- 🕒 **Отслеживание активности**: Автоматическое отслеживание переключений между вкладками
- 📊 **Анализ доменов**: Сбор статистики по посещаемым сайтам
- 🔄 **Офлайн-режим**: Сохранение данных локально при отсутствии интернета
- 📦 **Батчевая обработка**: Оптимизированная отправка данных на сервер
- 🔒 **Приватность**: Только домены, никогда полные URL или содержимое
- ⚙️ **Настраиваемость**: Настраиваемый URL бэкенда и параметры

## 🛠️ Tech Stack / Технологии

- **Browser**: Chrome 88+ with Manifest V3 support
- **Storage**: Chrome Storage API for local data persistence
- **Background**: Service Worker for background processing
- **UI**: HTML/CSS/JavaScript for popup and options pages
- **API**: RESTful communication with FastAPI backend

---

## 🚀 Quick Start / Быстрый старт

### 🇬🇧 English

#### 1. Prerequisites
- **Backend Server**: Ensure your FastAPI backend is running on `http://localhost:8000`
- **API Endpoint**: Must be available `POST /api/v1/events/send`
- **Chrome Browser**: Version 88+ with Manifest V3 support

#### 2. Install Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner
3. Click **"Load unpacked"**
4. Select the folder `extensions/сhrome_extension/`
5. Verify installation: Extension should appear in the list and auto-activate

#### 3. Configure
1. Click the extension icon in the toolbar
2. Click **"Settings"** to open the settings page
3. Change backend URL if needed (default: `http://localhost:8000/api/v1/events/send`)
4. Click **"Save Settings"**

#### 4. Test
1. In the popup, ensure status shows **"Connection: Online"**
2. Click **"Test Connection"** to verify backend communication
3. Open several tabs and switch between them
4. Watch the **"Events tracked"** counter increase in the popup

### 🇷🇺 Русский

#### 1. Предварительные требования
- **Бэкенд сервер**: Убедитесь, что ваш FastAPI бэкенд запущен на `http://localhost:8000`
- **Эндпоинт API**: Должен быть доступен `POST /api/v1/events/send`
- **Chrome браузер**: Версия 88+ с поддержкой Manifest V3

#### 2. Установка расширения
1. Откройте Chrome и перейдите в `chrome://extensions/`
2. Включите **"Режим разработчика"** (Developer mode) в правом верхнем углу
3. Нажмите **"Загрузить распакованное расширение"** (Load unpacked)
4. Выберите папку `extensions/сhrome_extension/`
5. Проверьте установку: Расширение должно появиться в списке и автоматически активироваться

#### 3. Настройка
1. Кликните на иконку расширения в панели инструментов
2. Нажмите **"Settings"** для открытия страницы настроек
3. Измените URL бэкенда при необходимости (по умолчанию: `http://localhost:8000/api/v1/events/send`)
4. Нажмите **"Save Settings"**

#### 4. Проверка работы
1. В popup расширения убедитесь, что статус **"Connection: Online"**
2. Нажмите **"Test Connection"** для проверки связи с бэкендом
3. Откройте несколько вкладок и переключайтесь между ними
4. Следите за увеличением счетчика **"Events tracked"** в popup

---

## 📊 How It Works / Как это работает

### 🇬🇧 English

#### Event Tracking
The extension tracks the following events:
- **`active`**: When a tab becomes active
- **`inactive`**: When a tab loses focus
- **`tab_removed`**: When a tab is closed
- **`window_focus`**: When browser window gains/loses focus

#### Data Format
Events are sent in the following format:

```json
{
  "data": [
    {
      "event": "active",
      "domain": "example.com",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Batch Processing
- Events accumulate locally in a queue
- Sending occurs in batches of 10 events or every 30 seconds
- Data is stored locally when internet is unavailable
- Queue is automatically processed when connection is restored

### 🇷🇺 Русский

#### Отслеживание событий
Расширение отслеживает следующие события:
- **`active`**: Когда вкладка становится активной
- **`inactive`**: Когда вкладка теряет фокус
- **`tab_removed`**: Когда вкладка закрывается
- **`window_focus`**: Когда окно браузера получает/теряет фокус

#### Формат данных
События отправляются в следующем формате:

```json
{
  "data": [
    {
      "event": "active",
      "domain": "example.com",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Батчевая обработка
- События накапливаются локально в очереди
- Отправка происходит батчами по 10 событий или каждые 30 секунд
- При отсутствии интернета данные сохраняются локально
- При восстановлении соединения очередь автоматически обрабатывается

---

## 🛠️ Development / Разработка

### 🇬🇧 English

#### Architecture
- **Service Worker** (`background.js`): Main tracking logic
- **Popup** (`popup.html/js`): Interface for status monitoring
- **Options** (`options.html/js`): Settings page
- **Manifest V3**: Modern Chrome extensions standard

#### Debugging
1. Open `chrome://extensions/`
2. Find the extension and click **"Inspect views: service worker"**
3. Use console to view logs
4. In popup, click **"Run Diagnostics"** for diagnostics

#### File Structure
```
сhrome_extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── popup.html            # Popup interface
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings functionality
└── test.html             # Testing page
```

### 🇷🇺 Русский

#### Архитектура
- **Service Worker** (`background.js`): Основная логика трекинга
- **Popup** (`popup.html/js`): Интерфейс для мониторинга статуса
- **Options** (`options.html/js`): Страница настроек
- **Manifest V3**: Современный стандарт расширений Chrome

#### Отладка
1. Откройте `chrome://extensions/`
2. Найдите расширение и нажмите **"Inspect views: service worker"**
3. Используйте консоль для просмотра логов
4. В popup нажмите **"Run Diagnostics"** для диагностики

#### Структура файлов
```
сhrome_extension/
├── manifest.json          # Конфигурация расширения
├── background.js          # Service worker (основная логика)
├── popup.html            # Интерфейс popup
├── popup.js              # Функциональность popup
├── options.html          # Страница настроек
├── options.js            # Функциональность настроек
└── test.html             # Страница тестирования
```

---

## 🔒 Privacy & Security / Приватность и безопасность

### 🇬🇧 English
- **Local Storage**: All data is stored locally first
- **User Control**: User can configure backend URL
- **Minimal Permissions**: Extension requests only necessary permissions
- **No Scripts**: Does not inject code into web pages
- **Domain Only**: Tracks only domains, never full URLs or content

### 🇷🇺 Русский
- **Локальное хранение**: Все данные сначала сохраняются локально
- **Контроль пользователя**: Пользователь может настроить URL бэкенда
- **Минимальные разрешения**: Расширение запрашивает только необходимые разрешения
- **Без скриптов**: Не внедряет код на веб-страницы
- **Только домены**: Отслеживает только домены, никогда полные URL или содержимое

## 📝 Permissions / Разрешения

The extension uses the following permissions:
- `tabs`: For tracking tab activity
- `storage`: For local data storage
- `activeTab`: For getting current tab information
- `host_permissions`: For sending data to configured backend

---

## 🧪 Testing / Тестирование

### 🇬🇧 English
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Load the extension
4. Use the popup to monitor status
5. Open `test.html` for additional testing
6. Check browser console for logs

### 🇷🇺 Русский
1. Откройте `chrome://extensions/`
2. Включите режим разработчика
3. Загрузите расширение
4. Используйте popup для мониторинга статуса
5. Откройте `test.html` для дополнительного тестирования
6. Проверьте консоль браузера для просмотра логов

---

## 🤝 Contributing / Вклад в проект

### 🇬🇧 English
We welcome contributions to the project! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test them
4. Create a Pull Request with a description of changes

### 🇷🇺 Русский
Мы приветствуем вклад в развитие проекта! Пожалуйста:

1. Создайте форк репозитория
2. Создайте ветку для вашей функции: `git checkout -b feature/amazing-feature`
3. Внесите изменения и протестируйте их
4. Создайте Pull Request с описанием изменений

---

## 📄 License / Лицензия

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Mindful Web Extensions** — restore control over your attention in the digital world! 🧘‍♀️
