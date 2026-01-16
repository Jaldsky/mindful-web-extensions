/**
 * @jest-environment jsdom
 */

const UIManager = require('../../../../src/managers/options/ui/UIManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

// Мокаем все UI менеджеры
jest.mock('../../../../src/managers/options/ui/DomainExceptionsManager.js');
jest.mock('../../../../src/managers/options/ui/ActivityManager.js');
jest.mock('../../../../src/managers/options/ui/SettingsManager.js');
jest.mock('../../../../src/managers/options/ui/EventHandlersManager.js');
jest.mock('../../../../src/managers/options/ui/LocaleDisplayManager.js');
jest.mock('../../../../src/managers/options/ui/ThemeDisplayManager.js');
jest.mock('../../../../src/managers/options/ui/AuthManager.js');

const DomainExceptionsManager = require('../../../../src/managers/options/ui/DomainExceptionsManager.js');
const ActivityManager = require('../../../../src/managers/options/ui/ActivityManager.js');
const SettingsManager = require('../../../../src/managers/options/ui/SettingsManager.js');
const EventHandlersManager = require('../../../../src/managers/options/ui/EventHandlersManager.js');
const LocaleDisplayManager = require('../../../../src/managers/options/ui/LocaleDisplayManager.js');
const ThemeDisplayManager = require('../../../../src/managers/options/ui/ThemeDisplayManager.js');
const AuthManager = require('../../../../src/managers/options/ui/AuthManager.js');

describe('UIManager', () => {
    let manager;
    let uiManager;
    let mockDomainExceptionsManager;
    let mockActivityManager;
    let mockSettingsManager;
    let mockEventHandlersManager;
    let mockLocaleDisplayManager;
    let mockThemeDisplayManager;
    let mockAuthManager;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Создаем моки для каждого менеджера
        mockDomainExceptionsManager = {
            setDomainExceptions: jest.fn(),
            getDomainExceptions: jest.fn(() => ['example.com']),
            addDomainException: jest.fn(() => true),
            removeDomainException: jest.fn(),
            renderDomainExceptions: jest.fn(),
            domainExceptions: new Set(['example.com'])
        };

        mockActivityManager = {
            loadActivityStats: jest.fn().mockResolvedValue(),
            setActivityRangeByKey: jest.fn(),
            startActivityAutoRefresh: jest.fn(),
            stopActivityAutoRefresh: jest.fn(),
            activityHistory: [{ t: Date.now(), v: 10 }],
            activityChartInitialized: true,
            activityRangeKey: '1h',
            activityRangeMs: 3600000
        };

        mockSettingsManager = {
            saveSettings: jest.fn().mockResolvedValue(true),
            resetToDefault: jest.fn().mockResolvedValue(true)
        };

        mockEventHandlersManager = {
            setupEventHandlers: jest.fn()
        };

        mockLocaleDisplayManager = {
            toggleLanguage: jest.fn().mockResolvedValue(),
            updateLanguageDisplay: jest.fn(),
            onLocaleChange: jest.fn()
        };

        mockThemeDisplayManager = {
            setThemeManager: jest.fn(),
            toggleTheme: jest.fn().mockResolvedValue(),
            updateThemeDisplay: jest.fn()
        };

        mockAuthManager = {
            refreshAuthStatus: jest.fn().mockResolvedValue()
        };

        // Настраиваем конструкторы моков
        DomainExceptionsManager.mockImplementation(() => mockDomainExceptionsManager);
        ActivityManager.mockImplementation(() => mockActivityManager);
        SettingsManager.mockImplementation(() => mockSettingsManager);
        EventHandlersManager.mockImplementation(() => mockEventHandlersManager);
        LocaleDisplayManager.mockImplementation(() => mockLocaleDisplayManager);
        ThemeDisplayManager.mockImplementation(() => mockThemeDisplayManager);
        AuthManager.mockImplementation(() => mockAuthManager);

        manager = createBaseOptionsManager();
        uiManager = new UIManager(manager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляры всех менеджеров', () => {
            expect(DomainExceptionsManager).toHaveBeenCalledWith(manager);
            expect(ActivityManager).toHaveBeenCalledWith(manager);
            expect(SettingsManager).toHaveBeenCalledWith(manager);
            expect(EventHandlersManager).toHaveBeenCalledWith(manager);
            expect(LocaleDisplayManager).toHaveBeenCalledWith(manager);
            expect(ThemeDisplayManager).toHaveBeenCalledWith(manager);
        });

        test('сохраняет ссылки на менеджеры', () => {
            expect(uiManager.domainExceptionsManager).toBe(mockDomainExceptionsManager);
            expect(uiManager.activityManager).toBe(mockActivityManager);
            expect(uiManager.settingsManager).toBe(mockSettingsManager);
            expect(uiManager.eventHandlersManager).toBe(mockEventHandlersManager);
            expect(uiManager.localeDisplayManager).toBe(mockLocaleDisplayManager);
            expect(uiManager.themeDisplayManager).toBe(mockThemeDisplayManager);
            expect(uiManager.authManager).toBe(mockAuthManager);
        });

        test('создает экземпляр AuthManager', () => {
            expect(AuthManager).toHaveBeenCalledWith(manager);
        });
    });

    describe('DomainExceptionsManager делегирование', () => {
        test('setDomainExceptions делегирует вызов', () => {
            const domains = ['example.com', 'test.com'];
            uiManager.setDomainExceptions(domains);
            
            expect(mockDomainExceptionsManager.setDomainExceptions).toHaveBeenCalledWith(domains);
        });

        test('getDomainExceptions делегирует вызов', () => {
            const result = uiManager.getDomainExceptions();
            
            expect(mockDomainExceptionsManager.getDomainExceptions).toHaveBeenCalled();
            expect(result).toEqual(['example.com']);
        });

        test('addDomainException делегирует вызов', () => {
            const result = uiManager.addDomainException('example.com');
            
            expect(mockDomainExceptionsManager.addDomainException).toHaveBeenCalledWith('example.com');
            expect(result).toBe(true);
        });

        test('removeDomainException делегирует вызов', () => {
            uiManager.removeDomainException('example.com');
            
            expect(mockDomainExceptionsManager.removeDomainException).toHaveBeenCalledWith('example.com');
        });

        test('renderDomainExceptions делегирует вызов', () => {
            uiManager.renderDomainExceptions();
            
            expect(mockDomainExceptionsManager.renderDomainExceptions).toHaveBeenCalled();
        });

        test('getter domainExceptions возвращает Set', () => {
            const result = uiManager.domainExceptions;
            
            expect(result).toBe(mockDomainExceptionsManager.domainExceptions);
            expect(result).toBeInstanceOf(Set);
        });
    });

    describe('ActivityManager делегирование', () => {
        test('loadActivityStats делегирует вызов', async () => {
            await uiManager.loadActivityStats();
            
            expect(mockActivityManager.loadActivityStats).toHaveBeenCalled();
        });

        test('setActivityRangeByKey делегирует вызов', () => {
            uiManager.setActivityRangeByKey('1d');
            
            expect(mockActivityManager.setActivityRangeByKey).toHaveBeenCalledWith('1d');
        });

        test('startActivityAutoRefresh делегирует вызов', () => {
            uiManager.startActivityAutoRefresh();
            
            expect(mockActivityManager.startActivityAutoRefresh).toHaveBeenCalled();
        });

        test('stopActivityAutoRefresh делегирует вызов', () => {
            uiManager.stopActivityAutoRefresh();
            
            expect(mockActivityManager.stopActivityAutoRefresh).toHaveBeenCalled();
        });

        test('getter activityHistory возвращает историю', () => {
            const result = uiManager.activityHistory;
            
            expect(result).toBe(mockActivityManager.activityHistory);
            expect(Array.isArray(result)).toBe(true);
        });

        test('getter activityChartInitialized возвращает флаг', () => {
            const result = uiManager.activityChartInitialized;
            
            expect(result).toBe(mockActivityManager.activityChartInitialized);
            expect(typeof result).toBe('boolean');
        });

        test('getter activityRangeKey возвращает ключ', () => {
            const result = uiManager.activityRangeKey;
            
            expect(result).toBe(mockActivityManager.activityRangeKey);
            expect(result).toBe('1h');
        });

        test('getter activityRangeMs возвращает миллисекунды', () => {
            const result = uiManager.activityRangeMs;
            
            expect(result).toBe(mockActivityManager.activityRangeMs);
            expect(result).toBe(3600000);
        });
    });

    describe('SettingsManager делегирование', () => {
        test('saveSettings делегирует вызов', async () => {
            const result = await uiManager.saveSettings();
            
            expect(mockSettingsManager.saveSettings).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        test('resetToDefault делегирует вызов', async () => {
            const result = await uiManager.resetToDefault();
            
            expect(mockSettingsManager.resetToDefault).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });

    describe('EventHandlersManager делегирование', () => {
        test('setupEventHandlers делегирует вызов', () => {
            uiManager.setupEventHandlers();
            
            expect(mockEventHandlersManager.setupEventHandlers).toHaveBeenCalled();
        });
    });

    describe('LocaleDisplayManager делегирование', () => {
        test('toggleLanguage делегирует вызов', async () => {
            await uiManager.toggleLanguage();
            
            expect(mockLocaleDisplayManager.toggleLanguage).toHaveBeenCalled();
        });

        test('updateLanguageDisplay делегирует вызов', () => {
            uiManager.updateLanguageDisplay();
            
            expect(mockLocaleDisplayManager.updateLanguageDisplay).toHaveBeenCalled();
        });

        test('onLocaleChange делегирует вызов', () => {
            uiManager.onLocaleChange();
            
            expect(mockLocaleDisplayManager.onLocaleChange).toHaveBeenCalled();
        });
    });

    describe('ThemeDisplayManager делегирование', () => {
        test('setThemeManager делегирует вызов', () => {
            const mockThemeManager = { getCurrentTheme: jest.fn() };
            uiManager.setThemeManager(mockThemeManager);
            
            expect(mockThemeDisplayManager.setThemeManager).toHaveBeenCalledWith(mockThemeManager);
        });

        test('toggleTheme делегирует вызов', async () => {
            await uiManager.toggleTheme();
            
            expect(mockThemeDisplayManager.toggleTheme).toHaveBeenCalled();
        });

        test('updateThemeDisplay делегирует вызов без параметра', () => {
            uiManager.updateThemeDisplay();
            
            expect(mockThemeDisplayManager.updateThemeDisplay).toHaveBeenCalledWith(undefined);
        });

        test('updateThemeDisplay делегирует вызов с параметром', () => {
            uiManager.updateThemeDisplay('dark');
            
            expect(mockThemeDisplayManager.updateThemeDisplay).toHaveBeenCalledWith('dark');
        });
    });

    describe('AuthManager делегирование', () => {
        test('refreshAuthStatus делегирует вызов', async () => {
            await uiManager.refreshAuthStatus();
            
            expect(mockAuthManager.refreshAuthStatus).toHaveBeenCalled();
        });
    });
});
