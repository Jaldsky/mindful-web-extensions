const CONFIG = require('../../../config.js');

class LogsManager {
    constructor(manager) {
        this.manager = manager;
    }

    setLevelFilter(level) {
        const manager = this.manager;
        manager.logsFilter.level = level;

        const filterButtons = document.querySelectorAll('.logs-filter-btn');
        filterButtons.forEach(btn => {
            if (btn.getAttribute('data-filter-level') === level) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.loadLogs();
    }

    setClassFilter(className) {
        const manager = this.manager;
        manager.logsFilter.className = className;

        const classFilter = document.getElementById('logsClassFilter');
        if (classFilter) {
            classFilter.blur();
        }

        this.loadLogs();
    }

    setServerOnly(serverOnly) {
        const manager = this.manager;
        manager.logsFilter.serverOnly = serverOnly;

        const classFilter = document.getElementById('logsClassFilter');
        if (classFilter) {
            classFilter.disabled = serverOnly;

            if (serverOnly) {
                classFilter.value = 'all';
                manager.logsFilter.className = 'all';
            }
        }

        this.loadLogs();
    }

    async loadLogs() {
        const manager = this.manager;

        try {
            const logsContent = document.getElementById('logsContent');
            if (!logsContent) {
                manager._logError('Контейнер для логов не найден');
                return;
            }

            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                const anchorNode = selection.anchorNode;
                if (anchorNode && logsContent.contains(anchorNode)) {
                    const timeSinceSelection = Date.now() - manager.lastSelectionChangeTime;
                    const selectionTimeout = CONFIG.LOGS?.SELECTION_TIMEOUT || 5000;
                    if (timeSinceSelection < selectionTimeout) {
                        return;
                    }
                }
            }

            const classFilter = document.getElementById('logsClassFilter');
            if (classFilter && (document.activeElement === classFilter || classFilter.matches(':focus-within'))) {
                return;
            }

            const oldScrollTop = logsContent.scrollTop;
            const oldScrollHeight = logsContent.scrollHeight;
            const wasAtTop = oldScrollTop < 50;

            const result = await chrome.storage.local.get(['mindful_logs']);
            const logs = result.mindful_logs || [];

            this.updateClassFilter(logs);

            const filteredLogs = this.filterLogs(logs);

            this.updateCounter(filteredLogs.length, logs.length);

            if (filteredLogs.length === 0) {
                if (logs.length === 0) {
                    logsContent.innerHTML = '<div class="log-empty">No logs available. Logs will appear here when you interact with the extension.</div>';
                } else {
                    logsContent.innerHTML = '<div class="log-empty">No logs match the current filters.</div>';
                }
            } else {
                const recentLogs = filteredLogs.slice(-100).reverse();
                const formattedLogs = recentLogs.map(log => {
                    const timestamp = new Date(log.timestamp).toLocaleString();
                    const level = log.level || 'INFO';
                    const className = log.className || 'Unknown';
                    const message = log.message || '';
                    const data = log.data ? JSON.stringify(log.data, null, 2) : '';

                    const levelClass = level.toLowerCase();
                    return `<div class="log-entry log-${levelClass}"><div class="log-header"><span class="log-timestamp">${timestamp}</span><span class="log-level log-level-${levelClass}">${level}</span><span class="log-class">${className}</span></div><div class="log-message">${this.escapeHtml(message)}</div>${data ? `<pre class="log-data">${this.escapeHtml(data)}</pre>` : ''}</div>`;
                }).join('');

                logsContent.innerHTML = formattedLogs;

                if (wasAtTop) {
                    logsContent.scrollTop = 0;
                } else {
                    const newScrollHeight = logsContent.scrollHeight;
                    const heightDifference = newScrollHeight - oldScrollHeight;
                    logsContent.scrollTop = oldScrollTop + heightDifference;
                }
            }
        } catch (error) {
            manager._logError('Ошибка загрузки логов', error);
            const logsContent = document.getElementById('logsContent');
            if (logsContent) {
                logsContent.innerHTML = `<div class="log-error">Error loading logs: ${this.escapeHtml(error.message)}</div>`;
            }
        }
    }

    async clearLogs() {
        const manager = this.manager;

        try {
            await chrome.storage.local.set({ mindful_logs: [] });

            const logsContent = document.getElementById('logsContent');
            if (logsContent) {
                logsContent.textContent = 'No logs available. Logs will appear here when you interact with the extension.';
            }

            this.updateCounter(0);

            if (manager.statusManager) {
                manager.statusManager.showSuccess(
                    manager.localeManager.t('options.notifications.logsCleared') || 'Logs cleared successfully'
                );
            }
        } catch (error) {
            manager._logError('Ошибка очистки логов', error);
            if (manager.statusManager) {
                manager.statusManager.showError(
                    manager.localeManager.t('options.notifications.logsClearError') || 'Error clearing logs'
                );
            }
        }
    }

    async copyLogs() {
        const manager = this.manager;

        try {
            const logsContent = document.getElementById('logsContent');
            if (!logsContent || !logsContent.textContent) {
                manager._log('Нет логов для копирования');
                return;
            }

            const textContent = logsContent.innerText || logsContent.textContent;
            await navigator.clipboard.writeText(textContent);
            manager._log('Логи скопированы в буфер обмена');

            if (manager.statusManager) {
                manager.statusManager.showSuccess(
                    manager.localeManager.t('options.notifications.logsCopied') || 'Logs copied to clipboard'
                );
            }
        } catch (error) {
            manager._logError('Ошибка копирования логов', error);
            if (manager.statusManager) {
                manager.statusManager.showError(
                    manager.localeManager.t('options.notifications.logsCopyError') || 'Error copying logs'
                );
            }
        }
    }

    startAutoRefresh() {
        const manager = this.manager;
        this.stopAutoRefresh();

        this.setupSelectionChangeHandler();

        const refreshInterval = CONFIG.LOGS?.AUTO_REFRESH_INTERVAL || 1000;
        manager.logsRefreshIntervalId = setInterval(async () => {
            try {
                await this.loadLogs();
            } catch (error) {
                // swallow errors during auto refresh
            }
        }, refreshInterval);

        manager._log(`Автоматическое обновление логов запущено (каждые ${refreshInterval}мс)`);
    }

    stopAutoRefresh() {
        const manager = this.manager;
        if (manager.logsRefreshIntervalId !== null) {
            clearInterval(manager.logsRefreshIntervalId);
            manager.logsRefreshIntervalId = null;
            this.removeSelectionChangeHandler();
            manager._log('Автоматическое обновление логов остановлено');
        }
    }

    updateClassFilter(logs) {
        const manager = this.manager;
        const classFilter = document.getElementById('logsClassFilter');
        if (!classFilter) {
            return;
        }

        const classes = new Set();
        logs.forEach(log => {
            if (log.className) {
                classes.add(log.className);
            }
        });

        const currentValue = classFilter.value;

        const allClassesText = manager.localeManager?.t('options.logsFilters.classAll') || 'All Classes';
        classFilter.innerHTML = `<option value="all" data-i18n="options.logsFilters.classAll">${allClassesText}</option>`;

        const sortedClasses = Array.from(classes).sort();
        sortedClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            option.title = className;
            classFilter.appendChild(option);
        });

