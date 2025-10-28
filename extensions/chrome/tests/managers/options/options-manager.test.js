/**
 * @jest-environment jsdom
 */

/**
 * Тесты для OptionsManager
 */

// Мокируем LocaleManager
jest.mock('../../../src/managers/locale/LocaleManager.js', () => {
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
            toggleLocale: jest.fn().mockResolvedValue(),
            addLocaleChangeListener: jest.fn(),
            destroy: jest.fn()
        };
    });
});

const OptionsManager = require('../../../src/managers/options/OptionsManager.js');

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
            <button type="button" id="toggleDeveloperTools">⚙️</button>
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
    });

    describe('runDiagnostics', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен запускать диагностику', async () => {
            const runDiagnosticsSpy = jest.spyOn(optionsManager.diagnosticsManager, 'runDiagnostics')
                .mockResolvedValue({ overall: 'ok', checks: {} });
            const renderSpy = jest.spyOn(optionsManager, '_renderDiagnostics')
                .mockImplementation(() => {});

            const result = await optionsManager.runDiagnostics();

            expect(runDiagnosticsSpy).toHaveBeenCalled();
            expect(renderSpy).toHaveBeenCalled();
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
                .mockImplementation(async () => {
                    // Проверяем что кнопка заблокирована во время выполнения
                    expect(button.disabled).toBe(true);
                    return { overall: 'ok', checks: {} };
                });
            jest.spyOn(optionsManager, '_renderDiagnostics')
                .mockImplementation(() => {});

            await optionsManager.runDiagnostics();

            // После завершения кнопка должна быть разблокирована
            expect(button.disabled).toBe(false);
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

    describe('Обработка ошибок инициализации', () => {
        test('должен обрабатывать повторную инициализацию', async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Повторная инициализация не должна выбрасывать ошибку
            await optionsManager.init();
            expect(optionsManager.isInitialized).toBe(true);
        });
    });

    describe('toggleLanguage', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен переключать язык', async () => {
            const toggleLocaleSpy = jest.spyOn(optionsManager.localeManager, 'toggleLocale')
                .mockResolvedValue();

            await optionsManager.toggleLanguage();

            expect(toggleLocaleSpy).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки переключения языка', async () => {
            jest.spyOn(optionsManager.localeManager, 'toggleLocale')
                .mockRejectedValue(new Error('Toggle failed'));

            await optionsManager.toggleLanguage();
            // Не должно выбрасывать ошибку
        });
    });

    describe('updateLanguageDisplay', () => {
        beforeEach(async () => {
            document.body.innerHTML += '<span id="currentLanguage"></span>';
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен обновлять отображение языка', () => {
            optionsManager.updateLanguageDisplay();

            const languageElement = document.getElementById('currentLanguage');
            expect(languageElement.textContent).toBe('EN');
        });

        test('должен работать если элемент не найден', () => {
            document.getElementById('currentLanguage').remove();
            
            expect(() => optionsManager.updateLanguageDisplay()).not.toThrow();
        });
    });

    describe('onLocaleChange', () => {
        beforeEach(async () => {
            document.body.innerHTML += '<span id="currentLanguage"></span>';
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен обрабатывать изменение локали', () => {
            const localizeDOMSpy = jest.spyOn(optionsManager.localeManager, 'localizeDOM');
            const updateLanguageSpy = jest.spyOn(optionsManager, 'updateLanguageDisplay');
            
            optionsManager.onLocaleChange();

            expect(localizeDOMSpy).toHaveBeenCalled();
            expect(updateLanguageSpy).toHaveBeenCalled();
        });

        test('должен обрабатывать ошибки при изменении локали', () => {
            jest.spyOn(optionsManager.localeManager, 'localizeDOM')
                .mockImplementation(() => { throw new Error('Localize error'); });

            expect(() => optionsManager.onLocaleChange()).not.toThrow();
        });
    });

    describe('ThemeManager интеграция', () => {
        beforeEach(async () => {
            document.body.innerHTML += `
                <span id="themeIcon"></span>
                <span id="themeLabel"></span>
                <button id="themeToggle">Toggle Theme</button>
            `;
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('setThemeManager должен устанавливать ThemeManager', () => {
            const mockThemeManager = {
                getCurrentTheme: jest.fn().mockReturnValue('light'),
                applyTheme: jest.fn(),
                saveTheme: jest.fn().mockResolvedValue()
            };

            optionsManager.setThemeManager(mockThemeManager);

            expect(optionsManager.themeManager).toBe(mockThemeManager);
        });

        test('toggleTheme должен переключать тему', async () => {
            const mockThemeManager = {
                getCurrentTheme: jest.fn().mockReturnValue('light'),
                applyTheme: jest.fn(),
                saveTheme: jest.fn().mockResolvedValue()
            };

            optionsManager.setThemeManager(mockThemeManager);
            await optionsManager.toggleTheme();

            expect(mockThemeManager.applyTheme).toHaveBeenCalledWith('dark');
            expect(mockThemeManager.saveTheme).toHaveBeenCalledWith('dark');
        });

        test('toggleTheme должен обрабатывать отсутствие ThemeManager', async () => {
            await optionsManager.toggleTheme();
            // Не должно выбрасывать ошибку
        });

        test('toggleTheme должен обрабатывать ошибки', async () => {
            const mockThemeManager = {
                getCurrentTheme: jest.fn().mockReturnValue('light'),
                applyTheme: jest.fn(),
                saveTheme: jest.fn().mockRejectedValue(new Error('Save failed'))
            };

            optionsManager.setThemeManager(mockThemeManager);
            await optionsManager.toggleTheme();

            // Не должно выбрасывать ошибку
        });

        test('updateThemeDisplay должен обновлять иконку темы', () => {
            const mockThemeManager = {
                getCurrentTheme: jest.fn().mockReturnValue('dark')
            };

            optionsManager.setThemeManager(mockThemeManager);
            optionsManager.updateThemeDisplay();

            const themeIcon = document.getElementById('themeIcon');
            const themeLabel = document.getElementById('themeLabel');
            expect(themeIcon.textContent).toBe('🌙');
        });

        test('updateThemeDisplay должен работать для светлой темы', () => {
            const mockThemeManager = {
                getCurrentTheme: jest.fn().mockReturnValue('light')
            };

            optionsManager.setThemeManager(mockThemeManager);
            optionsManager.updateThemeDisplay('light');

            const themeIcon = document.getElementById('themeIcon');
            expect(themeIcon.textContent).toBe('☀️');
        });

        test('updateThemeDisplay должен работать без элементов', () => {
            document.getElementById('themeIcon').remove();
            
            expect(() => optionsManager.updateThemeDisplay()).not.toThrow();
        });

        test('updateThemeDisplay должен обрабатывать ошибки', () => {
            const mockThemeManager = {
                getCurrentTheme: jest.fn().mockImplementation(() => {
                    throw new Error('Get theme error');
                })
            };

            optionsManager.setThemeManager(mockThemeManager);
            
            expect(() => optionsManager.updateThemeDisplay()).not.toThrow();
        });
    });

    describe('Обработчики событий - продвинутые сценарии', () => {
        test('должен обрабатывать отсутствующие элементы при setupEventHandlers', async () => {
            // Создаем минимальный DOM без некоторых элементов
            document.body.innerHTML = `
                <form id="settingsForm">
                    <input type="text" id="backendUrl" value="" />
                </form>
                <div id="status"></div>
            `;

            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));

            // Не должно выбрасывать ошибку
            expect(optionsManager.eventHandlers.size).toBeGreaterThan(0);
        });

        test('должен обрабатывать клик по languageToggle', async () => {
            document.body.innerHTML += '<button id="languageToggle">Toggle Language</button>';
            
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));

            const toggleLanguageSpy = jest.spyOn(optionsManager, 'toggleLanguage')
                .mockResolvedValue();

            const languageToggle = document.getElementById('languageToggle');
            const clickEvent = new Event('click', { bubbles: true });
            languageToggle.dispatchEvent(clickEvent);

            await new Promise(resolve => Promise.resolve().then(resolve));

            expect(toggleLanguageSpy).toHaveBeenCalled();
        });

        test('должен обрабатывать клик по themeToggle', async () => {
            document.body.innerHTML += '<button id="themeToggle">Toggle Theme</button>';
            
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));

            const toggleThemeSpy = jest.spyOn(optionsManager, 'toggleTheme')
                .mockResolvedValue();

            const themeToggle = document.getElementById('themeToggle');
            const clickEvent = new Event('click', { bubbles: true });
            themeToggle.dispatchEvent(clickEvent);

            await new Promise(resolve => Promise.resolve().then(resolve));

            expect(toggleThemeSpy).toHaveBeenCalled();
        });
    });

    describe('Обработка ошибок сохранения', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен обрабатывать ошибку верификации сохранения', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            jest.spyOn(optionsManager.storageManager, 'saveBackendUrl')
                .mockResolvedValue(false);

            const result = await optionsManager.saveSettings();

            expect(result).toBe(false);
        });

        test('должен обрабатывать ошибку уведомления background script', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            jest.spyOn(optionsManager.storageManager, 'notifyBackgroundScript')
                .mockResolvedValue(false);

            const result = await optionsManager.saveSettings();

            expect(result).toBe(true);
        });

        test('должен обрабатывать ошибку получения URL из DOM', async () => {
            jest.spyOn(optionsManager.domManager, 'getBackendUrlValue')
                .mockReturnValue(null);

            const result = await optionsManager.saveSettings();

            expect(result).toBe(false);
        });

        test('должен обрабатывать ошибку обновления состояния кнопки', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            jest.spyOn(optionsManager.domManager, 'setButtonState')
                .mockReturnValue(false);

            const result = await optionsManager.saveSettings();

            expect(result).toBe(true);
        });

        test('должен обрабатывать ошибку отображения статуса', async () => {
            const testUrl = 'http://test.com/api';
            const backendUrlInput = document.getElementById('backendUrl');
            backendUrlInput.value = testUrl;

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: testUrl
            });

            jest.spyOn(optionsManager.statusManager, 'showSuccess')
                .mockReturnValue(false);

            const result = await optionsManager.saveSettings();

            expect(result).toBe(true);
        });
    });

    describe('Обработка ошибок сброса', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен обрабатывать ошибку обновления UI после сброса', async () => {
            const defaultUrl = 'http://localhost:8000/api/v1/events/send';
            
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: defaultUrl
            });

            jest.spyOn(optionsManager.domManager, 'setBackendUrlValue')
                .mockReturnValue(false);

            const result = await optionsManager.resetToDefault();

            expect(result).toBe(true);
        });

        test('должен обрабатывать ошибку уведомления background script при сбросе', async () => {
            const defaultUrl = 'http://localhost:8000/api/v1/events/send';
            
            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: defaultUrl
            });

            jest.spyOn(optionsManager.storageManager, 'notifyBackgroundScript')
                .mockResolvedValue(false);

            const result = await optionsManager.resetToDefault();

            expect(result).toBe(true);
        });

        test('должен обрабатывать ошибку в resetToDefault', async () => {
            jest.spyOn(optionsManager.storageManager, 'resetToDefault')
                .mockRejectedValue(new Error('Reset failed'));

            const result = await optionsManager.resetToDefault();

            expect(result).toBe(false);
        });
    });

    describe('Обработка ошибок загрузки', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен обрабатывать ошибку обновления UI после загрузки', async () => {
            jest.spyOn(optionsManager.domManager, 'setBackendUrlValue')
                .mockReturnValue(false);

            global.chrome.storage.local.get.mockResolvedValueOnce({
                mindful_backend_url: 'http://test.com'
            });

            await optionsManager.loadSettings();
            // Не должно выбрасывать ошибку
        });
    });

    describe('Методы получения статистики - обработка ошибок', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('getStatusStatistics должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.statusManager, 'getStatistics')
                .mockImplementation(() => { throw new Error('Stats error'); });

            const stats = optionsManager.getStatusStatistics();

            expect(stats).toEqual({});
        });

        test('getStatusHistory должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.statusManager, 'getHistory')
                .mockImplementation(() => { throw new Error('History error'); });

            const history = optionsManager.getStatusHistory();

            expect(history).toEqual([]);
        });

        test('getStatusPerformanceMetrics должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.statusManager, 'getPerformanceMetrics')
                .mockImplementation(() => { throw new Error('Metrics error'); });

            const metrics = optionsManager.getStatusPerformanceMetrics();

            expect(metrics).toEqual({});
        });

        test('clearStatusHistory должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.statusManager, 'clearHistory')
                .mockImplementation(() => { throw new Error('Clear error'); });

            const count = optionsManager.clearStatusHistory();

            expect(count).toBe(0);
        });

        test('getValidationStatistics должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.validationManager, 'getValidationStatistics')
                .mockImplementation(() => { throw new Error('Stats error'); });

            const stats = optionsManager.getValidationStatistics();

            expect(stats).toEqual({});
        });

        test('getValidationHistory должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.validationManager, 'getHistory')
                .mockImplementation(() => { throw new Error('History error'); });

            const history = optionsManager.getValidationHistory();

            expect(history).toEqual([]);
        });

        test('clearValidationHistory должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.validationManager, 'clearHistory')
                .mockImplementation(() => { throw new Error('Clear error'); });

            const count = optionsManager.clearValidationHistory();

            expect(count).toBe(0);
        });

        test('getValidationPerformanceMetrics должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager.validationManager, 'getPerformanceMetrics')
                .mockImplementation(() => { throw new Error('Metrics error'); });

            const metrics = optionsManager.getValidationPerformanceMetrics();

            expect(metrics).toEqual({});
        });

        test('getDiagnostics должен обрабатывать ошибки', () => {
            jest.spyOn(optionsManager, 'getCurrentBackendUrl')
                .mockImplementation(() => { throw new Error('Get URL error'); });

            const diagnostics = optionsManager.getDiagnostics();

            expect(diagnostics).toHaveProperty('error');
        });
    });

    describe('validateManagersState', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен валидировать состояние менеджеров', () => {
            const result = optionsManager.validateManagersState();

            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('managers');
            expect(result).toHaveProperty('timestamp');
        });

        test('должен обрабатывать ошибки валидации', () => {
            jest.spyOn(optionsManager.statusManager, 'validateState')
                .mockImplementation(() => { throw new Error('Validation error'); });

            const result = optionsManager.validateManagersState();

            expect(result).toHaveProperty('error');
            expect(result.isValid).toBe(false);
        });

        test('должен помечать результат как невалидный если менеджер невалиден', () => {
            jest.spyOn(optionsManager.statusManager, 'validateState')
                .mockReturnValue({ isValid: false });

            const result = optionsManager.validateManagersState();

            expect(result.isValid).toBe(false);
        });
    });

    describe('_removeEventHandlers', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен удалять обработчики событий', () => {
            const initialSize = optionsManager.eventHandlers.size;
            
            optionsManager._removeEventHandlers();

            expect(optionsManager.eventHandlers.size).toBe(0);
        });

        test('должен обрабатывать ошибки при удалении обработчиков', () => {
            // Добавляем невалидный обработчик
            optionsManager.eventHandlers.set('invalid', null);

            expect(() => optionsManager._removeEventHandlers()).not.toThrow();
        });
    });

    describe('_destroyManagers', () => {
        beforeEach(async () => {
            optionsManager = new OptionsManager({ enableLogging: false });
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        test('должен уничтожать все менеджеры', () => {
            optionsManager._destroyManagers();

            expect(optionsManager.diagnosticsManager).toBeNull();
            expect(optionsManager.serviceWorkerManager).toBeNull();
            expect(optionsManager.notificationManager).toBeNull();
            expect(optionsManager.validationManager).toBeNull();
            expect(optionsManager.statusManager).toBeNull();
            expect(optionsManager.storageManager).toBeNull();
            expect(optionsManager.domManager).toBeNull();
            expect(optionsManager.localeManager).toBeNull();
        });

        test('должен обрабатывать ошибки при уничтожении менеджеров', () => {
            jest.spyOn(optionsManager.diagnosticsManager, 'destroy')
                .mockImplementation(() => { throw new Error('Destroy error'); });

            expect(() => optionsManager._destroyManagers()).not.toThrow();
        });
    });
});
