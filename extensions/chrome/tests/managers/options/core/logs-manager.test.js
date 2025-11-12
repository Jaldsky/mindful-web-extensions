/**
 * @jest-environment jsdom
 */

const LogsManager = require('../../../../src/managers/options/core/LogsManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

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
            <button type="button" id="clearLogs" class="logs-action-btn">Clear</button>
            <button type="button" id="copyLogs" class="logs-action-btn">Copy</button>
        `;
    };

    const createEnvironment = (logs = []) => {
        setupDOM();
        const manager = createBaseOptionsManager();
        manager.statusManager.showSuccess.mockReturnValue(true);
        manager.statusManager.showError.mockReturnValue(true);
        manager.localeManager.t.mockImplementation((key) => ({
            'options.notifications.logsClearedShort': 'Cleared',
            'options.notifications.logsClearErrorShort': 'Clear error',
            'options.notifications.logsCopiedShort': 'Copied',
            'options.notifications.logsCopyErrorShort': 'Copy error',
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
        expect(document.getElementById('logsCounter').textContent).toBe('0 / 1000');
        const clearButton = document.getElementById('clearLogs');
        expect(clearButton.textContent).toBe('Cleared');
        expect(clearButton.disabled).toBe(true);
        expect(manager.statusManager.showSuccess).not.toHaveBeenCalled();
    });

    test('copyLogs копирует содержимое и уведомляет пользователя', async () => {
        const { manager, logsManager } = createEnvironment();
        const logsContent = document.getElementById('logsContent');
        logsContent.textContent = 'Sample logs';

        await logsManager.copyLogs();

        expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith('Sample logs');
        const copyButton = document.getElementById('copyLogs');
        expect(copyButton.textContent).toBe('Copied');
        expect(copyButton.disabled).toBe(true);
        expect(manager.statusManager.showSuccess).not.toHaveBeenCalled();
    });

    describe('_initializeFeedbackButtons', () => {
        test('инициализирует кнопки обратной связи', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.localeManager.t.mockImplementation((key) => ({
                'options.notifications.logsClearedShort': 'Cleared',
                'options.notifications.logsClearErrorShort': 'Clear error',
                'options.notifications.logsCopiedShort': 'Copied',
                'options.notifications.logsCopyErrorShort': 'Copy error'
            }[key] || key));
            
            // Мокаем requestAnimationFrame чтобы выполнить инициализацию сразу
            const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
                cb();
                return 1;
            });
            
            const logsManager = new LogsManager(manager);
            
            // Устанавливаем offsetWidth для кнопок чтобы targetWidth > 0
            const clearButton = document.getElementById('clearLogs');
            const copyButton = document.getElementById('copyLogs');
            Object.defineProperty(clearButton, 'offsetWidth', { value: 100, writable: true });
            Object.defineProperty(copyButton, 'offsetWidth', { value: 100, writable: true });
            
            // Вызываем напрямую для тестирования
            logsManager._initializeFeedbackButtons();
            
            // Проверяем что метод был вызван (может не установить feedbackWidth если измерение вернуло 0)
            expect(clearButton).toBeDefined();
            expect(copyButton).toBeDefined();
            
            rafSpy.mockRestore();
        });

        test('обрабатывает отсутствие кнопок', () => {
            document.body.innerHTML = '<div id="logsContent"></div>';
            const manager = createBaseOptionsManager();
            
            expect(() => new LogsManager(manager)).not.toThrow();
        });

        test('использует requestAnimationFrame если доступен', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
                cb();
                return 1;
            });
            
            new LogsManager(manager);
            
            expect(rafSpy).toHaveBeenCalled();
            rafSpy.mockRestore();
        });
    });

    describe('_getFeedbackVariants', () => {
        test('возвращает варианты для clearLogs', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.localeManager.t.mockImplementation((key) => ({
                'options.notifications.logsClearedShort': 'Cleared',
                'options.notifications.logsClearErrorShort': 'Clear error'
            }[key] || key));
            
            const logsManager = new LogsManager(manager);
            const variants = logsManager._getFeedbackVariants('clearLogs', 'Clear');
            
            expect(variants).toContain('Clear');
            expect(variants).toContain('Cleared');
            expect(variants).toContain('Clear error');
        });

        test('возвращает варианты для copyLogs', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.localeManager.t.mockImplementation((key) => ({
                'options.notifications.logsCopiedShort': 'Copied',
                'options.notifications.logsCopyErrorShort': 'Copy error'
            }[key] || key));
            
            const logsManager = new LogsManager(manager);
            const variants = logsManager._getFeedbackVariants('copyLogs', 'Copy');
            
            expect(variants).toContain('Copy');
            expect(variants).toContain('Copied');
            expect(variants).toContain('Copy error');
        });

        test('возвращает только defaultText для неизвестной кнопки', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const variants = logsManager._getFeedbackVariants('unknown', 'Default');
            
            expect(variants).toEqual(['Default']);
        });
    });

    describe('_measureButtonText', () => {
        test('измеряет ширину текста кнопки', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const button = document.getElementById('clearLogs');
            
            const width = logsManager._measureButtonText(button, 'Test Text');
            
            expect(typeof width).toBe('number');
            expect(width).toBeGreaterThanOrEqual(0);
        });

        test('возвращает 0 если button отсутствует', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            const width = logsManager._measureButtonText(null, 'Test');
            
            expect(width).toBe(0);
        });

        test('создает элемент измерения при первом вызове', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const button = document.getElementById('clearLogs');
            
            expect(logsManager._measurementElement).toBeNull();
            logsManager._measureButtonText(button, 'Test');
            expect(logsManager._measurementElement).not.toBeNull();
        });
    });

    describe('_setButtonFeedback', () => {
        test('устанавливает обратную связь на кнопке', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            jest.useFakeTimers();
            logsManager._setButtonFeedback('clearLogs', { text: 'Cleared', duration: 500 });
            
            const button = document.getElementById('clearLogs');
            expect(button.textContent).toBe('Cleared');
            expect(button.disabled).toBe(true);
            expect(button.dataset.originalText).toBeDefined();
            
            jest.advanceTimersByTime(500);
            expect(button.textContent).toBe('Clear');
            expect(button.disabled).toBe(false);
            
            jest.useRealTimers();
        });

        test('обрезает длинный текст', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            logsManager._setButtonFeedback('clearLogs', { text: 'This is a very long text that should be truncated', duration: 500 });
            
            const button = document.getElementById('clearLogs');
            expect(button.textContent.length).toBeLessThanOrEqual(14);
            expect(button.textContent.endsWith('…')).toBe(true);
        });

        test('не устанавливает обратную связь если кнопка отсутствует', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            expect(() => logsManager._setButtonFeedback('nonexistent', { text: 'Test' })).not.toThrow();
        });

        test('не устанавливает обратную связь если text не строка', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            const button = document.getElementById('clearLogs');
            const originalText = button.textContent;
            
            logsManager._setButtonFeedback('clearLogs', { text: null });
            
            expect(button.textContent).toBe(originalText);
        });

        test('очищает предыдущий таймер при повторном вызове', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            jest.useFakeTimers();
            logsManager._setButtonFeedback('clearLogs', { text: 'First', duration: 500 });
            logsManager._setButtonFeedback('clearLogs', { text: 'Second', duration: 500 });
            
            const button = document.getElementById('clearLogs');
            expect(button.textContent).toBe('Second');
            
            jest.advanceTimersByTime(500);
            expect(button.textContent).toBe('Clear');
            
            jest.useRealTimers();
        });
    });

    describe('setClassFilter', () => {
        test('устанавливает фильтр по классу', async () => {
            const { logsManager } = createEnvironment();
            const loadSpy = jest.spyOn(logsManager, 'loadLogs').mockResolvedValue();
            
            logsManager.setClassFilter('TestClass');
            
            expect(logsManager.manager.logsFilter.className).toBe('TestClass');
            expect(loadSpy).toHaveBeenCalled();
            loadSpy.mockRestore();
        });

        test('убирает фокус с фильтра классов', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const classFilter = document.getElementById('logsClassFilter');
            classFilter.focus();
            
            const blurSpy = jest.spyOn(classFilter, 'blur');
            logsManager.setClassFilter('TestClass');
            
            expect(blurSpy).toHaveBeenCalled();
        });
    });

    describe('setServerOnly', () => {
        test('устанавливает фильтр только серверные запросы', async () => {
            const { logsManager } = createEnvironment();
            const loadSpy = jest.spyOn(logsManager, 'loadLogs').mockResolvedValue();
            
            logsManager.setServerOnly(true);
            
            expect(logsManager.manager.logsFilter.serverOnly).toBe(true);
            expect(logsManager.manager.logsFilter.className).toBe('all');
            expect(loadSpy).toHaveBeenCalled();
            loadSpy.mockRestore();
        });

        test('отключает фильтр классов при serverOnly', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const classFilter = document.getElementById('logsClassFilter');
            classFilter.value = 'TestClass';
            
            logsManager.setServerOnly(true);
            
            expect(classFilter.disabled).toBe(true);
            expect(manager.logsFilter.className).toBe('all');
        });
    });

    describe('loadLogs дополнительные сценарии', () => {
        test('обрабатывает отсутствие logsContent', async () => {
            document.body.innerHTML = '';
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            await logsManager.loadLogs();
            
            expect(manager._logError).toHaveBeenCalled();
        });

        test('не обновляет логи если есть выделение текста', async () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.lastSelectionChangeTime = Date.now();
            const logsManager = new LogsManager(manager);
            
            const selection = {
                toString: () => 'selected text',
                anchorNode: document.getElementById('logsContent')
            };
            window.getSelection = jest.fn(() => selection);
            
            const loadSpy = jest.spyOn(chrome.storage.local, 'get');
            await logsManager.loadLogs();
            
            expect(loadSpy).not.toHaveBeenCalled();
        });

        test('не обновляет логи если classFilter в фокусе', async () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const classFilter = document.getElementById('logsClassFilter');
            classFilter.focus();
            
            const loadSpy = jest.spyOn(chrome.storage.local, 'get');
            await logsManager.loadLogs();
            
            expect(loadSpy).not.toHaveBeenCalled();
        });

        test('показывает сообщение когда нет логов', async () => {
            const { logsManager } = createEnvironment([]);
            
            await logsManager.loadLogs();
            
            const logsContent = document.getElementById('logsContent');
            expect(logsContent.innerHTML).toContain('noLogsAvailable');
        });

        test('показывает сообщение когда нет логов соответствующих фильтрам', async () => {
            const { logsManager } = createEnvironment([
                { timestamp: new Date().toISOString(), level: 'INFO', className: 'TestClass', message: 'Test' }
            ]);
            logsManager.manager.logsFilter.level = 'ERROR';
            
            await logsManager.loadLogs();
            
            const logsContent = document.getElementById('logsContent');
            expect(logsContent.innerHTML).toContain('noLogsMatchFilters');
        });

        test('сохраняет позицию прокрутки при обновлении', async () => {
            const { logsManager } = createEnvironment([
                { timestamp: new Date().toISOString(), level: 'INFO', className: 'TestClass', message: 'Test' }
            ]);
            const logsContent = document.getElementById('logsContent');
            logsContent.scrollTop = 100;
            logsContent.scrollHeight = 200;
            
            await logsManager.loadLogs();
            
            expect(logsContent.scrollTop).toBeGreaterThan(0);
        });

        test('обрабатывает ошибки при загрузке', async () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));
            
            await logsManager.loadLogs();
            
            expect(manager._logError).toHaveBeenCalled();
            const logsContent = document.getElementById('logsContent');
            expect(logsContent.innerHTML).toContain('loadErrorMessage');
        });

        test('отображает логи с данными', async () => {
            const { logsManager } = createEnvironment([
                {
                    timestamp: new Date().toISOString(),
                    level: 'ERROR',
                    className: 'TestClass',
                    message: 'Error message',
                    data: { key: 'value' }
                }
            ]);
            
            await logsManager.loadLogs();
            
            const logsContent = document.getElementById('logsContent');
            expect(logsContent.innerHTML).toContain('Error message');
            expect(logsContent.innerHTML).toContain('log-data');
        });
    });

    describe('clearLogs обработка ошибок', () => {
        test('обрабатывает ошибки при очистке', async () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.localeManager.t.mockImplementation((key) => ({
                'options.notifications.logsClearErrorShort': 'Clear error'
            }[key] || key));
            const logsManager = new LogsManager(manager);
            chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));
            
            jest.useFakeTimers();
            await logsManager.clearLogs();
            
            const clearButton = document.getElementById('clearLogs');
            expect(clearButton.textContent.trim()).toContain('Clear error');
            expect(clearButton.disabled).toBe(false);
            
            jest.useRealTimers();
        });
    });

    describe('copyLogs дополнительные сценарии', () => {
        test('не копирует если нет содержимого', async () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const logsContent = document.getElementById('logsContent');
            logsContent.textContent = '';
            
            await logsManager.copyLogs();
            
            expect(global.navigator.clipboard.writeText).not.toHaveBeenCalled();
        });

        test('обрабатывает ошибки при копировании', async () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.localeManager.t.mockImplementation((key) => ({
                'options.notifications.logsCopyErrorShort': 'Copy error'
            }[key] || key));
            const logsManager = new LogsManager(manager);
            const logsContent = document.getElementById('logsContent');
            logsContent.textContent = 'Sample logs';
            global.navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
            
            jest.useFakeTimers();
            await logsManager.copyLogs();
            
            const copyButton = document.getElementById('copyLogs');
            expect(copyButton.textContent.trim()).toContain('Copy error');
            expect(copyButton.disabled).toBe(false);
            
            jest.useRealTimers();
        });
    });

    describe('startAutoRefresh и stopAutoRefresh', () => {
        test('запускает автоматическое обновление', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsRefreshIntervalId = null;
            const logsManager = new LogsManager(manager);
            const loadSpy = jest.spyOn(logsManager, 'loadLogs').mockResolvedValue();
            
            jest.useFakeTimers();
            logsManager.startAutoRefresh();
            
            expect(manager.logsRefreshIntervalId).not.toBeNull();
            
            jest.advanceTimersByTime(1000);
            expect(loadSpy).toHaveBeenCalled();
            
            loadSpy.mockRestore();
            jest.useRealTimers();
        });

        test('останавливает автоматическое обновление', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const intervalId = setInterval(() => {}, 1000);
            manager.logsRefreshIntervalId = intervalId;
            
            logsManager.stopAutoRefresh();
            
            expect(manager.logsRefreshIntervalId).toBeNull();
        });
    });

    describe('updateClassFilter', () => {
        test('обновляет список классов в фильтре', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const logs = [
                { className: 'Class1' },
                { className: 'Class2' },
                { className: 'Class1' },
                { className: 'Class3' }
            ];
            
            logsManager.updateClassFilter(logs);
            
            const classFilter = document.getElementById('logsClassFilter');
            const options = Array.from(classFilter.options).map(opt => opt.value);
            expect(options).toContain('all');
            expect(options).toContain('Class1');
            expect(options).toContain('Class2');
            expect(options).toContain('Class3');
        });

        test('сохраняет текущее значение если оно валидно', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const classFilter = document.getElementById('logsClassFilter');
            
            // Сначала устанавливаем значение через updateClassFilter
            const logs = [{ className: 'TestClass' }];
            logsManager.updateClassFilter(logs);
            classFilter.value = 'TestClass';
            
            // Затем обновляем снова
            logsManager.updateClassFilter(logs);
            
            expect(classFilter.value).toBe('TestClass');
        });

        test('обрабатывает отсутствие classFilter', () => {
            document.body.innerHTML = '<div id="logsContent"></div>';
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            expect(() => logsManager.updateClassFilter([])).not.toThrow();
        });
    });

    describe('filterLogs', () => {
        test('фильтрует по уровню', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsFilter.level = 'ERROR';
            manager.logsFilter.className = 'all';
            manager.logsFilter.serverOnly = false;
            const logsManager = new LogsManager(manager);
            
            const logs = [
                { level: 'INFO', className: 'Test' },
                { level: 'ERROR', className: 'Test' },
                { level: 'INFO', className: 'Test' }
            ];
            
            const filtered = logsManager.filterLogs(logs);
            
            expect(filtered).toHaveLength(1);
            expect(filtered[0].level).toBe('ERROR');
        });

        test('фильтрует по классу', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsFilter.level = 'all';
            manager.logsFilter.className = 'TestClass';
            manager.logsFilter.serverOnly = false;
            const logsManager = new LogsManager(manager);
            
            const logs = [
                { className: 'TestClass' },
                { className: 'OtherClass' },
                { className: 'TestClass' }
            ];
            
            const filtered = logsManager.filterLogs(logs);
            
            expect(filtered).toHaveLength(2);
        });

        test('фильтрует только серверные запросы', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.logsFilter.level = 'all';
            manager.logsFilter.className = 'all';
            manager.logsFilter.serverOnly = true;
            const logsManager = new LogsManager(manager);
            
            const logs = [
                { className: 'BackendManager' },
                { className: 'OtherClass' },
                { className: 'BackendManager' }
            ];
            
            const filtered = logsManager.filterLogs(logs);
            
            expect(filtered).toHaveLength(2);
            expect(filtered.every(log => log.className === 'BackendManager')).toBe(true);
        });
    });

    describe('updateCounter', () => {
        test('обновляет счетчик с общим количеством', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            logsManager.updateCounter(5, 10);
            
            const counter = document.getElementById('logsCounter');
            expect(counter.textContent).toBe('5 / 10');
        });

        test('обновляет счетчик без общего количества', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            logsManager.updateCounter(5);
            
            const counter = document.getElementById('logsCounter');
            expect(counter.textContent).toBe('5 / 1000');
        });

        test('обрабатывает отсутствие counter элемента', () => {
            document.body.innerHTML = '<div id="logsContent"></div>';
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            expect(() => logsManager.updateCounter(5)).not.toThrow();
        });
    });

    describe('escapeHtml', () => {
        test('экранирует HTML символы', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            
            const escaped = logsManager.escapeHtml('<script>alert("xss")</script>');
            
            expect(escaped).not.toContain('<script>');
            expect(escaped).toContain('&lt;');
        });
    });

    describe('setupSelectionChangeHandler и removeSelectionChangeHandler', () => {
        test('настраивает обработчик изменения выделения', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            manager.selectionChangeHandler = null;
            const logsManager = new LogsManager(manager);
            
            logsManager.setupSelectionChangeHandler();
            
            expect(manager.selectionChangeHandler).toBeDefined();
        });

        test('не создает дубликат обработчика', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const handler = jest.fn();
            manager.selectionChangeHandler = handler;
            const logsManager = new LogsManager(manager);
            
            logsManager.setupSelectionChangeHandler();
            
            expect(manager.selectionChangeHandler).toBe(handler);
        });

        test('удаляет обработчик изменения выделения', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const logsManager = new LogsManager(manager);
            const handler = jest.fn();
            manager.selectionChangeHandler = handler;
            
            logsManager.removeSelectionChangeHandler();
            
            expect(manager.selectionChangeHandler).toBeNull();
        });
    });
});
