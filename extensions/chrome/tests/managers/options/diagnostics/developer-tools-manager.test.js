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

    describe('toggle обработка ошибок', () => {
        test('обрабатывает отсутствие элементов', () => {
            document.body.innerHTML = '';
            const manager = createBaseOptionsManager();
            const developerToolsManager = new DeveloperToolsManager(manager);

            developerToolsManager.toggle();

            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.developerTools.elementsNotFound' })
            );
        });

        test('обрабатывает ошибки при переключении', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const developerToolsManager = new DeveloperToolsManager(manager);
            const content = document.getElementById('developerToolsContent');
            Object.defineProperty(content, 'style', {
                get: () => { throw new Error('Style error'); }
            });

            developerToolsManager.toggle();

            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('restoreState', () => {
        test('восстанавливает состояние из localStorage', () => {
            const { developerToolsManager } = createEnvironment();
            localStorage.setItem('mindful_developer_tools_expanded', 'true');

            developerToolsManager.restoreState();

            const content = document.getElementById('developerToolsContent');
            expect(content.style.display).toBe('flex');
        });

        test('скрывает панель если не расширена', () => {
            const { developerToolsManager } = createEnvironment();
            localStorage.setItem('mindful_developer_tools_expanded', 'false');

            developerToolsManager.restoreState();

            const content = document.getElementById('developerToolsContent');
            expect(content.style.display).toBe('none');
        });

        test('обрабатывает отсутствие элементов', () => {
            document.body.innerHTML = '';
            const manager = createBaseOptionsManager();
            const developerToolsManager = new DeveloperToolsManager(manager);

            expect(() => developerToolsManager.restoreState()).not.toThrow();
        });

        test('обрабатывает ошибки при восстановлении', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const developerToolsManager = new DeveloperToolsManager(manager);
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage error');
            });

            developerToolsManager.restoreState();

            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('openPanel дополнительные сценарии', () => {
        test('обрабатывает отсутствие панели', () => {
            document.body.innerHTML = '';
            const manager = createBaseOptionsManager();
            manager.logsManager = {
                loadLogs: jest.fn(),
                startAutoRefresh: jest.fn()
            };
            const developerToolsManager = new DeveloperToolsManager(manager);

            developerToolsManager.openPanel();

            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.developerTools.panelNotFound' })
            );
        });

        test('открывает панель с вкладкой diagnostics', () => {
            const { manager, developerToolsManager } = createEnvironment();
            const switchTabSpy = jest.spyOn(developerToolsManager, 'switchTab');

            developerToolsManager.openPanel('diagnostics');

            expect(switchTabSpy).toHaveBeenCalledWith('diagnostics');
            expect(manager.logsManager.loadLogs).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибки при открытии', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsManager = {
                loadLogs: jest.fn(),
                startAutoRefresh: jest.fn()
            };
            const developerToolsManager = new DeveloperToolsManager(manager);
            const panel = document.getElementById('devToolsPanel');
            Object.defineProperty(panel, 'style', {
                get: () => { throw new Error('Style error'); }
            });

            developerToolsManager.openPanel();

            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('closePanel обработка ошибок', () => {
        test('обрабатывает отсутствие панели', () => {
            document.body.innerHTML = '';
            const manager = createBaseOptionsManager();
            manager.logsManager = {
                stopAutoRefresh: jest.fn()
            };
            const developerToolsManager = new DeveloperToolsManager(manager);

            developerToolsManager.closePanel();

            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.developerTools.panelNotFound' })
            );
        });

        test('обрабатывает ошибки при закрытии', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsManager = {
                stopAutoRefresh: jest.fn()
            };
            const developerToolsManager = new DeveloperToolsManager(manager);
            const panel = document.getElementById('devToolsPanel');
            Object.defineProperty(panel, 'classList', {
                get: () => { throw new Error('ClassList error'); }
            });

            developerToolsManager.closePanel();

            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('switchTab', () => {
        test('переключает вкладку на logs', () => {
            const { manager, developerToolsManager } = createEnvironment();

            developerToolsManager.switchTab('logs');

            const activeTab = document.querySelector('[data-tab="logs"]');
            const activeContent = document.getElementById('logsTabContent');
            expect(activeTab.classList.contains('active')).toBe(true);
            expect(activeContent.classList.contains('active')).toBe(true);
            expect(manager.logsManager.loadLogs).toHaveBeenCalled();
            expect(manager.logsManager.startAutoRefresh).toHaveBeenCalled();
        });

        test('переключает вкладку на diagnostics', () => {
            const { manager, developerToolsManager } = createEnvironment();

            developerToolsManager.switchTab('diagnostics');

            const activeTab = document.querySelector('[data-tab="diagnostics"]');
            const activeContent = document.getElementById('diagnosticsTabContent');
            expect(activeTab.classList.contains('active')).toBe(true);
            expect(activeContent.classList.contains('active')).toBe(true);
            expect(manager.logsManager.stopAutoRefresh).toHaveBeenCalled();
        });

        test('обрабатывает отсутствие вкладки', () => {
            const { manager, developerToolsManager } = createEnvironment();
            const logErrorSpy = jest.spyOn(manager, '_logError');

            developerToolsManager.switchTab('nonexistent');

            expect(logErrorSpy).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    key: 'logs.developerTools.tabNotFound',
                    params: expect.objectContaining({ tabName: 'nonexistent' })
                })
            );
        });

        test('обрабатывает ошибки при переключении', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsManager = {
                loadLogs: jest.fn(),
                startAutoRefresh: jest.fn(),
                stopAutoRefresh: jest.fn()
            };
            const developerToolsManager = new DeveloperToolsManager(manager);
            jest.spyOn(document, 'querySelectorAll').mockImplementation(() => {
                throw new Error('Query error');
            });

            developerToolsManager.switchTab('logs');

            expect(manager._logError).toHaveBeenCalled();
        });
    });
});
