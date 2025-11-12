/**
 * @jest-environment jsdom
 */

const LocaleManager = require('../../src/base/LocaleManager.js');
const CONFIG = require('../../src/config/config.js');

describe('LocaleManager (base)', () => {
    beforeEach(() => {
        LocaleManager._localeCache = null;
        LocaleManager._localeLoadingPromise = null;
        jest.clearAllMocks();
    });

    afterEach(() => {
        LocaleManager._localeCache = null;
        LocaleManager._localeLoadingPromise = null;
        jest.clearAllMocks();
    });

    describe('detectBrowserLocale', () => {
        test('возвращает null если navigator не определен', () => {
            const originalNavigator = global.navigator;
            delete global.navigator;
            
            const result = LocaleManager.detectBrowserLocale();
            
            expect(result).toBeNull();
            
            global.navigator = originalNavigator;
        });

        test('возвращает null если browserLang отсутствует', () => {
            Object.defineProperty(navigator, 'language', {
                value: undefined,
                configurable: true
            });
            Object.defineProperty(navigator, 'userLanguage', {
                value: undefined,
                configurable: true
            });
            
            const result = LocaleManager.detectBrowserLocale();
            
            expect(result).toBeNull();
        });

        test('возвращает null если langCode не поддерживается', () => {
            Object.defineProperty(navigator, 'language', {
                value: 'fr-FR',
                configurable: true
            });
            
            const result = LocaleManager.detectBrowserLocale();
            
            expect(result).toBeNull();
        });

        test('возвращает локаль если она поддерживается', () => {
            Object.defineProperty(navigator, 'language', {
                value: 'en-US',
                configurable: true
            });
            
            const result = LocaleManager.detectBrowserLocale();
            
            expect(result).toBe('en');
        });

        test('обрабатывает ошибки и возвращает null', () => {
            Object.defineProperty(navigator, 'language', {
                get() {
                    throw new Error('Navigator error');
                },
                configurable: true
            });
            
            const result = LocaleManager.detectBrowserLocale();
            
            expect(result).toBeNull();
        });
    });

    describe('_initLocaleCache', () => {
        test('возвращает кэш если он уже установлен', () => {
            LocaleManager._localeCache = 'ru';
            
            const result = LocaleManager._initLocaleCache();
            
            expect(result).toBe('ru');
        });

        test('загружает локаль из localStorage если она поддерживается', () => {
            localStorage.setItem(CONFIG.LOCALE.CACHE_KEY, 'ru');
            
            const result = LocaleManager._initLocaleCache();
            
            expect(result).toBe('ru');
            expect(LocaleManager._localeCache).toBe('ru');
        });

        test('не использует localStorage если локаль не поддерживается', () => {
            localStorage.setItem(CONFIG.LOCALE.CACHE_KEY, 'fr');
            
            const result = LocaleManager._initLocaleCache();
            
            expect(result).not.toBe('fr');
        });

        test('обрабатывает ошибки localStorage', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            const result = LocaleManager._initLocaleCache();
            
            expect(result).toBeDefined();
        });

        test('использует detectBrowserLocale если localStorage недоступен', () => {
            const originalLocalStorage = global.localStorage;
            delete global.localStorage;
            
            Object.defineProperty(navigator, 'language', {
                value: 'en-US',
                configurable: true
            });
            
            const result = LocaleManager._initLocaleCache();
            
            expect(result).toBe('en');
            
            global.localStorage = originalLocalStorage;
        });
    });

    describe('updateLocaleCache', () => {
        test('обновляет кэш если локаль поддерживается', () => {
            LocaleManager.updateLocaleCache('ru');
            
            expect(LocaleManager._localeCache).toBe('ru');
        });

        test('не обновляет кэш если локаль не поддерживается', () => {
            LocaleManager._localeCache = 'en';
            LocaleManager.updateLocaleCache('fr');
            
            expect(LocaleManager._localeCache).toBe('en');
        });

        test('сохраняет в localStorage если доступен', () => {
            LocaleManager.updateLocaleCache('ru');
            
            expect(localStorage.getItem(CONFIG.LOCALE.CACHE_KEY)).toBe('ru');
        });

        test('обрабатывает ошибки localStorage', () => {
            jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            expect(() => LocaleManager.updateLocaleCache('ru')).not.toThrow();
        });

        test('сохраняет в chrome.storage если доступен', () => {
            global.chrome = {
                storage: {
                    local: {
                        set: jest.fn((data, callback) => {
                            if (callback) callback();
                        })
                    }
                }
            };
            
            LocaleManager.updateLocaleCache('ru');
            
            expect(global.chrome.storage.local.set).toHaveBeenCalled();
        });

        test('обрабатывает ошибки chrome.storage', () => {
            global.chrome = {
                storage: {
                    local: {
                        set: jest.fn((data, callback) => {
                            if (callback) {
                                global.chrome.runtime = { lastError: new Error('Storage error') };
                                callback();
                            }
                        })
                    }
                }
            };
            
            expect(() => LocaleManager.updateLocaleCache('ru')).not.toThrow();
        });
    });

    describe('_loadLocaleFromStorage', () => {
        test('загружает локаль из chrome.storage если она поддерживается', async () => {
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((keys, callback) => {
                            callback({ [CONFIG.LOCALE.STORAGE_KEY]: 'ru' });
                        })
                    }
                }
            };
            
            const localeManager = new LocaleManager();
            await localeManager._loadLocaleFromStorage();
            
            expect(LocaleManager._localeCache).toBe('ru');
        });

        test('не обновляет кэш если локаль не поддерживается', async () => {
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((keys, callback) => {
                            callback({ [CONFIG.LOCALE.STORAGE_KEY]: 'fr' });
                        })
                    }
                }
            };
            
            LocaleManager._localeCache = 'en';
            const localeManager = new LocaleManager();
            await localeManager._loadLocaleFromStorage();
            
            expect(LocaleManager._localeCache).toBe('en');
        });

        test('обрабатывает ошибки при загрузке', async () => {
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((keys, callback) => {
                            throw new Error('Storage error');
                        })
                    }
                }
            };
            
            const localeManager = new LocaleManager();
            
            await expect(localeManager._loadLocaleFromStorage()).resolves.not.toThrow();
            expect(LocaleManager._localeLoadingPromise).toBeNull();
        });

        test('не загружает если chrome.storage недоступен', async () => {
            delete global.chrome;
            
            const localeManager = new LocaleManager();
            await localeManager._loadLocaleFromStorage();
            
            expect(LocaleManager._localeLoadingPromise).toBeNull();
        });
    });

    describe('_getLocaleLoadingPromise', () => {
        test('возвращает null если localStorage доступен', () => {
            const localeManager = new LocaleManager();
            
            const result = localeManager._getLocaleLoadingPromise();
            
            expect(result).toBeNull();
        });

        test('создает promise если localStorage недоступен и chrome.storage доступен', () => {
            const originalLocalStorage = global.localStorage;
            delete global.localStorage;
            
            global.chrome = {
                storage: {
                    local: {
                        get: jest.fn((keys, callback) => {
                            callback({ [CONFIG.LOCALE.STORAGE_KEY]: 'ru' });
                        })
                    }
                }
            };
            
            const localeManager = new LocaleManager();
            const promise1 = localeManager._getLocaleLoadingPromise();
            const promise2 = localeManager._getLocaleLoadingPromise();
            
            expect(promise1).not.toBeNull();
            expect(promise1).toBe(promise2); // Должен вернуть тот же promise
            
            global.localStorage = originalLocalStorage;
        });

        test('возвращает null если chrome.storage недоступен', () => {
            const originalLocalStorage = global.localStorage;
            delete global.localStorage;
            delete global.chrome;
            
            const localeManager = new LocaleManager();
            const result = localeManager._getLocaleLoadingPromise();
            
            expect(result).toBeNull();
            
            global.localStorage = originalLocalStorage;
        });
    });

    describe('_getTranslateFn', () => {
        test('использует translateFn если она предоставлена', () => {
            const localeManager = new LocaleManager();
            const customTranslateFn = jest.fn((key) => `Custom: ${key}`);
            
            const translateFn = localeManager._getTranslateFn(customTranslateFn);
            
            expect(translateFn).toBe(customTranslateFn);
        });

        test('создает функцию перевода если translateFn не предоставлена', () => {
            LocaleManager._localeCache = 'en';
            const localeManager = new LocaleManager();
            
            const translateFn = localeManager._getTranslateFn();
            
            expect(typeof translateFn).toBe('function');
        });

        test('использует кэш локали если он установлен', () => {
            LocaleManager._localeCache = 'ru';
            const localeManager = new LocaleManager();
            
            const translateFn = localeManager._getTranslateFn();
            const result = translateFn('common.languageName');
            
            expect(result).toBeDefined();
        });

        test('инициализирует кэш если он не установлен', () => {
            LocaleManager._localeCache = null;
            Object.defineProperty(navigator, 'language', {
                value: 'en-US',
                configurable: true
            });
            
            const localeManager = new LocaleManager();
            localeManager._getTranslateFn();
            
            expect(LocaleManager._localeCache).not.toBeNull();
        });

        test('возвращает ключ если перевод не найден', () => {
            LocaleManager._localeCache = 'en';
            const localeManager = new LocaleManager();
            const translateFn = localeManager._getTranslateFn();
            
            const result = translateFn('nonexistent.key');
            
            expect(result).toBe('nonexistent.key');
        });

        test('подставляет параметры в перевод', () => {
            LocaleManager._localeCache = 'en';
            const localeManager = new LocaleManager();
            const translateFn = localeManager._getTranslateFn();
            
            // Предполагаем, что есть ключ с параметрами
            const result = translateFn('test.key', { name: 'John' });
            
            expect(typeof result).toBe('string');
        });
    });
});
