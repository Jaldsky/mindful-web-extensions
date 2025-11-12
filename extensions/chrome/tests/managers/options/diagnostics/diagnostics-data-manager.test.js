/**
 * @jest-environment jsdom
 */

const DiagnosticsDataManager = require('../../../../src/managers/options/diagnostics/DiagnosticsDataManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

describe('DiagnosticsDataManager', () => {
    let manager;
    let diagnosticsDataManager;

    beforeEach(() => {
        manager = createBaseOptionsManager();
        diagnosticsDataManager = new DiagnosticsDataManager(manager);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        test('создает экземпляр с manager', () => {
            expect(diagnosticsDataManager.manager).toBe(manager);
        });
    });

    describe('getCurrentBackendUrl', () => {
        test('получает URL из domManager', () => {
            manager.domManager.getBackendUrlValue.mockReturnValue('https://test.com');
            
            const result = diagnosticsDataManager.getCurrentBackendUrl();
            
            expect(result).toBe('https://test.com');
            expect(manager.domManager.getBackendUrlValue).toHaveBeenCalled();
        });
    });

    describe('getDefaultBackendUrl', () => {
        test('получает дефолтный URL из storageManager', () => {
            manager.storageManager.getDefaultBackendUrl.mockReturnValue('https://default.com');
            
            const result = diagnosticsDataManager.getDefaultBackendUrl();
            
            expect(result).toBe('https://default.com');
            expect(manager.storageManager.getDefaultBackendUrl).toHaveBeenCalled();
        });
    });

    describe('isCurrentUrlValid', () => {
        test('проверяет валидность URL', () => {
            manager.domManager.getBackendUrlValue.mockReturnValue('https://test.com');
            manager.validationManager.isValidUrl.mockReturnValue(true);
            
            const result = diagnosticsDataManager.isCurrentUrlValid();
            
            expect(result).toBe(true);
            expect(manager.validationManager.isValidUrl).toHaveBeenCalledWith('https://test.com');
        });

        test('возвращает false для невалидного URL', () => {
            manager.domManager.getBackendUrlValue.mockReturnValue('invalid');
            manager.validationManager.isValidUrl.mockReturnValue(false);
            
            const result = diagnosticsDataManager.isCurrentUrlValid();
            
            expect(result).toBe(false);
        });
    });

    describe('getStatusStatistics', () => {
        test('получает статистику статусов', () => {
            const stats = { total: 10, errors: 2 };
            manager.statusManager.getStatistics.mockReturnValue(stats);
            
            const result = diagnosticsDataManager.getStatusStatistics();
            
            expect(result).toEqual(stats);
            expect(manager.statusManager.getStatistics).toHaveBeenCalled();
        });

        test('обрабатывает ошибки и возвращает пустой объект', () => {
            manager.statusManager.getStatistics.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.getStatusStatistics();
            
            expect(result).toEqual({});
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('getStatusHistory', () => {
        test('получает историю статусов', () => {
            const history = [{ id: 1 }, { id: 2 }];
            manager.statusManager.getHistory.mockReturnValue(history);
            
            const result = diagnosticsDataManager.getStatusHistory();
            
            expect(result).toEqual(history);
            expect(manager.statusManager.getHistory).toHaveBeenCalledWith({});
        });

        test('передает опции в getHistory', () => {
            const options = { limit: 10 };
            manager.statusManager.getHistory.mockReturnValue([]);
            
            diagnosticsDataManager.getStatusHistory(options);
            
            expect(manager.statusManager.getHistory).toHaveBeenCalledWith(options);
        });

        test('обрабатывает ошибки и возвращает пустой массив', () => {
            manager.statusManager.getHistory.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.getStatusHistory();
            
            expect(result).toEqual([]);
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('getStatusPerformanceMetrics', () => {
        test('получает метрики производительности статусов', () => {
            const metrics = { average: 10, max: 20 };
            manager.statusManager.getPerformanceMetrics.mockReturnValue(metrics);
            
            const result = diagnosticsDataManager.getStatusPerformanceMetrics();
            
            expect(result).toEqual(metrics);
            expect(manager.statusManager.getPerformanceMetrics).toHaveBeenCalled();
        });

        test('обрабатывает ошибки и возвращает пустой объект', () => {
            manager.statusManager.getPerformanceMetrics.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.getStatusPerformanceMetrics();
            
            expect(result).toEqual({});
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('clearStatusHistory', () => {
        test('очищает историю статусов', () => {
            manager.statusManager.clearHistory.mockReturnValue(5);
            
            const result = diagnosticsDataManager.clearStatusHistory();
            
            expect(result).toBe(5);
            expect(manager.statusManager.clearHistory).toHaveBeenCalled();
            expect(manager._log).toHaveBeenCalled();
        });

        test('обрабатывает ошибки и возвращает 0', () => {
            manager.statusManager.clearHistory.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.clearStatusHistory();
            
            expect(result).toBe(0);
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('getValidationStatistics', () => {
        test('получает статистику валидации', () => {
            const stats = { total: 5, errors: 1 };
            manager.validationManager.getValidationStatistics.mockReturnValue(stats);
            
            const result = diagnosticsDataManager.getValidationStatistics();
            
            expect(result).toEqual(stats);
            expect(manager.validationManager.getValidationStatistics).toHaveBeenCalled();
        });

        test('обрабатывает ошибки и возвращает пустой объект', () => {
            manager.validationManager.getValidationStatistics.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.getValidationStatistics();
            
            expect(result).toEqual({});
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('getValidationHistory', () => {
        test('получает историю валидации', () => {
            const history = [{ id: 1 }];
            manager.validationManager.getHistory.mockReturnValue(history);
            
            const result = diagnosticsDataManager.getValidationHistory();
            
            expect(result).toEqual(history);
            expect(manager.validationManager.getHistory).toHaveBeenCalledWith({});
        });

        test('передает опции в getHistory', () => {
            const options = { limit: 5 };
            manager.validationManager.getHistory.mockReturnValue([]);
            
            diagnosticsDataManager.getValidationHistory(options);
            
            expect(manager.validationManager.getHistory).toHaveBeenCalledWith(options);
        });

        test('обрабатывает ошибки и возвращает пустой массив', () => {
            manager.validationManager.getHistory.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.getValidationHistory();
            
            expect(result).toEqual([]);
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('clearValidationHistory', () => {
        test('очищает историю валидации', () => {
            manager.validationManager.clearHistory.mockReturnValue(3);
            
            const result = diagnosticsDataManager.clearValidationHistory();
            
            expect(result).toBe(3);
            expect(manager.validationManager.clearHistory).toHaveBeenCalled();
            expect(manager._log).toHaveBeenCalled();
        });

        test('обрабатывает ошибки и возвращает 0', () => {
            manager.validationManager.clearHistory.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.clearValidationHistory();
            
            expect(result).toBe(0);
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('getValidationPerformanceMetrics', () => {
        test('получает метрики производительности валидации', () => {
            const metrics = { average: 5 };
            manager.validationManager.getPerformanceMetrics.mockReturnValue(metrics);
            
            const result = diagnosticsDataManager.getValidationPerformanceMetrics();
            
            expect(result).toEqual(metrics);
            expect(manager.validationManager.getPerformanceMetrics).toHaveBeenCalled();
        });

        test('обрабатывает ошибки и возвращает пустой объект', () => {
            manager.validationManager.getPerformanceMetrics.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.getValidationPerformanceMetrics();
            
            expect(result).toEqual({});
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('validateManagersState', () => {
        test('валидирует состояние менеджеров успешно', () => {
            manager.statusManager.validateState.mockReturnValue({ isValid: true });
            manager.validationManager.validateState.mockReturnValue({ isValid: true });
            
            const result = diagnosticsDataManager.validateManagersState();
            
            expect(result.isValid).toBe(true);
            expect(result.managers.statusManager.isValid).toBe(true);
            expect(result.managers.validationManager.isValid).toBe(true);
            expect(result.timestamp).toBeDefined();
        });

        test('отмечает результат как невалидный если statusManager невалиден', () => {
            manager.statusManager.validateState.mockReturnValue({ isValid: false });
            manager.validationManager.validateState.mockReturnValue({ isValid: true });
            
            const result = diagnosticsDataManager.validateManagersState();
            
            expect(result.isValid).toBe(false);
            expect(result.managers.statusManager.isValid).toBe(false);
        });

        test('отмечает результат как невалидный если validationManager невалиден', () => {
            manager.statusManager.validateState.mockReturnValue({ isValid: true });
            manager.validationManager.validateState.mockReturnValue({ isValid: false });
            
            const result = diagnosticsDataManager.validateManagersState();
            
            expect(result.isValid).toBe(false);
            expect(result.managers.validationManager.isValid).toBe(false);
        });

        test('обрабатывает отсутствие validateState метода', () => {
            manager.statusManager.validateState = undefined;
            manager.validationManager.validateState = undefined;
            
            const result = diagnosticsDataManager.validateManagersState();
            
            expect(result.isValid).toBe(true);
            expect(result.managers).toEqual({});
        });

        test('обрабатывает ошибки валидации', () => {
            manager.statusManager.validateState.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = diagnosticsDataManager.validateManagersState();
            
            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Test error');
            expect(result.timestamp).toBeDefined();
            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('getDiagnostics', () => {
        test('собирает ключевые метрики и текущие значения URL', () => {
            manager.domManager.getBackendUrlValue.mockReturnValue('https://current');
            manager.storageManager.getDefaultBackendUrl.mockReturnValue('https://default');
            manager.statusManager.getStatistics.mockReturnValue({ total: 3 });
            manager.statusManager.getPerformanceMetrics.mockReturnValue({ average: 10 });
            manager.validationManager.getPerformanceMetrics.mockReturnValue({ average: 5 });
            manager.validationManager.getValidationStatistics.mockReturnValue({ errors: 0 });
            manager.validationManager.isValidUrl.mockReturnValue(true);
            manager.domManager.getPerformanceMetrics.mockReturnValue({});
            manager.domManager.getElementsStatistics.mockReturnValue({});
            manager.storageManager.getPerformanceMetrics.mockReturnValue({});
            manager.uiManager = {
                getDomainExceptions: jest.fn(() => ['example.com'])
            };

            const diagnostics = diagnosticsDataManager.getDiagnostics();

            expect(diagnostics.currentUrl).toBe('https://current');
            expect(diagnostics.defaultUrl).toBe('https://default');
            expect(diagnostics.statusStatistics).toEqual({ total: 3 });
            expect(diagnostics.statusPerformanceMetrics).toEqual({ average: 10 });
            expect(diagnostics.validationPerformanceMetrics).toEqual({ average: 5 });
            expect(diagnostics.isUrlValid).toBe(true);
            expect(diagnostics.domainExceptions).toEqual(['example.com']);
            expect(diagnostics.domainExceptionsCount).toBe(1);
            expect(diagnostics.timestamp).toBeDefined();
        });

        test('обрабатывает отсутствие uiManager', () => {
            manager.uiManager = null;
            manager.domManager.getBackendUrlValue.mockReturnValue('');
            manager.storageManager.getDefaultBackendUrl.mockReturnValue('');
            manager.statusManager.getStatistics.mockReturnValue({});
            manager.statusManager.getPerformanceMetrics.mockReturnValue({});
            manager.validationManager.getPerformanceMetrics.mockReturnValue({});
            manager.validationManager.getValidationStatistics.mockReturnValue({});
            manager.validationManager.isValidUrl.mockReturnValue(false);
            manager.domManager.getPerformanceMetrics.mockReturnValue({});
            manager.domManager.getElementsStatistics.mockReturnValue({});
            manager.storageManager.getPerformanceMetrics.mockReturnValue({});

            const diagnostics = diagnosticsDataManager.getDiagnostics();

            expect(diagnostics.domainExceptions).toEqual([]);
            expect(diagnostics.domainExceptionsCount).toBe(0);
        });

        test('обрабатывает ошибки при получении диагностики', () => {
            manager.domManager.getBackendUrlValue.mockImplementation(() => {
                throw new Error('Test error');
            });

            const diagnostics = diagnosticsDataManager.getDiagnostics();

            expect(diagnostics.error).toBe('Test error');
            expect(diagnostics.timestamp).toBeDefined();
            expect(manager._logError).toHaveBeenCalled();
        });
    });
});
