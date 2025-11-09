const CONFIG = require('../../../config/config.js');

/**
 * Менеджер для управления активностью и графиком.
 * Отвечает за загрузку статистики активности, отображение графика и автообновление.
 * 
 * @class ActivityManager
 */
class ActivityManager {
    /**
     * Создает экземпляр ActivityManager.
     * 
     * @param {Object} manager - Экземпляр OptionsManager
     */
    constructor(manager) {
        this.manager = manager;
        this.activityHistory = [];
        this.activityChartInitialized = false;
        this.activityRangeKey = (CONFIG.ACTIVITY && CONFIG.ACTIVITY.DEFAULT_RANGE_KEY) || '1h';
        this.activityRangeMs = (CONFIG.ACTIVITY && CONFIG.ACTIVITY.RANGES && CONFIG.ACTIVITY.RANGES[this.activityRangeKey]) || (60 * 60 * 1000);
    }

    /**
     * Загружает статистику активности.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async loadActivityStats() {
        const manager = this.manager;
        try {
            const stats = await manager.serviceWorkerManager.getDetailedStats();

            const setText = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = String(value);
                }
            };

            setText('activityEvents', stats.eventsTracked);
            setText('activityActive', stats.activeEvents);
            setText('activityInactive', stats.inactiveEvents);
            setText('activityDomainsCount', stats.domainsVisited);
            setText('activityQueueSize', stats.queueSize);

            const list = document.getElementById('activityDomainsList');
            if (list) {
                list.innerHTML = '';
                const domains = Array.isArray(stats.domains) ? stats.domains : [];
                if (domains.length === 0) {
                    const li = document.createElement('li');
                    li.className = 'activity-domains-empty';
                    li.textContent = (this.manager.localeManager && typeof this.manager.localeManager.t === 'function')
                        ? (this.manager.localeManager.t('options.activity.noDomains') || 'No domains')
                        : 'No domains';
                    list.appendChild(li);
                } else {
                    const maxItems = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.MAX_DOMAINS_DISPLAY === 'number')
                        ? CONFIG.ACTIVITY.MAX_DOMAINS_DISPLAY
                        : 100;
                    domains.slice(0, maxItems).forEach(domain => {
                        const li = document.createElement('li');
                        li.textContent = domain;
                        list.appendChild(li);
                    });
                }
            }

            this._updateActivityChart(stats.eventsTracked, true);
        } catch (error) {
            manager._logError({ key: 'logs.ui.activity.loadActivityStatsError' }, error);
        }
    }

    /**
     * Устанавливает диапазон активности по ключу.
     * 
     * @param {string} key - Ключ диапазона
     * @returns {void}
     */
    setActivityRangeByKey(key) {
        try {
            if (!CONFIG.ACTIVITY || !CONFIG.ACTIVITY.RANGES || !CONFIG.ACTIVITY.RANGES[key]) {
                return;
            }
            this.activityRangeKey = key;
            this.activityRangeMs = CONFIG.ACTIVITY.RANGES[key];
            this._markActiveRangeButton(key);
            const last = this.activityHistory.length > 0 ? this.activityHistory[this.activityHistory.length - 1].v : 0;
            this._updateActivityChart(last, false);
        } catch (error) {
            this.manager._logError({ key: 'logs.ui.activity.setActivityRangeError' }, error);
        }
    }

    /**
     * Отмечает активную кнопку диапазона.
     * 
     * @private
     * @param {string} key - Ключ диапазона
     * @returns {void}
     */
    _markActiveRangeButton(key) {
        const select = document.getElementById('activityRangeSelect');
        if (select) {
            select.value = key;
        }
    }

