/**
 * @jest-environment jsdom
 */

const DiagnosticsWorkflowManager = require('../../../src/managers/options/DiagnosticsWorkflowManager.js');
const { createBaseOptionsManager } = require('./options-test-helpers.js');

describe('DiagnosticsWorkflowManager', () => {
    const setupDOM = () => {
        document.body.innerHTML = `
            <div id="diagnosticsResults"></div>
            <div id="diagnosticsSummary"></div>
            <div id="diagnosticsChecks"></div>
            <span id="diagnosticsStatusValue"></span>
        `;
    };

    const createEnvironment = () => {
        setupDOM();
        const manager = createBaseOptionsManager();
        manager.domManager.elements.runDiagnostics = document.createElement('button');
        manager.statusManager.showError.mockReturnValue(true);
        manager.localeManager.t.mockImplementation((key) => ({
            'options.buttons.analyzing': 'Analyzing...',
            'options.status.diagnosticsError': 'Diagnostics error',
            'options.diagnostics.notRun': 'Not run',
            'options.diagnostics.running': 'Running...',
            'options.diagnostics.success': 'Passed',
            'options.diagnostics.failed': 'Failed',
            'options.diagnostics.statusOk': 'All good',
            'options.diagnostics.statusWarning': 'Warning',
            'options.diagnostics.statusError': 'Error',
            'options.diagnostics.statusUnknown': 'Unknown',
            'options.diagnostics.labelTotal': 'Total',
            'options.diagnostics.labelSuccess': 'Success',
            'options.diagnostics.labelWarnings': 'Warnings',
            'options.diagnostics.labelTime': 'Time'
        }[key] || key));
        manager.diagnosticsManager.runDiagnostics.mockResolvedValue({
            overall: 'ok',
            totalDuration: 150,
            checks: {
                storage: { status: 'ok', message: 'Storage OK', duration: 10 }
            }
        });

        return { manager, diagnosticsManager: new DiagnosticsWorkflowManager(manager) };
    };

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    test('runDiagnostics обновляет кнопку, статус и отрисовывает результаты', async () => {
        const { manager, diagnosticsManager } = createEnvironment();

        const diagnosticsPromise = diagnosticsManager.runDiagnostics();
        jest.advanceTimersByTime(500);
        const result = await diagnosticsPromise;
        await Promise.resolve();

        expect(result.overall).toBe('ok');
        expect(manager.diagnosticsManager.runDiagnostics).toHaveBeenCalled();
        const statusValue = document.getElementById('diagnosticsStatusValue');
        expect(statusValue.classList.contains('success')).toBe(true);
        expect(document.getElementById('diagnosticsSummary').innerHTML).toContain('Total');
        expect(manager.domManager.elements.runDiagnostics.disabled).toBe(false);
    });

    test('clearDiagnostics скрывает результаты и сбрасывает статус', () => {
        const { diagnosticsManager } = createEnvironment();
        const resultsContainer = document.getElementById('diagnosticsResults');
        resultsContainer.style.display = 'block';

        diagnosticsManager.clearDiagnostics();

        expect(resultsContainer.style.display).toBe('none');
        expect(document.getElementById('diagnosticsStatusValue').textContent).toBe('Not run');
    });
});