        if (currentValue && Array.from(classFilter.options).some(opt => opt.value === currentValue)) {
            classFilter.value = currentValue;
        }
    }

    filterLogs(logs) {
        const manager = this.manager;

        return logs.filter(log => {
            if (manager.logsFilter.serverOnly && log.className !== 'BackendManager') {
                return false;
            }

            if (manager.logsFilter.level !== 'all') {
                const currentLogLevel = (log.level || 'INFO').toLowerCase();
                if (currentLogLevel !== manager.logsFilter.level.toLowerCase()) {
                    return false;
                }
            }

            if (manager.logsFilter.className !== 'all' && log.className !== manager.logsFilter.className) {
                return false;
            }

            return true;
        });
    }

    updateCounter(count, total) {
        const manager = this.manager;
        const counterElement = document.getElementById('logsCounter');
        if (!counterElement) {
            return;
        }

        if (total !== undefined && total !== count) {
            counterElement.textContent = `${count} / ${total}`;
        } else {
            const maxLogs = CONFIG.LOGS?.MAX_LOGS || 1000;
            counterElement.textContent = `${count} / ${maxLogs}`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupSelectionChangeHandler() {
        const manager = this.manager;
        if (!manager.selectionChangeHandler) {
            manager.selectionChangeHandler = () => {
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) {
                    manager.lastSelectionChangeTime = Date.now();
                }
            };
            document.addEventListener('selectionchange', manager.selectionChangeHandler);
        }
    }

    removeSelectionChangeHandler() {
        const manager = this.manager;
        if (manager.selectionChangeHandler) {
            document.removeEventListener('selectionchange', manager.selectionChangeHandler);
            manager.selectionChangeHandler = null;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogsManager;
    module.exports.default = LogsManager;
}

if (typeof window !== 'undefined') {
    window.LogsManager = LogsManager;
}
