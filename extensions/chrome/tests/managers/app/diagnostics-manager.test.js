/**
 * Тесты для DiagnosticsManager класса
 * Тестирует функциональность диагностики расширения
 */

const DiagnosticsManager = require('../../../src/managers/app/DiagnosticsManager.js');
const RU = require('../../../src/locales/ru.js');

// Создаем mock функцию локализации, которая возвращает русские строки
const createMockTranslateFn = () => {
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    };
    
    return (key, params = {}, fallback = '') => {
        const value = getNestedValue(RU, key);
        if (!value) return fallback;
        
        // Простая подстановка параметров
        if (typeof value === 'string' && params) {
            return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }
        
        return value || fallback;
    };
};

describe('DiagnosticsManager', () => {
    let diagnosticsManager;
    let mockServiceWorkerManager;
    let mockNotificationManager;
    let consoleErrorSpy;
    let consoleLogSpy;
    let consoleGroupSpy;
    let consoleGroupEndSpy;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation();
        consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();

        mockServiceWorkerManager = {
            ping: jest.fn().mockResolvedValue(true),
            checkConnection: jest.fn().mockResolvedValue(true),
            getTrackingStatus: jest.fn().mockResolvedValue({
                isTracking: true,
                isOnline: true
            }),
            getTodayStats: jest.fn().mockResolvedValue({
                events: 100,
                domains: 5,
                queue: 2
            })
        };

        mockNotificationManager = {
            showNotification: jest.fn()
        };

        const mockTranslateFn = createMockTranslateFn();

        diagnosticsManager = new DiagnosticsManager(
            mockServiceWorkerManager,
            mockNotificationManager,
            { translateFn: mockTranslateFn }
        );
    });

    afterEach(() => {
        if (diagnosticsManager) {
            diagnosticsManager.destroy();
        }
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleGroupSpy.mockRestore();
        consoleGroupEndSpy.mockRestore();
        jest.clearAllMocks();
    });

    describe('static properties', () => {
        test('should have CHECK_STATUS constants', () => {
            expect(DiagnosticsManager.CHECK_STATUS).toBeDefined();
            expect(DiagnosticsManager.CHECK_STATUS.OK).toBe('ok');
            expect(DiagnosticsManager.CHECK_STATUS.WARNING).toBe('warning');
            expect(DiagnosticsManager.CHECK_STATUS.ERROR).toBe('error');
        });

        test('should have CHECK_NAMES constants', () => {
            expect(DiagnosticsManager.CHECK_NAMES).toBeDefined();
            expect(DiagnosticsManager.CHECK_NAMES.SERVICE_WORKER).toBe('serviceWorker');
            expect(DiagnosticsManager.CHECK_NAMES.CONNECTION).toBe('connection');
            expect(DiagnosticsManager.CHECK_NAMES.TRACKING).toBe('tracking');
            expect(DiagnosticsManager.CHECK_NAMES.STATS).toBe('stats');
        });

        test('should have STATUS_EMOJI constants', () => {
            expect(DiagnosticsManager.STATUS_EMOJI).toBeDefined();
            expect(DiagnosticsManager.STATUS_EMOJI.ok).toBe('✅');
            expect(DiagnosticsManager.STATUS_EMOJI.warning).toBe('⚠️');
            expect(DiagnosticsManager.STATUS_EMOJI.error).toBe('❌');
            expect(DiagnosticsManager.STATUS_EMOJI.unknown).toBe('❓');
        });
    });

    describe('constructor', () => {
        test('should initialize with required dependencies', () => {
            expect(diagnosticsManager).toBeDefined();
            expect(diagnosticsManager.serviceWorkerManager).toBe(mockServiceWorkerManager);
            expect(diagnosticsManager.notificationManager).toBe(mockNotificationManager);
        });

        test('should throw error if serviceWorkerManager is missing', () => {
            // Устанавливаем язык для временной функции локализации в конструкторе
            global.navigator.language = 'ru';
            expect(() => {
                new DiagnosticsManager(null, mockNotificationManager);
            }).toThrow(TypeError);
            expect(() => {
                new DiagnosticsManager(null, mockNotificationManager);
            }).toThrow('ServiceWorkerManager обязателен');
        });

        test('should throw error if notificationManager is missing', () => {
            // Устанавливаем язык для временной функции локализации в конструкторе
            global.navigator.language = 'ru';
            expect(() => {
                new DiagnosticsManager(mockServiceWorkerManager, null);
            }).toThrow(TypeError);
            expect(() => {
                new DiagnosticsManager(mockServiceWorkerManager, null);
            }).toThrow('NotificationManager обязателен');
        });

        test('should set parallelExecution to true by default', () => {
            expect(diagnosticsManager.parallelExecution).toBe(true);
        });

        test('should accept custom parallelExecution option', () => {
            const mockTranslateFn = createMockTranslateFn();
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { parallelExecution: false, translateFn: mockTranslateFn }
            );

            expect(manager.parallelExecution).toBe(false);
            manager.destroy();
        });

        test('should throw error if translateFn is not a function', () => {
            global.navigator.language = 'ru';
            expect(() => {
                new DiagnosticsManager(
                    mockServiceWorkerManager,
                    mockNotificationManager,
                    { translateFn: 'not a function' }
                );
            }).toThrow(TypeError);
        });
    });

    describe('runDiagnostics', () => {
        test('should run all diagnostics in parallel by default', async () => {
            const results = await diagnosticsManager.runDiagnostics();

            expect(results).toBeDefined();
            expect(results.timestamp).toBeDefined();
            expect(results.totalDuration).toBeGreaterThanOrEqual(0);
            expect(results.checks).toBeDefined();
            expect(results.overall).toBeDefined();

            expect(results.checks.serviceWorker).toBeDefined();
            expect(results.checks.connection).toBeDefined();
            expect(results.checks.tracking).toBeDefined();
            expect(results.checks.stats).toBeDefined();
        });

        test('should run diagnostics sequentially when parallel is false', async () => {
            const mockTranslateFn = createMockTranslateFn();
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { parallelExecution: false, translateFn: mockTranslateFn }
            );

            const results = await manager.runDiagnostics();

            expect(results).toBeDefined();
            expect(results.checks.serviceWorker).toBeDefined();
            expect(results.checks.connection).toBeDefined();
            expect(results.checks.tracking).toBeDefined();
            expect(results.checks.stats).toBeDefined();

            manager.destroy();
        });

        test('should include duration for each check', async () => {
            const results = await diagnosticsManager.runDiagnostics();

            Object.values(results.checks).forEach(check => {
                expect(check.duration).toBeDefined();
                expect(typeof check.duration).toBe('number');
                expect(check.duration).toBeGreaterThanOrEqual(0);
            });
        });

        test('should run only specified checks', async () => {
            const results = await diagnosticsManager.runDiagnostics({
                checks: ['serviceWorker', 'connection']
            });

            expect(results.checks.serviceWorker).toBeDefined();
            expect(results.checks.connection).toBeDefined();
            expect(results.checks.tracking).toBeUndefined();
            expect(results.checks.stats).toBeUndefined();
        });

        test('should override parallel option per run', async () => {
            const results = await diagnosticsManager.runDiagnostics({
                parallel: false
            });

            expect(results).toBeDefined();
            expect(results.checks).toBeDefined();
        });

        test('should handle errors and return error status', async () => {
            const mockTranslateFn = createMockTranslateFn();
            const errorManager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { translateFn: mockTranslateFn }
            );

            errorManager.checkServiceWorker = jest.fn().mockRejectedValue(new Error('Test error'));

            const results = await errorManager.runDiagnostics();

            expect(results.overall).toBeDefined();
            errorManager.destroy();
        });
    });

    describe('checkServiceWorker', () => {
        test('should return OK status when service worker is available', async () => {
            mockServiceWorkerManager.ping.mockResolvedValue(true);

            const result = await diagnosticsManager.checkServiceWorker();

            expect(result.status).toBe('ok');
            expect(result.message).toContain('доступен');
            expect(result.data.available).toBe(true);
        });

        test('should return ERROR status when service worker is unavailable', async () => {
            mockServiceWorkerManager.ping.mockResolvedValue(false);

            const result = await diagnosticsManager.checkServiceWorker();

            expect(result.status).toBe('error');
            expect(result.message).toContain('недоступен');
            expect(result.data.available).toBe(false);
        });

        test('should handle ping errors', async () => {
            mockServiceWorkerManager.ping.mockRejectedValue(new Error('Ping failed'));

            const result = await diagnosticsManager.checkServiceWorker();

            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
        });
    });

    describe('checkServerConnection', () => {
        test('should return OK status when server is online', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue(true);

            const result = await diagnosticsManager.checkServerConnection();

            expect(result.status).toBe('ok');
            expect(result.message).toContain('доступен');
            expect(result.data.online).toBe(true);
        });

        test('should return ERROR status when server is offline', async () => {
            mockServiceWorkerManager.checkConnection.mockResolvedValue(false);

            const result = await diagnosticsManager.checkServerConnection();

            expect(result.status).toBe('error');
            expect(result.message).toContain('недоступен');
            expect(result.data.online).toBe(false);
        });

        test('should handle connection errors', async () => {
            mockServiceWorkerManager.checkConnection.mockRejectedValue(
                new Error('Connection failed')
            );

            const result = await diagnosticsManager.checkServerConnection();

            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
        });
    });

    describe('checkTrackingStatus', () => {
        test('should return OK status with valid tracking data', async () => {
            mockServiceWorkerManager.getTrackingStatus.mockResolvedValue({
                isTracking: true,
                isOnline: true
            });

            const result = await diagnosticsManager.checkTrackingStatus();

            expect(result.status).toBe('ok');
            expect(result.message).toContain('активно');
            expect(result.data.tracking).toBe(true);
            expect(result.data.online).toBe(true);
        });

        test('should show inactive tracking status', async () => {
            mockServiceWorkerManager.getTrackingStatus.mockResolvedValue({
                isTracking: false,
                isOnline: true
            });

            const result = await diagnosticsManager.checkTrackingStatus();

            expect(result.status).toBe('ok');
            expect(result.message).toContain('неактивно');
            expect(result.data.tracking).toBe(false);
        });

        test('should return WARNING for invalid data', async () => {
            mockServiceWorkerManager.getTrackingStatus.mockResolvedValue(null);

            const result = await diagnosticsManager.checkTrackingStatus();

            expect(result.status).toBe('warning');
            expect(result.message).toContain('некорректные данные');
        });

        test('should handle errors', async () => {
            mockServiceWorkerManager.getTrackingStatus.mockRejectedValue(
                new Error('Status check failed')
            );

            const result = await diagnosticsManager.checkTrackingStatus();

            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
        });
    });

    describe('checkStats', () => {
        test('should return OK status with valid stats', async () => {
            mockServiceWorkerManager.getTodayStats.mockResolvedValue({
                events: 100,
                domains: 5,
                queue: 2
            });

            const result = await diagnosticsManager.checkStats();

            expect(result.status).toBe('ok');
            expect(result.message).toContain('100 событий');
            expect(result.message).toContain('5 доменов');
            expect(result.data.events).toBe(100);
            expect(result.data.domains).toBe(5);
            expect(result.data.queue).toBe(2);
        });

        test('should show queue info when not empty', async () => {
            mockServiceWorkerManager.getTodayStats.mockResolvedValue({
                events: 10,
                domains: 2,
                queue: 5
            });

            const result = await diagnosticsManager.checkStats();

            expect(result.message).toContain('Очередь: 5');
        });

        test('should handle stats without data', async () => {
            mockServiceWorkerManager.getTodayStats.mockResolvedValue({
                events: 0,
                domains: 0,
                queue: 0
            });

            const result = await diagnosticsManager.checkStats();

            expect(result.status).toBe('ok');
            expect(result.message).toContain('Статистика получена');
        });

        test('should return WARNING for invalid stats', async () => {
            mockServiceWorkerManager.getTodayStats.mockResolvedValue(null);

            const result = await diagnosticsManager.checkStats();

            expect(result.status).toBe('warning');
            expect(result.message).toContain('некорректные данные');
        });

        test('should handle errors', async () => {
            mockServiceWorkerManager.getTodayStats.mockRejectedValue(
                new Error('Stats failed')
            );

            const result = await diagnosticsManager.checkStats();

            expect(result.status).toBe('error');
            expect(result.error).toBeDefined();
        });
    });

    describe('calculateOverallStatus', () => {
        test('should return OK when all checks are OK', () => {
            const checks = {
                check1: { status: 'ok' },
                check2: { status: 'ok' },
                check3: { status: 'ok' }
            };

            const overall = diagnosticsManager.calculateOverallStatus(checks);

            expect(overall).toBe('ok');
        });

        test('should return ERROR when any check has ERROR', () => {
            const checks = {
                check1: { status: 'ok' },
                check2: { status: 'error' },
                check3: { status: 'warning' }
            };

            const overall = diagnosticsManager.calculateOverallStatus(checks);

            expect(overall).toBe('error');
        });

        test('should return WARNING when no errors but has warnings', () => {
            const checks = {
                check1: { status: 'ok' },
                check2: { status: 'warning' },
                check3: { status: 'ok' }
            };

            const overall = diagnosticsManager.calculateOverallStatus(checks);

            expect(overall).toBe('warning');
        });

        test('should return ERROR for empty checks', () => {
            const overall = diagnosticsManager.calculateOverallStatus({});

            expect(overall).toBe('error');
        });

        test('should return ERROR for null checks', () => {
            const overall = diagnosticsManager.calculateOverallStatus(null);

            expect(overall).toBe('error');
        });

        test('should return WARNING for unknown statuses', () => {
            const checks = {
                check1: { status: 'unknown' }
            };

            const overall = diagnosticsManager.calculateOverallStatus(checks);

            expect(overall).toBe('warning');
        });
    });

    describe('destroy', () => {

        test('should not throw errors', () => {
            expect(() => diagnosticsManager.destroy()).not.toThrow();
        });

        test('should call super.destroy', () => {
            const superDestroySpy = jest.spyOn(Object.getPrototypeOf(DiagnosticsManager.prototype), 'destroy');
            
            diagnosticsManager.destroy();

            expect(superDestroySpy).toHaveBeenCalled();
            superDestroySpy.mockRestore();
        });
    });

    describe('inheritance from BaseManager', () => {
        test('should have BaseManager methods', () => {
            expect(typeof diagnosticsManager.updateState).toBe('function');
            expect(typeof diagnosticsManager.getState).toBe('function');
            expect(typeof diagnosticsManager._log).toBe('function');
            expect(typeof diagnosticsManager._logError).toBe('function');
        });

        test('should have CONSTANTS property', () => {
            expect(diagnosticsManager.CONSTANTS).toBeDefined();
        });
    });

    describe('error handling', () => {
        test('should handle errors in check execution', async () => {
            const mockTranslateFn = createMockTranslateFn();
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { translateFn: mockTranslateFn }
            );

            manager.checkServiceWorker = jest.fn(() => {
                throw new Error('Unexpected error');
            });

            const results = await manager.runDiagnostics({
                checks: ['serviceWorker']
            });

            expect(results.checks.serviceWorker).toBeDefined();
            expect(results.checks.serviceWorker.status).toBe('error');
            manager.destroy();
        });

        test('should handle critical errors gracefully', async () => {
            const mockTranslateFn = createMockTranslateFn();
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { translateFn: mockTranslateFn }
            );

            manager.calculateOverallStatus = jest.fn(() => {
                throw new Error('Critical error');
            });

            const results = await manager.runDiagnostics();

            expect(results.overall).toBe('error');
            expect(results.error).toBeDefined();
            manager.destroy();
        });
    });

    describe('integration', () => {
        test('should complete full diagnostic cycle', async () => {
            const results = await diagnosticsManager.runDiagnostics();

            expect(results).toBeDefined();
            expect(results.timestamp).toBeDefined();
            expect(results.totalDuration).toBeGreaterThanOrEqual(0);
            expect(results.checks).toBeDefined();
            expect(results.overall).toBeDefined();
        });

        test('should handle mixed check results', async () => {
            mockServiceWorkerManager.ping.mockResolvedValue(true);
            mockServiceWorkerManager.checkConnection.mockResolvedValue(false);
            mockServiceWorkerManager.getTrackingStatus.mockResolvedValue({
                isTracking: true,
                isOnline: false
            });

            const results = await diagnosticsManager.runDiagnostics();

            expect(results.overall).toBe('error');
            expect(results.checks.serviceWorker.status).toBe('ok');
            expect(results.checks.connection.status).toBe('error');
        });
    });
});
