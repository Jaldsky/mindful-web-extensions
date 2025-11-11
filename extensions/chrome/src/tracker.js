const TrackerManager = require('./managers/tracker/TrackerManager.js');

/**
 * Главный экземпляр трекера
 * @type {TrackerManager}
 */
let tracker = null;

/**
 * Инициализирует трекер.
 * @returns {void}
 */
function initializeTracker() {
    try {
        tracker = new TrackerManager({
            enableLogging: true
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Tracker] Ошибка инициализации TrackerManager:', error);
    }
}

initializeTracker();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { tracker };
}
