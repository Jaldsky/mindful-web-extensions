const CONFIG = require('../../../config.js');

class LogsManager {
    constructor(manager) {
        this.manager = manager;
        this.buttonFeedbackTimers = new Map();
        this._measurementElement = null;

        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => this._initializeFeedbackButtons());
            } else {
                this._initializeFeedbackButtons();
            }
        }
    }

    _initializeFeedbackButtons() {
        const buttonIds = ['clearLogs', 'copyLogs'];

        buttonIds.forEach((buttonId) => {
            const button = document.getElementById(buttonId);
            if (!button) {
                return;
            }

            const localizedTexts = this._getFeedbackVariants(buttonId, button.textContent.trim());
            const targetWidth = localizedTexts.reduce((max, text) => {
                const measured = this._measureButtonText(button, text);
                return Math.max(max, measured);
            }, button.offsetWidth);

            if (targetWidth > 0) {
                button.dataset.feedbackWidth = String(targetWidth);
                button.style.minWidth = `${targetWidth}px`;
                button.style.width = `${targetWidth}px`;
            }
        });
    }

    _getFeedbackVariants(buttonId, defaultText = '') {
        const manager = this.manager;
        const texts = [defaultText].filter(Boolean);

        if (buttonId === 'clearLogs') {
            texts.push(
                manager.localeManager.t('options.notifications.logsClearedShort') || 'Cleared',
                manager.localeManager.t('options.notifications.logsClearErrorShort') || 'Clear error'
            );
        } else if (buttonId === 'copyLogs') {
            texts.push(
                manager.localeManager.t('options.notifications.logsCopiedShort') || 'Copied',
                manager.localeManager.t('options.notifications.logsCopyErrorShort') || 'Copy error'
            );
        }

        return texts;
    }

    _measureButtonText(button, text) {
        if (typeof document === 'undefined' || !button) {
            return 0;
        }

        if (!this._measurementElement) {
            const measurementButton = document.createElement('button');
            measurementButton.type = 'button';
            measurementButton.style.position = 'absolute';
            measurementButton.style.visibility = 'hidden';
            measurementButton.style.pointerEvents = 'none';
            measurementButton.style.left = '-9999px';
            measurementButton.style.top = '-9999px';
            measurementButton.style.whiteSpace = 'nowrap';
            measurementButton.style.zIndex = '-1';
            document.body.appendChild(measurementButton);
            this._measurementElement = measurementButton;
        }

        const measurement = this._measurementElement;
        const computed = window.getComputedStyle(button);

        measurement.className = button.className;
        measurement.textContent = text;
        measurement.style.font = computed.font;
        measurement.style.fontSize = computed.fontSize;
        measurement.style.fontWeight = computed.fontWeight;
        measurement.style.fontFamily = computed.fontFamily;
        measurement.style.lineHeight = computed.lineHeight;
        measurement.style.padding = computed.padding;
        measurement.style.border = computed.border;
        measurement.style.boxSizing = computed.boxSizing;
        measurement.style.letterSpacing = computed.letterSpacing;
        measurement.style.textTransform = computed.textTransform;
        measurement.style.textRendering = computed.textRendering;
        measurement.style.textIndent = computed.textIndent;
        measurement.style.width = 'auto';
        measurement.style.minWidth = '0';
        measurement.style.maxWidth = 'none';

        return Math.ceil(measurement.offsetWidth);
    }

    _setButtonFeedback(buttonId, { text, disabled = true, duration = 500 }) {
        const button = document.getElementById(buttonId);

        if (!button || typeof text !== 'string') {
            return;
        }

        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }

        if (!button.dataset.originalTitle) {
            button.dataset.originalTitle = button.getAttribute('title') || '';
        }

        if (this.buttonFeedbackTimers.has(buttonId)) {
            clearTimeout(this.buttonFeedbackTimers.get(buttonId));
            this.buttonFeedbackTimers.delete(buttonId);
        }

        const truncate = (s, max) => {
            if (typeof s !== 'string') return '';
            if (s.length <= max) return s;
            return `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
        };

        const maxChars = 14; // чуть короче, т.к. есть иконка
        const truncated = truncate(text, maxChars);

        button.textContent = truncated;
        button.disabled = disabled;
        button.setAttribute('title', text);

        const timerId = setTimeout(() => {
            button.textContent = button.dataset.originalText || button.textContent;
            button.disabled = false;
            if (button.dataset.originalTitle !== undefined) {
                if (button.dataset.originalTitle) {
                    button.setAttribute('title', button.dataset.originalTitle);
                } else {
                    button.removeAttribute('title');
                }
            }
            this.buttonFeedbackTimers.delete(buttonId);
        }, duration);

        this.buttonFeedbackTimers.set(buttonId, timerId);
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

            const successMessage = manager.localeManager.t('options.notifications.logsClearedShort') || 'Cleared';
            this._setButtonFeedback('clearLogs', {
                text: successMessage,
                disabled: true,
                duration: 600
            });
        } catch (error) {
            manager._logError('Ошибка очистки логов', error);

            const errorMessage = manager.localeManager.t('options.notifications.logsClearErrorShort') || 'Clear error';
            this._setButtonFeedback('clearLogs', {
                text: errorMessage,
                disabled: false,
                duration: 1200
            });
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

            const successMessage = manager.localeManager.t('options.notifications.logsCopiedShort') || 'Copied';
            this._setButtonFeedback('copyLogs', {
                text: successMessage,
                disabled: true,
                duration: 550
            });
        } catch (error) {
            manager._logError('Ошибка копирования логов', error);

            const errorMessage = manager.localeManager.t('options.notifications.logsCopyErrorShort') || 'Copy error';
            this._setButtonFeedback('copyLogs', {
                text: errorMessage,
                disabled: false,
                duration: 1200
            });
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
