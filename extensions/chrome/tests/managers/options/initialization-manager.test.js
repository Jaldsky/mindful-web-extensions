/**
 * @jest-environment jsdom
 */

const InitializationManager = require('../../../src/managers/options/InitializationManager.js');
const { createBaseOptionsManager } = require('./options-test-helpers.js');

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
});
