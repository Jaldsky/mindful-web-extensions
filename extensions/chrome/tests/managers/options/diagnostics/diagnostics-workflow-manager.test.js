/**
 * @jest-environment jsdom
 */

const DiagnosticsWorkflowManager = require('../../../../src/managers/options/diagnostics/DiagnosticsWorkflowManager.js');
const { createBaseOptionsManager } = require('../options-test-helpers.js');

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

    describe('runDiagnostics обработка ошибок', () => {
        test('обрабатывает ошибки при выполнении диагностики', async () => {
            const { manager, diagnosticsManager } = createEnvironment();
            manager.diagnosticsManager.runDiagnostics.mockRejectedValue(new Error('Diagnostics failed'));

            await expect(diagnosticsManager.runDiagnostics()).rejects.toThrow('Diagnostics failed');
            expect(manager.statusManager.showError).toHaveBeenCalled();
            expect(manager.domManager.elements.runDiagnostics.disabled).toBe(false);
        });

        test('обрабатывает ошибки когда statusManager не показывает статус', async () => {
            const { manager, diagnosticsManager } = createEnvironment();
            manager.diagnosticsManager.runDiagnostics.mockRejectedValue(new Error('Test error'));
            manager.statusManager.showError.mockReturnValue(false);

            await expect(diagnosticsManager.runDiagnostics()).rejects.toThrow();
            expect(manager._log).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.diagnosticsWorkflow.statusErrorWarning' })
            );
        });
    });

    describe('clearDiagnostics обработка ошибок', () => {
        test('обрабатывает ошибки при очистке', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const diagnosticsManager = new DiagnosticsWorkflowManager(manager);
            const resultsContainer = document.getElementById('diagnosticsResults');
            Object.defineProperty(resultsContainer, 'style', {
                get: () => { throw new Error('Style error'); }
            });

            diagnosticsManager.clearDiagnostics();

            expect(manager._logError).toHaveBeenCalled();
        });
    });

    describe('updateStatus', () => {
        test('обрабатывает отсутствие statusValue', () => {
            document.body.innerHTML = '';
            const manager = createBaseOptionsManager();
            const diagnosticsManager = new DiagnosticsWorkflowManager(manager);

            expect(() => diagnosticsManager.updateStatus('success')).not.toThrow();
        });

        test('обновляет статус на failed', () => {
            const { diagnosticsManager } = createEnvironment();

            diagnosticsManager.updateStatus('failed');

            const statusValue = document.getElementById('diagnosticsStatusValue');
            expect(statusValue.classList.contains('error')).toBe(true);
            expect(statusValue.textContent).toBe('Failed');
        });
    });

    describe('renderDiagnostics', () => {
        test('обрабатывает отсутствие элементов', () => {
            document.body.innerHTML = '<div id="diagnosticsResults"></div>';
            const manager = createBaseOptionsManager();
            const diagnosticsManager = new DiagnosticsWorkflowManager(manager);

            diagnosticsManager.renderDiagnostics({
                overall: 'ok',
                totalDuration: 100,
                checks: {}
            });

            expect(manager._logError).toHaveBeenCalledWith(
                expect.objectContaining({ key: 'logs.diagnosticsWorkflow.elementsNotFound' })
            );
        });

        test('обрабатывает ошибки при отрисовке', () => {
            setupDOM();
            const manager = createBaseOptionsManager();
            const diagnosticsManager = new DiagnosticsWorkflowManager(manager);
            const summary = document.getElementById('diagnosticsSummary');
            const originalInnerHTML = summary.innerHTML;
            Object.defineProperty(summary, 'innerHTML', {
                get: () => originalInnerHTML,
                set: () => { throw new Error('InnerHTML error'); }
            });

            diagnosticsManager.renderDiagnostics({
                overall: 'ok',
                totalDuration: 100,
                checks: {}
            });

            expect(manager._logError).toHaveBeenCalled();
        });

        test('отрисовывает результаты с предупреждениями', () => {
            const { manager, diagnosticsManager } = createEnvironment();
            manager.diagnosticsManager.runDiagnostics.mockResolvedValue({
                overall: 'warning',
                totalDuration: 200,
                checks: {
                    storage: { status: 'ok', message: 'OK', duration: 10 },
                    network: { status: 'warning', message: 'Warning', duration: 20 }
                }
            });

            diagnosticsManager.renderDiagnostics({
                overall: 'warning',
                totalDuration: 200,
                checks: {
                    storage: { status: 'ok', message: 'OK', duration: 10 },
                    network: { status: 'warning', message: 'Warning', duration: 20 }
                }
            });

            const summary = document.getElementById('diagnosticsSummary');
            expect(summary.innerHTML).toContain('Warnings');
        });
    });
});
