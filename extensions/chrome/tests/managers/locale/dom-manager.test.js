/**
 * Тесты для DOMManager класса (locale_manager)
 * Тестирует функциональность локализации DOM элементов
 */

const DOMManager = require('../../../src/managers/locale/DOMManager.js');
const CONFIG = require('../../../src/config/config.js');

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

        test('should have I18N_ATTRIBUTE constant from config', () => {
            expect(DOMManager.I18N_ATTRIBUTE).toBe(CONFIG.LOCALE_DOM.I18N_ATTRIBUTE);
        });

        test('should have I18N_ATTR_ATTRIBUTE constant from config', () => {
            expect(DOMManager.I18N_ATTR_ATTRIBUTE).toBe(CONFIG.LOCALE_DOM.I18N_ATTR_ATTRIBUTE);
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

    describe('error handling', () => {
        test('should handle errors in _localizeElement during localizeDOM', () => {
            document.body.innerHTML = '<div data-i18n="app.title"></div>';
            
            // Mock getTranslation to throw an error
            domManager.getTranslation = jest.fn(() => {
                throw new Error('Translation error');
            });

            const count = domManager.localizeDOM();
            
            expect(count).toBe(0);
            const stats = domManager.getStatistics();
            expect(stats.errors).toBeGreaterThan(0);
        });

        test('should handle querySelectorAll errors in localizeDOM', () => {
            const badRoot = {
                querySelectorAll: jest.fn(() => {
                    throw new Error('querySelector error');
                })
            };

            const count = domManager.localizeDOM(badRoot);
            
            expect(count).toBe(0);
            const stats = domManager.getStatistics();
            expect(stats.errors).toBeGreaterThan(0);
        });

        test('should handle errors in localizeElementBySelector', () => {
            document.querySelector = jest.fn(() => {
                throw new Error('querySelector error');
            });

            const result = domManager.localizeElementBySelector('#test', 'app.title');
            
            expect(result).toBe(false);
            const stats = domManager.getStatistics();
            expect(stats.errors).toBeGreaterThan(0);
        });

        test('should handle errors in destroy', () => {
            // Should not throw
            expect(() => domManager.destroy()).not.toThrow();
        });
    });
});
