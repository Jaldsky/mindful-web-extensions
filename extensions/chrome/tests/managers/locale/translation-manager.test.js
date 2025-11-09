/**
 * Тесты для TranslationManager класса
 * Тестирует функциональность работы с переводами
 */

const TranslationManager = require('../../../src/managers/locale/TranslationManager.js');

// Мокируем модули локализации
jest.mock('../../../src/locales/en.js', () => ({
    common: {
        languageName: 'English'
    },
    app: {
        title: 'Test App',
        greeting: 'Hello, {{name}}!'
    },
    nested: {
        deep: {
            value: 'Deep value'
        }
    }
}), { virtual: true });

jest.mock('../../../src/locales/ru.js', () => ({
    common: {
        languageName: 'Русский'
    },
    app: {
        title: 'Тестовое приложение',
        greeting: 'Привет, {{name}}!'
    }
}), { virtual: true });

describe('TranslationManager', () => {
    let translationManager;

    beforeEach(() => {
        translationManager = new TranslationManager({ enableLogging: false });
    });

    afterEach(() => {
        if (translationManager) {
            translationManager.destroy();
        }
    });

    describe('constructor', () => {
        test('should initialize with default locale', () => {
            expect(translationManager).toBeDefined();
            expect(translationManager.getCurrentLocale()).toBe('en');
        });

        test('should initialize with custom locale', () => {
            const manager = new TranslationManager({ defaultLocale: 'ru' });
            expect(manager.getCurrentLocale()).toBe('ru');
            manager.destroy();
        });

    });

    describe('translate', () => {
        test('should translate simple key', () => {
            const translation = translationManager.translate('app.title');
            expect(translation).toBe('Test App');
        });

        test('should translate with interpolation', () => {
            const translation = translationManager.translate('app.greeting', { name: 'John' });
            expect(translation).toBe('Hello, John!');
        });

        test('should handle nested keys', () => {
            const translation = translationManager.translate('nested.deep.value');
            expect(translation).toBe('Deep value');
        });

        test('should return key when translation not found', () => {
            const translation = translationManager.translate('nonexistent.key');
            expect(translation).toBe('nonexistent.key');
        });

        test('should track translation requests', () => {
            translationManager.translate('app.title');
            translationManager.translate('app.title');

            expect(translationManager.statistics.translationRequests).toBe(2);
        });

        test('should track missing translations', () => {
            translationManager.translate('missing.key');

            expect(translationManager.statistics.missingTranslations).toBe(1);
            expect(translationManager.statistics.missingKeys.has('missing.key')).toBe(true);
        });

        test('should track interpolations', () => {
            translationManager.translate('app.greeting', { name: 'John' });

            expect(translationManager.statistics.interpolations).toBe(1);
        });
    });

    describe('setLocale', () => {
        test('should change locale', () => {
            const result = translationManager.setLocale('ru');

            expect(result).toBe(true);
            expect(translationManager.getCurrentLocale()).toBe('ru');
        });

        test('should reject unsupported locale', () => {
            const result = translationManager.setLocale('fr');

            expect(result).toBe(false);
            expect(translationManager.getCurrentLocale()).toBe('en');
        });

        test('should return true when setting same locale', () => {
            const result = translationManager.setLocale('en');

            expect(result).toBe(true);
            expect(translationManager.getCurrentLocale()).toBe('en');
        });

        test('should update state when locale changes', () => {
            translationManager.setLocale('ru');

            const state = translationManager.getState();
            expect(state.currentLocale).toBe('ru');
            expect(state.lastLocaleChange).toBeDefined();
        });
    });

    describe('getCurrentLocale', () => {
        test('should return current locale', () => {
            expect(translationManager.getCurrentLocale()).toBe('en');

            translationManager.setLocale('ru');
            expect(translationManager.getCurrentLocale()).toBe('ru');
        });
    });

    describe('isLocaleSupported', () => {
        test('should return true for supported locale', () => {
            expect(translationManager.isLocaleSupported('en')).toBe(true);
            expect(translationManager.isLocaleSupported('ru')).toBe(true);
        });

        test('should return false for unsupported locale', () => {
            expect(translationManager.isLocaleSupported('fr')).toBe(false);
            expect(translationManager.isLocaleSupported('de')).toBe(false);
        });
    });

    describe('toggleLocale', () => {
        test('should toggle between locales', () => {
            expect(translationManager.getCurrentLocale()).toBe('en');

            let newLocale = translationManager.toggleLocale();
            expect(newLocale).toBe('ru');
            expect(translationManager.getCurrentLocale()).toBe('ru');

            newLocale = translationManager.toggleLocale();
            expect(newLocale).toBe('en');
            expect(translationManager.getCurrentLocale()).toBe('en');
        });
    });

    describe('destroy', () => {
        test('should cleanup resources', () => {
            translationManager.translate('missing.key');

            translationManager.destroy();

            expect(translationManager.statistics.translationRequests).toBe(0);
            expect(translationManager.statistics.missingKeys.size).toBe(0);
        });
    });

    describe('performance tracking', () => {
        test('should track translation performance', () => {
            translationManager.translate('app.title');

            const metrics = translationManager.getPerformanceMetrics();
            expect(metrics.translate_lastDuration).toBeDefined();
            expect(typeof metrics.translate_lastDuration).toBe('number');
        });
    });
});
