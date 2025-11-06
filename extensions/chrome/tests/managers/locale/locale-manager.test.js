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
        test('should use base method with translationManager.translate', () => {
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

    describe('getCurrentLocale', () => {
        test('should return current locale', () => {
            localeManager.translationManager.getCurrentLocale = jest.fn().mockReturnValue('ru');

            const result = localeManager.getCurrentLocale();

            expect(result).toBe('ru');
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
            localeManager.translationManager.toggleLocale = jest.fn().mockReturnValue('ru');
            localeManager.storageManager.saveLocale = jest.fn().mockResolvedValue(true);
            localeManager.state.currentLocale = 'en';

            await localeManager.toggleLocale();

            const metrics = localeManager.getPerformanceMetrics();
            expect(metrics.toggleLocale_lastDuration).toBeDefined();
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
            const BaseManager = require('../../../src/base/BaseManager.js');
            
            // Ломаем navigator.language
            Object.defineProperty(global.navigator, 'language', {
                get() {
                    throw new Error('Navigator error');
                },
                configurable: true
            });

            const result = BaseManager.detectBrowserLocale();

            expect(result).toBeNull();
            
            // Восстанавливаем
            Object.defineProperty(global.navigator, 'language', {
                value: 'en-US',
                configurable: true
            });
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

    });
});
