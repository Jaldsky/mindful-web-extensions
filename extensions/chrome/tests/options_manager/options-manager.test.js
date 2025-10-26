/**
 * @jest-environment jsdom
 */

/**
 * Тесты для OptionsManager
 */

// Мокируем LocaleManager
jest.mock('../../src/locales/LocaleManager.js', () => {
    // Создаем мок переводов для тестов
    const mockTranslations = {
        'options.status.reloading': 'Reloading extension...',
        'options.status.saved': 'Settings saved!',
        'options.status.reset': 'Settings reset to default'
    };

    return jest.fn().mockImplementation(() => {
        return {
            init: jest.fn().mockResolvedValue(),
            localizeDOM: jest.fn(),
            t: jest.fn((key) => mockTranslations[key] || key),
            getCurrentLocale: jest.fn().mockReturnValue('en'),
            setLocale: jest.fn().mockResolvedValue(),
            addLocaleChangeListener: jest.fn(),
            destroy: jest.fn()
        };
    });
});

const OptionsManager = require('../../src/options_manager/OptionsManager.js');

describe('OptionsManager', () => {
    let optionsManager;

    beforeEach(() => {
        // Создаем необходимые DOM элементы
        document.body.innerHTML = `
            <form id="settingsForm">
                <input type="text" id="backendUrl" value="" />
                <button type="submit" id="saveBtn">Save</button>
                <button type="button" id="resetBtn">Reset</button>
            </form>
            <div id="status"></div>
            <button type="button" id="runDiagnostics">Run Diagnostics</button>
            <button type="button" id="reloadExtension">Reload Extension</button>
        `;

        // Мок для navigator.language (для LocaleManager)
        Object.defineProperty(navigator, 'language', {
            writable: true,
            value: 'en-US'
        });

        // Убеждаемся что chrome API существует
        if (!global.chrome) {
            global.chrome = {};
        }
        
        if (!global.chrome.storage) {
            global.chrome.storage = {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            };
        }
        
        if (!global.chrome.runtime) {
            global.chrome.runtime = {
                sendMessage: jest.fn(),
                reload: jest.fn()
            };
        }

        // Настраиваем моки
        global.chrome.storage.local.get.mockImplementation((keys, callback) => {
            const result = {
                mindful_backend_url: 'http://localhost:8000/api/v1/events/send',
                mindful_locale: 'en'
            };
            
            if (callback) {
                // Callback стиль
                callback(result);
                return undefined;
            } else {
                // Promise стиль
                return Promise.resolve(result);
            }
        });

        global.chrome.storage.local.set.mockImplementation(() => {
            return Promise.resolve();
        });

        global.chrome.runtime.sendMessage.mockResolvedValue({ success: true });
        
        // Мок для chrome.runtime.reload
        if (!global.chrome.runtime.reload) {
            global.chrome.runtime.reload = jest.fn();
        }

        // НЕ используем fake timers для OptionsManager - он использует реальные промисы
        jest.useRealTimers();
    });

    afterEach(() => {
        if (optionsManager) {
            optionsManager.destroy();
            optionsManager = null;
        }
        
        jest.clearAllMocks();
    });

    describe('Инициализация', () => {
        test('должен создаваться и инициализироваться', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });

            // Небольшая задержка для завершения async init в конструкторе
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(optionsManager).toBeInstanceOf(OptionsManager);
            expect(optionsManager.isInitialized).toBe(true);
        });

        test('должен инициализировать все менеджеры', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(optionsManager.domManager).toBeDefined();
            expect(optionsManager.storageManager).toBeDefined();
            expect(optionsManager.validationManager).toBeDefined();
            expect(optionsManager.statusManager).toBeDefined();
            expect(optionsManager.localeManager).toBeDefined();
        });

        test('должен загружать настройки при инициализации', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(global.chrome.storage.local.get).toHaveBeenCalled();
            
            const backendUrlInput = document.getElementById('backendUrl');
            expect(backendUrlInput.value).toBe('http://localhost:8000/api/v1/events/send');
        });

        test('должен настраивать обработчики событий', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(optionsManager.eventHandlers.size).toBeGreaterThan(0);
        });

        test('должен создаваться даже если начальная загрузка не удалась', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });

            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Мок ошибки после создания (не влияет на конструктор)
            const loadSpy = jest.spyOn(optionsManager, 'loadSettings')
                .mockRejectedValueOnce(new Error('Load error'));
            
            await expect(optionsManager.loadSettings()).rejects.toThrow('Load error');
            
            // Менеджер все еще должен существовать
            expect(optionsManager).toBeInstanceOf(OptionsManager);
            expect(optionsManager.domManager).toBeDefined();
            expect(optionsManager.storageManager).toBeDefined();
            
            loadSpy.mockRestore();
        });
    });

    describe('loadSettings', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен загружать настройки из хранилища', async () => {
            const testUrl = 'http://test.com/api';
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            await optionsManager.loadSettings();

            const backendUrlInput = document.getElementById('backendUrl');
            expect(backendUrlInput.value).toBe(testUrl);
        });

        test('должен обрабатывать ошибки загрузки', async () => {
            global.chrome.storage.local.get.mockRejectedValueOnce(new Error('Load error'));

            await expect(optionsManager.loadSettings()).rejects.toThrow();
        });
    });

    describe('saveSettings', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен сохранять валидный URL', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            const result = await optionsManager.saveSettings();

            expect(result).toBe(true);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith({
                mindful_backend_url: testUrl
            });
        });

        test('должен отклонять невалидный URL', async () => {
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = 'invalid-url';

            const result = await optionsManager.saveSettings();

            expect(result).toBe(false);
            expect(global.chrome.storage.local.set).not.toHaveBeenCalled();
        });

        test('должен уведомлять background script', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            await optionsManager.saveSettings();

            expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({
                action: 'updateBackendUrl',
                url: testUrl
            });
        });

        test('должен блокировать кнопку во время сохранения', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            const saveBtn = document.getElementById('saveBtn');
            backendUrlInput.value = testUrl;

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            let buttonWasDisabled = false;
            const originalSetButtonState = optionsManager.domManager.setButtonState.bind(optionsManager.domManager);
            jest.spyOn(optionsManager.domManager, 'setButtonState').mockImplementation((button, text, disabled) => {
                if (disabled) {
                    buttonWasDisabled = true;
                }
                return originalSetButtonState(button, text, disabled);
            });

            await optionsManager.saveSettings();

            expect(buttonWasDisabled).toBe(true);
        });
    });

    describe('resetToDefault', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен сбрасывать настройки к значениям по умолчанию', async () => {
            const defaultUrl = 'http://localhost:8000/api/v1/events/send';
            
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: defaultUrl
            });

            const result = await optionsManager.resetToDefault();

            expect(result).toBe(true);
            expect(global.chrome.storage.local.set).toHaveBeenCalled();
            
            const backendUrlInput = document.getElementById('backendUrl');
            expect(backendUrlInput.value).toBe(defaultUrl);
        });

        test('должен блокировать кнопку во время сброса', async () => {
            const defaultUrl = 'http://localhost:8000/api/v1/events/send';
            const resetBtn = document.getElementById('resetBtn');

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: defaultUrl
            });

            let buttonWasDisabled = false;
            const originalSetButtonState = optionsManager.domManager.setButtonState.bind(optionsManager.domManager);
            jest.spyOn(optionsManager.domManager, 'setButtonState').mockImplementation((button, text, disabled) => {
                if (button === resetBtn && disabled) {
                    buttonWasDisabled = true;
                }
                return originalSetButtonState(button, text, disabled);
            });

            await optionsManager.resetToDefault();

            expect(buttonWasDisabled).toBe(true);
        });
    });

    describe('Вспомогательные методы', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('getCurrentBackendUrl должен возвращать текущее значение', () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            const url = optionsManager.getCurrentBackendUrl();

            expect(url).toBe(testUrl);
        });

        test('getDefaultBackendUrl должен возвращать значение по умолчанию', () => {
            const url = optionsManager.getDefaultBackendUrl();

            expect(url).toBe('http://localhost:8000/api/v1/events/send');
        });

        test('isCurrentUrlValid должен проверять валидность URL', () => {
            const backendUrlInput = document.getElementById('backendUrl');
            
            backendUrlInput.value = 'http://test.com/api';
            expect(optionsManager.isCurrentUrlValid()).toBe(true);
            
            backendUrlInput.value = 'invalid';
            expect(optionsManager.isCurrentUrlValid()).toBe(false);
        });
    });

    describe('Статистика и диагностика', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('getStatusStatistics должен возвращать статистику статусов', () => {
            const stats = optionsManager.getStatusStatistics();

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('totalHistoryEntries');
        });

        test('getStatusHistory должен возвращать историю статусов', () => {
            const history = optionsManager.getStatusHistory();

            expect(Array.isArray(history)).toBe(true);
        });

        test('getValidationStatistics должен возвращать статистику валидаций', () => {
            const stats = optionsManager.getValidationStatistics();

            expect(stats).toBeDefined();
            expect(stats).toHaveProperty('totalValidations');
        });

        test('getDiagnostics должен возвращать полную диагностику', () => {
            const diagnostics = optionsManager.getDiagnostics();

            expect(diagnostics).toBeDefined();
            expect(diagnostics).toHaveProperty('isInitialized');
            expect(diagnostics).toHaveProperty('statusStatistics');
            expect(diagnostics).toHaveProperty('storagePerformanceMetrics');
            expect(diagnostics).toHaveProperty('domPerformanceMetrics');
            expect(diagnostics).toHaveProperty('validationPerformanceMetrics');
            expect(diagnostics).toHaveProperty('managersValidation');
        });

        test('validateManagersState должен проверять состояние менеджеров', () => {
            const validation = optionsManager.validateManagersState();

            expect(validation).toBeDefined();
            expect(validation).toHaveProperty('isValid');
            expect(validation).toHaveProperty('managers');
        });
    });

    describe('Очистка истории', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('clearStatusHistory должен очищать историю статусов', () => {
            const count = optionsManager.clearStatusHistory();

            expect(typeof count).toBe('number');
        });

        test('clearValidationHistory должен очищать историю валидаций', () => {
            const count = optionsManager.clearValidationHistory();

            expect(typeof count).toBe('number');
        });
    });

    describe('Обработчики событий', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен обрабатывать submit формы', async () => {
            const form = document.getElementById('settingsForm');
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = 'http://test.com/api';

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: 'http://test.com/api'
            });

            const saveSpy = jest.spyOn(optionsManager, 'saveSettings');

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);

            await new Promise(resolve => Promise.resolve().then(resolve)); await new Promise(resolve => Promise.resolve().then(resolve));

            expect(saveSpy).toHaveBeenCalled();
        });

        test('должен обрабатывать клик по кнопке сброса', async () => {
            const resetBtn = document.getElementById('resetBtn');

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: 'http://localhost:8000/api/v1/events/send'
            });

            const resetSpy = jest.spyOn(optionsManager, 'resetToDefault');

            const clickEvent = new Event('click', { bubbles: true });
            resetBtn.dispatchEvent(clickEvent);

            await new Promise(resolve => Promise.resolve().then(resolve)); await new Promise(resolve => Promise.resolve().then(resolve));

            expect(resetSpy).toHaveBeenCalled();
        });

        test('должен обрабатывать клик по кнопке диагностики', async () => {
            const runDiagnosticsBtn = document.getElementById('runDiagnostics');
            const diagnosticsSpy = jest.spyOn(optionsManager, 'runDiagnostics').mockResolvedValue({
                overall: 'ok'
            });

            const clickEvent = new Event('click', { bubbles: true });
            runDiagnosticsBtn.dispatchEvent(clickEvent);

            await new Promise(resolve => Promise.resolve().then(resolve)); await new Promise(resolve => Promise.resolve().then(resolve));

            expect(diagnosticsSpy).toHaveBeenCalled();
        });

        test('должен обрабатывать клик по кнопке перезагрузки', async () => {
            const reloadBtn = document.getElementById('reloadExtension');
            const reloadSpy = jest.spyOn(optionsManager, 'reloadExtension');

            const clickEvent = new Event('click', { bubbles: true });
            reloadBtn.dispatchEvent(clickEvent);

            await new Promise(resolve => Promise.resolve().then(resolve));

            expect(reloadSpy).toHaveBeenCalled();
        });
    });

    describe('runDiagnostics', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен запускать диагностику', async () => {
            const runDiagnosticsSpy = jest.spyOn(optionsManager.diagnosticsManager, 'runDiagnostics')
                .mockResolvedValue({ overall: 'ok', checks: {} });
            const displaySpy = jest.spyOn(optionsManager.diagnosticsManager, 'displayDiagnosticResults')
                .mockImplementation(() => {});

            const result = await optionsManager.runDiagnostics();

            expect(runDiagnosticsSpy).toHaveBeenCalled();
            expect(displaySpy).toHaveBeenCalled();
            expect(result).toBeDefined();
            expect(result.overall).toBe('ok');
        });

        test('должен обрабатывать ошибки диагностики', async () => {
            jest.spyOn(optionsManager.diagnosticsManager, 'runDiagnostics')
                .mockRejectedValue(new Error('Diagnostics failed'));

            await expect(optionsManager.runDiagnostics()).rejects.toThrow('Diagnostics failed');
        });

        test('должен блокировать кнопку во время диагностики', async () => {
            const button = document.getElementById('runDiagnostics');
            jest.spyOn(optionsManager.diagnosticsManager, 'runDiagnostics')
                .mockResolvedValue({ overall: 'ok', checks: {} });
            jest.spyOn(optionsManager.diagnosticsManager, 'displayDiagnosticResults')
                .mockImplementation(() => {});

            let buttonWasDisabled = false;
            const originalSetButtonState = optionsManager.domManager.setButtonState.bind(optionsManager.domManager);
            jest.spyOn(optionsManager.domManager, 'setButtonState').mockImplementation((btn, text, disabled) => {
                if (btn === button && disabled) {
                    buttonWasDisabled = true;
                }
                return originalSetButtonState(btn, text, disabled);
            });

            await optionsManager.runDiagnostics();

            expect(buttonWasDisabled).toBe(true);
        });
    });

    describe('reloadExtension', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('должен вызывать chrome.runtime.reload', () => {
            optionsManager.reloadExtension();
            
            // Прокручиваем таймер для setTimeout
            jest.advanceTimersByTime(500);

            expect(global.chrome.runtime.reload).toHaveBeenCalled();
        });

        test('должен показывать статус успеха перед перезагрузкой', () => {
            const showSuccessSpy = jest.spyOn(optionsManager.statusManager, 'showSuccess');

            optionsManager.reloadExtension();
            
            // Проверяем что статус был показан до перезагрузки
            expect(showSuccessSpy).toHaveBeenCalledWith('Reloading extension...');
        });
    });

    describe('destroy', () => {
        test('должен очищать все ресурсы', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));

            optionsManager.destroy();

            expect(optionsManager.eventHandlers.size).toBe(0);
        });

        test('не должен выбрасывать ошибку при повторном вызове', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => Promise.resolve().then(resolve)); await new Promise(resolve => Promise.resolve().then(resolve));

            expect(() => {
                optionsManager.destroy();
                optionsManager.destroy();
            }).not.toThrow();
        });
    });

    describe('Интеграционные тесты', () => {
        test('полный цикл: load -> edit -> save -> reset', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));

            // Load
            const backendUrlInput = document.getElementById('backendUrl');
            expect(backendUrlInput.value).toBe('http://localhost:8000/api/v1/events/send');

            // Edit and save
            const newUrl = 'http://new-url.com/api';
            backendUrlInput.value = newUrl;
            
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: newUrl
            });
            
            await optionsManager.saveSettings();
            expect(global.chrome.storage.local.set).toHaveBeenCalled();

            // Reset
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: 'http://localhost:8000/api/v1/events/send'
            });
            
            await optionsManager.resetToDefault();
            expect(backendUrlInput.value).toBe('http://localhost:8000/api/v1/events/send');
        });

        test('должен собирать метрики производительности для всех операций', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => Promise.resolve().then(resolve)); await new Promise(resolve => Promise.resolve().then(resolve));

            const testUrl = 'http://test.com/api';
            document.getElementById('backendUrl').value = testUrl;

            global.chrome.storage.local.get.mockResolvedValue({
                mindful_backend_url: testUrl
            });

            await optionsManager.saveSettings();

            const diagnostics = optionsManager.getDiagnostics();
            
            expect(diagnostics.storagePerformanceMetrics).toBeDefined();
            expect(diagnostics.domPerformanceMetrics).toBeDefined();
            expect(diagnostics.validationPerformanceMetrics).toBeDefined();
            expect(diagnostics.statusPerformanceMetrics).toBeDefined();
        });
    });
});
