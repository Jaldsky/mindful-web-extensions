/**
 * Тесты для TranslationManager класса
 * Тестирует функциональность работы с переводами
 */

const TranslationManager = require('../../src/locale_manager/TranslationManager.js');

// Мокируем модули локализации
jest.mock('../../locales/en.js', () => ({
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

jest.mock('../../locales/ru.js', () => ({
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

        test('should have LOCALES constant', () => {
            expect(TranslationManager.LOCALES).toEqual({
                EN: 'en',
                RU: 'ru'
            });
        });

        test('should have DEFAULT_LOCALE constant', () => {
            expect(TranslationManager.DEFAULT_LOCALE).toBe('en');
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

            const stats = translationManager.getStatistics();
            expect(stats.translationRequests).toBe(2);
        });

        test('should track missing translations', () => {
            translationManager.translate('missing.key');

            const stats = translationManager.getStatistics();
            expect(stats.missingTranslations).toBe(1);
            expect(stats.missingKeys).toContain('missing.key');
        });

        test('should track interpolations', () => {
            translationManager.translate('app.greeting', { name: 'John' });

            const stats = translationManager.getStatistics();
            expect(stats.interpolations).toBe(1);
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

    describe('getAvailableLocales', () => {
        test('should return array of available locales', () => {
            const locales = translationManager.getAvailableLocales();

            expect(Array.isArray(locales)).toBe(true);
            expect(locales.length).toBe(2);
            expect(locales[0]).toHaveProperty('code');
            expect(locales[0]).toHaveProperty('name');
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

    describe('getCurrentLocaleInfo', () => {
        test('should return info about current locale', () => {
            const info = translationManager.getCurrentLocaleInfo();

            expect(info).toHaveProperty('code');
            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('translations');
            expect(info.code).toBe('en');
        });
    });

    describe('hasTranslation', () => {
        test('should return true for existing translation', () => {
            expect(translationManager.hasTranslation('app.title')).toBe(true);
        });

        test('should return false for non-existing translation', () => {
            expect(translationManager.hasTranslation('nonexistent.key')).toBe(false);
        });

        test('should check translation in specific locale', () => {
            expect(translationManager.hasTranslation('app.title', 'ru')).toBe(true);
        });
    });

    describe('getAllKeys', () => {
        test('should return all translation keys', () => {
            const keys = translationManager.getAllKeys();

            expect(Array.isArray(keys)).toBe(true);
            expect(keys.length).toBeGreaterThan(0);
            expect(keys).toContain('app.title');
            expect(keys).toContain('app.greeting');
        });

        test('should return keys for specific locale', () => {
            const keys = translationManager.getAllKeys('ru');

            expect(Array.isArray(keys)).toBe(true);
            expect(keys).toContain('app.title');
        });
    });

    describe('getStatistics', () => {
        test('should return correct statistics', () => {
            translationManager.translate('app.title');
            translationManager.translate('missing.key');
            translationManager.translate('app.greeting', { name: 'Test' });

            const stats = translationManager.getStatistics();

            expect(stats.translationRequests).toBe(3);
            expect(stats.missingTranslations).toBe(1);
            expect(stats.interpolations).toBe(1);
            expect(stats.errors).toBe(0);
            expect(stats.currentLocale).toBe('en');
            expect(Array.isArray(stats.missingKeys)).toBe(true);
        });
    });

    describe('resetStatistics', () => {
        test('should reset all statistics', () => {
            translationManager.translate('app.title');
            translationManager.translate('missing.key');

            translationManager.resetStatistics();

            const stats = translationManager.getStatistics();
            expect(stats.translationRequests).toBe(0);
            expect(stats.missingTranslations).toBe(0);
            expect(stats.interpolations).toBe(0);
            expect(stats.errors).toBe(0);
            expect(stats.missingKeys.length).toBe(0);
        });
    });

    describe('destroy', () => {
        test('should cleanup resources', () => {
            translationManager.translate('missing.key');

            translationManager.destroy();

            const stats = translationManager.getStatistics();
            expect(stats.translationRequests).toBe(0);
            expect(stats.missingKeys.length).toBe(0);
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
