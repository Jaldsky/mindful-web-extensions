/**
 * @jest-environment jsdom
 */

const EventHandlersManager = require('../../../../src/managers/options/ui/EventHandlersManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('EventHandlersManager', () => {
    let manager;
    let eventHandlersManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        eventHandlersManager = new EventHandlersManager(manager);
        
        document.body.innerHTML = `
            <form id="settingsForm">
                <input id="backendUrl" />
                <button type="submit" id="saveBtn">Save</button>
                <button type="button" id="resetBtn">Reset</button>
            </form>
            <button id="runDiagnostics">Run Diagnostics</button>
            <button id="clearDiagnostics">Clear</button>
            <button id="closeDevToolsPanel">Close</button>
            <button id="logsTab">Logs</button>
            <button id="diagnosticsTab">Diagnostics</button>
            <button id="clearLogs">Clear Logs</button>
            <button id="copyLogs">Copy</button>
            <select id="activityRangeSelect">
                <option value="1h">1h</option>
            </select>
            <button class="logs-filter-btn" data-filter-level="all">All</button>
            <button class="logs-filter-btn" data-filter-level="error">Error</button>
            <select id="logsClassFilter">
                <option value="all">All</option>
            </select>
            <input type="checkbox" id="logsServerOnlyFilter" />
            <button id="languageToggle">Language</button>
            <button id="themeToggle">Theme</button>
            <button id="addDomainExceptionBtn">Add Domain</button>
            <input id="domainExceptionInput" />
            <ul id="domainExceptionsList"></ul>
            <button id="toggleDeveloperTools">Dev Tools</button>
        `;
        
        manager.domManager.elements = {
            settingsForm: document.getElementById('settingsForm'),
            resetBtn: document.getElementById('resetBtn'),
            saveBtn: document.getElementById('saveBtn'),
            runDiagnostics: document.getElementById('runDiagnostics'),
            toggleDeveloperTools: document.getElementById('toggleDeveloperTools'),
            addDomainExceptionBtn: document.getElementById('addDomainExceptionBtn'),
            domainExceptionInput: document.getElementById('domainExceptionInput'),
            domainExceptionsList: document.getElementById('domainExceptionsList')
        };
        
        manager.saveSettings = jest.fn();
        manager.resetToDefault = jest.fn();
        manager.runDiagnostics = jest.fn();
        manager.clearDiagnostics = jest.fn();
        manager.closeDevToolsPanel = jest.fn();
        manager.openDevToolsPanel = jest.fn();
        manager.switchTab = jest.fn();
        manager.clearLogs = jest.fn();
        manager.copyLogs = jest.fn();
        manager.setLogLevelFilter = jest.fn();
        manager.setLogClassFilter = jest.fn();
        manager.setServerOnlyFilter = jest.fn();
        manager.toggleLanguage = jest.fn();
        manager.toggleTheme = jest.fn();
        manager.uiManager = {
            addDomainException: jest.fn(),
            removeDomainException: jest.fn(),
            activityRangeKey: '1h',
            activityManager: {
                setActivityRangeByKey: jest.fn()
            }
        };
        manager.activityManager = {
            startActivityAutoRefresh: jest.fn(),
            stopActivityAutoRefresh: jest.fn(),
            loadActivityStats: jest.fn().mockResolvedValue()
        };
        manager.developerToolsManager = {
            restoreState: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с manager', () => {
            expect(eventHandlersManager.manager).toBe(manager);
        });
    });

    describe('setupEventHandlers', () => {
        test('настраивает обработчик для settingsForm', () => {
            eventHandlersManager.setupEventHandlers();
            
            const form = document.getElementById('settingsForm');
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
            
            expect(event.defaultPrevented).toBe(true);
            expect(manager.saveSettings).toHaveBeenCalled();
            expect(manager.eventHandlers.has('settingsForm')).toBe(true);
        });

        test('логирует если settingsForm не найден', () => {
            manager.domManager.elements.settingsForm = null;
            
            eventHandlersManager.setupEventHandlers();
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.eventHandlers.settingsFormNotFound' })
            );
        });

        test('настраивает обработчик для resetBtn', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('resetBtn');
            button.click();
            
            expect(manager.resetToDefault).toHaveBeenCalled();
            expect(manager.eventHandlers.has('resetBtn')).toBe(true);
            expect(manager.originalButtonTexts.get('resetBtn')).toBe('Reset');
        });

        test('логирует если resetBtn не найден', () => {
            manager.domManager.elements.resetBtn = null;
            
            eventHandlersManager.setupEventHandlers();
            
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.ui.eventHandlers.resetBtnNotFound' })
            );
        });

        test('сохраняет оригинальный текст saveBtn', () => {
            eventHandlersManager.setupEventHandlers();
            
            expect(manager.originalButtonTexts.get('saveBtn')).toBe('Save');
        });

        test('настраивает обработчик для runDiagnostics', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('runDiagnostics');
            button.click();
            
            expect(manager.runDiagnostics).toHaveBeenCalled();
            expect(manager.eventHandlers.has('runDiagnostics')).toBe(true);
        });

        test('настраивает обработчик для clearDiagnostics', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('clearDiagnostics');
            button.click();
            
            expect(manager.clearDiagnostics).toHaveBeenCalled();
            expect(manager.eventHandlers.has('clearDiagnostics')).toBe(true);
        });

        test('настраивает обработчик для closeDevToolsPanel', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('closeDevToolsPanel');
            button.click();
            
            expect(manager.closeDevToolsPanel).toHaveBeenCalled();
            expect(manager.eventHandlers.has('closeDevToolsPanel')).toBe(true);
        });

        test('настраивает обработчик для logsTab', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('logsTab');
            button.click();
            
            expect(manager.switchTab).toHaveBeenCalledWith('logs');
            expect(manager.eventHandlers.has('logsTab')).toBe(true);
        });

        test('настраивает обработчик для diagnosticsTab', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('diagnosticsTab');
            button.click();
            
            expect(manager.switchTab).toHaveBeenCalledWith('diagnostics');
            expect(manager.eventHandlers.has('diagnosticsTab')).toBe(true);
        });

        test('настраивает обработчик для clearLogs', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('clearLogs');
            button.click();
            
            expect(manager.clearLogs).toHaveBeenCalled();
            expect(manager.eventHandlers.has('clearLogs')).toBe(true);
        });

        test('настраивает обработчик для copyLogs', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('copyLogs');
            button.click();
            
            expect(manager.copyLogs).toHaveBeenCalled();
            expect(manager.eventHandlers.has('copyLogs')).toBe(true);
        });

        test('настраивает обработчик для activityRangeSelect', () => {
            eventHandlersManager.setupEventHandlers();
            
            // Получаем обработчик и вызываем его напрямую с правильным event объектом
            const handler = manager.eventHandlers.get('activityRangeSelect');
            const mockEvent = {
                target: {
                    value: '1d'
                },
                bubbles: true,
                cancelable: true
            };
            handler(mockEvent);
            
            expect(manager.uiManager.activityManager.setActivityRangeByKey).toHaveBeenCalledWith('1d');
            expect(manager.eventHandlers.has('activityRangeSelect')).toBe(true);
        });

        test('настраивает обработчики для filterButtons', () => {
            eventHandlersManager.setupEventHandlers();
            
            const buttons = document.querySelectorAll('.logs-filter-btn');
            buttons[0].click();
            
            expect(manager.setLogLevelFilter).toHaveBeenCalled();
        });

        test('настраивает обработчик для logsClassFilter', () => {
            eventHandlersManager.setupEventHandlers();
            
            // Получаем обработчик и вызываем его напрямую с правильным event объектом
            const handler = manager.eventHandlers.get('logsClassFilter');
            const mockEvent = {
                target: {
                    value: 'TestClass'
                },
                bubbles: true,
                cancelable: true
            };
            handler(mockEvent);
            
            expect(manager.setLogClassFilter).toHaveBeenCalledWith('TestClass');
            expect(manager.eventHandlers.has('logsClassFilter')).toBe(true);
        });

        test('настраивает обработчик для logsServerOnlyFilter', () => {
            eventHandlersManager.setupEventHandlers();
            
            const checkbox = document.getElementById('logsServerOnlyFilter');
            checkbox.checked = true;
            const event = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(event);
            
            expect(manager.setServerOnlyFilter).toHaveBeenCalledWith(true);
            expect(manager.eventHandlers.has('logsServerOnlyFilter')).toBe(true);
        });

        test('настраивает обработчик для languageToggle', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('languageToggle');
            button.click();
            
            expect(manager.toggleLanguage).toHaveBeenCalled();
            expect(manager.eventHandlers.has('languageToggle')).toBe(true);
        });

        test('настраивает обработчик для themeToggle', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('themeToggle');
            button.click();
            
            expect(manager.toggleTheme).toHaveBeenCalled();
            expect(manager.eventHandlers.has('themeToggle')).toBe(true);
        });

        test('настраивает обработчик для addDomainExceptionBtn', () => {
            eventHandlersManager.setupEventHandlers();
            
            const button = document.getElementById('addDomainExceptionBtn');
            const event = new Event('click', { bubbles: true, cancelable: true });
            button.dispatchEvent(event);
            
            expect(event.defaultPrevented).toBe(true);
            expect(manager.uiManager.addDomainException).toHaveBeenCalled();
            expect(manager.eventHandlers.has('addDomainExceptionBtn')).toBe(true);
        });

        test('настраивает обработчик для domainExceptionInput Enter key', () => {
            eventHandlersManager.setupEventHandlers();
            
            const input = document.getElementById('domainExceptionInput');
            const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
            input.dispatchEvent(event);
            
            expect(event.defaultPrevented).toBe(true);
            expect(manager.uiManager.addDomainException).toHaveBeenCalled();
        });

        test('не обрабатывает другие клавиши в domainExceptionInput', () => {
            eventHandlersManager.setupEventHandlers();
            
            const input = document.getElementById('domainExceptionInput');
            const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true });
            input.dispatchEvent(event);
            
            expect(manager.uiManager.addDomainException).not.toHaveBeenCalled();
        });

        test('настраивает обработчик для domainExceptionsList', () => {
            eventHandlersManager.setupEventHandlers();
            
            const list = document.getElementById('domainExceptionsList');
            const button = document.createElement('button');
            button.className = 'domain-exception-remove';
            button.setAttribute('data-domain', 'example.com');
            list.appendChild(button);
            
            const event = new Event('click', { bubbles: true, cancelable: true });
            button.dispatchEvent(event);
            
            expect(event.defaultPrevented).toBe(true);
            expect(manager.uiManager.removeDomainException).toHaveBeenCalledWith('example.com');
            expect(manager.eventHandlers.has('domainExceptionsList')).toBe(true);
        });

        test('не обрабатывает клики вне кнопки удаления в domainExceptionsList', () => {
            eventHandlersManager.setupEventHandlers();
            
            const list = document.getElementById('domainExceptionsList');
            const span = document.createElement('span');
            list.appendChild(span);
            
            const event = new Event('click', { bubbles: true });
            span.dispatchEvent(event);
            
            expect(manager.uiManager.removeDomainException).not.toHaveBeenCalled();
        });

        test('настраивает обработчик для toggleDeveloperTools', () => {
            eventHandlersManager.setupEventHandlers();
            
            // Создаем панель с display: block чтобы вызвать closeDevToolsPanel
            const panel = document.createElement('div');
            panel.id = 'devToolsPanel';
            panel.style.display = 'block';
            document.body.appendChild(panel);
            
            const button = document.getElementById('toggleDeveloperTools');
            button.click();
            
            expect(manager.closeDevToolsPanel).toHaveBeenCalled();
            expect(manager.eventHandlers.has('toggleDeveloperTools')).toBe(true);
        });

        test('открывает devToolsPanel если он закрыт', () => {
            eventHandlersManager.setupEventHandlers();
            
            const panel = document.createElement('div');
            panel.id = 'devToolsPanel';
            panel.style.display = 'none';
            document.body.appendChild(panel);
            
            const button = document.getElementById('toggleDeveloperTools');
            button.click();
            
            expect(manager.openDevToolsPanel).toHaveBeenCalledWith('logs');
        });

        test('настраивает обработчик visibilitychange', () => {
            eventHandlersManager.setupEventHandlers();
            
            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true,
                configurable: true
            });
            
            const event = new Event('visibilitychange');
            document.dispatchEvent(event);
            
            expect(manager.activityManager.startActivityAutoRefresh).toHaveBeenCalled();
            expect(manager.activityManager.loadActivityStats).toHaveBeenCalled();
        });

        test('останавливает автообновление при скрытии страницы', () => {
            eventHandlersManager.setupEventHandlers();
            
            Object.defineProperty(document, 'visibilityState', {
                value: 'hidden',
                writable: true,
                configurable: true
            });
            
            const event = new Event('visibilitychange');
            document.dispatchEvent(event);
            
            expect(manager.activityManager.stopActivityAutoRefresh).toHaveBeenCalled();
        });

        test('настраивает обработчики focus и blur', () => {
            eventHandlersManager.setupEventHandlers();
            
            const focusEvent = new Event('focus');
            window.dispatchEvent(focusEvent);
            expect(manager.activityManager.startActivityAutoRefresh).toHaveBeenCalled();
            
            const blurEvent = new Event('blur');
            window.dispatchEvent(blurEvent);
            expect(manager.activityManager.stopActivityAutoRefresh).toHaveBeenCalled();
        });

        test('вызывает restoreState для developerToolsManager', () => {
            eventHandlersManager.setupEventHandlers();
            
            expect(manager.developerToolsManager.restoreState).toHaveBeenCalled();
        });

        test('обрабатывает ошибки при настройке обработчиков', () => {
            // Удаляем settingsForm чтобы проверить что код продолжает работу
            const originalForm = manager.domManager.elements.settingsForm;
            manager.domManager.elements.settingsForm = null;
            
            // Метод должен обработать отсутствие элемента и продолжить работу
            expect(() => eventHandlersManager.setupEventHandlers()).not.toThrow();
            
            // Проверяем что другие обработчики все равно настроены
            expect(manager.eventHandlers.has('resetBtn')).toBe(true);
            
            // Восстанавливаем
            manager.domManager.elements.settingsForm = originalForm;
        });
    });
});
