/**
 * @jest-environment jsdom
 */

const DeveloperToolsManager = require('../../../../src/managers/options/diagnostics/DeveloperToolsManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('DeveloperToolsManager', () => {
    const setupDOM = () => {
        document.body.innerHTML = `
            <div id="developerToolsContent" style="display: none"></div>
            <div id="developerToolsIcon"></div>
            <button id="toggleDeveloperTools"></button>
            <div id="devToolsPanel" style="display: none"></div>
            <div class="dev-tab" data-tab="logs"></div>
            <div class="dev-tab" data-tab="diagnostics"></div>
            <div class="tab-content" id="logsTabContent"></div>
            <div class="tab-content" id="diagnosticsTabContent"></div>
        `;

        const panel = document.getElementById('devToolsPanel');
        panel.scrollIntoView = jest.fn();
    };

    const createEnvironment = () => {
        setupDOM();
        const manager = createBaseOptionsManager();
        manager.logsManager = {
            loadLogs: jest.fn(),
            startAutoRefresh: jest.fn(),
            stopAutoRefresh: jest.fn()
        };

        const storage = {};
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
            return key in storage ? storage[key] : null;
        });
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
            storage[key] = value;
        });

        return { manager, developerToolsManager: new DeveloperToolsManager(manager) };
    };

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    test('toggle переключает состояние и сохраняет выбор', () => {
        jest.useFakeTimers();
        const { developerToolsManager } = createEnvironment();
        const content = document.getElementById('developerToolsContent');

        developerToolsManager.toggle();
        expect(content.style.display).toBe('flex');

        developerToolsManager.toggle();
        jest.advanceTimersByTime(500);
        expect(content.style.display).toBe('none');
        expect(window.localStorage.setItem).toHaveBeenCalled();
    });

    test('openPanel включает автообновление логов и делает панель видимой', async () => {
        jest.useFakeTimers();
        const { manager, developerToolsManager } = createEnvironment();

        developerToolsManager.openPanel('logs');
        jest.runOnlyPendingTimers();
        await Promise.resolve();

        expect(manager.logsManager.loadLogs).toHaveBeenCalled();
        expect(manager.logsManager.startAutoRefresh).toHaveBeenCalled();
        expect(document.getElementById('devToolsPanel').style.display).toBe('block');
    });

    test('closePanel отключает автообновление логов', async () => {
        jest.useFakeTimers();
        const { manager, developerToolsManager } = createEnvironment();

        developerToolsManager.openPanel('logs');
        jest.runOnlyPendingTimers();
        await Promise.resolve();

        developerToolsManager.closePanel();
        jest.advanceTimersByTime(300);
        await Promise.resolve();

        expect(manager.logsManager.stopAutoRefresh).toHaveBeenCalled();
        expect(document.getElementById('devToolsPanel').style.display).toBe('none');
    });
});
