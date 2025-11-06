const CONFIG = require('../../../config.js');

/**
 * Менеджер для работы с workflow диагностики.
 * Отвечает за запуск диагностики, отрисовку результатов и управление статусом.
 * 
 * @class DiagnosticsWorkflowManager
 */
class DiagnosticsWorkflowManager {
    /**
     * Создает экземпляр DiagnosticsWorkflowManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
    }

    /**
     * Запускает диагностику.
     * 
     * @async
     * @returns {Promise<Object>} Результаты диагностики
     */
    async runDiagnostics() {
        const manager = this.manager;
        const button = manager.domManager.elements.runDiagnostics;
        const originalText = button ? button.textContent : '';
        const operationStartTime = performance.now();

        try {
            manager._log({ key: 'logs.diagnosticsWorkflow.runStart' });

            this.updateStatus('running');

            if (button) {
                button.disabled = true;
                button.textContent = manager.localeManager.t('options.buttons.analyzing') || 'Analyzing...';
            }

            const minDelay = new Promise(resolve => setTimeout(resolve, CONFIG.DIAGNOSTICS.MIN_DISPLAY_DELAY));
            const diagnosticsRun = manager.diagnosticsManager.runDiagnostics();

            const [results] = await Promise.all([diagnosticsRun, minDelay]);

            this.renderDiagnostics(results);

            const totalTime = Math.round(performance.now() - operationStartTime);
            manager._log({ key: 'logs.diagnosticsWorkflow.runCompleted' }, {
                overall: results.overall,
                totalTime: `${totalTime}мс`
            });

            this.updateStatus(CONFIG.DIAGNOSTICS.STATUS_MAP[results.overall] || 'failed');

            return results;
        } catch (error) {
            const totalTime = Math.round(performance.now() - operationStartTime);
            manager._logError({ key: 'logs.diagnosticsWorkflow.runError', params: { totalTime } }, error);

            this.updateStatus('failed');

            const statusShown = manager.statusManager.showError(
                manager.localeManager.t('options.status.diagnosticsError')
            );

            if (!statusShown) {
                manager._log({ key: 'logs.diagnosticsWorkflow.statusErrorWarning' });
            }

            throw error;
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    /**
     * Очищает результаты диагностики.
     * 
     * @returns {void}
     */
    clearDiagnostics() {
        const manager = this.manager;

        try {
            const diagnosticsResults = document.getElementById('diagnosticsResults');
            const diagnosticsSummary = document.getElementById('diagnosticsSummary');
            const diagnosticsChecks = document.getElementById('diagnosticsChecks');

            if (diagnosticsResults) {
                diagnosticsResults.style.display = 'none';
            }

            if (diagnosticsSummary) {
                diagnosticsSummary.innerHTML = '';
            }

            if (diagnosticsChecks) {
                diagnosticsChecks.innerHTML = '';
            }

            this.updateStatus('notRun');

            manager._log({ key: 'logs.diagnosticsWorkflow.cleared' });
        } catch (error) {
            manager._logError({ key: 'logs.diagnosticsWorkflow.clearError' }, error);
        }
    }

    /**
     * Обновляет статус диагностики в UI.
     * 
     * @param {string} status - Статус диагностики ('notRun', 'running', 'success', 'failed')
     * @returns {void}
     */
    updateStatus(status) {
        const manager = this.manager;
        const statusValue = document.getElementById('diagnosticsStatusValue');
        if (!statusValue) {
            return;
        }

        statusValue.classList.remove('success', 'error', 'running');

        const safeTranslate = (key, fallback) => {
            const translated = manager.localeManager.t(key);
            return (translated && !translated.startsWith('options.')) ? translated : fallback;
        };

        let statusText = '';
        switch (status) {
            case 'notRun':
                statusText = safeTranslate('options.diagnostics.notRun', 'Not run');
                break;
            case 'running':
                statusText = safeTranslate('options.diagnostics.running', 'Running...');
                statusValue.classList.add('running');
                break;
            case 'success':
                statusText = safeTranslate('options.diagnostics.success', 'Passed');
                statusValue.classList.add('success');
                break;
            case 'failed':
                statusText = safeTranslate('options.diagnostics.failed', 'Failed');
                statusValue.classList.add('error');
                break;
        }

        statusValue.textContent = statusText;
    }

    /**
     * Отрисовывает результаты диагностики в UI.
     * 
     * @param {Object} results - Результаты диагностики
     * @returns {void}
     */
    renderDiagnostics(results) {
        const manager = this.manager;

        try {
            const resultsContainer = document.getElementById('diagnosticsResults');
            const summary = document.getElementById('diagnosticsSummary');
            const checks = document.getElementById('diagnosticsChecks');

            if (!summary || !checks) {
                manager._logError({ key: 'logs.diagnosticsWorkflow.elementsNotFound' });
                return;
            }

            if (resultsContainer) {
                resultsContainer.style.display = 'block';
            }

            const statusEmoji = CONFIG.DIAGNOSTICS.STATUS_EMOJI;
            const uiEmoji = CONFIG.DIAGNOSTICS.UI_EMOJI;
            const statusText = {
                ok: manager.localeManager.t('options.diagnostics.statusOk'),
                warning: manager.localeManager.t('options.diagnostics.statusWarning'),
                error: manager.localeManager.t('options.diagnostics.statusError')
            };

            const checksArray = Object.values(results.checks);
            const stats = {
                total: checksArray.length,
                ok: checksArray.filter(c => c.status === 'ok').length,
                warning: checksArray.filter(c => c.status === 'warning').length,
                error: checksArray.filter(c => c.status === 'error').length
            };

            summary.className = `diagnostics-summary status-${results.overall}`;
            summary.innerHTML = `
                <div class="diagnostics-summary-header">
                    <span class="summary-icon">${statusEmoji[results.overall] || statusEmoji.unknown}</span>
                    <span class="summary-title">${statusText[results.overall] || manager.localeManager.t('options.diagnostics.statusUnknown')}</span>
                </div>
                <div class="diagnostics-summary-grid">
                    <div class="stat-card">
                        <div class="stat-label">${manager.localeManager.t('options.diagnostics.labelTotal')}</div>
                        <div class="stat-value">${stats.total}</div>
                    </div>
                    <div class="stat-card stat-success">
                        <div class="stat-label">${uiEmoji.SUCCESS} ${manager.localeManager.t('options.diagnostics.labelSuccess')}</div>
                        <div class="stat-value">${stats.ok}</div>
                    </div>
                    ${stats.warning > 0
                ? `
                    <div class="stat-card stat-warning">
                        <div class="stat-label">${uiEmoji.WARNING} ${manager.localeManager.t('options.diagnostics.labelWarnings')}</div>
                        <div class="stat-value">${stats.warning}</div>
                    </div>
                    `
                : ''}
                    <div class="stat-card stat-time">
                        <div class="stat-label">${uiEmoji.TIME} ${manager.localeManager.t('options.diagnostics.labelTime')}</div>
                        <div class="stat-value">${results.totalDuration}<span class="stat-unit">мс</span></div>
                    </div>
                </div>
            `;

            checks.innerHTML = Object.entries(results.checks)
                .map(([name, check]) => {
                    const localizedName = manager.localeManager.t(`logs.diagnostics.checkNames.${name}`, {}, name);
                    return `
                    <div class="diagnostic-check check-${check.status}">
                        <div class="diagnostic-check-header">
                            <div class="diagnostic-check-name">
                                <span>${statusEmoji[check.status] || statusEmoji.unknown}</span>
                                <span>${localizedName}</span>
                            </div>
                            <div class="diagnostic-check-duration">${check.duration}мс</div>
                        </div>
                        <div class="diagnostic-check-message">${check.message}</div>
                    </div>
                `;
                }).join('');
        } catch (error) {
            manager._logError({ key: 'logs.diagnosticsWorkflow.renderError' }, error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiagnosticsWorkflowManager;
    module.exports.default = DiagnosticsWorkflowManager;
}

if (typeof window !== 'undefined') {
    window.DiagnosticsWorkflowManager = DiagnosticsWorkflowManager;
}
