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

## ✨ Key Features

- 🔐 **Authentication** — Token-based auth with login/registration
- 👋 **Onboarding** — Welcome screen for new users
- 📊 **Activity Dashboard** — Real-time statistics and activity charts
- 🔌 **Connection Monitor** — Interactive backend status checking
- 🛑 **Tracking Control** — Enable/disable with one click
- 🚫 **Domain Exceptions** — Exclude specific sites from tracking
- 🌓 **Themes** — Light and dark mode
- 🌍 **i18n** — English and Russian localization
- 🔒 **Privacy-First** — Only domains, never full URLs

---

## 🚀 Quick Start

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