    /**
     * Запускает автообновление активности.
     * 
     * @returns {void}
     */
    startActivityAutoRefresh() {
        const manager = this.manager;
        try {
            this.stopActivityAutoRefresh();
            const interval = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.AUTO_REFRESH_INTERVAL === 'number' && CONFIG.ACTIVITY.AUTO_REFRESH_INTERVAL > 0)
                ? CONFIG.ACTIVITY.AUTO_REFRESH_INTERVAL
                : ((CONFIG.LOGS && typeof CONFIG.LOGS.AUTO_REFRESH_INTERVAL === 'number') ? CONFIG.LOGS.AUTO_REFRESH_INTERVAL : 1000);
            this.loadActivityStats().catch(() => {});
            manager.activityRefreshIntervalId = setInterval(() => {
                this.loadActivityStats().catch(() => {});
            }, interval);
            manager._log({ key: 'logs.ui.activity.activityAutoRefreshStarted', params: { interval } });
        } catch (error) {
            manager._logError({ key: 'logs.ui.activity.startActivityAutoRefreshError' }, error);
        }
    }

    /**
     * Останавливает автообновление активности.
     * 
     * @returns {void}
     */
    stopActivityAutoRefresh() {
        const manager = this.manager;
        try {
            if (manager.activityRefreshIntervalId) {
                clearInterval(manager.activityRefreshIntervalId);
                manager.activityRefreshIntervalId = null;
                manager._log({ key: 'logs.ui.activity.activityAutoRefreshStopped' });
            }
        } catch (error) {
            manager._logError({ key: 'logs.ui.activity.stopActivityAutoRefreshError' }, error);
        }
    }

    /**
     * Инициализирует график активности.
     * 
     * @private
     * @returns {void}
     */
    _ensureActivityChartInitialized() {
        if (this.activityChartInitialized) {
            return;
        }

        const canvas = document.getElementById('activityChart');
        if (!canvas) {
            return;
        }

        const height = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.CHART_HEIGHT === 'number')
            ? CONFIG.ACTIVITY.CHART_HEIGHT
            : (canvas.height || CONFIG.UI.CHART.DEFAULT_HEIGHT);
        try { canvas.style.height = `${height}px`; } catch (_) {}
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = canvas.clientWidth || canvas.offsetWidth || CONFIG.UI.CHART.DEFAULT_WIDTH;
        const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
        const targetHeight = Math.max(1, Math.floor(height * dpr));
        if (canvas.width !== targetWidth) canvas.width = targetWidth;
        if (canvas.height !== targetHeight) canvas.height = targetHeight;
        this.activityChartInitialized = true;
    }

    /**
     * Обновляет график активности.
     * 
     * @private
     * @param {number} currentValue - Текущее значение
     * @param {boolean} [addPoint=true] - Добавить точку в историю
     * @returns {void}
     */
    _updateActivityChart(currentValue, addPoint = true) {
        try {
            this._ensureActivityChartInitialized();
            const canvas = document.getElementById('activityChart');
            if (!canvas) {
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            const cssWidth = canvas.clientWidth || canvas.offsetWidth || CONFIG.UI.CHART.DEFAULT_WIDTH;
            const cssHeight = parseFloat(getComputedStyle(canvas).height) || canvas.height || CONFIG.UI.CHART.DEFAULT_HEIGHT;
            const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
            const targetHeight = Math.max(1, Math.floor(cssHeight * dpr));
            if (canvas.width !== targetWidth) canvas.width = targetWidth;
            if (canvas.height !== targetHeight) canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return;
            }
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.scale(dpr, dpr);

            const maxPoints = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.CHART_MAX_POINTS === 'number')
                ? CONFIG.ACTIVITY.CHART_MAX_POINTS
                : 60;

            const now = Date.now();
            if (addPoint) {
                this.activityHistory.push({ t: now, v: Number(currentValue) || 0 });
            }
            const maxWindow = (CONFIG.ACTIVITY && CONFIG.ACTIVITY.HISTORY_MAX_MS) || (24 * 60 * 60 * 1000);
            const minTime = now - maxWindow;
            if (this.activityHistory.length > 0) {
                let startIndex = 0;
                while (startIndex < this.activityHistory.length && this.activityHistory[startIndex].t < minTime) {
                    startIndex++;
                }
                if (startIndex > 0) {
                    this.activityHistory.splice(0, startIndex);
                }
            }
            if (this.activityHistory.length > maxPoints) {
                this.activityHistory.splice(0, this.activityHistory.length - maxPoints);
            }

            const rangeMs = this.activityRangeMs || ((CONFIG.ACTIVITY && CONFIG.ACTIVITY.RANGES && CONFIG.ACTIVITY.RANGES['1h']) || 60 * 60 * 1000);
            const cutoff = now - rangeMs;
            const data = this.activityHistory.filter(p => p.t >= cutoff);

            const values = data.map(p => p.v);
            const minV = Math.min(...values);
            const maxV = Math.max(...values);

            const yDesiredCount = (CONFIG.ACTIVITY && Number.isFinite(CONFIG.ACTIVITY.GRID_Y_COUNT)) ? Math.max(2, CONFIG.ACTIVITY.GRID_Y_COUNT) : 4;
            let minInt = isFinite(minV) ? Math.floor(minV) : 0;
            let maxInt = isFinite(maxV) ? Math.ceil(maxV) : 1;
            if (maxInt - minInt <= 0) {
                minInt = Math.max(0, minInt - 1);
                maxInt = minInt + 1;
            }
            const step = Math.max(1, Math.ceil((maxInt - minInt) / yDesiredCount));
            const ticksAll = [];
            for (let v = minInt; v <= maxInt; v += step) {
                ticksAll.push(v);
            }
            const maxTicks = yDesiredCount + 1;
            const sampleStep = Math.max(1, Math.ceil(ticksAll.length / maxTicks));
            const yTicks = ticksAll.filter((_, i) => i % sampleStep === 0);
            while (yTicks.length > maxTicks) yTicks.pop();
            const axisMin = minInt;
            const axisMax = maxInt;
            const axisRange = Math.max(1, axisMax - axisMin);
            const basePadding = (CONFIG.ACTIVITY && typeof CONFIG.ACTIVITY.CHART_PADDING === 'number')
                ? CONFIG.ACTIVITY.CHART_PADDING
                : 20;
            const width = cssWidth;
            const height = cssHeight;
            const fontSize = CONFIG.UI.CHART.FONT_SIZE;
            ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
            const unitEventsShort = (this.manager.localeManager && typeof this.manager.localeManager.t === 'function')
                ? (this.manager.localeManager.t('options.activity.axis.unitEventsShort') || 'evt')
                : 'evt';
            const formatVal = (v) => `${Math.round(v)} ${unitEventsShort}`;
            const maxYTickWidth = yTicks.reduce((m, v) => Math.max(m, ctx.measureText(formatVal(v)).width), 0);
            const yTitlePad = 0;
            const xTitlePad = 0;
            const xTickHeight = fontSize;
            const spacing = CONFIG.UI.CHART.SPACING;
            const leftPadding = basePadding + Math.ceil(maxYTickWidth + CONFIG.UI.CHART.PADDING.TEXT) + yTitlePad;
            const rightPadding = basePadding + CONFIG.UI.CHART.PADDING.RIGHT;
            const topPadding = basePadding;
            const bottomPadding = basePadding + xTickHeight + spacing + xTitlePad;
            const innerW = Math.max(1, width - leftPadding - rightPadding);
            const innerH = Math.max(1, height - topPadding - bottomPadding);

            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-bg-secondary') || CONFIG.UI.CHART.COLORS.BACKGROUND;
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--color-text-secondary') || CONFIG.UI.CHART.COLORS.AXIS;
            ctx.lineWidth = CONFIG.UI.CHART.LINE_WIDTH.AXIS;
            ctx.beginPath();
            ctx.moveTo(leftPadding, topPadding);
            ctx.lineTo(leftPadding, height - bottomPadding);
            ctx.lineTo(width - rightPadding, height - bottomPadding);
            ctx.stroke();

            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color') || CONFIG.UI.CHART.COLORS.GRID;
            ctx.lineWidth = CONFIG.UI.CHART.LINE_WIDTH.GRID;
            ctx.setLineDash(CONFIG.UI.CHART.DASH_PATTERN);
            const xCount = (CONFIG.ACTIVITY && Number.isFinite(CONFIG.ACTIVITY.GRID_X_COUNT)) ? Math.max(2, CONFIG.ACTIVITY.GRID_X_COUNT) : 3;
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-text-secondary') || CONFIG.UI.CHART.COLORS.TEXT;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            yTicks.forEach((val) => {
                const t = (val - axisMin) / axisRange;
                const y = topPadding + innerH - t * innerH;
                ctx.beginPath();
                ctx.moveTo(leftPadding, y);
                ctx.lineTo(width - rightPadding, y);
                ctx.stroke();
                if (Math.abs(y - (height - bottomPadding)) < CONFIG.UI.CHART.POSITION_THRESHOLD) {
                    const prevBaseline = ctx.textBaseline;
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(formatVal(val), leftPadding - CONFIG.UI.CHART.TEXT_OFFSET, y - 1);
                    ctx.textBaseline = prevBaseline;
                } else {
                    ctx.fillText(formatVal(val), leftPadding - CONFIG.UI.CHART.TEXT_OFFSET, y);
                }
            });
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const xMin = cutoff;
            const xRange = Math.max(1, now - xMin);
            for (let i = 0; i <= xCount; i++) {
                const t = i / xCount;
                const x = leftPadding + t * innerW;
                ctx.beginPath();
                ctx.moveTo(x, topPadding);
                ctx.lineTo(x, height - bottomPadding);
                ctx.stroke();
                const labelTs = new Date(xMin + t * xRange);
                const hh = String(labelTs.getHours()).padStart(2, '0');
                const mm = String(labelTs.getMinutes()).padStart(2, '0');
                const prevAlign = ctx.textAlign;
                let dx = 0;
                if (i === 0) { ctx.textAlign = 'left'; dx = 2; } else if (i === xCount) { ctx.textAlign = 'right'; dx = -2; }
                ctx.fillText(`${hh}:${mm}`, x + dx, height - bottomPadding + 2);
                ctx.textAlign = prevAlign;
            }
            ctx.setLineDash([]);

            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--color-primary') || CONFIG.UI.CHART.COLORS.DATA;
            ctx.lineWidth = CONFIG.UI.CHART.LINE_WIDTH.DATA;
            if (data.length >= 2) {
                ctx.beginPath();
                data.forEach((p, i) => {
                    const xr = (p.t - xMin) / xRange;
                    const x = leftPadding + xr * innerW;
                    const y = topPadding + innerH - ((p.v - axisMin) / axisRange) * innerH;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.stroke();
            } else if (data.length === 1) {
                const p = data[0];
                const xr = (p.t - xMin) / xRange;
                const x = leftPadding + xr * innerW;
                const y = topPadding + innerH - ((p.v - axisMin) / axisRange) * innerH;
                ctx.fillStyle = ctx.strokeStyle;
                ctx.beginPath();
                ctx.arc(x, y, CONFIG.UI.CHART.POINT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        } catch (error) {
            this.manager._logError({ key: 'logs.ui.activity.updateActivityChartError' }, error);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityManager;
    module.exports.default = ActivityManager;
}

if (typeof window !== 'undefined') {
    window.ActivityManager = ActivityManager;
}
