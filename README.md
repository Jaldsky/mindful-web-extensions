# 🌐 Mindful Web Extensions
*Browser extensions for mindful internet tracking*

[![Chrome](https://img.shields.io/badge/Chrome-Extension-green)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![Privacy](https://img.shields.io/badge/Privacy-First-green)](https://github.com/Jaldsky/mindful-web)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)](extensions/chrome)
[![Coverage](https://img.shields.io/badge/Coverage-95%25-brightgreen)](extensions/chrome)

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
- 🌓 **Theme Support**: Light and dark themes with seamless switching
- 🌍 **Multilingual**: Full support for English and Russian languages

### 🇷🇺 Русский
- 🕒 **Отслеживание активности**: Автоматическое отслеживание переключений между вкладками
- 📊 **Анализ доменов**: Сбор статистики по посещаемым сайтам
- 🔄 **Офлайн-режим**: Сохранение данных локально при отсутствии интернета
- 📦 **Батчевая обработка**: Оптимизированная отправка данных на сервер
- 🔒 **Приватность**: Только домены, никогда полные URL или содержимое
- ⚙️ **Настраиваемость**: Настраиваемый URL бэкенда и параметры
- 🌓 **Поддержка тем**: Светлая и темная темы с плавным переключением
- 🌍 **Многоязычность**: Полная поддержка английского и русского языков

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
- **Node.js**: Version 14+ for building the extension

#### 2. Build Extension
```bash
cd extensions/chrome
npm install          # Install dependencies
npm run build        # Build the extension
```

This will create a `dist/` folder with the bundled extension files.

#### 3. Install Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner
3. Click **"Load unpacked"**
4. Select the folder `extensions/chrome/dist/`
5. Verify installation: Extension should appear in the list and auto-activate

#### 3. Configure
1. Click the extension icon in the toolbar
2. Click **"Settings"** to open the settings page
3. Change backend URL if needed (default: `http://localhost:8000/api/v1/events/send`)
4. Choose your preferred theme (☀️ Light or 🌙 Dark) using the theme toggle button
5. Select your language (🌐 EN or RU) using the language toggle button
6. Click **"Save Settings"**

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
- **Node.js**: Версия 14+ для сборки расширения

#### 2. Сборка расширения
```bash
cd extensions/chrome
npm install          # Установка зависимостей
npm run build        # Сборка расширения
```

Это создаст папку `dist/` с файлами расширения.

#### 3. Установка расширения
1. Откройте Chrome и перейдите в `chrome://extensions/`
2. Включите **"Режим разработчика"** (Developer mode) в правом верхнем углу
3. Нажмите **"Загрузить распакованное расширение"** (Load unpacked)
4. Выберите папку `extensions/chrome/dist/`
5. Проверьте установку: Расширение должно появиться в списке и автоматически активироваться

#### 4. Настройка
1. Кликните на иконку расширения в панели инструментов
2. Нажмите **"Settings"** для открытия страницы настроек
3. Измените URL бэкенда при необходимости (по умолчанию: `http://localhost:8000/api/v1/events/send`)
4. Выберите предпочитаемую тему (☀️ Светлая или 🌙 Тёмная) с помощью кнопки переключения темы
5. Выберите язык (🌐 EN или RU) с помощью кнопки переключения языка
6. Нажмите **"Сохранить настройки"**

#### 5. Проверка работы
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
- **Service Worker** (`tracker.js`): Main tracking logic
- **Popup** (`src/popup.js`): Entry point for popup interface
- **App Managers** (`src/app_manager/`): Modular manager classes
- **Options** (`options.js`): Settings page
- **Manifest V3**: Modern Chrome extensions standard
- **Webpack**: Module bundler for ES6 modules

#### Building
```bash
cd extensions/chrome

# Development build
npm run build

# Production build (minified)
npm run build:prod

# Watch mode (auto-rebuild)
npm run watch
```

#### Debugging
1. Open `chrome://extensions/`
2. Find the extension and click **"Inspect views: service worker"**
3. Use console to view logs
4. In popup, click **"Run Diagnostics"** for diagnostics
5. Use source maps for debugging bundled code

#### Code Quality & Pre-commit Hooks
This project uses automated code quality checks before every commit.

**🔍 What is checked:**
- ✅ **Tests** - All Jest tests must pass
- ✅ **Linter** - ESLint with auto-fix for code quality
- ✅ **Code style** - Automatic formatting corrections

**⚡ Pre-commit Hooks Setup (First Time):**

After cloning the repository, just run:
```bash
cd extensions/chrome
npm install
```

That's it! Hooks are configured automatically and will run on every commit.

> **Note:** In CI environments, hooks installation is automatically skipped.

**What happens on commit:**
1. 🧪 **npm test** - Runs all 1029 tests (~7 seconds)
2. 🔍 **npm run lint:fix** - Checks code quality and auto-fixes issues
3. ❌ **Blocks commit** if tests fail or linter finds errors
4. ✅ **Allows commit** if all checks pass (warnings are OK)

**Manual testing:**
```bash
# Run tests manually
cd extensions/chrome
npm test

# Run linter with auto-fix
npm run lint:fix

# Test pre-commit hook manually
cd ../..
.husky/pre-commit
```

**Commit from terminal (see full output):**
```bash
git add .
git commit -m "your message"

# You will see:
# ==========================================
# 🔍 PRE-COMMIT CHECKS
# ==========================================
# 🧪 Running tests...
# ✅ Tests passed
# 🔍 Running linter...
# ✅ All checks passed!
```

**Commit from WebStorm/IDE:**
- Open built-in Terminal (Alt+F12 / Option+F12)
- Use `git commit` commands there to see full output
- Or commit via IDE UI (output in Version Control → Console)

**Skip hooks (if urgently needed):**
```bash
# Skip hooks for one commit
git commit --no-verify -m "urgent fix"
```

### 🇷🇺 Русский

#### Архитектура
- **Service Worker** (`tracker.js`): Основная логика трекинга
- **Popup** (`popup.html/js`): Интерфейс для мониторинга статуса
- **Options** (`options.html/js`): Страница настроек
- **Manifest V3**: Современный стандарт расширений Chrome

#### Отладка
1. Откройте `chrome://extensions/`
2. Найдите расширение и нажмите **"Inspect views: service worker"**
3. Используйте консоль для просмотра логов
4. В popup нажмите **"Run Diagnostics"** для диагностики

#### Качество кода и Pre-commit хуки
Проект использует автоматизированные проверки качества кода перед каждым коммитом.

**🔍 Что проверяется:**
- ✅ **Тесты** - Все Jest тесты должны пройти
- ✅ **Линтер** - ESLint с автоисправлениями для качества кода
- ✅ **Стиль кода** - Автоматические исправления форматирования

**⚡ Настройка Pre-commit хуков (первый раз):**

После клонирования репозитория, просто выполните:
```bash
cd extensions/chrome
npm install
```

Всё! Хуки настраиваются автоматически и будут запускаться при каждом коммите.

> **Примечание:** В CI окружениях установка хуков автоматически пропускается.

**Что происходит при коммите:**
1. 🔍 ESLint проверяет измененные JavaScript файлы
2. 🔧 Автоматически исправляет проблемы форматирования где возможно
3. ❌ Блокирует коммит если остались критические ошибки
4. ✅ Разрешает коммит если все проверки пройдены

**Ручное тестирование:**
```bash
# Запуск тестов вручную
cd extensions/chrome
npm test

# Запуск линтера с автоисправлением
npm run lint:fix

# Тестирование pre-commit хука вручную
cd ../..
.husky/pre-commit
```

**Коммит через терминал (виден полный вывод):**
```bash
git add .
git commit -m "ваше сообщение"

# Вы увидите:
# ==========================================
# 🔍 PRE-COMMIT CHECKS
# ==========================================
# 🧪 Running tests...
# ✅ Tests passed
# 🔍 Running linter...
# ✅ All checks passed!
```

**Коммит через WebStorm/IDE:**
- Откройте встроенный Terminal (Alt+F12 / Option+F12)
- Используйте команды `git commit` там для полного вывода
- Или коммитьте через UI IDE (вывод в Version Control → Console)

**Пропустить хуки (если срочно нужно):**
```bash
# Пропустить хуки для одного коммита
git commit --no-verify -m "срочный фикс"
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

#### Automated Testing
```bash
# Install dependencies
cd extensions/chrome
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Code Quality Checks
```bash
# Run ESLint manually
cd extensions/chrome
npm run lint

# Run ESLint with auto-fix
npm run lint:fix

# Test pre-commit hook manually
.husky/pre-commit

# Check code quality before commit
git add .
git commit -m "your message"  # Pre-commit hooks run automatically
```

#### Manual Testing
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Load the extension from `extensions/chrome/`
4. Use the popup to monitor status
5. Open `extensions/chrome/tests/test-runner.html` for interactive testing
6. Check browser console for logs

### 🇷🇺 Русский

#### Автоматизированное тестирование
```bash
# Установка зависимостей
cd extensions/chrome
npm install

# Запуск всех тестов
npm test

# Тесты с покрытием кода
npm run test:coverage

# Тесты в режиме наблюдения
npm run test:watch
```

#### Проверки качества кода
```bash
# Запуск ESLint вручную
cd extensions/chrome
npm run lint

# Запуск ESLint с автоисправлением
npm run lint:fix

# Тестирование pre-commit хука вручную
.husky/pre-commit

# Проверка качества кода перед коммитом
git add .
git commit -m "your message"  # Pre-commit хуки запускаются автоматически
```

#### Ручное тестирование
1. Откройте `chrome://extensions/`
2. Включите режим разработчика
3. Загрузите расширение из `extensions/chrome/`
4. Используйте popup для мониторинга статуса
5. Откройте `extensions/chrome/tests/test-runner.html` для интерактивного тестирования
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

