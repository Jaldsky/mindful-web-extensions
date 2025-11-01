/**
 * @jest-environment jsdom
 */

const DiagnosticsDataManager = require('../../../src/managers/options/DiagnosticsDataManager.js');
const { createBaseOptionsManager } = require('./options-test-helpers.js');

describe('DiagnosticsDataManager', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('getDiagnostics собирает ключевые метрики и текущие значения URL', () => {
        const manager = createBaseOptionsManager();
        manager.domManager.getBackendUrlValue.mockReturnValue('https://current');
        manager.storageManager.getDefaultBackendUrl.mockReturnValue('https://default');
        manager.statusManager.getStatistics.mockReturnValue({ total: 3 });
        manager.statusManager.getPerformanceMetrics.mockReturnValue({ average: 10 });
        manager.validationManager.getPerformanceMetrics.mockReturnValue({ average: 5 });
        manager.validationManager.getValidationStatistics.mockReturnValue({ errors: 0 });
        manager.validationManager.isValidUrl.mockReturnValue(true);

        const diagnosticsDataManager = new DiagnosticsDataManager(manager);
        const diagnostics = diagnosticsDataManager.getDiagnostics();

        expect(diagnostics.currentUrl).toBe('https://current');
        expect(diagnostics.defaultUrl).toBe('https://default');
        expect(diagnostics.statusStatistics).toEqual({ total: 3 });
        expect(diagnostics.statusPerformanceMetrics).toEqual({ average: 10 });
        expect(diagnostics.validationPerformanceMetrics).toEqual({ average: 5 });
        expect(diagnostics.isUrlValid).toBe(true);
    });

    test('validateManagersState отмечает результат как невалидный, если проверка подменеджера провалилась', () => {
        const manager = createBaseOptionsManager();
        manager.validationManager.validateState.mockReturnValue({ isValid: false });

        const diagnosticsDataManager = new DiagnosticsDataManager(manager);
        const validationResult = diagnosticsDataManager.validateManagersState();

        expect(validationResult.isValid).toBe(false);
        expect(validationResult.managers.validationManager.isValid).toBe(false);
    });
});
