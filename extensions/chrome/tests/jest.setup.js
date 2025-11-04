/**
 * Jest setup file для тестирования Chrome Extension
 * Настраивает DOM окружение и моки для Chrome API
 */

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <!-- App Manager elements -->
    <div id="connectionStatus"></div>
    <div id="trackingStatus"></div>
    <div id="eventsCount"></div>
    <div id="domainsCount"></div>
    <button id="openSettings"></button>
    <button id="testConnection"></button>
    <button id="reloadExtension"></button>
    <button id="runDiagnostics"></button>
    
    <!-- Options Manager elements -->
    <form id="settingsForm">
        <input type="text" id="backendUrl" value="" />
        <button type="submit" id="saveBtn">Save Settings</button>
        <button type="button" id="resetBtn">Reset to Default</button>
    </form>
    <div id="status"></div>
</body>
</html>
`, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

global.chrome = {
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
        },
        getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
        lastError: null
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
        },
        sync: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn(),
            clear: jest.fn()
        }
    },
    notifications: {
        create: jest.fn(),
        clear: jest.fn(),
        getAll: jest.fn()
    },
    tabs: {
        create: jest.fn(),
        update: jest.fn(),
        query: jest.fn()
    }
};

global.fetch = jest.fn();

// Подавление консольных логов во время тестов
// Сохраняем оригинальные методы
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
};

// Подавляем все логи кроме критических ошибок Jest
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // error оставляем, но можем фильтровать
    error: jest.fn((...args) => {
        // Показываем только реальные ошибки тестов, не от тестируемого кода
        const message = args[0]?.toString() || '';
        if (message.includes('Error:') && !message.includes('[')) {
            originalConsole.error(...args);
        }
    })
};

jest.useFakeTimers();

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    document.body.innerHTML = `
        <!-- App Manager elements -->
        <div id="connectionStatus"></div>
        <div id="trackingStatus"></div>
        <div id="eventsCount"></div>
        <div id="domainsCount"></div>
        <button id="openSettings"></button>
        <button id="testConnection"></button>
        <button id="reloadExtension"></button>
        <button id="runDiagnostics"></button>
        
        <!-- Options Manager elements -->
        <form id="settingsForm">
            <input type="text" id="backendUrl" value="" />
            <button type="submit" id="saveBtn">Save Settings</button>
            <button type="button" id="resetBtn">Reset to Default</button>
        </form>
        <div id="status"></div>
    `;
});
