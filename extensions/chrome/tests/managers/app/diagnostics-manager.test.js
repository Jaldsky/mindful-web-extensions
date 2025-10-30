/**
 * Тесты для DiagnosticsManager класса
 * Тестирует функциональность диагностики расширения
 */

const DiagnosticsManager = require('../../../src/managers/app/DiagnosticsManager.js');

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

        diagnosticsManager = new DiagnosticsManager(
            mockServiceWorkerManager,
            mockNotificationManager
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
            expect(() => {
                new DiagnosticsManager(null, mockNotificationManager);
            }).toThrow(TypeError);
            expect(() => {
                new DiagnosticsManager(null, mockNotificationManager);
            }).toThrow('ServiceWorkerManager обязателен');
        });

        test('should throw error if notificationManager is missing', () => {
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
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { parallelExecution: false }
            );

            expect(manager.parallelExecution).toBe(false);
            manager.destroy();
        });

        test('should initialize lastResults as null', () => {
            expect(diagnosticsManager.lastResults).toBeNull();
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
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager,
                { parallelExecution: false }
            );

            const results = await manager.runDiagnostics();

            expect(results).toBeDefined();
            expect(results.checks.serviceWorker).toBeDefined();
            expect(results.checks.connection).toBeDefined();
            expect(results.checks.tracking).toBeDefined();
            expect(results.checks.stats).toBeDefined();

            manager.destroy();
        });

        test('should store results in lastResults', async () => {
            const results = await diagnosticsManager.runDiagnostics();

            expect(diagnosticsManager.lastResults).toBe(results);
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
            const errorManager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager
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

    describe('displayDiagnosticResults', () => {
        test('should display results with notification', () => {
            const results = {
                overall: 'ok',
                totalDuration: 100,
                timestamp: new Date().toISOString(),
                checks: {
                    test: { status: 'ok', message: 'Test OK', duration: 50 }
                }
            };

            diagnosticsManager.displayDiagnosticResults(results);

            expect(mockNotificationManager.showNotification).toHaveBeenCalled();
        });

        test('should show success notification for OK status', () => {
            const results = {
                overall: 'ok',
                totalDuration: 100,
                timestamp: new Date().toISOString(),
                checks: {
                    test: { status: 'ok', message: 'Test', duration: 50 }
                }
            };

            diagnosticsManager.displayDiagnosticResults(results);

            const call = mockNotificationManager.showNotification.mock.calls[0];
            expect(call[0]).toContain('✅');
            expect(call[1]).toBe('success');
        });

        test('should show error notification for ERROR status', () => {
            const results = {
                overall: 'error',
                totalDuration: 100,
                timestamp: new Date().toISOString(),
                checks: {
                    test: { status: 'error', message: 'Test failed', duration: 50 }
                }
            };

            diagnosticsManager.displayDiagnosticResults(results);

            const call = mockNotificationManager.showNotification.mock.calls[0];
            expect(call[0]).toContain('❌');
            expect(call[1]).toBe('error');
        });

        test('should display error count in message', () => {
            const results = {
                overall: 'error',
                totalDuration: 100,
                timestamp: new Date().toISOString(),
                checks: {
                    test1: { status: 'error', message: 'Failed', duration: 50 },
                    test2: { status: 'ok', message: 'OK', duration: 50 }
                }
            };

            diagnosticsManager.displayDiagnosticResults(results);

            const message = mockNotificationManager.showNotification.mock.calls[0][0];
            expect(message).toContain('Ошибки: 1/2');
        });

        test('should display warning count in message', () => {
            const results = {
                overall: 'warning',
                totalDuration: 100,
                timestamp: new Date().toISOString(),
                checks: {
                    test1: { status: 'warning', message: 'Warning', duration: 50 },
                    test2: { status: 'ok', message: 'OK', duration: 50 }
                }
            };

            diagnosticsManager.displayDiagnosticResults(results);

            const message = mockNotificationManager.showNotification.mock.calls[0][0];
            expect(message).toContain('Предупреждения: 1/2');
        });

        test('should handle null results gracefully', () => {
            diagnosticsManager.displayDiagnosticResults(null);

            expect(mockNotificationManager.showNotification).not.toHaveBeenCalled();
        });

        test('should log errors to console', () => {
            const results = {
                overall: 'error',
                totalDuration: 100,
                timestamp: new Date().toISOString(),
                error: 'General error',
                checks: {
                    test: { status: 'error', message: 'Failed', error: 'Specific error', duration: 50 }
                }
            };

            diagnosticsManager.displayDiagnosticResults(results);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('destroy', () => {
        test('should clear lastResults', () => {
            diagnosticsManager.lastResults = { overall: 'ok', checks: {} };
            diagnosticsManager.destroy();

            expect(diagnosticsManager.lastResults).toBeNull();
        });

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
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager
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
            const manager = new DiagnosticsManager(
                mockServiceWorkerManager,
                mockNotificationManager
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

            diagnosticsManager.displayDiagnosticResults(results);

            expect(mockNotificationManager.showNotification).toHaveBeenCalled();
            expect(diagnosticsManager.lastResults).toBe(results);
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
