# 🌐 Mindful Web Extensions
*Browser extensions for mindful internet tracking*

[![Chrome](https://img.shields.io/badge/Chrome-Extension-green)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![Tests](https://img.shields.io/badge/Tests-1861_Passing-brightgreen)](extensions/chrome)
[![Coverage](https://img.shields.io/badge/Coverage-95%25-brightgreen)](extensions/chrome)

> Browser extension for tracking internet activity and restoring control over your attention.

## 🔗 Project Links

| Component | Repository | Description |
|-----------|-----------|-------------|
| 🔌 **Extensions** | [mindful-web-extensions](https://github.com/Jaldsky/mindful-web-extensions) | Browser extensions (Chrome) |
| ⚙️ **Backend** | [mindful-web-backend](https://github.com/Jaldsky/mindful-web-backend) | FastAPI backend server |
| 🖥️ **Frontend** | [mindful-web-frontend](https://github.com/Jaldsky/mindful-web-frontend) | React dashboard and analytics |

---

## 📥 Installing the latest release (for users)

Install the extension from the official release package. No developer tools or command line required.

### English

1. **Open the releases page**
   - Go to: [Releases · Mindful Web Extensions](https://github.com/Jaldsky/mindful-web-extensions/releases) (or your repo’s **Releases** tab).
   - Find the latest release (e.g. **v1.3.2**).

2. **Download the extension archive**
   - Under **Assets**, click **`chrome-v1.3.2.zip`** (the name includes the version number).
   - The file will download to your computer (usually to the **Downloads** folder).

3. **Unzip the archive**
   - Locate the downloaded file (e.g. `chrome-v1.3.2.zip`).
   - **Double‑click** it to open, or right‑click → **Open**.
   - You should see a **folder** inside (e.g. `chrome-v1.3.2`). **Extract / unzip** that folder to a place you’ll remember (e.g. **Desktop** or **Documents**).
   - On Windows: right‑click the zip → **Extract All** → choose a folder.
   - On macOS: double‑click the zip; a folder with the same name will appear next to it.

4. **Open Chrome’s extensions page**
   - Open **Google Chrome**.
   - In the address bar type: `chrome://extensions` and press **Enter**.

5. **Enable Developer mode**
   - On the **extensions** page, find the switch in the top‑right named **Developer mode** and turn it **ON**.

6. **Load the extension**
   - Click the **Load unpacked** button (top‑left area).
   - In the window that opens, select the **folder** you unzipped (e.g. `chrome-v1.3.2`), then click **Select folder** (or **Open**).
   - The Mindful Web extension should appear in the list and its icon in the Chrome toolbar.

7. **Pin the icon (optional)**
   - Click the **puzzle piece** icon in the toolbar → find **Mindful Web** → click the **pin** icon so the extension is always visible.

You’re done. Click the extension icon to open it and sign in or use it anonymously.

---

### Русский

1. **Откройте страницу релизов**
   - Перейдите по ссылке: [Releases · Mindful Web Extensions](https://github.com/Jaldsky/mindful-web-extensions/releases) (или вкладка **Releases** вашего репозитория).
   - Найдите последний релиз (например, **v1.3.2**).

2. **Скачайте архив расширения**
   - В блоке **Assets** нажмите на **`chrome-v1.3.2.zip`** (в названии указана версия).
   - Файл сохранится на компьютер (обычно в папку **Загрузки**).

3. **Распакуйте архив**
   - Найдите скачанный файл (например, `chrome-v1.3.2.zip`).
   - **Дважды щёлкните** по нему или нажмите правой кнопкой → **Открыть**.
   - Внутри должна быть **папка** (например, `chrome-v1.3.2`). **Распакуйте** её в удобное место (например, **Рабочий стол** или **Документы**).
   - В Windows: правая кнопка по zip → **Извлечь все** → укажите папку.
   - В macOS: дважды щёлкните по zip — рядом появится папка с тем же именем.

4. **Откройте страницу расширений Chrome**
   - Запустите **Google Chrome**.
   - В адресной строке введите: `chrome://extensions` и нажмите **Enter**.

5. **Включите режим разработчика**
   - На странице **Расширения** справа сверху найдите переключатель **Режим разработчика** и включите его.

6. **Загрузите расширение**
   - Нажмите кнопку **Загрузить распакованное расширение** (слева сверху).
   - В открывшемся окне выберите **папку**, которую распаковали (например, `chrome-v1.3.2`), затем нажмите **Выбор папки** (или **Открыть**).
   - Расширение Mindful Web появится в списке, а его значок — на панели Chrome.

7. **Закрепите значок (по желанию)**
   - Нажмите на иконку **пазла** на панели → найдите **Mindful Web** → нажмите **булавку**, чтобы значок всегда был виден.

Готово. Нажмите на значок расширения, чтобы открыть его и войти в аккаунт или использовать анонимно.

---

## ✨ Key Features

- 🔐 **Authentication** — Token-based auth with login/registration
- 🔗 **SSO** — One session for site and extension
- 👋 **Onboarding** — Welcome screen for new users
- 📊 **Activity Dashboard** — Real-time statistics and activity charts
- 🔌 **Connection Monitor** — Interactive backend status checking
- 🛑 **Tracking Control** — Enable/disable with one click
- 🚫 **Domain Exceptions** — Exclude specific sites from tracking
- 🌓 **Themes** — Light and dark mode
- 🌍 **i18n** — English and Russian localization
- 🔒 **Privacy-First** — Only domains, never full URLs

---

## 🚀 Quick Start (developers)

### 1. Prerequisites
- Chrome 88+ with Manifest V3
- FastAPI backend running on `http://localhost:8000`
- Web frontend running on `http://localhost:5173` (or your configured URL)

### 2. Build & Install
```bash
cd extensions/chrome
npm install
npm run build
```

### 3. First Launch
1. Click extension icon
2. Choose **"Try Without Login"** (anonymous) or **"Login"** (with account)
3. Open the web frontend — you will be **automatically** in the same auth state (anonymous or logged in) thanks to shared cookies
4. Configure settings, manage domain exceptions
5. Start tracking!

---

## 🛠️ Development

### Tech Stack
- **Chrome Manifest V3**, Service Worker, Storage API
- **Cookie-based SSO** with FastAPI backend and React frontend
- **Modular Architecture**: Core, Handlers, Queue, Tracking modules
- **Testing**: Jest (1861 tests, 95%+ coverage)
- **Code Quality**: ESLint, Pre-commit hooks

### Build Commands
```bash
cd extensions/chrome

npm install           # Install dependencies
npm run build         # Development build
npm run build:prod    # Production build
npm run watch         # Watch mode

npm test              # Run tests
npm run test:coverage # Coverage report
npm run lint:fix      # Fix linting issues
```

### Pre-commit Hooks
Automatically runs on every commit:
- ✅ All tests must pass
- ✅ ESLint checks and auto-fixes
- ❌ Blocks commit if checks fail

```bash
# Skip hooks if urgently needed
git commit --no-verify -m "urgent fix"
```
---

---

## 🔒 Privacy & Security

- **Secure Auth** — HttpOnly cookie-based sessions; access/anonymous
- **SSO** — Sign in once in the extension or on the web — you're automatically signed in on the other
- **Local-First** — All data stored locally before sending
- **Anonymous Mode** — Use without account
- **Domain Only** — Never tracks full URLs or content
- **User Control** — Enable/disable tracking, manage exceptions
- **Minimal Permissions** — Only necessary browser permissions

---

## 📝 Data Format

Events sent to backend:
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

**Event Types:** `active`, `inactive`

**Batch Processing:** Every 30 seconds, offline queue, automatic retry with limits

---

<div align="center">

**[🔌 Extensions](https://github.com/Jaldsky/mindful-web-extensions)** • **[🖥️ Frontend](https://github.com/Jaldsky/mindful-web-frontend)** • **[⚙️ Backend](https://github.com/Jaldsky/mindful-web-backend)**

Restore control over your attention! 🧘‍♀️

</div>
