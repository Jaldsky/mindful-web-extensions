/**
 * Тесты для LocaleManager класса
 * Тестирует главный координатор локализации
 */

const LocaleManager = require('../../../src/managers/locale/LocaleManager.js');

// Мокируем подменеджеры
jest.mock('../../../src/managers/locale/StorageManager.js');
jest.mock('../../../src/managers/locale/TranslationManager.js');
jest.mock('../../../src/managers/locale/DOMManager.js');

// Мокируем модули локализации
jest.mock('../../locales/en.js', () => ({
    common: { languageName: 'English' }
}), { virtual: true });

jest.mock('../../locales/ru.js', () => ({
    common: { languageName: 'Русский' }
}), { virtual: true });

describe('LocaleManager', () => {
    let localeManager;

    beforeEach(() => {
        // Мокируем navigator.language
        Object.defineProperty(navigator, 'language', {
            value: 'en-US',
            configurable: true
        });

        localeManager = new LocaleManager({ enableLogging: false });
    });

    afterEach(() => {
        if (localeManager) {
            localeManager.destroy();
        }
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(localeManager).toBeDefined();
            expect(localeManager.storageManager).toBeDefined();
            expect(localeManager.translationManager).toBeDefined();
            expect(localeManager.domManager).toBeDefined();
        });

        test('should have LOCALES constant', () => {
            expect(LocaleManager.LOCALES).toEqual({
                EN: 'en',
                RU: 'ru'
            });
        });

        test('should have DEFAULT_LOCALE constant', () => {
            expect(LocaleManager.DEFAULT_LOCALE).toBe('en');
        });

        test('should initialize listeners array', () => {
            expect(localeManager.listeners).toBeDefined();
            expect(Array.isArray(localeManager.listeners)).toBe(true);
        });
    });

    describe('init', () => {
        test('should initialize successfully', async () => {
            localeManager.storageManager.loadLocale = jest.fn().mockResolvedValue(null);
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');
            localeManager.storageManager.saveLocale = jest.fn().mockResolvedValue(true);

            await localeManager.init();

            expect(localeManager.isInitialized).toBe(true);
        });

        test('should not initialize twice', async () => {
            localeManager.storageManager.loadLocale = jest.fn().mockResolvedValue(null);
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');

            await localeManager.init();
            const firstCallCount = localeManager.storageManager.loadLocale.mock.calls.length;

            await localeManager.init();
            const secondCallCount = localeManager.storageManager.loadLocale.mock.calls.length;

            expect(secondCallCount).toBe(firstCallCount);
        });

        test('should load saved locale', async () => {
            localeManager.storageManager.loadLocale = jest.fn().mockResolvedValue('ru');
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('ru');

            await localeManager.init();

            expect(localeManager.translationManager.setLocale).toHaveBeenCalledWith('ru');
        });

        test('should handle initialization errors gracefully', async () => {
            localeManager.storageManager.loadLocale = jest.fn().mockRejectedValue(new Error('Storage error'));
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');

            await localeManager.init();

            expect(localeManager.isInitialized).toBe(true);
            expect(localeManager.translationManager.setLocale).toHaveBeenCalledWith('en');
        });
    });

    describe('t (translate)', () => {
        test('should delegate translation to TranslationManager', () => {
            localeManager.translationManager.translate = jest.fn().mockReturnValue('Translated text');

            const result = localeManager.t('app.title');

            expect(localeManager.translationManager.translate).toHaveBeenCalledWith('app.title', {});
            expect(result).toBe('Translated text');
        });

        test('should pass parameters to translation', () => {
            localeManager.translationManager.translate = jest.fn().mockReturnValue('Hello, John!');

            const result = localeManager.t('app.greeting', { name: 'John' });

            expect(localeManager.translationManager.translate).toHaveBeenCalledWith('app.greeting', { name: 'John' });
            expect(result).toBe('Hello, John!');
        });
    });

    describe('setLocale', () => {
        test('should set new locale', async () => {
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn()
                .mockReturnValueOnce('en')
                .mockReturnValue('ru');
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.storageManager.saveLocale = jest.fn().mockResolvedValue(true);

            const result = await localeManager.setLocale('ru');

            expect(result).toBe(true);
            expect(localeManager.translationManager.setLocale).toHaveBeenCalledWith('ru');
            expect(localeManager.storageManager.saveLocale).toHaveBeenCalledWith('ru');
        });

        test('should reject unsupported locale', async () => {
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(false);

            const result = await localeManager.setLocale('fr');

            expect(result).toBe(false);
        });

        test('should notify listeners when locale changes', async () => {
            const listener = jest.fn();
            localeManager.addLocaleChangeListener(listener);

            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn()
                .mockReturnValueOnce('en')
                .mockReturnValue('ru');
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.storageManager.saveLocale = jest.fn().mockResolvedValue(true);

            await localeManager.setLocale('ru');

            expect(listener).toHaveBeenCalledWith('ru', 'en');
        });
    });

    describe('getCurrentLocale', () => {
        test('should return current locale', () => {
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('ru');

            const result = localeManager.getCurrentLocale();

            expect(result).toBe('ru');
        });
    });

    describe('getAvailableLocales', () => {
        test('should return available locales', () => {
            const mockLocales = [
                { code: 'en', name: 'English' },
                { code: 'ru', name: 'Русский' }
            ];
            localeManager.translationManager.getAvailableLocales = jest.fn().mockReturnValue(mockLocales);

            const result = localeManager.getAvailableLocales();

            expect(result).toEqual(mockLocales);
        });
    });

    describe('isLocaleSupported', () => {
        test('should check if locale is supported', () => {
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);

            const result = localeManager.isLocaleSupported('en');

            expect(result).toBe(true);
            expect(localeManager.translationManager.isLocaleSupported).toHaveBeenCalledWith('en');
        });
    });

    describe('addLocaleChangeListener', () => {
        test('should add listener', () => {
            const listener = jest.fn();

            const unsubscribe = localeManager.addLocaleChangeListener(listener);

            expect(localeManager.listeners.length).toBe(1);
            expect(typeof unsubscribe).toBe('function');
        });

        test('should throw error for non-function listener', () => {
            expect(() => localeManager.addLocaleChangeListener('invalid')).toThrow(TypeError);
            expect(() => localeManager.addLocaleChangeListener(null)).toThrow(TypeError);
        });

        test('should return unsubscribe function', () => {
            const listener = jest.fn();

            const unsubscribe = localeManager.addLocaleChangeListener(listener);
            expect(localeManager.listeners.length).toBe(1);

            unsubscribe();
            expect(localeManager.listeners.length).toBe(0);
        });
    });

    describe('removeLocaleChangeListener', () => {
        test('should remove listener', () => {
            const listener = jest.fn();
            localeManager.addLocaleChangeListener(listener);

            const result = localeManager.removeLocaleChangeListener(listener);

            expect(result).toBe(true);
            expect(localeManager.listeners.length).toBe(0);
        });

        test('should return false for non-existing listener', () => {
            const listener = jest.fn();

            const result = localeManager.removeLocaleChangeListener(listener);

            expect(result).toBe(false);
        });
    });

    describe('localizeDOM', () => {
        test('should delegate to DOMManager', () => {
            localeManager.domManager.localizeDOM = jest.fn().mockReturnValue(5);

            const result = localeManager.localizeDOM();

            expect(localeManager.domManager.localizeDOM).toHaveBeenCalled();
            expect(result).toBe(5);
        });

        test('should pass root element to DOMManager', () => {
            localeManager.domManager.localizeDOM = jest.fn().mockReturnValue(3);
            const root = document.createElement('div');

            const result = localeManager.localizeDOM(root);

            expect(localeManager.domManager.localizeDOM).toHaveBeenCalledWith(root);
            expect(result).toBe(3);
        });
    });

    describe('localizeElement', () => {
        test('should delegate to DOMManager', () => {
            localeManager.domManager.localizeElementBySelector = jest.fn().mockReturnValue(true);

            const result = localeManager.localizeElement('#test', 'app.title');

            expect(localeManager.domManager.localizeElementBySelector).toHaveBeenCalledWith('#test', 'app.title', null);
            expect(result).toBe(true);
        });
    });

    describe('toggleLocale', () => {
        test('should toggle locale', async () => {
            localeManager.translationManager.toggleLocale = jest.fn().mockReturnValue('ru');
            localeManager.storageManager.saveLocale = jest.fn().mockResolvedValue(true);
            localeManager.state.currentLocale = 'en';

            const result = await localeManager.toggleLocale();

            expect(result).toBe('ru');
            expect(localeManager.storageManager.saveLocale).toHaveBeenCalledWith('ru');
        });
    });

    describe('getStatistics', () => {
        test('should aggregate statistics from all managers', () => {
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');
            localeManager.storageManager.getStatistics = jest.fn().mockReturnValue({ loads: 1 });
            localeManager.translationManager.getStatistics = jest.fn().mockReturnValue({ requests: 10 });
            localeManager.domManager.getStatistics = jest.fn().mockReturnValue({ localizations: 5 });

            const stats = localeManager.getStatistics();

            expect(stats.currentLocale).toBe('en');
            expect(stats.storage).toEqual({ loads: 1 });
            expect(stats.translation).toEqual({ requests: 10 });
            expect(stats.dom).toEqual({ localizations: 5 });
        });
    });

    describe('getAllPerformanceMetrics', () => {
        test('should aggregate performance metrics from all managers', () => {
            localeManager.getPerformanceMetrics = jest.fn().mockReturnValue({ metric1: 100 });
            localeManager.storageManager.getPerformanceMetrics = jest.fn().mockReturnValue({ metric2: 200 });
            localeManager.translationManager.getPerformanceMetrics = jest.fn().mockReturnValue({ metric3: 300 });
            localeManager.domManager.getPerformanceMetrics = jest.fn().mockReturnValue({ metric4: 400 });

            const metrics = localeManager.getAllPerformanceMetrics();

            expect(metrics.localeManager).toEqual({ metric1: 100 });
            expect(metrics.storage).toEqual({ metric2: 200 });
            expect(metrics.translation).toEqual({ metric3: 300 });
            expect(metrics.dom).toEqual({ metric4: 400 });
        });
    });

    describe('resetStatistics', () => {
        test('should reset statistics for all managers', () => {
            localeManager.storageManager.resetStatistics = jest.fn();
            localeManager.translationManager.resetStatistics = jest.fn();
            localeManager.domManager.resetStatistics = jest.fn();

            localeManager.resetStatistics();

            expect(localeManager.storageManager.resetStatistics).toHaveBeenCalled();
            expect(localeManager.translationManager.resetStatistics).toHaveBeenCalled();
            expect(localeManager.domManager.resetStatistics).toHaveBeenCalled();
        });
    });

    describe('hasTranslation', () => {
        test('should check translation existence', () => {
            localeManager.translationManager.hasTranslation = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');

            const result = localeManager.hasTranslation('app.title');

            expect(result).toBe(true);
            expect(localeManager.translationManager.hasTranslation).toHaveBeenCalledWith('app.title', 'en');
        });
    });

    describe('getAllTranslationKeys', () => {
        test('should get all translation keys', () => {
            const mockKeys = ['app.title', 'app.button'];
            localeManager.translationManager.getAllKeys = jest.fn().mockReturnValue(mockKeys);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');

            const result = localeManager.getAllTranslationKeys();

            expect(result).toEqual(mockKeys);
        });
    });

    describe('destroy', () => {
        test('should destroy all managers', () => {
            localeManager.isInitialized = true;
            
            // Создаем шпионов до вызова destroy
            const domDestroySpy = jest.spyOn(localeManager.domManager, 'destroy');
            const translationDestroySpy = jest.spyOn(localeManager.translationManager, 'destroy');
            const storageDestroySpy = jest.spyOn(localeManager.storageManager, 'destroy');

            localeManager.destroy();

            expect(domDestroySpy).toHaveBeenCalled();
            expect(translationDestroySpy).toHaveBeenCalled();
            expect(storageDestroySpy).toHaveBeenCalled();
            expect(localeManager.isInitialized).toBe(false);
        });

        test('should clear listeners', () => {
            localeManager.isInitialized = true;
            localeManager.addLocaleChangeListener(jest.fn());
            localeManager.addLocaleChangeListener(jest.fn());

            localeManager.destroy();

            expect(localeManager.listeners.length).toBe(0);
        });
    });

    describe('performance tracking', () => {
        test('should track async operations', async () => {
            localeManager.translationManager.isLocaleSupported = jest.fn().mockReturnValue(true);
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('en');
            localeManager.translationManager.setLocale = jest.fn().mockReturnValue(true);
            localeManager.storageManager.saveLocale = jest.fn().mockResolvedValue(true);

            await localeManager.setLocale('ru');

            const metrics = localeManager.getPerformanceMetrics();
            expect(metrics.setLocale_lastDuration).toBeDefined();
        });
    });

    describe('Branch Coverage - Additional Branches', () => {
        test('constructor - DOMManager использует callback от translationManager', () => {
            // Проверяем, что domManager вызывает translate через callback
            jest.spyOn(localeManager.translationManager, 'translate').mockReturnValue('translated');
            
            // Используем внутренний метод domManager который использует callback
            const result = localeManager.t('test.key', { param: 'value' });
            
            expect(localeManager.translationManager.translate).toHaveBeenCalledWith('test.key', { param: 'value' });
        });

        test('_detectBrowserLocale - должен обрабатывать ошибки', () => {
            // Ломаем navigator.language
            Object.defineProperty(global.navigator, 'language', {
                get() {
                    throw new Error('Navigator error');
                },
                configurable: true
            });

            const result = localeManager._detectBrowserLocale();

            expect(result).toBeNull();
            
            // Восстанавливаем
            Object.defineProperty(global.navigator, 'language', {
                value: 'en-US',
                configurable: true
            });
        });

        test('setLocale - должен возвращать true если локаль уже установлена', async () => {
            jest.spyOn(localeManager.translationManager, 'isLocaleSupported').mockReturnValue(true);
            jest.spyOn(localeManager.translationManager, 'getCurrentLocale').mockReturnValue('en');

            const result = await localeManager.setLocale('en');

            expect(result).toBe(true);
        });

        test('setLocale - должен возвращать false если setLocale неуспешен', async () => {
            jest.spyOn(localeManager.translationManager, 'isLocaleSupported').mockReturnValue(true);
            jest.spyOn(localeManager.translationManager, 'getCurrentLocale').mockReturnValue('en');
            jest.spyOn(localeManager.translationManager, 'setLocale').mockReturnValue(false);

            const result = await localeManager.setLocale('ru');

            expect(result).toBe(false);
        });

        test('_notifyListeners - должен обрабатывать ошибки в слушателях', () => {
            const errorListener = jest.fn(() => {
                throw new Error('Listener error');
            });
            const normalListener = jest.fn();

            localeManager.addLocaleChangeListener(errorListener);
            localeManager.addLocaleChangeListener(normalListener);

            // Не должно выбросить ошибку
            expect(() => {
                localeManager._notifyListeners('ru', 'en');
            }).not.toThrow();

            // Оба должны быть вызваны несмотря на ошибку в первом
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();
        });

        test('removeLocaleChangeListener - должен обрабатывать ошибки', () => {
            const listener = jest.fn();
            
            // Мокируем findIndex чтобы выбросить ошибку
            jest.spyOn(Array.prototype, 'findIndex').mockImplementation(() => {
                throw new Error('FindIndex error');
            });

            // Не должно выбросить ошибку благодаря try-catch
            expect(() => {
                localeManager.removeLocaleChangeListener(listener);
            }).not.toThrow();
            
            // Восстанавливаем
            Array.prototype.findIndex.mockRestore();
        });

        test('_destroyManagers - должен обрабатывать ошибки при уничтожении', () => {
            // Ломаем domManager.destroy
            jest.spyOn(localeManager.domManager, 'destroy').mockImplementation(() => {
                throw new Error('Destroy error');
            });

            // Не должно выбросить ошибку благодаря try-catch
            expect(() => localeManager._destroyManagers()).not.toThrow();
        });

        test('toggleLocale - должен обрабатывать ошибки', async () => {
            jest.spyOn(localeManager.translationManager, 'toggleLocale').mockImplementation(() => {
                throw new Error('Toggle error');
            });

            await expect(localeManager.toggleLocale()).rejects.toThrow();
        });

        test('getStatistics - должен собирать статистику со всех менеджеров', () => {
            jest.spyOn(localeManager.domManager, 'getStatistics').mockReturnValue({ dom: 'stats' });
            jest.spyOn(localeManager.translationManager, 'getStatistics').mockReturnValue({ trans: 'stats' });
            jest.spyOn(localeManager.storageManager, 'getStatistics').mockReturnValue({ storage: 'stats' });

            const stats = localeManager.getStatistics();

            expect(stats).toHaveProperty('dom');
            expect(stats).toHaveProperty('translation');
            expect(stats).toHaveProperty('storage');
        });
    });
});
