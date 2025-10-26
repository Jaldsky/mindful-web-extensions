/**
 * Тесты для DOMManager класса (locale_manager)
 * Тестирует функциональность локализации DOM элементов
 */

const DOMManager = require('../../src/locale_manager/DOMManager.js');

describe('DOMManager (locale_manager)', () => {
    let domManager;
    let translationCallback;

    beforeEach(() => {
        // Мокируем функцию перевода
        translationCallback = jest.fn((key) => {
            const translations = {
                'app.title': 'Test Application',
                'app.button': 'Click Me',
                'app.description': 'Test Description'
            };
            return translations[key] || key;
        });

        domManager = new DOMManager(translationCallback, { enableLogging: false });

        // Очищаем DOM
        document.body.innerHTML = '';
    });

    afterEach(() => {
        if (domManager) {
            domManager.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('constructor', () => {
        test('should initialize with translation callback', () => {
            expect(domManager).toBeDefined();
            expect(domManager.getTranslation).toBeDefined();
            expect(typeof domManager.getTranslation).toBe('function');
        });

        test('should throw error without translation callback', () => {
            expect(() => new DOMManager()).toThrow(TypeError);
            expect(() => new DOMManager(null)).toThrow(TypeError);
            expect(() => new DOMManager('invalid')).toThrow(TypeError);
        });

        test('should have I18N_ATTRIBUTE constant', () => {
            expect(DOMManager.I18N_ATTRIBUTE).toBe('data-i18n');
        });

        test('should have I18N_ATTR_ATTRIBUTE constant', () => {
            expect(DOMManager.I18N_ATTR_ATTRIBUTE).toBe('data-i18n-attr');
        });
    });

    describe('localizeDOM', () => {
        test('should localize elements with data-i18n attribute', () => {
            document.body.innerHTML = `
                <div data-i18n="app.title"></div>
                <button data-i18n="app.button"></button>
            `;

            const count = domManager.localizeDOM();

            expect(count).toBe(2);
            expect(document.querySelector('div').textContent).toBe('Test Application');
            expect(document.querySelector('button').textContent).toBe('Click Me');
        });

        test('should localize element attributes', () => {
            document.body.innerHTML = `
                <input data-i18n="app.title" data-i18n-attr="placeholder" />
            `;

            const count = domManager.localizeDOM();

            expect(count).toBe(1);
            expect(document.querySelector('input').getAttribute('placeholder')).toBe('Test Application');
        });

        test('should handle empty root', () => {
            document.body.innerHTML = '';

            const count = domManager.localizeDOM();

            expect(count).toBe(0);
        });

        test('should return 0 for null root', () => {
            const count = domManager.localizeDOM(null);

            expect(count).toBe(0);
        });

        test('should update statistics', () => {
            document.body.innerHTML = `
                <div data-i18n="app.title"></div>
            `;

            domManager.localizeDOM();

            const stats = domManager.getStatistics();
            expect(stats.totalLocalizations).toBe(1);
            expect(stats.elementsLocalized).toBe(1);
            expect(stats.lastElementCount).toBe(1);
        });

        test('should work with custom root element', () => {
            const container = document.createElement('div');
            container.innerHTML = `
                <span data-i18n="app.title"></span>
            `;
            document.body.appendChild(container);

            const count = domManager.localizeDOM(container);

            expect(count).toBe(1);
            expect(container.querySelector('span').textContent).toBe('Test Application');
        });

        test('should skip elements without key', () => {
            document.body.innerHTML = `
                <div data-i18n=""></div>
                <div data-i18n="app.title"></div>
            `;

            const count = domManager.localizeDOM();

            expect(count).toBe(1);
        });
    });

    describe('localizeElementBySelector', () => {
        test('should localize single element by selector', () => {
            document.body.innerHTML = '<div id="test"></div>';

            const result = domManager.localizeElementBySelector('#test', 'app.title');

            expect(result).toBe(true);
            expect(document.getElementById('test').textContent).toBe('Test Application');
        });

        test('should localize element attribute by selector', () => {
            document.body.innerHTML = '<input id="test" />';

            const result = domManager.localizeElementBySelector('#test', 'app.title', 'placeholder');

            expect(result).toBe(true);
            expect(document.getElementById('test').getAttribute('placeholder')).toBe('Test Application');
        });

        test('should return false when element not found', () => {
            const result = domManager.localizeElementBySelector('#nonexistent', 'app.title');

            expect(result).toBe(false);
        });
    });

    describe('localizeElementsBySelector', () => {
        test('should localize multiple elements', () => {
            document.body.innerHTML = `
                <div class="test"></div>
                <div class="test"></div>
                <div class="test"></div>
            `;

            const count = domManager.localizeElementsBySelector('.test', 'app.title');

            expect(count).toBe(3);
            document.querySelectorAll('.test').forEach(el => {
                expect(el.textContent).toBe('Test Application');
            });
        });

        test('should return 0 when no elements found', () => {
            const count = domManager.localizeElementsBySelector('.nonexistent', 'app.title');

            expect(count).toBe(0);
        });

        test('should localize attributes for multiple elements', () => {
            document.body.innerHTML = `
                <input class="test" />
                <input class="test" />
            `;

            const count = domManager.localizeElementsBySelector('.test', 'app.title', 'placeholder');

            expect(count).toBe(2);
            document.querySelectorAll('.test').forEach(el => {
                expect(el.getAttribute('placeholder')).toBe('Test Application');
            });
        });
    });

    describe('addLocalizationAttributes', () => {
        test('should add i18n attributes to element', () => {
            const element = document.createElement('div');

            const result = domManager.addLocalizationAttributes(element, 'app.title');

            expect(result).toBe(true);
            expect(element.getAttribute('data-i18n')).toBe('app.title');
            expect(element.textContent).toBe('Test Application');
        });

        test('should add i18n attributes with target attribute', () => {
            const element = document.createElement('input');

            const result = domManager.addLocalizationAttributes(element, 'app.title', 'placeholder');

            expect(result).toBe(true);
            expect(element.getAttribute('data-i18n')).toBe('app.title');
            expect(element.getAttribute('data-i18n-attr')).toBe('placeholder');
            expect(element.getAttribute('placeholder')).toBe('Test Application');
        });

        test('should return false for null element', () => {
            const result = domManager.addLocalizationAttributes(null, 'app.title');

            expect(result).toBe(false);
        });
    });

    describe('removeLocalizationAttributes', () => {
        test('should remove i18n attributes', () => {
            const element = document.createElement('div');
            element.setAttribute('data-i18n', 'app.title');
            element.setAttribute('data-i18n-attr', 'title');

            const result = domManager.removeLocalizationAttributes(element);

            expect(result).toBe(true);
            expect(element.hasAttribute('data-i18n')).toBe(false);
            expect(element.hasAttribute('data-i18n-attr')).toBe(false);
        });

        test('should return false for null element', () => {
            const result = domManager.removeLocalizationAttributes(null);

            expect(result).toBe(false);
        });
    });

    describe('getLocalizableElements', () => {
        test('should return all elements with i18n attribute', () => {
            document.body.innerHTML = `
                <div data-i18n="app.title"></div>
                <span data-i18n="app.button"></span>
                <p>No i18n</p>
            `;

            const elements = domManager.getLocalizableElements();

            expect(elements.length).toBe(2);
        });

        test('should work with custom root', () => {
            const container = document.createElement('div');
            container.innerHTML = '<span data-i18n="app.title"></span>';
            document.body.appendChild(container);

            const elements = domManager.getLocalizableElements(container);

            expect(elements.length).toBe(1);
        });
    });

    describe('getLocalizableElementsCount', () => {
        test('should return count of localizable elements', () => {
            document.body.innerHTML = `
                <div data-i18n="app.title"></div>
                <div data-i18n="app.button"></div>
            `;

            const count = domManager.getLocalizableElementsCount();

            expect(count).toBe(2);
        });
    });

    describe('getStatistics', () => {
        test('should return correct statistics', () => {
            document.body.innerHTML = `
                <div data-i18n="app.title"></div>
                <div data-i18n="app.button"></div>
            `;

            domManager.localizeDOM();
            domManager.localizeDOM();

            const stats = domManager.getStatistics();

            expect(stats.totalLocalizations).toBe(2);
            expect(stats.elementsLocalized).toBe(4);
            expect(stats.errors).toBe(0);
            expect(stats.lastLocalizationTime).toBeDefined();
            expect(stats.averageElementsPerLocalization).toBe(2);
        });
    });

    describe('resetStatistics', () => {
        test('should reset all statistics', () => {
            document.body.innerHTML = '<div data-i18n="app.title"></div>';
            domManager.localizeDOM();

            domManager.resetStatistics();

            const stats = domManager.getStatistics();
            expect(stats.totalLocalizations).toBe(0);
            expect(stats.elementsLocalized).toBe(0);
            expect(stats.errors).toBe(0);
        });
    });

    describe('destroy', () => {
        test('should cleanup resources', () => {
            document.body.innerHTML = '<div data-i18n="app.title"></div>';
            domManager.localizeDOM();

            domManager.destroy();

            const stats = domManager.getStatistics();
            expect(stats.totalLocalizations).toBe(0);
        });
    });

    describe('performance tracking', () => {
        test('should track localization performance', () => {
            document.body.innerHTML = '<div data-i18n="app.title"></div>';

            domManager.localizeDOM();

            const metrics = domManager.getPerformanceMetrics();
            expect(metrics.localizeDOM_lastDuration).toBeDefined();
            expect(typeof metrics.localizeDOM_lastDuration).toBe('number');
        });
    });
});
