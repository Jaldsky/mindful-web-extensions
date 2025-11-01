/**
 * @jest-environment jsdom
 */

const LogsManager = require('../../../src/managers/options/LogsManager.js');
const { createBaseOptionsManager } = require('./options-test-helpers.js');

describe('LogsManager', () => {
    let originalClipboard;
    let originalChrome;
    let originalGetSelection;

    const setupDOM = () => {
        document.body.innerHTML = `
            <div id="logsContent"></div>
            <select id="logsClassFilter"></select>
            <div id="logsCounter"></div>
            <button class="logs-filter-btn" data-filter-level="info"></button>
            <button class="logs-filter-btn" data-filter-level="error"></button>
        `;
    };

    const createEnvironment = (logs = []) => {
        setupDOM();
        const manager = createBaseOptionsManager();
        manager.statusManager.showSuccess.mockReturnValue(true);
        manager.statusManager.showError.mockReturnValue(true);
        manager.localeManager.t.mockImplementation((key) => ({
            'options.notifications.logsCleared': 'Logs cleared successfully',
            'options.notifications.logsClearError': 'Error clearing logs',
            'options.notifications.logsCopied': 'Logs copied to clipboard',
            'options.notifications.logsCopyError': 'Error copying logs',
            'options.logsFilters.classAll': 'All Classes'
        }[key] || key));

        global.chrome.storage.local.get.mockResolvedValue({ mindful_logs: logs });
        global.chrome.storage.local.set.mockResolvedValue();

        return { manager, logsManager: new LogsManager(manager) };
    };

    beforeEach(() => {
        document.body.innerHTML = '';

        if (!global.navigator) {
            global.navigator = {};
        }
        originalClipboard = global.navigator.clipboard;
        global.navigator.clipboard = {
            writeText: jest.fn().mockResolvedValue()
        };

        originalChrome = global.chrome;
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            }
        };

        originalGetSelection = window.getSelection;
        window.getSelection = jest.fn(() => ({ toString: () => '' }));
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();

        if (originalClipboard) {
            global.navigator.clipboard = originalClipboard;
        } else {
            delete global.navigator.clipboard;
        }

        if (originalChrome === undefined) {
            delete global.chrome;
        } else {
            global.chrome = originalChrome;
        }

        if (originalGetSelection) {
            window.getSelection = originalGetSelection;
        } else {
            delete window.getSelection;
        }
    });

    test('setLevelFilter активирует выбранную кнопку и запускает загрузку логов', async () => {
        const { logsManager } = createEnvironment();
        const loadSpy = jest.spyOn(logsManager, 'loadLogs').mockResolvedValue();

        logsManager.setLevelFilter('error');

        expect(loadSpy).toHaveBeenCalled();
        const buttons = Array.from(document.querySelectorAll('.logs-filter-btn'));
        expect(buttons[1].classList.contains('active')).toBe(true);
        loadSpy.mockRestore();
    });

    test('loadLogs получает данные из chrome.storage и обновляет DOM', async () => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            className: 'TestClass',
            message: 'Test message'
        };
        const { logsManager } = createEnvironment([logEntry]);

        await logsManager.loadLogs();

        expect(global.chrome.storage.local.get).toHaveBeenCalledWith(['mindful_logs']);
        expect(document.getElementById('logsContent').innerHTML).toContain('Test message');
        expect(document.getElementById('logsCounter').textContent).toBe('1 / 1000');
    });

    test('clearLogs очищает логи и показывает статус успеха', async () => {
        const { manager, logsManager } = createEnvironment();

        await logsManager.clearLogs();

        expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ mindful_logs: [] });
        expect(manager.statusManager.showSuccess).toHaveBeenCalledWith('Logs cleared successfully');
        expect(document.getElementById('logsCounter').textContent).toBe('0 / 1000');
    });

    test('copyLogs копирует содержимое и уведомляет пользователя', async () => {
        const { manager, logsManager } = createEnvironment();
        const logsContent = document.getElementById('logsContent');
        logsContent.textContent = 'Sample logs';

        await logsManager.copyLogs();

        expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('Sample logs');
        expect(manager.statusManager.showSuccess).toHaveBeenCalledWith('Logs copied to clipboard');
    });
});
