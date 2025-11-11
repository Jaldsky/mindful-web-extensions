/**
 * @jest-environment jsdom
 */

/**
 * Тесты для DOMManager
 */

const DOMManager = require('../../../../src/managers/options/core/DOMManager.js');

describe('DOMManager', () => {
    let domManager;

    beforeEach(() => {
        document.body.innerHTML = `
            <form id="settingsForm">
                <input type="url" id="backendUrl" />
                <button type="submit" id="saveBtn">Save</button>
                <button type="button" id="resetBtn">Reset</button>
                <input type="text" id="domainExceptionInput" />
                <button type="button" id="addDomainExceptionBtn">Add</button>
                <ul id="domainExceptionsList"></ul>
            </form>
            <div id="status"></div>
            <button type="button" id="runDiagnostics">Run Diagnostics</button>
            <button type="button" id="toggleDeveloperTools">⚙️</button>
        `;

        domManager = new DOMManager({ enableLogging: false });
    });

    afterEach(() => {
        if (domManager) {
            domManager.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Инициализация', () => {
        test('должен создаваться с настройками по умолчанию', () => {
            expect(domManager).toBeDefined();
            expect(domManager.elements).toBeDefined();
            expect(domManager.strictMode).toBe(false);
            expect(domManager.performanceMetrics).toBeInstanceOf(Map);
        });

        test('должен кэшировать DOM элементы', () => {
            expect(domManager.elements.settingsForm).toBeInstanceOf(HTMLFormElement);
            expect(domManager.elements.backendUrl).toBeInstanceOf(HTMLInputElement);
            expect(domManager.elements.saveBtn).toBeInstanceOf(HTMLButtonElement);
            expect(domManager.elements.resetBtn).toBeInstanceOf(HTMLButtonElement);
            expect(domManager.elements.status).toBeInstanceOf(HTMLDivElement);
            expect(domManager.elements.runDiagnostics).toBeInstanceOf(HTMLButtonElement);
            expect(domManager.elements.toggleDeveloperTools).toBeInstanceOf(HTMLButtonElement);
            expect(domManager.elements.domainExceptionInput).toBeInstanceOf(HTMLInputElement);
            expect(domManager.elements.addDomainExceptionBtn).toBeInstanceOf(HTMLButtonElement);
            expect(domManager.elements.domainExceptionsList).toBeInstanceOf(HTMLUListElement);
        });

        test('должен создаваться с пользовательскими настройками', () => {
            const customManager = new DOMManager({ 
                enableLogging: false,
                strictMode: true 
            });
            
            expect(customManager.strictMode).toBe(true);
            customManager.destroy();
        });
    });

    describe('Статические свойства', () => {
        test('должен иметь ELEMENT_IDS константу', () => {
            expect(DOMManager.ELEMENT_IDS).toBeDefined();
            expect(DOMManager.ELEMENT_IDS.SETTINGS_FORM).toBe('settingsForm');
            expect(DOMManager.ELEMENT_IDS.BACKEND_URL).toBe('backendUrl');
            expect(DOMManager.ELEMENT_IDS.SAVE_BTN).toBe('saveBtn');
            expect(DOMManager.ELEMENT_IDS.RESET_BTN).toBe('resetBtn');
            expect(DOMManager.ELEMENT_IDS.STATUS).toBe('status');
            expect(DOMManager.ELEMENT_IDS.RUN_DIAGNOSTICS).toBe('runDiagnostics');
            expect(DOMManager.ELEMENT_IDS.TOGGLE_DEVELOPER_TOOLS).toBe('toggleDeveloperTools');
            expect(DOMManager.ELEMENT_IDS.DOMAIN_EXCEPTION_INPUT).toBe('domainExceptionInput');
            expect(DOMManager.ELEMENT_IDS.ADD_DOMAIN_EXCEPTION_BTN).toBe('addDomainExceptionBtn');
            expect(DOMManager.ELEMENT_IDS.DOMAIN_EXCEPTIONS_LIST).toBe('domainExceptionsList');
        });
    });

    describe('getBackendUrlValue', () => {
        test('должен возвращать значение input поля', () => {
            domManager.elements.backendUrl.value = 'http://example.com';
            const value = domManager.getBackendUrlValue();
            
            expect(value).toBe('http://example.com');
        });

        test('должен тримить пробелы', () => {
            domManager.elements.backendUrl.value = '  http://example.com  ';
            const value = domManager.getBackendUrlValue();
            
            expect(value).toBe('http://example.com');
        });

        test('должен возвращать пустую строку для пустого input', () => {
            domManager.elements.backendUrl.value = '';
            const value = domManager.getBackendUrlValue();
            
            expect(value).toBe('');
        });

        test('должен возвращать пустую строку если элемент отсутствует', () => {
            domManager.elements.backendUrl = null;
            const value = domManager.getBackendUrlValue();
            
            expect(value).toBe('');
        });

        test('должен собирать метрики производительности', () => {
            domManager.getBackendUrlValue();

            const metrics = domManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('getBackendUrlValue_lastDuration');
        });
    });

    describe('setBackendUrlValue', () => {
        test('должен устанавливать значение input поля', () => {
            const url = 'http://example.com';
            const result = domManager.setBackendUrlValue(url);

            expect(result).toBe(true);
            expect(domManager.elements.backendUrl.value).toBe(url);
        });

        test('должен обрабатывать пустую строку', () => {
            const result = domManager.setBackendUrlValue('');

            expect(result).toBe(true);
            expect(domManager.elements.backendUrl.value).toBe('');
        });

        test('должен валидировать входные данные', () => {
            expect(() => domManager.setBackendUrlValue(123)).toThrow(TypeError);
            expect(() => domManager.setBackendUrlValue(null)).toThrow(TypeError);
            expect(() => domManager.setBackendUrlValue(undefined)).toThrow(TypeError);
            expect(() => domManager.setBackendUrlValue({})).toThrow(TypeError);
        });

        test('должен возвращать false если элемент отсутствует', () => {
            domManager.elements.backendUrl.remove();
            domManager.elements.backendUrl = null;

            const result = domManager.setBackendUrlValue('http://example.com');
            expect(result).toBe(false);
        });

        test('должен проверять что элемент находится в DOM', () => {
            const input = domManager.elements.backendUrl;
            input.remove();

            const result = domManager.setBackendUrlValue('http://example.com');
            expect(result).toBe(false);
        });

        test('должен верифицировать установку значения', () => {
            const url = 'http://example.com';
            const result = domManager.setBackendUrlValue(url);

            expect(result).toBe(true);
            expect(domManager.elements.backendUrl.value).toBe(url);
        });

        test('должен собирать метрики производительности', () => {
            domManager.setBackendUrlValue('http://example.com');

            const metrics = domManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('setBackendUrlValue_lastDuration');
        });
    });

    describe('setButtonState', () => {
        test('должен устанавливать текст и состояние кнопки', () => {
            const button = domManager.elements.saveBtn;
            const result = domManager.setButtonState(button, 'Saving...', true);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Saving...');
            expect(button.disabled).toBe(true);
        });

        test('должен включать кнопку когда disabled=false', () => {
            const button = domManager.elements.saveBtn;
            button.disabled = true;

            domManager.setButtonState(button, 'Save', false);

            expect(button.disabled).toBe(false);
            expect(button.textContent).toBe('Save');
        });

        test('должен работать с кнопкой reset', () => {
            const button = domManager.elements.resetBtn;
            const result = domManager.setButtonState(button, 'Resetting...', true);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Resetting...');
            expect(button.disabled).toBe(true);
        });

        test('должен валидировать параметр text', () => {
            const button = domManager.elements.saveBtn;

            expect(() => domManager.setButtonState(button, 123, true)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, null, true)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, undefined, true)).toThrow(TypeError);
        });

        test('должен валидировать параметр disabled', () => {
            const button = domManager.elements.saveBtn;

            expect(() => domManager.setButtonState(button, 'Test', 'invalid')).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, 'Test', null)).toThrow(TypeError);
            expect(() => domManager.setButtonState(button, 'Test', 1)).toThrow(TypeError);
        });

        test('должен возвращать false для null кнопки', () => {
            const result = domManager.setButtonState(null, 'Test', false);
            expect(result).toBe(false);
        });

        test('должен проверять что кнопка находится в DOM', () => {
            const button = domManager.elements.saveBtn;
            button.remove();

            const result = domManager.setButtonState(button, 'Test', false);
            expect(result).toBe(false);
        });

        test('должен верифицировать установку состояния', () => {
            const button = domManager.elements.saveBtn;
            const result = domManager.setButtonState(button, 'Saving...', true);

            expect(result).toBe(true);
            expect(button.textContent).toBe('Saving...');
            expect(button.disabled).toBe(true);
        });

        test('должен собирать метрики производительности', () => {
            const button = domManager.elements.saveBtn;
            domManager.setButtonState(button, 'Test', false);

            const metrics = domManager.getPerformanceMetrics();
            expect(metrics).toHaveProperty('setButtonState_lastDuration');
        });
    });

    describe('getPerformanceMetrics', () => {
        test('должен возвращать метрики производительности', () => {
            domManager.getBackendUrlValue();
            domManager.setBackendUrlValue('http://test.com');

            const metrics = domManager.getPerformanceMetrics();

            expect(typeof metrics).toBe('object');
            expect(metrics).toHaveProperty('getBackendUrlValue_lastDuration');
            expect(metrics).toHaveProperty('setBackendUrlValue_lastDuration');
        });
    });

    describe('getElementsStatistics', () => {
        test('должен возвращать статистику элементов', () => {
            const stats = domManager.getElementsStatistics();

            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('available');
            expect(stats).toHaveProperty('missing');
            expect(stats).toHaveProperty('inDOM');
            expect(stats).toHaveProperty('notInDOM');
        });

        test('должен корректно считать доступные элементы', () => {
            const stats = domManager.getElementsStatistics();

            expect(stats.total).toBe(10);
            expect(stats.available).toBe(10);
            expect(stats.missing).toEqual([]);
            expect(stats.inDOM).toBe(10);
            expect(stats.notInDOM).toEqual([]);
        });

        test('должен отслеживать отсутствующие элементы', () => {
            domManager.elements.saveBtn.remove();
            domManager.elements.saveBtn = null;

            const stats = domManager.getElementsStatistics();

            expect(stats.total).toBe(10);
            expect(stats.available).toBe(9);
            expect(stats.missing).toEqual(['saveBtn']);
            expect(stats.inDOM).toBe(9);
        });
    });

    describe('Обработка ошибок', () => {
        test('должен корректно обрабатывать отсутствующие элементы', () => {
            const input = domManager.elements.backendUrl;
            input.remove();

            expect(() => {
                domManager.setBackendUrlValue('http://example.com');
            }).not.toThrow();
        });

        test('должен выбрасывать ошибку в strictMode при отсутствии элементов', () => {
            document.getElementById('saveBtn').remove();

            expect(() => {
                new DOMManager({ strictMode: true, enableLogging: false });
            }).toThrow('Отсутствуют критичные DOM элементы');
        });

        test('не должен выбрасывать ошибку в non-strict режиме', () => {
            document.getElementById('saveBtn').remove();

            expect(() => {
                new DOMManager({ strictMode: false, enableLogging: false });
            }).not.toThrow();
        });
    });

    describe('destroy', () => {
        test('должен очищать все ресурсы', () => {
            domManager.getBackendUrlValue();
            domManager.destroy();

            expect(domManager.elements).toEqual({});
            expect(domManager.performanceMetrics.size).toBe(0);
        });

        test('должен быть безопасным при повторном вызове', () => {
            expect(() => {
                domManager.destroy();
                domManager.destroy();
            }).not.toThrow();
        });
    });

    describe('Интеграционные тесты', () => {
        test('должен обрабатывать полный workflow формы', () => {
            domManager.setBackendUrlValue('http://example.com');
            expect(domManager.getBackendUrlValue()).toBe('http://example.com');

            domManager.setButtonState(domManager.elements.saveBtn, 'Saving...', true);
            expect(domManager.elements.saveBtn.disabled).toBe(true);

            domManager.setButtonState(domManager.elements.saveBtn, 'Save', false);
            expect(domManager.elements.saveBtn.disabled).toBe(false);
        });

        test('должен обрабатывать состояния нескольких кнопок', () => {
            const saveBtn = domManager.elements.saveBtn;
            const resetBtn = domManager.elements.resetBtn;

            domManager.setButtonState(saveBtn, 'Saving...', true);
            domManager.setButtonState(resetBtn, 'Resetting...', true);

            expect(saveBtn.disabled).toBe(true);
            expect(resetBtn.disabled).toBe(true);
            expect(saveBtn.textContent).toBe('Saving...');
            expect(resetBtn.textContent).toBe('Resetting...');
        });

        test('должен собирать метрики для всех операций', () => {
            domManager.getBackendUrlValue();
            domManager.setBackendUrlValue('http://test.com');
            domManager.setButtonState(domManager.elements.saveBtn, 'Test', false);

            const metrics = domManager.getPerformanceMetrics();
            const stats = domManager.getElementsStatistics();

            expect(Object.keys(metrics).length).toBeGreaterThan(0);
            expect(stats.total).toBe(10);
        });
    });

    describe('Наследование от BaseManager', () => {
        test('должен иметь методы BaseManager', () => {
            expect(typeof domManager.updateState).toBe('function');
            expect(typeof domManager.getState).toBe('function');
            expect(typeof domManager.resetState).toBe('function');
        });

        test('должен корректно обновлять состояние', () => {
            domManager.updateState({ customProperty: 'test value' });
            
            const state = domManager.getState();
            expect(state.customProperty).toBe('test value');
        });
    });
});
