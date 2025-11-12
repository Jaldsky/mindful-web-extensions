/**
 * @jest-environment jsdom
 */

const InitializationManager = require('../../../../src/managers/options/core/InitializationManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('InitializationManager', () => {
    const setupDiagnosticsLabel = () => {
        document.body.innerHTML = '<span class="diagnostics-status-label"></span>';
    };

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('init ничего не делает, если менеджер уже инициализирован', async () => {
        const manager = createBaseOptionsManager();
        manager.isInitialized = true;

        const initializationManager = new InitializationManager(manager);
        await initializationManager.init();

        expect(manager.localeManager.init).not.toHaveBeenCalled();
        expect(manager.isInitialized).toBe(true);
    });

    test('init инициализирует локализацию, обработчики и обновляет статус', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.example');
        manager.domManager.setBackendUrlValue.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);
        await initializationManager.init();

        expect(manager.localeManager.init).toHaveBeenCalled();
        expect(manager.localeManager.localizeDOM).toHaveBeenCalled();
        expect(manager.uiManager.updateLanguageDisplay).toHaveBeenCalled();
        expect(manager.diagnosticsWorkflowManager.updateStatus).toHaveBeenCalledWith('notRun');
        expect(manager.uiManager.setupEventHandlers).toHaveBeenCalled();
        expect(manager.localeManager.addLocaleChangeListener).toHaveBeenCalledTimes(1);
        expect(manager.isInitialized).toBe(true);

        const listener = manager.localeManager.addLocaleChangeListener.mock.calls[0][0];
        listener();
        expect(manager.uiManager.onLocaleChange).toHaveBeenCalled();
    });

    test('loadSettings обновляет DOM и не показывает предупреждение при успехе', async () => {
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.test');
        manager.storageManager.loadDomainExceptions.mockResolvedValue([]);
        manager.domManager.setBackendUrlValue.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);
        await initializationManager.loadSettings();

        expect(manager.storageManager.loadBackendUrl).toHaveBeenCalled();
        expect(manager.storageManager.loadDomainExceptions).toHaveBeenCalled();
        expect(manager.domManager.setBackendUrlValue).toHaveBeenCalledWith('https://api.test');
        expect(manager.statusManager.showWarning).not.toHaveBeenCalled();
        expect(manager.setDomainExceptions).toHaveBeenCalledWith([]);
    });

    test('loadSettings показывает предупреждение при неудачном обновлении UI', async () => {
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.test');
        manager.storageManager.loadDomainExceptions.mockResolvedValue([]);
        manager.domManager.setBackendUrlValue.mockReturnValue(false);
        manager.statusManager.showWarning.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);
        await initializationManager.loadSettings();

        expect(manager.statusManager.showWarning).toHaveBeenCalled();
        expect(manager.setDomainExceptions).toHaveBeenCalledWith([]);
    });

    test('init обрабатывает ошибки при загрузке activity stats', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.example');
        manager.domManager.setBackendUrlValue.mockReturnValue(true);
        manager.uiManager.loadActivityStats = jest.fn().mockRejectedValue(new Error('Activity error'));

        const initializationManager = new InitializationManager(manager);
        await initializationManager.init();

        expect(manager.uiManager.loadActivityStats).toHaveBeenCalled();
        expect(manager._logError).toHaveBeenCalled();
        expect(manager.isInitialized).toBe(true);
    });

    test('init устанавливает activityRangeSelect если доступен', async () => {
        setupDiagnosticsLabel();
        const rangeSelect = document.createElement('select');
        rangeSelect.id = 'activityRangeSelect';
        // Добавляем опцию, чтобы значение могло быть установлено
        const option = document.createElement('option');
        option.value = '1h';
        option.textContent = '1 hour';
        rangeSelect.appendChild(option);
        document.body.appendChild(rangeSelect);
        
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.example');
        manager.domManager.setBackendUrlValue.mockReturnValue(true);
        // Устанавливаем activityRangeKey как обычное свойство
        manager.uiManager.activityRangeKey = '1h';
        manager.uiManager.startActivityAutoRefresh = jest.fn();
        manager.uiManager.loadActivityStats = jest.fn().mockResolvedValue();

        const initializationManager = new InitializationManager(manager);
        await initializationManager.init();

        // Проверяем, что startActivityAutoRefresh был вызван
        expect(manager.uiManager.startActivityAutoRefresh).toHaveBeenCalled();
        // Проверяем, что activityRangeKey доступен
        expect(manager.uiManager.activityRangeKey).toBe('1h');
        // Проверяем, что rangeSelect все еще в DOM
        const foundSelect = document.getElementById('activityRangeSelect');
        expect(foundSelect).toBe(rangeSelect);
        // Проверяем, что значение установлено в select
        expect(foundSelect.value).toBe('1h');
    });

    test('init обрабатывает ошибки инициализации с Chrome Storage API', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.localeManager.init.mockRejectedValue(new Error('Chrome Storage API error'));
        manager.statusManager.showError.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);

        await expect(initializationManager.init()).rejects.toThrow('Chrome Storage API error');
        expect(manager.statusManager.showError).toHaveBeenCalledWith('Chrome Storage API error');
    });

    test('init обрабатывает ошибки инициализации без Chrome Storage API', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.localeManager.init.mockRejectedValue(new Error('Other error'));
        manager.statusManager.showError.mockReturnValue(true);
        manager.localeManager.t.mockReturnValue('Load error');

        const initializationManager = new InitializationManager(manager);

        await expect(initializationManager.init()).rejects.toThrow('Other error');
        expect(manager.statusManager.showError).toHaveBeenCalledWith('Load error');
    });

    test('init обрабатывает ошибки когда statusManager не показывает статус', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.localeManager.init.mockRejectedValue(new Error('Test error'));
        manager.statusManager.showError.mockReturnValue(false);

        const initializationManager = new InitializationManager(manager);

        await expect(initializationManager.init()).rejects.toThrow();
        expect(manager._log).toHaveBeenCalledWith(expect.objectContaining({ key: 'logs.initialization.initStatusErrorWarning' }));
    });

    test('loadSettings обрабатывает ошибки при установке domainExceptions', async () => {
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.test');
        manager.storageManager.loadDomainExceptions.mockResolvedValue(['test.com']);
        manager.domManager.setBackendUrlValue.mockReturnValue(true);
        manager.setDomainExceptions.mockImplementation(() => {
            throw new Error('Domain exceptions error');
        });
        manager.statusManager.showWarning.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);
        await initializationManager.loadSettings();

        expect(manager._logError).toHaveBeenCalled();
        expect(manager.statusManager.showWarning).toHaveBeenCalled();
    });

    test('loadSettings обрабатывает ошибки загрузки с storageApiUnavailableError', async () => {
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockRejectedValue(new Error('Storage API unavailable error'));
        manager.localeManager.t.mockImplementation((key) => {
            if (key === 'logs.initialization.storageApiUnavailableError') return 'Storage API unavailable error';
            if (key === 'logs.initialization.storageApiUnavailable') return 'Storage API unavailable';
            return 'Load error';
        });
        manager.statusManager.showError.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);

        await expect(initializationManager.loadSettings()).rejects.toThrow();
        expect(manager.statusManager.showError).toHaveBeenCalledWith('Storage API unavailable');
    });

    test('loadSettings обрабатывает ошибки загрузки без storageApiUnavailableError', async () => {
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockRejectedValue(new Error('Other error'));
        manager.localeManager.t.mockReturnValue('Load error');
        manager.statusManager.showError.mockReturnValue(true);

        const initializationManager = new InitializationManager(manager);

        await expect(initializationManager.loadSettings()).rejects.toThrow();
        expect(manager.statusManager.showError).toHaveBeenCalledWith('Load error');
    });

    test('loadSettings обрабатывает ошибки когда statusManager не показывает статус', async () => {
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockRejectedValue(new Error('Test error'));
        manager.statusManager.showError.mockReturnValue(false);

        const initializationManager = new InitializationManager(manager);

        await expect(initializationManager.loadSettings()).rejects.toThrow();
        expect(manager._log).toHaveBeenCalledWith(expect.objectContaining({ key: 'logs.initialization.loadStatusErrorWarning' }));
    });

    test('init обновляет diagnosticsLabel если доступен', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.example');
        manager.domManager.setBackendUrlValue.mockReturnValue(true);
        manager.localeManager.t.mockImplementation((key) => {
            if (key === 'options.diagnostics.status') return 'Status';
            return key;
        });

        const initializationManager = new InitializationManager(manager);
        await initializationManager.init();

        const diagnosticsLabel = document.querySelector('.diagnostics-status-label');
        expect(diagnosticsLabel.textContent).toBe('Status');
    });

    test('init не обновляет diagnosticsLabel если текст начинается с options.', async () => {
        setupDiagnosticsLabel();
        const manager = createBaseOptionsManager();
        manager.storageManager.loadBackendUrl.mockResolvedValue('https://api.example');
        manager.domManager.setBackendUrlValue.mockReturnValue(true);
        manager.localeManager.t.mockImplementation((key) => {
            if (key === 'options.diagnostics.status') return 'options.diagnostics.status';
            return key;
        });

        const initializationManager = new InitializationManager(manager);
        await initializationManager.init();

        const diagnosticsLabel = document.querySelector('.diagnostics-status-label');
        expect(diagnosticsLabel.textContent).toBe('Status:');
    });
});
