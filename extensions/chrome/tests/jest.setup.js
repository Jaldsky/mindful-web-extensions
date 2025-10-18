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
    <div id="connectionStatus"></div>
    <div id="trackingStatus"></div>
    <div id="eventsCount"></div>
    <div id="domainsCount"></div>
    <div id="queueSize"></div>
    <button id="openSettings"></button>
    <button id="testConnection"></button>
    <button id="reloadExtension"></button>
    <button id="runDiagnostics"></button>
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

jest.useFakeTimers();

afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();

    document.body.innerHTML = `
        <div id="connectionStatus"></div>
        <div id="trackingStatus"></div>
        <div id="eventsCount"></div>
        <div id="domainsCount"></div>
        <div id="queueSize"></div>
        <button id="openSettings"></button>
        <button id="testConnection"></button>
        <button id="reloadExtension"></button>
        <button id="runDiagnostics"></button>
    `;
});
